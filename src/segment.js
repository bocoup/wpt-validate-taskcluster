'use strict';

module.exports = function* segment(complete, size) {
  const copy = complete.slice();

  while (copy.length) {
    yield copy.splice(0, size);
  }
};
