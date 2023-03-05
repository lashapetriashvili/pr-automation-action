import * as core from '@actions/core';
import * as githubAction from '@actions/github';
import * as github from '../github';
import { info, error, warning } from '../logger';
import { isPrFullyApproved } from '../approves/is-pr-fully-approved';
import { identifyReviewers } from '../approves/identify-approvers';
import { identifyFileChangeGroups } from '../reviewer';

export async function run(): Promise<void> {
  try {
    info('Staring PR auto merging.');

    const inputs = github.getInputs();

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

    const prValidationError = github.validatePullRequest(pr);

    if (prValidationError) {
      warning(prValidationError);
      return;
    }

    const { author, baseBranchName } = pr;

    const getCIChecks = await github.getCIChecks();

    info(JSON.stringify(getCIChecks, null, 2));
    return;

    /* const changedFiles = await github.fetchChangedFiles({ pr }); */
    /* const fileChangesGroups = identifyFileChangeGroups({ */
    /*   fileChangesGroups: config.fileChangesGroups, */
    /*   changedFiles, */
    /* }); */
    /**/
    /* const reviewersWithRules = identifyReviewers({ */
    /*   createdBy: author, */
    /*   fileChangesGroups, */
    /*   rulesByCreator: config.rulesByCreator, */
    /*   defaultRules: config.defaultRules, */
    /*   requestedReviewerLogins: pr.requestedReviewerLogins, */
    /* }); */
    /**/
    /* const client = githubAction.getOctokit(inputs.token); */
    /**/
    /* const { data: checks } = await client.checks.listForRef({ */
    /*   owner: inputs.owner, */
    /*   repo: inputs.repo, */
    /*   ref: inputs.sha, */
    /* }); */

    /* if ( */
    /*   !isPrFullyApproved( */
    /*     inputs, */
    /*     // @ts-ignore */
    /*     pullRequest, */
    /*     reviews, */
    /*     checks, */
    /*     reviewersWithRules, */
    /*     config?.options?.requiredChecks, */
    /*   ) */
    /* ) { */
    /*   return; */
    /* } */

    if (inputs.comment) {
      await github.createComment('Test comment');
    }

    if (baseBranchName !== 'master' && baseBranchName !== 'main') {
      /* await client.pulls.merge({ */
      /*   owner: inputs.owner, */
      /*   repo: inputs.repo, */
      /*   pull_number: inputs.pullRequestNumber, */
      /*   merge_method: inputs.strategy, */
      /* }); */

      info(`Merged pull request #${inputs.pullRequestNumber}`);
    }

    core.setOutput('merged', true);
  } catch (err) {
    error(err as Error);
  }
  return;
}

run();
