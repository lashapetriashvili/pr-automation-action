import { PullsGetReviewResponseData, PullsGetResponseData } from '@octokit/types';
import { Checks, Inputs, Rule } from '../config/typings';

import {
  checkReviewersRequiredChanges,
  checkRequestedReviewers,
} from './identify-reviews';

import { checkCI, checkDoNotMergeLabels } from './identify-ci';

export function isPrFullyApproved(
  configInput: Inputs,
  pullRequest: PullsGetResponseData,
  reviews: PullsGetReviewResponseData[],
  checks: Checks,
  reviewersWithRules: Rule[],
): boolean {
  let isMergeable = false;

  if (
    configInput.doNotMergeLabels &&
    !checkDoNotMergeLabels(pullRequest.labels, configInput.doNotMergeLabels)
  ) {
    return false;
  }

  /* isMergeable = checkRequestedReviewers(pullRequest.requested_reviewers); */

  isMergeable = checkReviewersRequiredChanges(reviews, reviewersWithRules);

  /* isMergeable = checkCI(checks); */

  return isMergeable;
}
