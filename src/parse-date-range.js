'use strict';

const moment = require('moment');

module.exports = function parseDateRange(value) {
  const dates = value.split(':');

  if (dates.length !== 2) {
    throw new Error('"between" argument must be two colon-separated dates');
  }

  return dates.map((dateStr) => {
    const date = moment(dateStr);
    if (!date.isValid()) {
      throw new Error(`invalid date for "between": ${dateStr}`);
    }
    return date;
  });
};
