import * as core from '@actions/core';
import * as github from '@actions/github';
import { Inputs, Strategy } from '../config/typings';
import { info, debug, warning, error } from '../logger';

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

    const octokit = github.getOctokit(configInput.token);

    // @ts-ignore
    const { data: pullRequest } = await octokit.pulls.get({
      owner,
      repo,
      pull_number: configInput.pullRequestNumber,
    });

    if (pullRequest.state !== 'open') {
      warning(`Pull request #${configInput.pullRequestNumber} is not open.`);
      return;
    }

    // Check if all reviwers approved the PR

    // @ts-ignore
    const { data: reviews } = await octokit.pulls.listReviews({
      owner,
      repo,
      pull_number: configInput.pullRequestNumber,
    });

    info(JSON.stringify(reviews, null, 2));
  } catch (err) {
    error(err as Error);
  }
  return;
}

run();
