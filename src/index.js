'use strict';

const path = require('path');

const moment = require('moment');
const Replay = require('replay');
const yargs = require('yargs');

const fetchPrsBetween = require('./fetch-prs-between');
const getTravisCIResults = require('./get-travisci-results');
const getTaskclusterResults = require('./get-taskcluster-results');

Replay.mode = 'record';
Replay.fixtures = path.join(__dirname, '..', 'fixtures');

// Omit token value from the recorded requests which are persisted to disk
Replay.headers = Replay.headers
  .filter((pattern) => !pattern.test('authorization: token abcdef'));

function parseDateRange(value) {
  const dates = value.split(':');

  if (dates.length !== 2) {
    throw new Error('"between" argument must be two colon-separated dates');
  }

  return dates.map((dateStr) => {
    const date = moment(dateStr);
    if (!date.isValid()) {
      throw new Error(`invalid date for "between": ${dateStr}`);
    }
    return date;
  });
}

const argv = yargs
  .option('p', {
    alias: 'pull-request',
    describe: 'pull request number',
    type: 'number'
  })
  .option('b', {
    alias: 'between',
    default: function none() { return []; },
    describe: 'colon-separated dates of pull requests to validate ' +
      '(e.g. `2018-10-03:2018-10-05)',
    coerce: (values) => {
      if (!Array.isArray(values)) {
        values = [values];
      }
      return values.map(parseDateRange);
    }
  })
  .option('f', {
    alias: 'format',
    default: 'csv',
    choices: ['csv', 'markdown']
  })
  .strict()
  .argv;

(async () => {
  const prs = [];

  for (const [start, end] of argv.between) {
    prs.push(...await fetchPrsBetween(start, end));
  }

  await Promise.all(prs.map(async (pr) => {
    await Promise.all(pr.commits.map(async (commit) => {
      commit.travisci = await getTravisCIResults(commit);
      commit.taskcluster = await getTaskclusterResults(commit);
    }));
  }));

  const delimiter = argv.format === 'csv' ? ',' : ' | ';
  const heading = [
    'pull request URL',
    'commit',
    'TravisCI: Chrome',
    'Taskcluster: Chrome',
    'TravisCI: Firefox',
    'Taskcluster: Firefox'
  ].join(delimiter);

  console.log(heading);
  if (argv.format === 'markdown') {
    console.log(heading.replace(/[^|]/g, '-'));
  }

  prs.forEach((pr) => {
    pr.commits.forEach((commit) => {
      console.log([
        'http://github.com/web-platform-tests/wpt/pull/' + pr.number,
        commit.sha,
        commit.travisci.chrome,
        commit.taskcluster.chrome,
        commit.travisci.firefox,
        commit.taskcluster.firefox
      ].join(delimiter));
    });
  });
})();
