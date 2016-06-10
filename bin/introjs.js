#!/usr/bin/env node

var cli = require('../lib/cli');

try {
  cli.execute(process.argv.slice(2));
} catch (e) {
  if (!e.location && e.name !== 'TestFailure') {
    throw e;
  }
  console.error(e.name + ': ' + e.message);
  process.exitCode = 1;
}
