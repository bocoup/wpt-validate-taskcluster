'use strict';

const url = require('url');

const travisciClient = require('./travisci-client');

module.exports = async function getTravisCIResults(commit) {
  const status = commit.statuses
    .filter((status) => /travis/i.test(status.context))
    .filter((status) => status.state !== 'pending')
    .reverse()[0];

  const results = { firefox: null, chrome: null };

  if (!status) {
    return results;
  }

  const buildId = url.parse(status.target_url).pathname.split('/').pop();

  (await travisciClient.getBuild(buildId))
    .jobs
    .map((job) => {
      const state = job.state;
      let id;

      // The designator for TravisCI jobs was updated on 2018-10-02:
      // https://github.com/web-platform-tests/wpt/pull/13300
      if (/stability/i.test(job.config.name)) {
        id = job.config.name;
      } else if (/stability/i.test(job.config.env)) {
        id = job.config.env;
      } else {
        return null;
      }

      job.browser = id.match(/firefox|chrome/i)[0].toLowerCase();

      return job;
    })
    .filter((job) => !!job)
    .forEach((job) => {
      results[job.browser] = job.state === 'passed' ? 'PASS' : 'FAIL';
    });

  return results;
};
