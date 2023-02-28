import { inspect } from 'util';
import * as core from '@actions/core';
import * as github from '@actions/github';
import { Inputs, Strategy } from '../config/typings';
import { info, error, warning } from '../logger';
import { isPrFullyApproved } from '../approves/is-pr-fully-approved';
import JiraClient from '../jira';

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
      doNotMergeLabels: core.getInput('do-not-merge-labels'),
      token: core.getInput('token', { required: true }),
    };

    const client = github.getOctokit(configInput.token);

    const { data: pullRequest } = await client.pulls.get({
      owner,
      repo,
      pull_number: configInput.pullRequestNumber,
    });

    const jiraAccount = 'lasha.petro1@gmail.com';
    const jiraToken =
      'ATATT3xFfGF0BcsDjXeO8aQKln17axZRbAjvdrQ3fUuJX1B9obsg1j7PfMO5uReRQQ08-Edjcb3oG70fReeBkGyx8Gn9zudjIzG4K9xARRuy04lYHEF9RBZVq-uvpqk7Y9WcqHTPS5qrbnKHEif3kzP0_tdQKbv4YNUjD1dzqvPbXKb1xTu9NVs=77EB8100';

    const jiraEndpoint = 'https://test-github-actions.atlassian.net';

    const jira = new JiraClient(
      Buffer.from(`${jiraAccount}:${jiraToken}`).toString('base64'),
    );

    const res = await jira.request(`${jiraEndpoint}/rest/api/3/issue/TEST-3`);

    const availableTransitions = await jira.request(
      `${jiraEndpoint}/rest/api/3/issue/TEST-3/transitions`,
    );

    info(JSON.stringify(availableTransitions, null, 2));

    return;

    if (pullRequest.state !== 'open') {
      warning(`Pull request #${configInput.pullRequestNumber} is not open.`);
      return;
    }

    const { data: reviews } = await client.pulls.listReviews({
      owner,
      repo,
      pull_number: configInput.pullRequestNumber,
    });

    const { data: checks } = await client.checks.listForRef({
      owner: configInput.owner,
      repo: configInput.repo,
      ref: configInput.sha,
    });

    // @ts-ignore
    if (!isPrFullyApproved(configInput, pullRequest, reviews, checks)) {
      return;
    }

    if (configInput.comment) {
      const { data: resp } = await client.issues.createComment({
        owner: configInput.owner,
        repo: configInput.repo,
        issue_number: configInput.pullRequestNumber,
        body: configInput.comment,
      });

      info(`Post comment ${inspect(configInput.comment)}`);
      core.setOutput('commentID', resp.id);
    }

    await client.pulls.merge({
      owner,
      repo,
      pull_number: configInput.pullRequestNumber,
      merge_method: configInput.strategy,
    });

    info(`Merged pull request #${configInput.pullRequestNumber}`);

    core.setOutput('merged', true);
  } catch (err) {
    error(err as Error);
  }
  return;
}

run();
