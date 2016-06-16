'use strict';

var assert = require('assert');
var cli = require('../lib/cli');

describe('execute', function () {
  var sourceFilePaths = [
    './examples/for_in/for_in.intro',
    './examples/sum/sum.intro',
    './test/arrays/arrays.intro',
    './test/assignments/assignments.intro',
    './test/builtins/builtins.intro',
    './test/expressions/expressions.intro',
    './test/literals/literals.intro',
    './test/loops/loops.intro',
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
