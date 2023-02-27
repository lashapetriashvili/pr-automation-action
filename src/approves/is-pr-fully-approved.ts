import { PullsGetReviewResponseData, PullsGetResponseData } from '@octokit/types';
import { Checks } from '../config/typings';

import {
  checkReviewersRequiredChanges,
  checkRequestedReviewers,
} from './identify-reviews';

import { checkCI } from './identify-ci';

export function isPrFullyApproved(
  pullRequest: PullsGetResponseData,
  reviews: PullsGetReviewResponseData[],
  checks: Checks,
): boolean {
  let isMergeable = true;

  /* isMergeable = checkRequestedReviewers(pullRequest.requested_reviewers); */
  /**/
  /* isMergeable = checkReviewersRequiredChanges(reviews); */

  isMergeable = checkCI(checks);

  return isMergeable;
}
