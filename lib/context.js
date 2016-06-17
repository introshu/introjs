'use strict';

var utils = require('./utils');

function Context(inputReader, outputWriter, errorWriter) {
  this.inputReader = inputReader;
  this.outputWriter = outputWriter;
  this.errorWriter = errorWriter;
  this.startTime = Date.now();
}

Context.prototype.trace = function (line, text) {
  var args = [];
  for (var i = 2; i < arguments.length; i++) {
    args.push(JSON.stringify(arguments[i]));
  }
  this.errorWriter.writeLine(line + ': ' + text + ' => ' + args.join(', '));
};

Context.prototype.range = function (first, last, step, inclusive) {
  var curr = first;
  var testFunc;
  if (step > 0) {
    if (inclusive) {
      testFunc = function () {
        return curr <= last;
      };
    } else {
      testFunc = function () {
        return curr < last;
      };
    }
  } else if (step < 0) {
    if (inclusive) {
      testFunc = function () {
        return curr >= last;
      };
    } else {
      testFunc = function () {
        return curr > last;
      };
    }
  } else {
    throw new RangeError('step: ' + step);
  }
  return function () {
    if (testFunc()) {
      var tmp = curr;
      curr += step
      return tmp;
    }
    return null;
  };
};

Context.prototype.iter = function (values) {
  var i = 0;
  var n = values.length;
  return function () {
    if (i >= n) {
      return null;
    }
    return values[i++];
  };
};

Context.prototype.eq = function (left, right) {
  return left === right ? 1 : 0;
};

Context.prototype.ne = function (left, right) {
  return left !== right ? 1 : 0;
};

Context.prototype.le = function (left, right) {
  return left <= right ? 1 : 0;
};

Context.prototype.ge = function (left, right) {
  return left >= right ? 1 : 0;
};

Context.prototype.lt = function (left, right) {
  return left < right ? 1 : 0;
};

Context.prototype.gt = function (left, right) {
  return left > right ? 1 : 0;
};

Context.prototype.lsh = function (left, right) {
  return left << right;
};

Context.prototype.rsh = function (left, right) {
  return left >> right;
};

Context.prototype.zrsh = function (left, right) {
  return (left >>> right) | 0;
};

Context.prototype.add = function (left, right) {
  return this.checkOverflow(left + right);
};

Context.prototype.sub = function (left, right) {
  return this.checkOverflow(left - right);
};

Context.prototype.mul = function (left, right) {
  return this.checkOverflow(left * right);
};

Context.prototype.fdiv = function (left, right) {
  return this.checkOverflow(Math.floor(left / this.checkDivisor(right)));
};

Context.prototype.zdiv = function (left, right) {
  var value = left / this.checkDivisor(right);
  value = value < 0 ? Math.ceil(value) : Math.floor(value);
  return this.checkOverflow(value);
};

Context.prototype.mod = function (left, right) {
  return left - this.fdiv(left, right) * right;
};

Context.prototype.rem = function (left, right) {
  return left % this.checkDivisor(right);
};

Context.prototype.band = function (left, right) {
  return left & right;
};

Context.prototype.bor = function (left, right) {
  return left | right;
};

Context.prototype.bxor = function (left, right) {
  return left ^ right;
};

Context.prototype.neg = function (value) {
  return this.checkOverflow(-value);
};

Context.prototype.pos = function (value) {
  return value;
};

Context.prototype.bnot = function (value) {
  return ~value;
};

Context.prototype.not = function (value) {
  return !value ? 1 : 0;
};

Context.prototype.len = function (values) {
  return values.length;
};

Context.prototype.checkOverflow = function (value) {
  if (utils.isOverflow(value)) {
    throw new RangeError('integer overflow');
  }
  return value;
};

Context.prototype.checkDivisor = function (divisor) {
  if (divisor === 0) {
    throw new RangeError('division by zero');
  }
  return divisor;
};

Context.prototype.getAt = function (values, index) {
  return values[this.checkIndex(index, values.length)];
};

Context.prototype.setAt = function (values, index, value) {
  values[this.checkIndex(index, values.length)] = value;
};

Context.prototype.addAt = function (values, index, value) {
  values[this.checkIndex(index, values.length)] = this.add(values[index], value);
};

Context.prototype.subAt = function (values, index, value) {
  values[this.checkIndex(index, values.length)] = this.sub(values[index], value);
};

Context.prototype.mulAt = function (values, index, value) {
  values[this.checkIndex(index, values.length)] = this.mul(values[index], value);
};

Context.prototype.fdivAt = function (values, index, value) {
  values[this.checkIndex(index, values.length)] = this.fdiv(values[index], value);
};

Context.prototype.zdivAt = function (values, index, value) {
  values[this.checkIndex(index, values.length)] = this.zdiv(values[index], value);
};

Context.prototype.modAt = function (values, index, value) {
  values[this.checkIndex(index, values.length)] = this.mod(values[index], value);
};

Context.prototype.remAt = function (values, index, value) {
  values[this.checkIndex(index, values.length)] = this.rem(values[index], value);
};

Context.prototype.lshAt = function (values, index, value) {
  values[this.checkIndex(index, values.length)] = this.lsh(values[index], value);
};

Context.prototype.rshAt = function (values, index, value) {
  values[this.checkIndex(index, values.length)] = this.rsh(values[index], value);
};

Context.prototype.zrshAt = function (values, index, value) {
  values[this.checkIndex(index, values.length)] = this.zrsh(values[index], value);
};

Context.prototype.bandAt = function (values, index, value) {
  values[this.checkIndex(index, values.length)] = this.band(values[index], value);
};

Context.prototype.borAt = function (values, index, value) {
  values[this.checkIndex(index, values.length)] = this.bor(values[index], value);
};

Context.prototype.bxorAt = function (values, index, value) {
  values[this.checkIndex(index, values.length)] = this.bxor(values[index], value);
};

Context.prototype.checkIndex = function (index, length) {
  if (index < 0 || index >= length) {
    throw new RangeError('array index out of range: ' + index);
  }
  return index;
};

Context.prototype.zeros = function () {
  var n = arguments[0];
  if (arguments.length === 1) {
    return new Array(n).fill(0);
  }
  var values = [];
  var args = Array.prototype.slice.call(arguments, 1);
  for (var i = 0; i < n; i++) {
    values.push(this.zeros.apply(this, args));
  }
  return values;
};

Context.prototype.get_date$ = function () {
  var date = new Date();
  return [
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
    date.getMilliseconds(),
    date.getTimezoneOffset(),
  ];
};

Context.prototype.get_time$ = function () {
  return (Date.now() - this.startTime) | 0;
};

Context.prototype.read$ = function (values, offset, length) {
  var line = this.inputReader.readLine();
  if (line === null) {
    return -1;
  }
  var ints = utils.toInts(line);
  var n = Math.min(ints.length, length);
  for (var i = 0; i < n; i++) {
    values[offset + i] = this.checkOverflow(ints[i]);
  }
  return n;
};

Context.prototype.read_int$ = function () {
  var values = [0];
  this.read$(values, 0, 1);
  return values[0];
};

Context.prototype.read_ints$ = function (max_length) {
  var values = new Array(max_length);
  var n = this.read$(values, 0, max_length);
  if (n <= 0) {
    return [];
  }
  return values.slice(0, n);
};

Context.prototype.write$ = function (values, offset, length) {
  this.outputWriter.writeLine(values.slice(offset, offset + length).join('\t'));
};

Context.prototype.write_int$ = function (value) {
  this.write$([value], 0, 1);
};

Context.prototype.write_ints$ = function (values) {
  this.write$(values, 0, values.length);
};

module.exports = Context;
