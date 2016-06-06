#!/usr/bin/env node

var cli = require('../lib/cli');

try {
  cli.execute(process.argv.slice(2));
} catch (e) {
  if (e.name !== 'TestFailure') {
    throw e;
  }
  console.error(e.message);
}
