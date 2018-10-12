'use strict';

const http = require('http');
const https = require('https');
const { parse: parseUrl } = require('url');

module.exports = async function httpGet(url, headers={}) {
  const options = parseUrl(url);
  options.headers = headers;
  const get = options.protocol === 'https:' ? https.get : http.get;

  return new Promise((resolve, reject) => {
    get(options, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400) {
        httpGet(response.headers.location)
          .then(resolve, reject);
        return;
      }

      if (response.statusCode !== 200) {
        reject(new Error('Status code: ' + response.statusCode));
      }

      let body = '';
      response.on('data', (data) => body += data);
      response.on('end', () => resolve(body));
    }).on('error', reject);
  });
};
