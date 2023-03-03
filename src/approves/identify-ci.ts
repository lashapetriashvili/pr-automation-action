import { PullsGetResponseData } from '@octokit/types';
import { Checks } from '../config/typings';

import { warning } from '../logger';

export function checkCI(checks: Checks, requiredChecks: string[] | undefined): boolean {
  if (requiredChecks === undefined) {
    return true;
  }

  let result = true;

  requiredChecks.forEach((name) => {
    const check = checks.check_runs.find((checkRun) => {
      return checkRun.name === name;
    });

    if (check && (check.status !== 'completed' || check.conclusion !== 'success')) {
      warning(`Waiting for ${name} to pass.`);
      result = false;
    }
  });

  return result;
}

export function checkDoNotMergeLabels(
  labels: PullsGetResponseData['labels'],
  doNotMergeLabels: string,
): boolean {
  const doNotMergeLabelsList = doNotMergeLabels.split(',');
  const check = labels.find((label) => {
    return doNotMergeLabelsList.includes(label.name);
  });

  if (check) {
    warning(`Pull request has a ${doNotMergeLabels} label.`);
    return false;
  }

  return true;
}
