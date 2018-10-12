'use strict';

const path = require('path');

const Replay = require('replay');
const yargs = require('yargs');

const fetchPrsBetween = require('./fetch-prs-between');
const getTravisCIResults = require('./get-travisci-results');
const getTaskclusterResults = require('./get-taskcluster-results');
const parseDateRange = require('./parse-date-range');

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
  .option('q', {
    alias: 'quiet',
    type: 'boolean',
    describe: 'omit summary'
  })
  .strict()
  .argv;

(async () => {
  const prs = [];

  (await Promise.all(argv.between.map(([start, end]) => {
    return fetchPrsBetween(start, end);
  }))).forEach((morePrs) => {
    // Remove duplicates in case of over overlapping date ranges
    morePrs
      .filter((pr) => !prs.find((seen) => seen.number === pr.number))
      .forEach((pr) => prs.push(pr));
  });

  await Promise.all(prs.map((pr) => {
    return Promise.all(pr.commits.map(async (commit) => {
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

  const allCommits = [];
  const contestedCommits = [];

  prs.forEach((pr) => {
    pr.commits.forEach((commit) => {
      commit.prNumber = pr.number;

      allCommits.push(commit);

      if (commit.travisci.chrome !== commit.taskcluster.chrome ||
        commit.travisci.firefox !== commit.taskcluster.firefox) {
        contestedCommits.push(commit);
      }
    });
  });

  allCommits.forEach((commit) => {
    console.log([
      'http://github.com/web-platform-tests/wpt/pull/' + commit.prNumber,
      commit.sha,
      commit.travisci.chrome,
      commit.taskcluster.chrome,
      commit.travisci.firefox,
      commit.taskcluster.firefox
    ].join(delimiter));
  });

  if (!argv.quiet) {
    console.log();
    console.log('Summary');
    console.log('- Total pull requests: ' + prs.length);
    console.log('- Total commits:       ' + allCommits.length);
    console.log('- Contested commits:   ' + contestedCommits.length);
  }
})();
