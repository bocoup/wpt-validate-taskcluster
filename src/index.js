'use strict';

const path = require('path');

const Progress = require('progress');
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

const progressBars = {};

(async () => {
  if (!argv.silent) {
    progressBars.pullRequests = new Progress(
      'fetching pull requests (step 1/2)... [:bar] :percent :etas',
      {
          total: argv.between.length,
          width: 20,
          incomplete: ' '
      }
    );
  }

  const pullRequests = (await Promise.all(argv.between.map(([start, end]) => {
      return fetchPrsBetween(start, end)
        .then((prs) => {
          if (!argv.silent) {
            progressBars.pullRequests.tick();
          }
          return prs;
        });
    })))
    // Flattern
    .reduce((seenPrs, newPrs) => seenPrs.concat(newPrs), [])
    // De-duplicate (in case of overlapping date ranges)
    .filter((pr, _, allPrs) => {
      return pr === allPrs.find((seenPr) => seenPr.number === pr.number);
    });
  const allCommits = pullRequests.reduce((seenCommits, pr) => {
      pr.commits.forEach((commit) => commit.prNumber = pr.number);
      return seenCommits.concat(pr.commits);
    }, []);

  if (!argv.silent) {
    progressBars.statuses = new Progress(
      'fetching statuses (step 2/2)... [:bar] :percent :etas',
      {
        total: allCommits.length,
        width: 20,
        incomplete: ' '
      }
    );
  }

  await Promise.all(allCommits.map(async (commit) => {
    const [ travisci, taskcluster ] = await Promise.all([
      getTravisCIResults(commit),
      await getTaskclusterResults(commit)
    ]);

    if (!argv.quiet) {
      progressBars.statuses.tick();
    }

    Object.assign(commit, { travisci, taskcluster });
  }));

  const contestedCommits = allCommits.filter((commit) => {
      return commit.travisci.chrome !== commit.taskcluster.chrome ||
        commit.travisci.firefox !== commit.taskcluster.firefox;
    });

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
    console.log('- Total pull requests: ' + pullRequests.length);
    console.log('- Total commits:       ' + allCommits.length);
    console.log('- Contested commits:   ' + contestedCommits.length);
  }
})();
