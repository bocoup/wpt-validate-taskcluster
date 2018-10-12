'use strict';

const path = require('path');

const get = require('./http-get');

const headers = {
  'Travis-API-Version': 3,
  authorization: 'token ' + require('./load-token')(
    'TravsCI.com', path.join(__dirname, '..', 'token-travisci.txt')
  )
};

exports.getBuild = async (buildId) => {
  return JSON.parse(await get(
    `https://api.travis-ci.org/build/${buildId}?include=job.config,job.state`, headers
  ));
};
