import { PullsGetReviewResponseData, PullsGetResponseData } from '@octokit/types';
import { ReviewerByState, Rule } from '../config/typings';
import { info, warning } from '../logger';

export function getReviewersLastReviews(
  listReviews: PullsGetReviewResponseData[],
): PullsGetReviewResponseData[] {
  const response: {
    [key: string]: PullsGetReviewResponseData & { total_review: number };
  } = {};

  listReviews
    .slice()
    .reverse()
    .forEach((review) => {
      const key = review.user.login;
      if (!response[key]) {
        response[key] = { ...review, total_review: 0 };
      }

      response[key].total_review += 1;
    });
  return Object.values(response);
}

export function filterReviewersByState(
  reviewersFullData: PullsGetReviewResponseData[],
): ReviewerByState {
  const response: ReviewerByState = {
    requiredChanges: [],
    approve: [],
    commented: [],
  };

  reviewersFullData.forEach((reviewer) => {
    switch (reviewer.state) {
      case 'APPROVED':
        response.approve.push(reviewer.user.login);
        break;

      case 'CHANGES_REQUESTED':
        response.requiredChanges.push(reviewer.user.login);
        break;
      case 'COMMENTED':
        response.commented.push(reviewer.user.login);
        break;
      default:
    }
  });

  return response;
}

export function checkRequestedReviewers(
  requestedReviewers: PullsGetResponseData['requested_reviewers'],
) {
  const requestedChanges = requestedReviewers.map((reviewer) => reviewer.login);

  if (requestedChanges.length > 0) {
    warning(`Waiting [${requestedChanges.join(', ')}] to approve.`);
    return false;
  }
  return true;
}

export function checkReviewersRequiredChanges(
  reviews: PullsGetReviewResponseData[],
  reviewersWithRules: Rule[],
): boolean {
  let result = true;

  const reviewersByState: ReviewerByState = filterReviewersByState(
    getReviewersLastReviews(reviews),
  );

  if (reviewersByState.requiredChanges.length) {
    warning(`${reviewersByState.requiredChanges.join(', ')} required changes.`);
    return false;
  }

  reviewersWithRules.forEach((rule) => {
    if (rule.required) {
      const requiredReviewers = rule.reviewers.filter((reviewer) => {
        return reviewersByState.approve.includes(reviewer);
      });

      if (requiredReviewers.length < rule.required) {
        warning(
          `Waiting ${rule.required} reviews from ${rule.reviewers.join(
            ', ',
          )} to approve.`,
        );
        result = false;
      }
    }
  });

  return result;
}
