import { info, error, warning, debug } from '../logger';
import * as github from '../github';
import { getInput } from '@actions/core';
import {
  identifyFileChangeGroups,
  identifyReviewers,
  shouldRequestReview,
} from '../reviewer';

import { getEmployees } from '../sage';

export async function run(): Promise<void> {
  try {
    info('Starting pr auto assign.');

    const inputs = {
      checkReviewerOnSage:
        getInput('check-reviewer-on-sage', { required: false }) === 'true',
      sageUrl: getInput('sage-url', { required: false }),
      sageToken: getInput('sage-token', { required: false }),
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

    if (
      !shouldRequestReview({
        isDraft,
        options: config.options,
        currentLabels: pr.labelNames,
      })
    ) {
      info(
        `Matched the ignoring rules ${JSON.stringify({
          isDraft,
          prLabels: pr.labelNames,
        })}; terminating the process.`,
      );
      return;
    }

    debug('Fetching changed files in the pull request');
    const changedFiles = await github.fetchChangedFiles({ pr });
    const fileChangesGroups = identifyFileChangeGroups({
      fileChangesGroups: config.fileChangesGroups,
      changedFiles,
    });
    info(`Identified changed file groups: ${fileChangesGroups.join(', ')}`);

    debug('Identifying reviewers based on the changed files and PR creator');
    /* let reviewers = identifyReviewers({ */
    /*   createdBy: author, */
    /*   fileChangesGroups, */
    /*   rulesByCreator: config.rulesByCreator, */
    /*   defaultRules: config.defaultRules, */
    /*   requestedReviewerLogins: pr.requestedReviewerLogins, */
    /* }); */
    /* info(`Identified reviewers: ${reviewers.join(', ')}`); */

    const sageUsers = config.sageUsers || {};
    let reviewers = ['lashapetriashvili', 'lashapetriashvili-ezetech', 'lasha3044'];

    info(JSON.stringify(sageUsers, null, 2));

    // find sage users in reviewers

    const reviewersEmails: string[] = [];

    reviewers.forEach((reviewer) => {
      if (sageUsers[reviewer]) {

        /* info(sageUsers[reviewer]); */

        reviewersEmails.push(sageUsers[reviewer].email);
      }
    });

    info(JSON.stringify(reviewersEmails, null, 2));


    return;

    if (inputs.checkReviewerOnSage) {
      try {
        reviewers = await getEmployees({
          sageBaseUrl: inputs.sageUrl,
          sageToken: inputs.sageToken,
          reviewersEmails: reviewers,
        });
      } catch (err) {
        warning('Sage Error: ' + JSON.stringify(err, null, 2));
      }
    }

    const reviewersToAssign = reviewers.filter((reviewer) => reviewer !== author);
    if (reviewersToAssign.length === 0) {
      info(`No reviewers were matched for author ${author}. Terminating the process`);
      return;
    }
    await github.assignReviewers(pr, reviewersToAssign);

    info(`Requesting review to ${reviewersToAssign.join(', ')}`);

    info('Done');
  } catch (err) {
    error(err as Error);
  }
  return;
}

run();
