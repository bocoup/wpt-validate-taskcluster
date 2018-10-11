'use strict';

const path = require('path');

const Replay = require('replay');
const yargs = require('yargs');

Replay.mode = 'record';
Replay.fixtures = path.join(__dirname, '..', 'fixtures');

// Omit token value from the recorded requests which are persisted to disk
Replay.headers = Replay.headers
  .filter((pattern) => !pattern.test('authorization: token abcdef'));

const argv = yargs
  .option('p', {
    alias: 'pull-request',
    describe: 'pull request number',
    type: 'number'
  })
  .strict()
  .argv;

console.log(argv);
