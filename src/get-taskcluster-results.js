'use strict';

const url = require('url');

const moment = require('moment');

const get = require('./http-get');

const descPattern = /pull_request\.(opened|synchronize)/i;
// At this time, the Taskcluster configuration was modified so that the result
// of the task could influence the pull request review process. The change also
// affects how task statuses should be interpreted.
//
// https://github.com/web-platform-tests/wpt/pull/14096
const momentEnforced = moment('2018-11-16T17:03:00Z');

// Prior to [1], Taskcluster was configured to respond to many irrelevant
// GitHub events. The validation results created in response to those events
// should not be considered for correctness. For a given commit, the "relevant"
// status can be identified by first locating the "pending" status that was
// created when the pull request was opened or when a new commit was added. The
// "target_url" of that status will be shared by some other non-pending status;
// that is the status which describes the result.
//
// [1] https://github.com/web-platform-tests/wpt/pull/13552
function findRelevant(statuses) {
  const initialStatus = statuses
    .filter((status) => /taskcluster/i.test(status.context))
    .find((status) => descPattern.test(status.description));

  if (!initialStatus) {
    return null;
  }

  return statuses
    .filter((status) => status.state !== 'pending')
    .find((status) => status.target_url === initialStatus.target_url);
}

module.exports = async function addTaskcluster(commit) {
  const results = { firefox: null, chrome: null };
  const status = findRelevant(commit.statuses);

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

    if (moment(status.created_at).isAfter(momentEnforced)) {
      if (task.status.state === 'completed') {
        results[match[1]] = 'PASS';
      } else if (task.status.state === 'failed') {
        results[match[1]] = 'FAIL';
      } else {
        results[match[1]] = task.status.state.toUpperCase();
      }
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
