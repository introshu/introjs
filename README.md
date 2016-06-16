# IntroJS

IntroJS is a JavaScript implementation of the simplified programming language Intro.

## Example

```
def main()
  var n = read_int()
  if n <= 0
    return
  end
  while 1
    var values = read_ints(n)
    if !$values
      break
    end
    write_int(sum(values))
  end
end

def sum(values: Int[]): Int
  var ret = 0
  for v in values
    ret += v
  end
  return ret
end
```

## Features

Data types are only integer type (Int) and its array types (Int[], Int[][], ...).

All codes must be written in a file.

Top level elements are only function declarations.

A program needs a `main` function.

Function parameters need a data type.

Variable declaration needs initialization.

I/O format is plain text which line is integer values separated by white spaces.

To read from stdin, you can use `read*` builtin functions.

To write to stdout, you can use `write*` builtin functions.

To print variables to stderr, you can use `trace` statement.

To branch by conditions, you can use `if-elseif-else` statement.

To get a length of array, you can use `$` operator.

### For-in statements

```
def main()
  var values = [3, 1, 4, 1, 5]
  trace values, $values

  # Ascending index
  for i in 0 :< $values
    write_ints([i, values[i]])
  end

  # Ascending index (Omitted "0 :<")
  for i in $values
    write_ints([i, values[i]])
  end

  # Each element
  for v in values
    write_int(v)
  end

  # Descending index
  for i in $values - 1 :>= 0
    write_ints([i, values[i]])
  end

  # Skip
  for i in 1 :< $values :% 2
    write_ints([i, values[i]])
  end
end
```

## Install

```
npm install -g introjs
```

## Usage

```
Usage: introjs [options] <source_file>
Options:
  -c, --convert:
    print converted AST
  -g, --generate:
    print generated JavaScript
  -h, --help:
    print help
  -p, --parse:
    print parsed AST
  -t, --test:
    execute test
  -v, --version:
    print version
```

## Built-in functions

```
def get_date(): Int[]
```

```
def get_time(): Int
```

```
def read(values: Int[], offset: Int, length: Int): Int
```

```
def read_int(): Int
```

```
def read_ints(max_length: Int): Int[]
```

```
def write(values: Int[], offset: Int, length: Int)
```

```
def write_int(value: Int)
```

```
def write_ints(values: Int[])
```

## Not supported features

* Variable-length array
* Associative array
* Miscellaneous data types
* Multiline comment
* Switch statement
* Do-while statement
* Exception handling
* Module
* Class
* Closure
* Coroutine
* Generics
* Annotation
* Multithread
* Asynchronous
* Source map
* Debugger
* REPL

## License

MIT
