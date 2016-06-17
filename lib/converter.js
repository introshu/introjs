'use strict';

var utils = require('./utils');
var builtins = require('./builtins');

var binaryOperatorNames = {
  '==': 'eq',
  '!=': 'ne',
  '<=': 'le',
  '>=': 'ge',
  '<': 'lt',
  '>': 'gt',
  '<<': 'lsh',
  '>>': 'rsh',
  '>>>': 'zrsh',
  '+': 'add',
  '-': 'sub',
  '*': 'mul',
  '//': 'fdiv',
  '/': 'zdiv',
  '%%': 'mod',
  '%': 'rem',
  '&': 'band',
  '|': 'bor',
  '^': 'bxor',
};

var unaryOperatorNames = {
  '-': 'neg',
  '+': 'pos',
  '~': 'bnot',
  '!': 'not',
  '$': 'len',
};

function convert(sourceAst) {
  var symbolTableStack = [];
  var resultType;
  var loopLevel;
  return convertProgram(sourceAst);

  function convertProgram(program) {
    var symbolTable = {};
    for (var k in builtins) {
      symbolTable[k] = builtins[k];
    }
    for (var i in program.body) {
      var decl = program.body[i];
      var name = decl.id.name;
      if (symbolTable[name]) {
        throw newConvertError('FUNCTION_NAME_CONFLICT', decl.id.loc);
      }
      var paramTypes = [];
      for (var j in decl.params) {
        paramTypes.push(decl.params[j].dataType);
      }
      symbolTable[name] = {
        type: 'Function',
        builtin: false,
        paramTypes: paramTypes,
        resultType: decl.resultType,
      };
    }
    symbolTableStack.push(symbolTable);
    var body = [];
    for (var i in program.body) {
      body.push(convertFunctionDeclaration(program.body[i]));
    }
    return {
      type: program.type,
      loc: program.loc,
      body: body,
    };
  }

  function convertFunctionDeclaration(decl) {
    resultType = decl.resultType;
    loopLevel = 0;
    var symbolTable = {};
    for (var i in decl.params) {
      var param = decl.params[i];
      if (symbolTable[param.name] || findSymbol(param.name)) {
        throw newConvertError('FUNCTION_PARAM_CONFLICT', param.loc);
      }
      symbolTable[param.name] = {
        type: 'Variable',
        dataType: param.dataType,
      };
    }
    var block = convertBlockStatement(decl.body, symbolTable);
    if (resultType) {
      var n = block.body.length;
      if (n === 0 || block.body[n - 1].type !== 'ReturnStatement') {
        throw newConvertError('FUNCTION_RETURN_NOT_FOUND', block.loc);
      }
    }
    return {
      type: decl.type,
      loc: decl.loc,
      id: decl.id,
      params: decl.params,
      body: block,
      resultType: resultType,
    };
  }

  function convertStatement(stmt) {
    switch (stmt.type) {
      case 'BlockStatement':
        return convertBlockStatement(stmt);
      case 'VariableDeclaration':
        return convertVariableDeclaration(stmt);
      case 'ExpressionStatement':
        return convertExpressionStatement(stmt);
      case 'IfStatement':
        return convertIfStatement(stmt);
      case 'LabeledStatement':
        return convertLabeledStatement(stmt);
      case 'ForInStatement':
        return convertForInStatement(stmt);
      case 'WhileStatement':
        return convertWhileStatement(stmt);
      case 'BreakStatement':
        return convertBreakStatement(stmt);
      case 'ContinueStatement':
        return convertContinueStatement(stmt);
      case 'ReturnStatement':
        return convertReturnStatement(stmt);
      default:
        throw newConvertError('STATEMENT_UNKNOWN', stmt.loc);
    }
  }

  function convertBlockStatement(stmt, symbolTable) {
    symbolTableStack.push(symbolTable || {});
    var body = [];
    for (var i in stmt.body) {
      body.push(convertStatement(stmt.body[i]));
    }
    symbolTableStack.pop();
    return {
      type: stmt.type,
      loc: stmt.loc,
      body: body,
    };
  }

  function convertVariableDeclaration(stmt) {
    var declarator = stmt.declarations[0];
    var id = declarator.id;
    var symbol = findSymbol(id.name);
    if (symbol) {
      throw newConvertError('VARIABLE_NAME_CONFLICT', id.loc);
    }
    var init = convertExpression(declarator.init);
    if (!init.dataType) {
      throw newConvertError('VARIABLE_INIT_VOID', init.loc);
    }
    symbolTableStack[symbolTableStack.length - 1][id.name] = {
      type: 'Variable',
      dataType: init.dataType,
    };
    return {
      type: stmt.type,
      loc: stmt.loc,
      declarations: [{
        type: declarator.type,
        loc: declarator.loc,
        id: id,
        init: init,
      }],
      kind: stmt.kind,
    };
  }

  function convertExpressionStatement(stmt) {
    return {
      type: stmt.type,
      loc: stmt.loc,
      expression: convertExpression(stmt.expression),
    };
  }

  function convertIfStatement(stmt) {
    var test = convertExpression(stmt.test);
    if (test.dataType !== 'Int') {
      throw newConvertError('IF_TEST_BAD_TYPE', test.loc);
    }
    var consequent = convertBlockStatement(stmt.consequent);
    var alternate = stmt.alternate ? convertBlockStatement(stmt.alternate) : null;
    return {
      type: stmt.type,
      loc: stmt.loc,
      test: test,
      consequent: consequent,
      alternate: alternate,
    };
  }

  function convertLabeledStatement(stmt) {
    return {
      type: stmt.type,
      loc: stmt.loc,
      label: stmt.label,
      body: convertStatement(stmt.body),
    };
  }

  function convertForInStatement(stmt) {
    var counter = {
      type: 'Identifier',
      loc: stmt.left.loc,
      name: stmt.left.name,
    };
    var iterator = {
      type: 'Identifier',
      name: counter.name + '$',
    };
    var first = convertExpression(stmt.right);
    var iterateCall;
    if (first.dataType === 'Int') {
      var last = stmt.last;
      var step = stmt.step;
      if (last) {
        last = convertExpression(last);
        if (last.dataType !== 'Int') {
          throw newConvertError('FOR_LAST_BAD_TYPE', last.loc);
        }
        if (step) {
          step = convertExpression(step);
          if (step.dataType !== 'Int') {
            throw newConvertError('FOR_STEP_BAD_TYPE', step.loc);
          }
        }
      }
      var args;
      if (stmt.operator === ':<=') {
        args = [first, last, step || intLiteral(1), intLiteral(1)];
      } else if (stmt.operator === ':<') {
        args = [first, last, step || intLiteral(1), intLiteral(0)];
      } else if (stmt.operator === ':>=') {
        args = [first, last, step || intLiteral(-1), intLiteral(1)];
      } else if (stmt.operator === ':>') {
        args = [first, last, step || intLiteral(-1), intLiteral(0)];
      } else {
        args = [intLiteral(0), first, step || intLiteral(1), intLiteral(0)];
      }
      counter.dataType = 'Int';
      iterateCall = contextCall('range', args, {
        start: stmt.right.loc.start,
        end: stmt.body.loc.start,
      });
    } else if (isArrayType(first.dataType)) {
      if (stmt.last) {
        throw newConvertError('FOR_LAST_FOUND', stmt.last.loc);
      }
      iterateCall = contextCall('iter', [first], first.loc);
      counter.dataType = toElementType(first.dataType);
    } else {
      throw newConvertError('FOR_FIRST_VOID', first.loc);
    }
    loopLevel++;
    var symbolTable = {};
    symbolTable[counter.name] = {
      type: 'Variable',
      dataType: counter.dataType,
    }
    var body = convertBlockStatement(stmt.body, symbolTable);
    loopLevel--;
    return {
      type: 'ForStatement',
      loc: stmt.loc,
      init: {
        type: 'VariableDeclaration',
        declarations: [
          {
            type: 'VariableDeclarator',
            id: counter,
            init: null,
          },
          {
            type: 'VariableDeclarator',
            id: iterator,
            init: iterateCall,
          },
        ],
        kind: 'var'
      },
      test: {
        type: 'BinaryExpression',
        operator: '!=',
        left: {
          type: 'AssignmentExpression',
          operator: '=',
          left: counter,
          right: {
            type: 'CallExpression',
            callee: iterator,
            arguments: []
          }
        },
        right: {
          type: 'Literal',
          value: null,
        }
      },
      update: null,
      body: body,
    };
  }

  function convertWhileStatement(stmt) {
    var test = convertExpression(stmt.test);
    if (test.dataType !== 'Int') {
      throw newConvertError('WHILE_TEST_BAD_TYPE', test.loc);
    }
    loopLevel++;
    var body = convertBlockStatement(stmt.body)
    loopLevel--;
    return {
      type: stmt.type,
      loc: stmt.loc,
      test: test,
      body: body,
    };
  }

  function convertBreakStatement(stmt) {
    if (loopLevel <= 0) {
      throw newConvertError('BREAK_NOT_IN_LOOP', stmt.loc);
    }
    return {
      type: stmt.type,
      loc: stmt.loc,
      label: stmt.label,
    };
  }

  function convertContinueStatement(stmt) {
    if (loopLevel <= 0) {
      throw newConvertError('CONTINUE_NOT_IN_LOOP', stmt.loc);
    }
    return {
      type: stmt.type,
      loc: stmt.loc,
      label: stmt.label,
    };
  }

  function convertReturnStatement(stmt) {
    var arg = stmt.argument ? convertExpression(stmt.argument) : null;
    if (resultType) {
      if (!arg) {
        throw newConvertError('RETURN_ARGUMENT_NOT_FOUND', stmt.loc);
      }
      if (arg.dataType !== resultType) {
        throw newConvertError('RETURN_ARGUMENT_DIFFERENT_TYPE', arg.loc);
      }
    } else {
      if (arg) {
        throw newConvertError('RETURN_ARGUMENT_FOUND', arg.loc);
      }
    }
    return {
      type: stmt.type,
      loc: stmt.loc,
      argument: arg,
    };
  }

  function convertExpression(expr) {
    switch (expr.type) {
      case 'ConditionalExpression':
        return convertConditionalExpression(expr);
      case 'LogicalExpression':
        return convertLogicalExpression(expr);
      case 'BinaryExpression':
        return convertBinaryExpression(expr);
      case 'UnaryExpression':
        return convertUnaryExpression(expr);
      case 'CallExpression':
        return convertCallExpression(expr);
      case 'MemberExpression':
        return convertMemberExpression(expr);
      case 'Literal':
        return convertLiteral(expr);
      case 'Identifier':
        return convertIdentifier(expr);
      case 'NewExpression':
        return convertNewExpression(expr);
      case 'ArrayExpression':
        return convertArrayExpression(expr);
      case 'SequenceExpression':
        return convertSequenceExpression(expr);
      case 'AssignmentExpression':
        return convertAssignmentExpression(expr);
      default:
        throw newConvertError('EXPRESSION_UNKNOWN', expr.loc);
    }
  }

  function convertConditionalExpression(expr) {
    var test = convertExpression(expr.test);
    if (test.dataType !== 'Int') {
      throw newConvertError('CONDITIONAL_TEST_BAD_TYPE', test.loc);
    }
    var consequent = convertExpression(expr.consequent);
    if (!consequent.dataType) {
      throw newConvertError('CONDITIONAL_CONSEQUENT_VOID', consequent.loc);
    }
    var alternate = convertExpression(expr.alternate);
    if (alternate.dataType !== consequent.dataType) {
      throw newConvertError('CONDITIONAL_ALTERNATE_DIFFERENT_TYPE', alternate.loc);
    }
    return {
      type: expr.type,
      loc: expr.loc,
      test: test,
      consequent: consequent,
      alternate: alternate,
      dataType: consequent.dataType,
    };
  }

  function convertLogicalExpression(expr) {
    var left = convertExpression(expr.left);
    if (left.dataType !== 'Int') {
      throw newConvertError('LOGICAL_LEFT_BAD_TYPE', left.loc);
    }
    var right = convertExpression(expr.right);
    if (right.dataType !== left.dataType) {
      throw newConvertError('LOGICAL_RIGHT_DIFFERENT_TYPE', right.loc);
    }
    return {
      type: expr.type,
      loc: expr.loc,
      operator: expr.operator,
      left: left,
      right: right,
      dataType: left.dataType,
    };
  }

  function convertBinaryExpression(expr) {
    var left = convertExpression(expr.left);
    if (left.dataType !== 'Int') {
      throw newConvertError('BINARY_LEFT_BAD_TYPE', left.loc);
    }
    var right = convertExpression(expr.right);
    if (right.dataType !== left.dataType) {
      throw newConvertError('BINARY_RIGHT_DIFFERENT_TYPE', right.loc);
    }
    var call = contextCall(binaryOperatorNames[expr.operator], [left, right], expr.loc);
    call.loc = expr.loc;
    call.dataType = left.dataType;
    return call;
  }

  function convertUnaryExpression(expr) {
    var arg = convertExpression(expr.argument);
    if (expr.operator === '$') {
      if (!isArrayType(arg.dataType)) {
        throw newConvertError('UNARY_ARGUMENT_NOT_ARRAY', arg.loc);
      }
    } else {
      if (arg.dataType !== 'Int') {
        throw newConvertError('UNARY_ARGUMENT_BAD_TYPE', arg.loc);
      }
    }
    var call = contextCall(unaryOperatorNames[expr.operator], [arg], expr.loc);
    call.loc = expr.loc;
    call.dataType = 'Int';
    return call;
  }

  function convertCallExpression(expr) {
    var callee = expr.callee;
    var symbol = findSymbol(callee.name);
    if (!symbol || symbol.type !== 'Function') {
      throw newConvertError('CALL_NAME_NOT_FOUND', callee.loc);
    }
    if (expr.arguments.length !== symbol.paramTypes.length) {
      throw newConvertError('CALL_ARGUMENTS_DIFFERENT_COUNT', callee.loc);
    }
    var args = [];
    for (var i in expr.arguments) {
      var arg = convertExpression(expr.arguments[i]);
      if (arg.dataType !== symbol.paramTypes[i]) {
        throw newConvertError('CALL_ARGUMENT_DIFFERENT_TYPE', arg.loc);
      }
      args.push(arg);
    }
    if (symbol.builtin) {
      var call = contextCall(callee.name, args, expr.loc);
      call.dataType = symbol.resultType;
      return call;
    }
    return {
      type: expr.type,
      loc: expr.loc,
      callee: expr.callee,
      arguments: args,
      dataType: symbol.resultType,
    };
  }

  function convertMemberExpression(expr) {
    var object = convertExpression(expr.object);
    if (!isArrayType(object.dataType)) {
      throw newConvertError('INDEXED_MEMBER_OBJECT_NOT_ARRAY', object.loc);
    }
    var property = convertExpression(expr.property);
    if (property.dataType !== 'Int') {
      throw newConvertError('INDEXED_MEMBER_INDEX_BAD_TYPE', property.loc);
    }
    var call = contextCall('getAt', [object, property], expr.loc);
    call.dataType = toElementType(object.dataType);
    return call;
  }

  function convertLiteral(expr) {
    var value = utils.toInt(expr.value);
    if (utils.isOverflow(value)) {
      throw newConvertError('LITERAL_OVERFLOW', expr.loc);
    }
    return {
      type: expr.type,
      loc: expr.loc,
      value: value,
      dataType: 'Int',
    };
  }

  function convertIdentifier(expr) {
    var symbol = findSymbol(expr.name);
    if (!symbol || symbol.type !== 'Variable') {
      throw newConvertError('IDENTIFIER_NOT_FOUND', expr.loc);
    }
    return {
      type: expr.type,
      loc: expr.loc,
      name: expr.name,
      dataType: symbol.dataType,
    };
  }

  function convertNewExpression(expr) {
    var args = [];
    var dataType = expr.callee;
    for (var i in expr.arguments) {
      var arg = convertExpression(expr.arguments[i]);
      if (arg.dataType !== 'Int') {
        throw newConvertError('NEW_INDEX_BAD_TYPE', arg.loc);
      }
      args.push(arg);
      dataType = toArrayType(dataType);
    }
    var call = contextCall('zeros', args, expr.loc);
    call.dataType = dataType;
    return call;
  }

  function convertArrayExpression(expr) {
    var elems = [];
    if (expr.elements.length === 0) {
      return {
        type: expr.type,
        loc: expr.loc,
        elements: elems,
        dataType: 'Int[]',
      };
    }

    var elem = convertExpression(expr.elements[0]);
    var dataType = elem.dataType
    if (!dataType) {
      throw newConvertError('ARRAY_ELEMENT_VOID', elem.loc);
    }
    elems.push(elem);
    for (var i = 1; i < expr.elements.length; i++) {
      var elem = convertExpression(expr.elements[i]);
      if (elem.dataType !== dataType) {
        throw newConvertError('ARRAY_ELEMENT_DIFFERENT_TYPE', elem.loc);
      }
      elems.push(elem);
    }
    return {
      type: expr.type,
      loc: expr.loc,
      elements: elems,
      dataType: toArrayType(dataType),
    };
  }

  function convertSequenceExpression(expr) {
    var exprs = [
      {
        type: 'Literal',
        value: expr.loc.start.line,
      },
      {
        type: 'Literal',
        value: expr.text,
      },
    ];
    for (var i in expr.expressions) {
      exprs.push(convertExpression(expr.expressions[i]));
    }
    return contextCall('trace', exprs, expr.loc);
  }

  function convertAssignmentExpression(expr) {
    var left = convertExpression(expr.left);
    var right = convertExpression(expr.right);
    var operator = expr.operator;
    var operatorName = binaryOperatorNames[operator.slice(0, -1)];
    if (expr.indices.length === 0) {
      if (right.dataType !== left.dataType) {
        throw newConvertError('ASSIGNMENT_RIGHT_BAD_TYPE', right.loc);
      }
      if (operatorName) {
        right = contextCall(operatorName, [left, right], expr.loc);
        operator = '=';
      }
      return {
        type: expr.type,
        loc: expr.loc,
        operator: operator,
        left: left,
        right: right,
      };
    }

    if (operatorName) {
      if (right.dataType !== 'Int') {
        throw newConvertError('INDEXED_ASSIGNMENT_RIGHT_BAD_TYPE', right.loc);
      }
      operatorName += 'At';
    } else {
      operatorName = 'setAt';
    }
    var index;
    var i = 0;
    while (true) {
      index = convertExpression(expr.indices[i]);
      if (index.dataType !== 'Int') {
        throw newConvertError('INDEXED_ASSIGNMENT_INDEX_BAD_TYPE', index.loc);
      }
      var dataType = left.dataType;
      if (!isArrayType(dataType)) {
        throw newConvertError('INDEXED_ASSIGNMENT_LEFT_NOT_ARRAY', left.loc);
      }
      if (i === expr.indices.length - 1) {
        break;
      }
      left = contextCall('getAt', [left, index], {
        start: left.loc.start,
        end: index.loc.end,
      });
      left.dataType = toElementType(dataType);
      i++;
    }
    if (right.dataType !== toElementType(left.dataType)) {
      throw newConvertError('INDEXED_ASSIGNMENT_RIGHT_DIFFERENT_TYPE', right.loc);
    }
    return contextCall(operatorName, [left, index, right], expr.loc);
  }

  function isArrayType(dataType) {
    return dataType.endsWith('[]');
  }

  function toElementType(dataType) {
    return dataType.slice(0, -2);
  }

  function toArrayType(dataType) {
    return dataType + '[]';
  }

  function findSymbol(name) {
    for (var i = symbolTableStack.length - 1; i >= 0; i--) {
      var symbol = symbolTableStack[i][name];
      if (symbol) {
        return symbol;
      }
    }
    return null;
  }

  function contextCall(name, args, loc) {
    return {
      type: 'CallExpression',
      loc: loc,
      callee: {
        type: 'MemberExpression',
        computed: false,
        object: {
          type: 'Identifier',
          name: '$'
        },
        property: {
          type: 'Identifier',
          name: name,
        },
      },
      arguments: args
    };
  }

  function intLiteral(value) {
    if (value < 0) {
      return {
        type: 'UnaryExpression',
        operator: '-',
        prefix: true,
        argument: intLiteral(-value),
      };
    }
    return {
      type: 'Literal',
      value: value,
      dataType: 'Int',
    };
  }

  function newConvertError(message, location) {
    var err = new Error(message);
    err.name = 'ConvertError';
    err.location = location;
    return err;
  }
}

module.exports = {
  convert: convert,
};
