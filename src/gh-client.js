'use strict';

const path = require('path');

const client = require('@octokit/rest')();

const token = require('./load-token')(
  'GitHub.com', path.join(__dirname, '..', 'token-github.txt')
);

client.authenticate({ type: 'token', token });

module.exports = client;
