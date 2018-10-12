'use strict';

const moment = require('moment');

const ghClient = require('./gh-client');

const OWNER = 'web-platform-tests';
const REPO = 'wpt';

module.exports = async function fetchPrsBetween(start, end) {
  const options = {
    sort: 'created',
    order: 'desc',
    per_page: 30,
    page: 1,
    q: [
      'type:pr',
      `created:${start.format('YYYY-MM-DD')}..${end.format('YYYY-MM-DD')}`,
      `repo:${OWNER}/${REPO}`
    ].join(' ')
  };
  const queryParts = [];
  const prs = [];

  let response = await ghClient.search.issues(options);

  while (true) {
    for (const pr of response.data.items) {
      const created = moment(pr.created_at);

      if (created.isAfter(end)) {
        continue;
      }
      if (created.isBefore(start)) {
        continue;
      }

      pr.commits = (await ghClient.pullRequests.getCommits({
        owner: OWNER,
        repo: REPO,
        number: pr.number
      })).data;

      for (const commit of pr.commits) {
        commit.statuses = (await ghClient.repos.getStatuses({
          owner: OWNER,
          repo: REPO,
          ref: commit.sha
        })).data;
      }

      prs.push(pr);
    }

    if (!ghClient.hasNextPage(response)) {
      return prs;
    }

    response = await ghClient.getNextPage(response);
  }
};
