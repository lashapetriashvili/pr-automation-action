import { inspect } from 'util';
import * as core from '@actions/core';
import * as github from '@actions/github';
import { Inputs, Strategy, ReviewerBySate, Reviewer } from '../config/typings';
import { info, debug, warning, error } from '../logger';
import {
  getReviewsByGraphQL,
  getReviewersLastReviews,
  filterReviewersByState,
} from '../github';

/*
run after:
 - every approve
 - after label add/remove
 - after CI checks status change
LOGIC:
- identify by config and changed files correct groups that have to approve with what amount of approvals.
- identify if current approved users satisfy to the rules for required approvals
- if any change requested, return
- if any change was requested and this person didn't approve after, return
- if tests are failed, return
- if PR to master, change issue status in Jira
  - change status only if Jira issue, at this moment, belong to correct status — Code Review
  - return
- if any PR restrictions to merge, return. Like do-not-merge label or tests are failed
- merge PR
- change issue status in Jira
 */

/*
TASK B0 (not blocking anything)
  GitHub action to run after:
    - every approve
    - after label add/remove
    - after CI checks status change
TASK C0-C1 Jira move to next status/Github merge
  - if PR to master, change issue status in Jira
  - change status only if Jira issue, at this moment,
      belong to correct status — Code Review
  - GitHub merge PR
    - change issue status in Jira
TASK D0 identify approver groups
  - identifyApprovers function
TASK A0 (blocking next tasks) GitHub PR data retrieval
  - getLatestCommitDate function
  - getReviews function
TASK A1 (blocked by 0A) identify current state
  - identifyCurrentState function
TASK A2 (blocked by A0) if PR is fully approved
  - is-pr-fully-approved file
*/

export async function run(): Promise<void> {
  try {
    info('Staring PR auto merging.');

    let doNotMerge = false;

    const [owner, repo] = core.getInput('repository').split('/');

    const configInput: Inputs = {
      comment: core.getInput('comment'),
      owner,
      repo,
      pullRequestNumber: Number(core.getInput('pullRequestNumber', { required: true })),
      sha: core.getInput('sha', { required: true }),
      strategy: core.getInput('strategy', { required: true }) as Strategy,
      token: core.getInput('token', { required: true }),
    };

    debug(`Inputs: ${inspect(configInput)}`);

    const client = github.getOctokit(configInput.token);

    const { data: pullRequest } = await client.pulls.get({
      owner,
      repo,
      pull_number: configInput.pullRequestNumber,
    });

    info('Checking requested reviewers.');

    if (pullRequest?.requested_reviewers) {
      const requestedChanges = pullRequest?.requested_reviewers?.map(
        (reviewer) => reviewer.login,
      );

      if (requestedChanges.length > 0) {
        warning(`Waiting [${requestedChanges.join(', ')}] to approve.`);
        doNotMerge = true;
      }
    }

    const { data: reviews } = await client.pulls.listReviews({
      owner,
      repo,
      pull_number: configInput.pullRequestNumber,
    });

    info(JSON.stringify(reviews, null, 2));

    // @ts-ignore
    const res = getReviewersLastReviews(reviews);

    info(JSON.stringify(res, null, 2));
    return;

    info('Checking required changes status.');

    // TODO Fix Typescript Error
    // @ts-ignore
    const reviewers: Reviewer[] = await getReviewsByGraphQL(pullRequest);

    const reviewersByState: ReviewerBySate = filterReviewersByState(
      getReviewersLastReviews(reviewers),
      reviewers,
    );

    debug(JSON.stringify(reviewersByState, null, 2));

    if (reviewersByState.requiredChanges.length) {
      warning(`${reviewersByState.requiredChanges.join(', ')} required changes.`);
      doNotMerge = true;
    }

    info(`${reviewersByState.approve.join(', ')} approved changes.`);

    info('Checking CI status.');

    const { data: checks } = await client.checks.listForRef({
      owner: configInput.owner,
      repo: configInput.repo,
      ref: configInput.sha,
    });

    if (checks.check_runs.some((check) => check.status !== 'completed')) {
      warning('Waiting for CI checks to complete.');
      doNotMerge = true;
    }

    if (doNotMerge) {
      return;
    }

    if (configInput.comment) {
      const { data: resp } = await client.issues.createComment({
        owner: configInput.owner,
        repo: configInput.repo,
        issue_number: configInput.pullRequestNumber,
        body: configInput.comment,
      });

      debug(`Post comment ${inspect(configInput.comment)}`);
      core.setOutput('commentID', resp.id);
    }

    info('Merging...');

    /* await client.pulls.merge({ */
    /*   owner, */
    /*   repo, */
    /*   pull_number: configInput.pullRequestNumber, */
    /*   merge_method: configInput.strategy, */
    /* }); */

    core.setOutput('merged', true);
  } catch (err) {
    error(err as Error);
  }
  return;
}

run();
