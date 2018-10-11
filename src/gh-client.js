'use strict';

const path = require('path');

const client = require('@octokit/rest')();

const token = require('./load-gh-token')(
  path.join(__dirname, '..', '..', 'github-token.txt')
);

client.authenticate({ type: 'token', token });

module.exports = client;
