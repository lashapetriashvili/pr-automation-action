import { inspect } from 'util';
import * as github from '@actions/github';
import * as core from '@actions/core';
import { PullsGetResponseData } from '@octokit/types';
import { info, debug, warning } from '../logger';
import { getReviewsByGraphQL, getPullRequest } from '../github';
import { findDuplicateValues, filterReviewersByState } from '../utils';
import { Reviewer } from '../config/typings';

export type labelStrategies = 'all' | 'atLeastOne';

export interface Inputs {
  comment: string;
  ignoreLabels: string[];
  ignoreLabelsStrategy: labelStrategies;
  labels: string[];
  labelsStrategy: labelStrategies;
  repo: string;
  owner: string;
  pullRequestNumber: number;
  sha: string;
  strategy: Strategy;
  token: string;
}

export type Strategy = 'merge' | 'squash' | 'rebase';

interface ValidationResult {
  failed: boolean;
  message: string;
}

export class Merger {
  constructor(private configInput: Inputs) {}

  private isAllLabelsValid(
    pr: PullsGetResponseData,
    labels: string[],
    type: 'labels' | 'ignoreLabels',
  ): ValidationResult {
    const hasLabels = pr.labels
      .filter((prLabel) => {
        return labels.includes(prLabel.name);
      })
      .map((label) => label.name);

    let failed = true;
    if (type === 'labels' && hasLabels.length === labels.length) {
      failed = false;
    }
    if (type === 'ignoreLabels' && !hasLabels.length) {
      failed = false;
    }

    debug(
      `Checking all labels for type:${type} and prLabels:${inspect(
        pr.labels.map((l) => l.name),
      )}, hasLabels:${inspect(hasLabels)}, labels:${inspect(
        labels,
      )} and failed: ${failed}`,
    );

    return {
      failed,
      message: `PR ${pr.id} ${type === 'labels' ? '' : "does't"} contains all ${inspect(
        labels,
      )} for PR labels ${inspect(
        pr.labels.map((l) => l.name),
      )} and and failed: ${failed}`,
    };
  }

  private isAtLeastOneLabelsValid(
    pr: PullsGetResponseData,
    labels: string[],
    type: 'labels' | 'ignoreLabels',
  ): ValidationResult {
    const hasLabels = pr.labels
      .filter((prLabel) => {
        return labels.includes(prLabel.name);
      })
      .map((label) => label.name);

    let failed = true;
    if (type === 'labels' && hasLabels.length) {
      failed = false;
    }
    if (type === 'ignoreLabels' && !hasLabels.length) {
      failed = false;
    }

    debug(
      `Checking atLeastOne labels for type:${type} and prLabels:${inspect(
        pr.labels.map((l) => l.name),
      )}, hasLabels:${inspect(hasLabels)}, labels:${inspect(
        labels,
      )} and failed: ${failed}`,
    );

    return {
      failed,
      message: `PR ${pr.id} ${type === 'labels' ? '' : "does't"} contains ${inspect(
        labels,
      )} for PR labels ${inspect(pr.labels.map((l) => l.name))}`,
    };
  }

  private isLabelsValid(
    pr: PullsGetResponseData,
    labels: string[],
    strategy: labelStrategies,
    type: 'labels' | 'ignoreLabels',
  ): ValidationResult {
    switch (strategy) {
      case 'atLeastOne':
        return this.isAtLeastOneLabelsValid(pr, labels, type);
      case 'all':
      default:
        return this.isAllLabelsValid(pr, labels, type);
    }
  }

  async merge(): Promise<void> {
    const client = github.getOctokit(this.configInput.token);

    const { owner, repo } = this.configInput;

    const { data: pr } = await client.pulls.get({
      owner,
      repo,
      pull_number: this.configInput.pullRequestNumber,
    });

    const pullRequest = getPullRequest();

    /* const res = getReviews(pullRequest); */

    if (this.configInput.labels.length) {
      const labelResult = this.isLabelsValid(
        // @ts-ignore
        pr,
        this.configInput.labels,
        this.configInput.labelsStrategy,
        'labels',
      );
      if (labelResult.failed) {
        throw new Error(`Checked labels failed: ${labelResult.message}`);
      }

      debug(
        `Checked labels and passed with message:${labelResult.message} with ${this.configInput.labelsStrategy}`,
      );

      info(`Checked labels and passed with labels:${inspect(this.configInput.labels)}`);
    }

    if (this.configInput.ignoreLabels.length) {
      const ignoreLabelResult = this.isLabelsValid(
        // @ts-ignore
        pr,
        this.configInput.ignoreLabels,
        this.configInput.ignoreLabelsStrategy,
        'ignoreLabels',
      );
      if (ignoreLabelResult.failed) {
        throw new Error(`Checked ignore labels failed: ${ignoreLabelResult.message}`);
      }

      debug(
        `Checked ignore labels and passed with message:${ignoreLabelResult.message} with ${this.configInput.ignoreLabelsStrategy} strategy`,
      );
      info(
        `Checked ignore labels and passed with ignoreLabels:${inspect(
          this.configInput.ignoreLabels,
        )}`,
      );
    }

    const { data: checks } = await client.checks.listForRef({
      owner: this.configInput.owner,
      repo: this.configInput.repo,
      ref: this.configInput.sha,
    });

    const totalStatus = checks.total_count;
    const totalSuccessStatuses = checks.check_runs.filter(
      (check) => check.conclusion === 'success' || check.conclusion === 'skipped',
    ).length;

    // @ts-ignore
    let requestedChanges = pr?.requested_reviewers?.map((reviewer) => reviewer.login);

    if (requestedChanges === undefined) {
      requestedChanges = [];
    }

    /* if (requestedChanges.length > 0) { */
    /*   warning(`Waiting [${requestedChanges.join(', ')}] to approve.`); */
    /*   return; */
    /* } */

    const res = await getReviewsByGraphQL(pullRequest);

    info(JSON.stringify(res, null, 2));

    const reviewers: any = findDuplicateValues(res);

    info(JSON.stringify(reviewers, null, 2));

    const reviewersByState: any = filterReviewersByState(reviewers, res);

    info(JSON.stringify(reviewersByState, null, 2));

    return;

    if (reviewersByState.reviewersWhoRequiredChanges.length) {
      warning(
        `${reviewersByState.reviewersWhoRequiredChanges.join(', ')} required changes.`,
      );
      return;
    }

    if (totalStatus - 1 !== totalSuccessStatuses) {
      throw new Error(
        `Not all status success, ${totalSuccessStatuses} out of ${
          totalStatus - 1
        } (ignored this check) success`,
      );
    }

    debug(`All ${totalStatus} status success`);
    debug(`Merge PR ${pr.number}`);

    if (this.configInput.comment) {
      const { data: resp } = await client.issues.createComment({
        owner: this.configInput.owner,
        repo: this.configInput.repo,
        issue_number: this.configInput.pullRequestNumber,
        body: this.configInput.comment,
      });

      debug(`Post comment ${inspect(this.configInput.comment)}`);
      core.setOutput('commentID', resp.id);
    }

    await client.pulls.merge({
      owner,
      repo,
      pull_number: this.configInput.pullRequestNumber,
      merge_method: this.configInput.strategy,
    });

    core.setOutput('merged', true);
  }
}

export default {
  Merger,
};
