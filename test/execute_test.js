'use strict';

var assert = require('assert');
var cli = require('../lib/cli');

describe('execute', function () {
  var sourceFilePaths = [
    './examples/for_in/for_in.intro',
    './examples/sum/sum.intro',
  ];
  sourceFilePaths.forEach(function (sourceFilePath) {
    it (sourceFilePath, function () {
      assert.doesNotThrow(function () {
        cli.execute([
          '-t',
          sourceFilePath,
        ]);
      });
    });
  });
});
