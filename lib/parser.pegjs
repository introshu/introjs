{
  function buildList(first, rest, index) {
    var result = [first];
    for (var i in rest) {
      result.push(rest[i][index]);
    }
    return result;
  }

  function buildLeftTree(type, first, rest, operatorIndex, rightIndex) {
    var left = first;
    for (var i in rest) {
      var right = rest[i][rightIndex];
      left = {
        type: type,
        loc: {
          start: left.loc.start,
          end: right.loc.end,
        },
        operator: rest[i][operatorIndex],
        left: left,
        right: right,
      };
    }
    return left;
  }
}

Program
  = statements:((_ FunctionDeclaration)? _ Eol)*
    {
      var body = [];
      for (var i in statements) {
        var statement = statements[i][0];
        if (statement) {
          body.push(statement[1]);
        }
      }
      return {
        type: 'Program',
        loc: location(),
        body: body,
      };
    }

FunctionDeclaration
  = DefToken _ id:Identifier _ params:FormalParameters resultType:(_ ':' _ DataType)? _ body:Block _ EndToken
    {
      return {
        type: 'FunctionDeclaration',
        loc: location(),
        id: id,
        params: params,
        body: body,
        resultType: resultType ? resultType[3] : null,
      };
    }

FormalParameters
  = '(' list:(_Eol_ FormalParameterList)? _Eol_ ')'
    {
      return list ? list[1] : [];
    }

FormalParameterList
  = first:FormalParameter rest:(_Eol_ ',' _Eol_ FormalParameter)*
    {
      return buildList(first, rest, 3);
    }

FormalParameter
  = id:Identifier _ ':' _ dataType:DataType
    {
      id.dataType = dataType;
      return id;
    }

Block
  = Eol body:(_ StatementList)?
    {
      return {
        type: 'BlockStatement',
        loc: location(),
        body: body ? body[1] : [],
      };
    }

StatementList
  = first:Statement? _ Eol rest:((_ Statement)? _ Eol)*
    {
      var list = first ? [first] : [];
      for (var i in rest) {
        var statement = rest[i][0];
        if (statement) {
          list.push(statement[1]);
        }
      }
      return list;
    }

Statement
  = VariableDeclaration
  / Assignment
  / ExpressionStatement
  / IfStatement
  / ForInStatement
  / WhileStatement
  / BreakStatement
  / ContinueStatement
  / ReturnStatement
  / TraceStatement

VariableDeclaration
  = VarToken _ declaration:VariableDeclarator
    {
      return {
        type: 'VariableDeclaration',
        loc: location(),
        declarations: [declaration],
        kind: 'var',
      };
    }

VariableDeclarator
  = id:Identifier _ '=' _ init:Expression
    {
      return {
        type: 'VariableDeclarator',
        loc: location(),
        id: id,
        init: init,
      };
    }

DataType
  = base:BaseDataType postfix:(_ '[' _ ']')?
    {
      return postfix ? base + '[]' : base;
    }

BaseDataType
  = IntToken

Assignment
  = left:Identifier index:(_ '[' _ Expression _ ']')? _ operator:AssignmentOperator _ right:Expression
    {
      var loc = location();
      return {
        type: 'ExpressionStatement',
        loc: loc,
        expression: {
          type: 'AssignmentExpression',
          loc: loc,
          operator: operator,
          left: left,
          right: right,
          index: index ? index[3] : null,
        }
      };
    }

AssignmentOperator
  = '='
  / '+='
  / '-='
  / '*='
  / '/='
  / '%='

IfStatement
  = IfToken _ test:Expression _ consequent:Block rest:(_ IfStatementElseIf)* last:(_ ElseToken _ Block)? _ EndToken
    {
      var loc = location();
      var alternate = last ? last[3] : null;
      if (rest) {
        for (var i = rest.length - 1; i >= 0; i--) {
          var elseif = rest[i][1];
          elseif.loc.end = loc.end;
          elseif.body[0].alternate = alternate;
          alternate = elseif;
        }
      }
      return {
        type: 'IfStatement',
        loc: loc,
        test: test,
        consequent: consequent,
        alternate: alternate,
      };
    }

IfStatementElseIf
  = ElseIfToken _ test:Expression _ consequent:Block
    {
      var loc = location();
      return {
        type: 'BlockStatement',
        loc: loc,
        body: [{
          type: 'IfStatement',
          loc: loc,
          test: test,
          consequent: consequent,
          alternate: null,
        }],
      };
    }

ForInStatement
  = ForToken _ left:Identifier _ InToken _ right:Expression range:(_ RangeOperator _ Expression (_ ':%' _ Expression)?)? _ body:Block _ EndToken
    {
      var loc = location();
      var operator = range ? range[1] : null;
      var last = range ? range[3] : null;
      var step = range && range[4] ? range[4][3] : null;
      return {
        type: 'BlockStatement',
        loc: loc,
        body: [
          {
            type: 'VariableDeclaration',
            loc: left.loc,
            declarations: [{
              type: 'VariableDeclarator',
              loc: left.loc,
              id: left,
              init: {
                type: 'Literal',
                loc: left.loc,
                value: '0',
              },
              dataType: 'Int',
            }],
            kind: 'var',
          },
          {
            type: 'ForInStatement',
            loc: loc,
            left: left,
            right: right,
            body: body,
            operator: operator,
            last: last,
            step: step,
          },
        ],
      };
    }

RangeOperator
  = ':<='
  / ':<'
  / ':>='
  / ':>'

WhileStatement
  = WhileToken _ test:Expression _ body:Block _ EndToken
    {
      return {
        type: 'WhileStatement',
        loc: location(),
        test: test,
        body: body,
      };
    }

BreakStatement
  = BreakToken
    {
      return {
        type: 'BreakStatement',
        loc: location(),
        label: null,
      };
    }

ContinueStatement
  = ContinueToken
    {
      return {
        type: 'ContinueStatement',
        loc: location(),
        label: null,
      };
    }

ReturnStatement
  = ReturnToken argument:(_ Expression)?
    {
      return {
        type: 'ReturnStatement',
        loc: location(),
        argument: argument ? argument[1] : null,
      };
    }

TraceStatement
  = TraceToken _ expression:TraceStatementArguments
    {
      return {
        type: 'ExpressionStatement',
        loc: location(),
        expression: expression,
      };
    }

TraceStatementArguments
  = first:Expression rest:(_ ',' _ Expression)*
    {
      return {
        type: 'SequenceExpression',
        loc: location(),
        expressions: buildList(first, rest, 3),
        text: text(),
      }
    }

ExpressionStatement
  = expression:Expression
    {
      return {
        type: 'ExpressionStatement',
        loc: location(),
        expression: expression,
      };
    }

Expression
  = ConditionalExpression

ConditionalExpression
  = test:LogicalOrExpression rest:(_ '?' _ LogicalOrExpression _ ':' _ LogicalOrExpression)?
    {
      if (!rest) {
        return test;
      }
      return {
        type: 'ConditionalExpression',
        loc: location(),
        test: test,
        consequent: rest[3],
        alternate: rest[7],
      };
    }

LogicalOrExpression
  = first:LogicalAndExpression rest:(_ '||' _ LogicalAndExpression)*
    {
      return buildLeftTree('LogicalExpression', first, rest, 1, 3);
    }

LogicalAndExpression
  = first:RelationalExpression rest:(_ '&&' _ RelationalExpression)*
    {
      return buildLeftTree('LogicalExpression', first, rest, 1, 3);
    }

RelationalExpression
  = left:ShiftExpression right:(_ RelationalOperator _ ShiftExpression)?
    {
      if (!right) {
        return left;
      }
      return {
        type: 'BinaryExpression',
        loc: location(),
        operator: right[1],
        left: left,
        right: right[3],
      };
    }

RelationalOperator
  = '=='
  / '!='
  / '<='
  / '>='
  / '<'
  / '>'

ShiftExpression
  = first:AdditiveExpression rest:(_ ShiftOperator _ AdditiveExpression)*
    {
      return buildLeftTree('BinaryExpression', first, rest, 1, 3);
    }

ShiftOperator
  = '>>'

AdditiveExpression
  = first:MultiplicativeExpression rest:(_ AdditiveOperator _ MultiplicativeExpression)*
    {
      return buildLeftTree('BinaryExpression', first, rest, 1, 3);
    }

AdditiveOperator
  = '+'
  / '-'

MultiplicativeExpression
  = first:UnaryExpression rest:(_ MultiplicativeOperator _ UnaryExpression)*
    {
      return buildLeftTree('BinaryExpression', first, rest, 1, 3);
    }

MultiplicativeOperator
  = '*'
  / '/'
  / '%'

UnaryExpression
  = operator:(UnaryOperator _)? argument:CallExpression
    {
      if (!operator) {
        return argument;
      }
      return {
        type: 'UnaryExpression',
        loc: location(),
        operator: operator[0],
        prefix: true,
        argument: argument,
      };
    }

UnaryOperator
  = '-'
  / '!'
  / '$'

CallExpression
  = callee:MemberExpression args:(_ Arguments)?
    {
      if (!args) {
        return callee;
      }
      return {
        type: 'CallExpression',
        loc: location(),
        callee: callee,
        arguments: args[1],
      };
    }

Arguments
  = '(' list:(_Eol_ ArgumentList)? _Eol_ ')'
    {
      return list ? list[1] : [];
    }

ArgumentList
  = first:Expression rest:(_Eol_ ',' _Eol_ Expression)*
    {
      return buildList(first, rest, 3);
    }

MemberExpression
  = object:Primary property:(_ '[' _ Expression _ ']')?
    {
      if (!property) {
        return object;
      }
      return {
        type: 'MemberExpression',
        loc: location(),
        object: object,
        property: property[3],
        computed: true,
      };
    }

Primary
  = Literal
  / Identifier
  / ArrayExpression
  / '(' _ expr:Expression _ ')'
    {
      return expr;
    }

ArrayExpression
  = '[' elements:(_Eol_ ArrayElementList)? _Eol_ ']'
    {
      return {
        type: 'ArrayExpression',
        loc: location(),
        elements: elements ? elements[1] : [],
      };
    }

ArrayElementList
  = first:Expression rest:(_Eol_ ',' _Eol_ Expression)* (_Eol_ ',')?
    {
      return buildList(first, rest, 3);
    }

Identifier
  = !ReservedWord IdentifierName
    {
      return {
        type: 'Identifier',
        loc: location(),
        name: text() + '$',
      };
    }

IdentifierName
  = IdentifierStart IdentifierPart*

IdentifierStart
  = [A-Z_a-z]

IdentifierPart
  = IdentifierStart
  / [0-9]

ReservedWord
  = BreakToken
  / ContinueToken
  / DefToken
  / ElseIfToken
  / ElseToken
  / EndToken
  / ForToken
  / IfToken
  / InToken
  / IntToken
  / ReturnToken
  / TraceToken
  / VarToken
  / WhileToken

BreakToken = 'break' !IdentifierPart
ContinueToken = 'continue' !IdentifierPart
DefToken = 'def' !IdentifierPart
ElseIfToken = 'elseif' !IdentifierPart
ElseToken = 'else' !IdentifierPart
EndToken = 'end' !IdentifierPart
ForToken = 'for' !IdentifierPart
IfToken = 'if' !IdentifierPart
InToken = 'in' !IdentifierPart
IntToken = 'Int' !IdentifierPart { return text(); }
ReturnToken = 'return' !IdentifierPart
TraceToken = 'trace' !IdentifierPart
VarToken = 'var' !IdentifierPart
WhileToken = 'while' !IdentifierPart

Literal
  = IntegerLiteral
    {
      return {
        type: 'Literal',
        loc: location(),
        value: text(),
      };
    }

IntegerLiteral
  = '0'
  / [1-9][0-9]*

_Eol_
  = _ (Eol _)*
_
  = WhiteSpace*

WhiteSpace
  = ' '
  / '\t'

Eol
  = Comment? '\r'? '\n'

Comment
  = '#' [^\n]*
