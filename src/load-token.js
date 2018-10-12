'use strict';

const fs = require('fs');

module.exports = (name, filename) => {
  try {
    return fs.readFileSync(filename, 'utf-8').trim();
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new Error(
        'This project requires an authentication token for communicating ' +
        'with the ' + name + ' API. It must be saved to disk at the ' +
        'following location: ' + filename
      );
    }

    throw err;
  }
};
