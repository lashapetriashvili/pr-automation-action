import { debug } from './logger';

export function getRandomItemFromArray<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export function withDebugLog<In, Out>(executeFunction: (params: In) => Out) {
  return function (param: In) {
    debug(`[${executeFunction.name}]. Params: ${JSON.stringify(param)}`);
    const result = executeFunction(param);
    debug(`[${executeFunction.name}]. Result: ${JSON.stringify(result)}`);
    return result;
  };
}

export function findDuplicateValues(arr: any) {
  const res: any = {};
  arr.forEach((obj: any) => {
    const key = `${obj.Country}${obj.author.login}`;
    if (!res[key]) {
      res[key] = { login: obj.author.login, count: 0 };
    }
    res[key].count += 1;
  });
  return Object.values(res);
}

export function filterReviewersByState(reviewers: any, reviewersFullData: any) {
  const reviewersWhoRequiredChanges: any = [];
  const reviewersWhoApprove: any = [];

  reviewers.forEach((reviewer: any) => {
    const filter = reviewersFullData.filter(
      (data: any) => data.author.login === reviewer.login,
    );

    const lastElement = filter[filter.length - 1];

    if (lastElement.state === 'APPROVED') {
      reviewersWhoApprove.push(lastElement.author.login);
    }

    if (lastElement.state === 'CHANGES_REQUESTED') {
      reviewersWhoRequiredChanges.push(lastElement.author.login);
    }
  });

  return {
    reviewersWhoRequiredChanges,
    reviewersWhoApprove,
  };
}
