import { inspect } from 'util';
import * as core from '@actions/core';
import * as github from '@actions/github';
import { Inputs, Strategy, ReviewerBySate, Reviewer } from '../config/typings';
import { info, debug, warning, error } from '../logger';
import {
  getReviewsByGraphQL,
  removeDuplicateReviewer,
  filterReviewersByState,
} from '../github';

export async function run(): Promise<void> {
  try {
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

    /* const pullRequest = getPullRequest(); */
    /**/
    /* info(JSON.stringify(pullRequest, null, 2)); */

    const { data: pullRequest } = await client.pulls.get({
      owner,
      repo,
      pull_number: configInput.pullRequestNumber,
    });

    let requestedChanges = pullRequest?.requested_reviewers?.map(
      (reviewer) => reviewer.login,
    );

    if (requestedChanges === undefined) {
      requestedChanges = [];
    }

    if (requestedChanges.length > 0) {
      warning(`Waiting [${requestedChanges.join(', ')}] to approve.`);
      return;
    }

    const reviewers: Reviewer[] = await getReviewsByGraphQL(pullRequest);

    info(JSON.stringify(reviewers));
    return;

    const reviewersByState: ReviewerBySate = filterReviewersByState(
      removeDuplicateReviewer(reviewers),
      reviewers,
    );

    info(JSON.stringify(reviewersByState));

    if (reviewersByState.requiredChanges.length) {
      warning(`${reviewersByState.requiredChanges.join(', ')} required changes.`);
      return;
    }

    const { data: checks } = await client.checks.listForRef({
      owner: configInput.owner,
      repo: configInput.repo,
      ref: configInput.sha,
    });

    const totalStatus = checks.total_count;
    const totalSuccessStatuses = checks.check_runs.filter(
      (check) => check.conclusion === 'success' || check.conclusion === 'skipped',
    ).length;

    if (totalStatus - 1 !== totalSuccessStatuses) {
      throw new Error(
        `Not all status success, ${totalSuccessStatuses} out of ${
          totalStatus - 1
        } (ignored this check) success`,
      );
    }

    debug(`All ${totalStatus} status success`);
    debug(`Merge PR ${pullRequest.number}`);

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

    await client.pulls.merge({
      owner,
      repo,
      pull_number: configInput.pullRequestNumber,
      merge_method: configInput.strategy,
    });

    core.setOutput('merged', true);

    /* const merger = new Merger(inputs); */
    /* await merger.merge(); */
  } catch (err) {
    error(err as Error);
  }
  return;
}

run();
