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
      const login = review?.user?.login;

      if (login !== undefined) {
        // @ts-ignore
        reviewers[review.state.toLowerCase()].push({ login: login });
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

    // @ts-ignore
    const { data: commits } = await octokit.pulls.listCommits({
      owner,
      repo,
      pull_number: configInput.pullRequestNumber,
    });

    info(JSON.stringify(reviewers, null, 2));
    info(JSON.stringify(commits, null, 2));
  } catch (err) {
    error(err as Error);
  }
  return;
}

run();
