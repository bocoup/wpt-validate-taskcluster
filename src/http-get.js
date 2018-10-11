'use strict';

const http = require('http');
const https = require('https');
const { parse: parseUrl } = require('url');

module.exports = async function get(url) {
  const options = parseUrl(url);
  const get = options.protocol === 'https:' ? https.get : http.get;
  return new Promise((resolve, reject) => {
    get(options, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error('Status code: ' + response.statusCode));
      }

      let body = '';
      response.on('data', (data) => body += data);
      response.on('end', () => resolve(body));
    }).on('error', reject);
  });
};
