'use strict';

var assert = require('assert');
var fs = require('fs');
var introjs = require('..');
var path = require('path');

describe('convert', function () {
  var sourceDirPath = './test/convert_errors';
  var sourceFileNames = fs.readdirSync(sourceDirPath);
  sourceFileNames.forEach(function (sourceFileName) {
    it (sourceFileName, function () {
      var sourceFilePath = path.join(sourceDirPath, sourceFileName);
      var sourceText = fs.readFileSync(sourceFilePath, 'UTF-8');
      var sourceAst = introjs.parse(sourceText);
      assert.throws(function () {
        introjs.convert(sourceAst);
      });
    });
  });
});
