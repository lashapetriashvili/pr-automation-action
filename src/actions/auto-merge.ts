import { inspect } from 'util';
import * as core from '@actions/core';
import * as githubAction from '@actions/github';
import * as github from '../github';
import { Inputs, Strategy } from '../config/typings';
import { info, error, warning } from '../logger';
import { isPrFullyApproved } from '../approves/is-pr-fully-approved';
import { identifyReviewers } from '../approves/identify-approvers';
import changeJiraIssueStatus from '../jira/change-jira-issue-status';

import { identifyFileChangeGroups } from '../reviewer';

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
      config: core.getInput('config', { required: true }),
      jiraToken: core.getInput('jira-token', { required: true }),
      jiraAccount: core.getInput('jira-account', { required: true }),
      jiraEndpoint: core.getInput('jira-endpoint', { required: true }),
      jiraMoveIssueFrom: core.getInput('jira-move-issue-from', { required: true }),
      jiraMoveIssueTo: core.getInput('jira-move-issue-to', { required: true }),
    };

    let config;

    try {
      config = await github.fetchConfig();
    } catch (err) {
      if ((err as Record<string, unknown>).status === 404) {
        warning(
          'No configuration file is found in the base branch; terminating the process',
        );
        info(JSON.stringify(err));
        return;
      }
      throw err;
    }

    const pr = github.getPullRequest();
    const { isDraft, author } = pr;

    const changedFiles = await github.fetchChangedFiles({ pr });
    const fileChangesGroups = identifyFileChangeGroups({
      fileChangesGroups: config.fileChangesGroups,
      changedFiles,
    });
    info(`Identified changed file groups: ${fileChangesGroups.join(', ')}`);

    const reviewersWithRules = identifyReviewers({
      createdBy: author,
      fileChangesGroups,
      rulesByCreator: config.rulesByCreator,
      defaultRules: config.defaultRules,
      requestedReviewerLogins: pr.requestedReviewerLogins,
    });

    const client = githubAction.getOctokit(configInput.token);

    const { data: pullRequest } = await client.pulls.get({
      owner,
      repo,
      pull_number: configInput.pullRequestNumber,
    });

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

    if (
      !isPrFullyApproved(
        configInput,
        // @ts-ignore
        pullRequest,
        reviews,
        checks,
        reviewersWithRules,
        config?.options?.requiredChecks,
      )
    ) {
      return;
    }

    if (configInput.comment) {
      /* const { data: resp } = await client.issues.createComment({ */
      /*   owner: configInput.owner, */
      /*   repo: configInput.repo, */
      /*   issue_number: configInput.pullRequestNumber, */
      /*   body: configInput.comment, */
      /* }); */
      /**/
      /* info(`Post comment ${inspect(configInput.comment)}`); */
      /* core.setOutput('commentID', resp.id); */
    }

    const branchName = pullRequest.head.ref;
    const baseBranchName = pullRequest.base.ref;

    if (baseBranchName !== 'master' && baseBranchName !== 'main') {
      await client.pulls.merge({
        owner,
        repo,
        pull_number: configInput.pullRequestNumber,
        merge_method: configInput.strategy,
      });

      info(`Merged pull request #${configInput.pullRequestNumber}`);
    }

    const jiraResponse = await changeJiraIssueStatus(branchName, configInput);

    if (jiraResponse.status) {
      info(jiraResponse.message);
    } else {
      warning(jiraResponse.message);
    }

    info(`Merged pull request #${configInput.pullRequestNumber}`);

    core.setOutput('merged', true);
  } catch (err) {
    error(err as Error);
  }
  return;
}

run();
