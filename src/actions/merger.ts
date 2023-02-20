import { inspect } from 'util';
import * as github from '@actions/github';
import * as core from '@actions/core';
import { PullsGetResponseData } from '@octokit/types';
import { info, debug } from '../logger';
import { checkReviewersState, getPullRequest } from '../github';

export type labelStrategies = 'all' | 'atLeastOne';

export interface Inputs {
  checkStatus: boolean;
  comment: string;
  dryRun: boolean;
  ignoreLabels: string[];
  ignoreLabelsStrategy: labelStrategies;
  failStep: boolean;
  intervalSeconds: number;
  labels: string[];
  labelsStrategy: labelStrategies;
  repo: string;
  owner: string;
  pullRequestNumber: number;
  sha: string;
  strategy: Strategy;
  token: string;
  timeoutSeconds: number;
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

    if (this.configInput.checkStatus) {
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
      const requestedChanges = pr.requested_reviewers.map(
        (reviewer: any) => reviewer.login,
      );

      info(JSON.stringify(requestedChanges, null, 2));

      if (requestedChanges.length > 0) {
        info(`${requestedChanges.length} approved required.`);
        return;
      }

      const checkReviewerState = await checkReviewersState(
        pullRequest,
        'lashapetriashvili-ezetech',
      );

      info(JSON.stringify(checkReviewerState, null, 2));

      if (checkReviewerState === undefined) {
        info(`approved required from ${requestedChanges.join(', ')}`);
        return;
      }

      /* if (totalStatus - 1 !== totalSuccessStatuses) { */
      /*   throw new Error( */
      /*     `Not all status success, ${totalSuccessStatuses} out of ${ */
      /*       totalStatus - 1 */
      /*     } (ignored this check) success`, */
      /*   ); */
      /* } */

      debug(`All ${totalStatus} status success`);
      debug(`Merge PR ${pr.number}`);
    }

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
