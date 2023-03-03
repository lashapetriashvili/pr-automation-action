import * as minimatch from 'minimatch';
import { info } from '../logger';
import { Config, DefaultRules, Rule } from '../config/typings';
import { getRandomItemFromArray } from '../utils';

export function shouldRequestReview({
  isDraft,
  options,
  currentLabels,
}: {
  isDraft: boolean;
  options?: Config['options'];
  currentLabels: string[];
}): boolean {
  if (isDraft) {
    return false;
  }
  if (!options) {
    return true;
  }
  const includesIgnoredLabels = currentLabels.some((currentLabel) => {
    return options.ignoredLabels.includes(currentLabel);
  });
  if (includesIgnoredLabels) {
    return false;
  }

  return true;
}

function getReviewersBasedOnRule({
  assign,
  reviewers,
  createdBy,
  requestedReviewerLogins,
  getRandomReviewers = true,
}: Pick<Rule, 'assign' | 'reviewers'> & {
  createdBy: string;
  requestedReviewerLogins: string[];
  getRandomReviewers?: boolean;
}) {
  const result = new Set<string>();
  if (!assign) {
    reviewers.forEach((reviewer) => {
      if (reviewer === createdBy) {
        return;
      }
      return result.add(reviewer);
    });

    return result;
  }
  const preselectAlreadySelectedReviewers = reviewers.reduce<string[]>(
    (alreadySelectedReviewers, reviewer) => {
      const alreadyRequested = requestedReviewerLogins.includes(reviewer);
      if (alreadyRequested) {
        alreadySelectedReviewers.push(reviewer);
      }
      return alreadySelectedReviewers;
    },
    [],
  );
  const selectedList = [...preselectAlreadySelectedReviewers];

  while (selectedList.length < assign) {
    const reviewersWithoutRandomlySelected = reviewers.filter((reviewer) => {
      return !selectedList.includes(reviewer);
    });

    if (getRandomReviewers) {
      const randomReviewer = getRandomItemFromArray(reviewersWithoutRandomlySelected);

      selectedList.push(randomReviewer);
    } else {
      selectedList.push(...reviewersWithoutRandomlySelected);
    }
  }
  selectedList.forEach((randomlySelected) => {
    result.add(randomlySelected);
  });
  return result;
}

function identifyReviewersByDefaultRules({
  byFileGroups,
  fileChangesGroups,
  createdBy,
  requestedReviewerLogins,
  getFullResult = false,
}: {
  byFileGroups: DefaultRules['byFileGroups'];
  fileChangesGroups: string[];
  requestedReviewerLogins: string[];
  createdBy: string;
  getFullResult?: boolean;
}): any {
  const rulesByFileGroup = byFileGroups;
  const set = new Set<string>();
  const fullResult: Rule[] = [];
  fileChangesGroups.forEach((fileGroup) => {
    const rules = rulesByFileGroup[fileGroup];
    if (!rules) {
      return;
    }
    rules.forEach((rule) => {
      const reviewers = getReviewersBasedOnRule({
        assign: rule.assign,
        reviewers: rule.reviewers,
        requestedReviewerLogins,
        createdBy,
        getRandomReviewers: !getFullResult,
      });
      reviewers.forEach((reviewer) => set.add(reviewer));

      fullResult.push({
        // @ts-ignore
        reviewers,
        assign: rule.assign,
        required: rule.required,
      });
    });
  });

  if (getFullResult) {
    return fullResult;
  }

  return [...set];
}

export function identifyReviewers({
  createdBy,
  rulesByCreator,
  fileChangesGroups,
  defaultRules,
  requestedReviewerLogins,
  getFullResult = false,
}: {
  createdBy: string;
  rulesByCreator: Config['rulesByCreator'];
  defaultRules?: Config['defaultRules'];
  fileChangesGroups: string[];
  requestedReviewerLogins: string[];
  getFullResult?: boolean;
}): any {
  const rules = rulesByCreator[createdBy];

  info(JSON.stringify(rules, null, 2));

  if (!rules) {
    info(`No rules for creator ${createdBy} were found.`);
    if (defaultRules) {
      info('Using default rules');
      return identifyReviewersByDefaultRules({
        byFileGroups: defaultRules.byFileGroups,
        fileChangesGroups,
        createdBy,
        requestedReviewerLogins,
        getFullResult,
      });
    } else {
      return [];
    }
  }
  const fileChangesGroupsMap = fileChangesGroups.reduce<Record<string, string>>(
    (result, group) => {
      result[group] = group;
      return result;
    },
    {},
  );
  const result = new Set<string>();
  const fullResult: Rule[] = [];
  rules.forEach((rule) => {
    if (rule.ifChanged) {
      const matchFileChanges = rule.ifChanged.some((group) =>
        Boolean(fileChangesGroupsMap[group]),
      );
      if (!matchFileChanges) {
        return;
      }
    }
    const reviewers = getReviewersBasedOnRule({
      assign: rule.assign,
      reviewers: rule.reviewers,
      createdBy,
      requestedReviewerLogins,
      getRandomReviewers: !getFullResult,
    });
    reviewers.forEach((reviewer) => result.add(reviewer));

    fullResult.push({
      // @ts-ignore
      reviewers,
      assign: rule.assign,
      required: rule.required,
    });
  });

  if (getFullResult) {
    return fullResult;
  }

  return [...result];
}

export function identifyFileChangeGroups({
  fileChangesGroups,
  changedFiles,
}: {
  fileChangesGroups: Config['fileChangesGroups'];
  changedFiles: string[];
}): string[] {
  const set = new Set<string>();
  changedFiles.forEach((changedFile) => {
    for (const [groupName, patterns] of Object.entries(fileChangesGroups)) {
      patterns.forEach((pattern) => {
        const matches = minimatch(changedFile, pattern);
        if (matches) {
          set.add(groupName);
        }
      });
    }
  });
  return [...set];
}
