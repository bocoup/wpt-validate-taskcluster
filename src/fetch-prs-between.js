'use strict';

const moment = require('moment');

const ghClient = require('./gh-client');

module.exports = async function fetchPrsBetween(startDate, endDate, repo) {
  const options = {
    sort: 'created',
    order: 'desc',
    per_page: 30,
    page: 1,
    q: [
      'type:pr',
      `created:${startDate}..${endDate}`,
      'repo:' + repo
    ].join(' ')
  };
  const start = moment(startDate);
  const end = moment(endDate);
  const queryParts = [];
  const tickets = [];

  let response = await ghClient.search.issues(options);

  while (true) {
    for (const ticket of response.data.items) {
      const created = moment(ticket.created_at);

      if (created.isAfter(end)) {
        continue;
      }
      if (created.isBefore(start)) {
        continue;
      }

      tickets.push(ticket);
    }

    if (!ghClient.hasNextPage(response)) {
      return tickets;
    }

    response = await ghClient.getNextPage(response);
  }
};
