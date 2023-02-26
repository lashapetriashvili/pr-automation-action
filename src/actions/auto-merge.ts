import { inspect } from 'util';
import * as core from '@actions/core';
import * as github from '@actions/github';
import { Inputs, Strategy, Reviewer } from '../config/typings';
import { info, debug, warning, error } from '../logger';
import { Reviews } from '../github';

export type ReviewerBySate = {
  approved: string[];
  changes_requested: string[];
  commented: string[];
  dismissed: string[];
  pending: string[];
};

export async function run(): Promise<void> {
  try {
    info('Staring PR auto merging.');

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

    // Get only then reviewers then not approved
    const reviewers: ReviewerBySate = {
      approved: [],
      changes_requested: [],
      commented: [],
      dismissed: [],
      pending: [],
    };

    const octokit = github.getOctokit(configInput.token);

    // @ts-ignore
    const { data: pullRequest } = await octokit.pulls.get({
      owner,
      repo,
      pull_number: configInput.pullRequestNumber,
    });

    const { data: reviews } = await octokit.pulls.listReviews({
      owner,
      repo,
      pull_number: configInput.pullRequestNumber,
    });

    reviews.forEach((review) => {
      // @ts-ignore
      if (reviewers[review.state.toLowerCase()] === review.user.login) {
        // @ts-ignore
        reviewers[review.state.toLowerCase()].push(review.user.login);
      }
    });

    const { data: comments } = await octokit.issues.listComments({
      owner,
      repo,
      issue_number: configInput.pullRequestNumber,
    });

    comments.forEach((comment) => {
      const login = comment?.user?.login;

      if (login !== undefined) {
        // @ts-ignore
        reviewers.commented.push({ login: comment.user.login });
      }
    });

    const requiredReviewers = reviewers.approved.filter((reviewer) => {
      // @ts-ignore
      return reviewer !== pullRequest.user.login;
    });

    info(JSON.stringify(reviewers, null, 2));
    info(JSON.stringify(requiredReviewers, null, 2));

    /* if (requiredReviewers.length === 0) { */
    /*   info('PR is not fully approved. Skipping auto merge.'); */
    /*   return; */
    /* } */

    const { data: checks } = await octokit.checks.listForRef({
      owner,
      repo,
      ref: configInput.sha,
    });

    const failedChecks = checks.check_runs.filter((check) => {
      return check.conclusion === 'failure';
    });

    if (failedChecks.length > 0) {
      info('PR has failed checks. Skipping auto merge.');
      return;
    }

    const { data: statuses } = await octokit.repos.listCommitStatusesForRef({
      owner,
      repo,
      ref: configInput.sha,
    });

    info(JSON.stringify(statuses, null, 2));

    const failedStatuses = statuses.filter((status) => {
      return status.state !== 'success';
    });

    if (failedStatuses.length > 0) {
      info('PR has failed statuses. Skipping auto merge.');
      return;
    }

    /* const { data: merge } = await octokit.pulls.merge({ */
    /*   owner, */
    /*   repo, */
    /*   pull_number: configInput.pullRequestNumber, */
    /* }); */

    info('PR is fully approved. Merging PR.');

    /* info(JSON.stringify(merge, null, 2)); */
  } catch (err) {
    error(err as Error);
  }
  return;
}

run();
