import { inspect } from 'util';
import * as github from '@actions/github';
import * as core from '@actions/core';
import { PullsGetResponseData } from '@octokit/types';
import { info, error, warning, debug } from '../logger';
import { fetchConfig, checkReviewersState, getPullRequest } from '../github';
import Retry from './retry';

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
  private retry: Retry;

  constructor(private configInput: Inputs) {
    this.retry = new Retry()
      .timeout(this.configInput.timeoutSeconds)
      .interval(this.configInput.intervalSeconds)
      .failStep(this.configInput.failStep);
  }

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

    core.debug(
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

    core.debug(
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

    try {
      await this.retry.exec(async (count): Promise<void> => {
        try {
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

            core.debug(
              `Checked labels and passed with message:${labelResult.message} with ${this.configInput.labelsStrategy}`,
            );
            core.info(
              `Checked labels and passed with labels:${inspect(this.configInput.labels)}`,
            );
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
              throw new Error(
                `Checked ignore labels failed: ${ignoreLabelResult.message}`,
              );
            }

            core.debug(
              `Checked ignore labels and passed with message:${ignoreLabelResult.message} with ${this.configInput.ignoreLabelsStrategy} strategy`,
            );
            core.info(
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

            if (requestedChanges.length > 0) {
              throw new Error('Waiting approve');
            }

            const checkReviewerState = await checkReviewersState(
              pullRequest,
              'lashapetriashvili-ezetech',
            );

            if (checkReviewerState === undefined) {
              throw new Error('Waiting approve');
            }

            if (totalStatus - 1 !== totalSuccessStatuses) {
              throw new Error(
                `Not all status success, ${totalSuccessStatuses} out of ${
                  totalStatus - 1
                } (ignored this check) success`,
              );
            }

            core.debug(`All ${totalStatus} status success`);
            core.debug(`Merge PR ${pr.number}`);
          }
        } catch (err) {
          core.debug(`failed retry count:${count} with error ${inspect(err)}`);
          throw err;
        }
      });

      if (this.configInput.comment) {
        const { data: resp } = await client.issues.createComment({
          owner: this.configInput.owner,
          repo: this.configInput.repo,
          issue_number: this.configInput.pullRequestNumber,
          body: this.configInput.comment,
        });

        core.debug(`Post comment ${inspect(this.configInput.comment)}`);
        core.setOutput('commentID', resp.id);
      }

      /* await client.pulls.merge({ */
      /*   owner, */
      /*   repo, */
      /*   pull_number: this.configInput.pullRequestNumber, */
      /*   merge_method: this.configInput.strategy, */
      /* }); */

      core.setOutput('merged', true);
    } catch (err) {
      core.debug(`Error on retry error:${inspect(err)}`);
      if (this.configInput.failStep) {
        throw err;
      }
      core.debug('timeout but passing because "failStep" is configure to false');
    }
  }
}

export default {
  Merger,
};
