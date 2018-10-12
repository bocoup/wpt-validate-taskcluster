'use strict';

const url = require('url');

const get = require('./http-get');

module.exports = async function addTaskcluster(commit) {
  const status = commit.statuses
    .filter((status) => /Taskcluster/.test(status.context))
    .filter((status) => status.state !== 'pending')
    .reverse()[0];

  const results = { firefox: null, chrome: null };

  if (!status) {
    return results;
  }

  const taskgroupId = (url.parse(status.target_url).hash || '').substr(2);
  const taskgroup = JSON.parse(await get(
    `https://queue.taskcluster.net/v1/task-group/${taskgroupId}/list`
  ));

  for (const task of taskgroup.tasks) {
    const match = /(chrome|firefox).*-stability/.exec(task.task.metadata.name);
    if (!match) {
      continue;
    }
    const artifactUrl =
      `https://queue.taskcluster.net/v1/task/${task.status.taskId}/artifacts`;
    const artifacts = JSON.parse(await get(artifactUrl));

    for (const artifact of artifacts.artifacts) {
      if (!/run-return-code/.test(artifact.name)) {
        continue;
      }
      const result = (await get(artifactUrl + '/' + artifact.name)).trim();
      results[match[1]] = result === '0' ? 'PASS' : 'FAIL';
    }
  }

  return results;
};
