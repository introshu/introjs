'use strict';

var assert = require('assert');
var fs = require('fs');
var introjs = require('..');
var minimist = require('minimist');
var path = require('path');
var tty = require('tty');
var utils = require('./utils');

function execute(args) {
  var argv = minimist(args, {
    boolean: [
      'convert',
      'generate',
      'help',
      'parse',
      'test',
      'version',
    ],
    alias: {
      c: 'convert',
      g: 'generate',
      h: 'help',
      p: 'parse',
      t: 'test',
      v: 'version',
    },
  });
  if (argv.version) {
    console.log(require('../package').version);
    return;
  }
  if (argv._.length === 0 || argv.help) {
    console.log('Usage: introjs [options] <source_file>\n'
      + 'Options:\n'
      + '  -c, --convert:\n'
      + '    print converted AST\n'
      + '  -g, --generate:\n'
      + '    print generated JavaScript\n'
      + '  -h, --help:\n'
      + '    print help\n'
      + '  -p, --parse:\n'
      + '    print parsed AST\n'
      + '  -t, --test:\n'
      + '    execute test\n'
      + '  -v, --version:\n'
      + '    print version\n'
    );
    return;
  }
  var sourceFilePath = argv._[0];
  var sourceText = fs.readFileSync(sourceFilePath, 'UTF-8');
  try {
    var sourceAst = introjs.parse(sourceText);
    if (argv.parse) {
      console.log(JSON.stringify(sourceAst, null, '  '));
      return;
    }
    var targetAst = introjs.convert(sourceAst);
    if (argv.convert) {
      console.log(JSON.stringify(targetAst, null, '  '));
      return;
    }
    var targetText = introjs.generate(targetAst);
    if (argv.generate) {
      console.log(targetText);
      return;
    }
    if (argv.test) {
      test(sourceFilePath, targetText);
      return;
    }
    var inputReader = newFileReader(process.stdin.fd);
    var outputWriter = newFileWriter(process.stdout.fd);
    var errorWriter = newFileWriter(process.stderr.fd, sourceFilePath + ':');
    var ctx = new introjs.Context(inputReader, outputWriter, errorWriter);
    introjs.run(targetText, ctx);
  } catch (e) {
    if (e.location) {
      var lineNumber = e.location.start.line;
      var column = e.location.start.column;
      e.message += '\n'
        + sourceFilePath + ':' + lineNumber + ':' + column + '\n'
        + sourceText.split('\n')[lineNumber - 1] + '\n'
        + ' '.repeat(column - 1) + '^';
    }
    throw e;
  }
}

function test(sourceFilePath, targetText) {
  var testDirPath = path.dirname(sourceFilePath);
  var caseDirNames = fs.readdirSync(testDirPath);
  for (var i in caseDirNames) {
    var caseDirName = caseDirNames[i];
    if (!caseDirName.match(/^case/)) {
      continue;
    }
    var caseDirPath = path.join(testDirPath, caseDirName);
    if (!fs.statSync(caseDirPath).isDirectory()) {
      continue;
    }
    var inputFilePath = findFilePath(caseDirPath, /^input/);
    if (!inputFilePath) {
      throw new Error('INPUT_NOT_FOUND: ' + caseDirName);
    }
    var outputFilePath = findFilePath(caseDirPath, /^output/);
    if (!outputFilePath) {
      throw new Error('OUTPUT_NOT_FOUND: ' + caseDirName);
    }
    var inputReader = newFileReader(fs.openSync(inputFilePath, 'r'));
    var outputWriter = newAssertWriter(caseDirName, outputFilePath);
    var errorWriter = newFileWriter(process.stderr.fd, sourceFilePath + ':');
    var ctx = new introjs.Context(inputReader, outputWriter, errorWriter);
    introjs.run(targetText, ctx);
    outputWriter.writeLine(null);
    console.log('TestSuccess: ' + caseDirName);
  }
}

function findFilePath(dirPath, pattern) {
  var fileNames = fs.readdirSync(dirPath);
  for (var i in fileNames) {
    var fileName = fileNames[i];
    if (!fileName.match(pattern)) {
      continue;
    }
    var filePath = path.join(dirPath, fileName);
    if (fs.statSync(filePath).isFile()) {
      return filePath;
    }
  }
  return null;
}

function newAssertWriter(caseDirName, outputFilePath) {
  var outputReader = newFileReader(fs.openSync(outputFilePath, 'r'));
  var lineNumber = 0;

  function writeLine(line) {
    lineNumber++;
    var actual = JSON.stringify(utils.toInts(line));
    var expected = JSON.stringify(utils.toInts(outputReader.readLine()));
    if (actual !== expected) {
      throw new TestFailure(caseDirName, outputFilePath, lineNumber, expected, actual);
    }
  }

  return {
    writeLine: writeLine,
  }
}

function TestFailure(caseDirName, filePath, lineNumber, expected, actual) {
  this.name = 'TestFailure';
  this.caseDirName = caseDirName;
  this.filePath = filePath;
  this.lineNumber = lineNumber;
  this.expected = expected;
  this.acutal = actual;
  this.message = caseDirName + '\n'
    + filePath + ':' + lineNumber + '\n'
    + 'expected: ' + expected + '\n'
    + 'actual  : ' + actual + '\n';
}

function newFileReader(fd) {
  var buf = new Buffer(512);
  var pos = 0;
  var len = 0;
  var piped = !fd && !tty.isatty(fd);

  function readByte() {
    if (pos === len) {
      if (piped && !fs.fstatSync(fd).size) {
        return -1;
      }
      len = fs.readSync(fd, buf, 0, buf.length);
      if (len === 0) {
        return -1;
      }
      pos = 0;
    }
    return buf[pos++];
  }

  function readLine() {
    var bytes = [];
    while (true) {
      var b = readByte();
      if (b === -1) {
        if (bytes.length === 0) {
          return null;
        }
        return new Buffer(bytes).toString();
      }
      if (b === 0x0A) {
        return new Buffer(bytes).toString();
      }
      if (b !== 0x0D) {
        bytes.push(b);
      }
    }
  }

  return {
    readLine: readLine,
  };
}

function newFileWriter(fd, prefix) {
  prefix = prefix || '';

  function writeLine(line) {
    fs.writeSync(fd, prefix + line + '\n');
  }

  return {
    writeLine: writeLine,
  };
}

module.exports = {
  execute: execute,
  TestFailure: TestFailure,
};
