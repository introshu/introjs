'use strict';

var Context = require('./context');
var converter = require('./converter');
var escodegen = require('escodegen');
var parser = require('./parser');
var vm = require('vm');

function parse(sourceText, options) {
  try {
    return parser.parse(sourceText, options && options.pegjs || {});
  } catch (e) {
    if (e instanceof parser.SyntaxError) {
      var err = new Error(e.message);
      err.name = 'ParseError';
      err.location = e.location;
      e = err;
    }
    throw e;
  }
}

function generate(targetAst, options) {
  return '(function(){return function($){\n'
    + escodegen.generate(targetAst, options && options.escodegen || {})
    + '\nmain$();};}());\n';
}

function run(targetText, ctx) {
  var targetFunc = vm.runInNewContext(targetText);
  targetFunc(ctx);
}

module.exports = {
  Context: Context,
  convert: converter.convert,
  generate: generate,
  parse: parse,
  run: run,
};
