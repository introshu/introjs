'use strict';

var minInteger = -2147483648;
var maxInteger = 2147483647;

function isOverflow(value) {
  return !(value >= minInteger && value <= maxInteger);
}

function toInt(str) {
  if (!str) {
    return 0;
  }
  str = str.replace(/_/g, '');
  if (str.match(/^0x/)) {
    return parseInt(str.slice(2), 16) || 0;
  }
  if (str.match(/^0o/)) {
    return parseInt(str.slice(2), 8) || 0;
  }
  if (str.match(/^0b/)) {
    return parseInt(str.slice(2), 2) || 0;
  }
  return parseInt(str, 10) || 0;
}

function toInts(line) {
  if (line === null) {
    return null;
  }
  if (line.length === 0) {
    return [];
  }
  return line.trim().split(/\s+/).map(function (s) { return toInt(s); });
}

module.exports = {
  isOverflow: isOverflow,
  toInt: toInt,
  toInts: toInts,
};
