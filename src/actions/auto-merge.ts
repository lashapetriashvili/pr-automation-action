import { inspect } from 'util';
import * as core from '@actions/core';
import * as github from '@actions/github';
import { Inputs, Strategy, JiraIssue, JiraTransitions } from '../config/typings';
import { info, error, warning } from '../logger';
import { isPrFullyApproved } from '../approves/is-pr-fully-approved';
import { jiraClient, getTransitionId, getIssueIdFromBranchName } from '../jira';

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
      jiraToken: core.getInput('jira-token', { required: true }),
      jiraAccount: core.getInput('jira-account', { required: true }),
      jiraEndpoint: core.getInput('jira-endpoint', { required: true }),
      jiraMoveIssueFrom: core.getInput('jira-move-issue-from', { required: true }),
      jiraMoveIssueTo: core.getInput('jira-move-issue-to', { required: true }),
    };

    const client = github.getOctokit(configInput.token);

    const { data: pullRequest } = await client.pulls.get({
      owner,
      repo,
      pull_number: configInput.pullRequestNumber,
    });

    // Get a branch name
    const branchName = pullRequest.head.ref;

    // Get a branch name where this pull request will be Merged
    const baseBranchName = pullRequest.base.ref;

    /* info(`Branch name: ${branchName}`); */
    /* info(`Base branch name: ${baseBranchName}`); */
    /**/
    /* if (baseBranchName !== 'master' || baseBranchName !== 'main') { */
    /*   info(`Base branch name is not master or main. Exiting...`); */
    /*   return; */
    /* } */

    const issueId = getIssueIdFromBranchName(branchName);

    info(`Issue id: ${issueId}`);

    if (!issueId) {
      info(`Issue id is not found in branch name. Exiting...`);
      return;
    }

    const jiraToken = Buffer.from(
      `${configInput.jiraAccount}:${configInput.jiraToken}`,
    ).toString('base64');

    const jiraRequest = jiraClient(jiraToken);

    const issueDetail: JiraIssue | undefined = await jiraRequest(
      `${configInput.jiraEndpoint}/rest/api/3/issue/${issueId}`,
    );

    info(`Issue detail:`);
    info(JSON.stringify(issueDetail, null, 2));

    if (issueDetail === undefined) {
      info(`Issue detail is not found. Exiting...`);
      return;
    }

    if (
      issueDetail.fields.status.name.toLowerCase() !==
      configInput.jiraMoveIssueFrom.toLowerCase()
    ) {
      info(`Issue status is not ${configInput.jiraMoveIssueFrom}. Exiting...`);
      return;
    }

    const availableTransitions:
      | { expand: string; transitions: JiraTransitions[] }
      | undefined = await jiraRequest(
      `${configInput.jiraEndpoint}/rest/api/3/issue/${issueId}/transitions`,
    );

    info(`Available transitions:`);
    info(JSON.stringify(availableTransitions, null, 2));

    if (availableTransitions === undefined) {
      info(`Available transitions are not found. Exiting...`);
      return;
    }

    const transitionId = getTransitionId(
      availableTransitions.transitions,
      configInput.jiraMoveIssueTo,
    );

    info(`Transition id: ${transitionId}`);

    if (!transitionId) {
      info(`Transition id is not found. Exiting...`);
      return;
    }

    const updateTransition = await jiraRequest(
      `${configInput.jiraEndpoint}/rest/api/3/issue/${issueId}/transitions`,
      'POST',
      { transition: { id: transitionId } },
    );

    info(`Update transition:`);
    info(JSON.stringify(updateTransition, null, 2));
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
