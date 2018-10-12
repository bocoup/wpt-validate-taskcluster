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
    .filter((job) => /stability/i.test(job.config.name))
    .forEach((job) => {
      const browser = /firefox/i.test(job.config.name) ? 'firefox' : 'chrome';
      results[browser] = job.state === 'passed' ? 'PASS' : 'FAIL';
    });

  return results;
};
