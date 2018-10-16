'use strict';

module.exports = (format, headings, data) => {
  const delimiter = format === 'csv' ? ',' : ' | ';
  const headingsStr = headings.join(delimiter);
  const br = format === 'markdown' ? headingsStr.replace(/[^|]/g, '-') : [];

  return [headingsStr]
    .concat(br)
    .concat(data.map((row) => row.join(delimiter)))
    .join('\n');
};
