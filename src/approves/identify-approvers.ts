import * as minimatch from 'minimatch';
import { info } from '../logger';
import { Config, DefaultRules, Rule } from '../config/typings';

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
}: Pick<Rule, 'assign' | 'reviewers'> & {
  createdBy: string;
  requestedReviewerLogins: string[];
}) {
  const result = new Set<string>();
  reviewers.forEach((reviewer) => {
    if (reviewer === createdBy) {
      return;
    }
    return result.add(reviewer);
  });
  return result;
}

function identifyReviewersByDefaultRules({
  byFileGroups,
  fileChangesGroups,
  createdBy,
  requestedReviewerLogins,
}: {
  byFileGroups: DefaultRules['byFileGroups'];
  fileChangesGroups: string[];
  requestedReviewerLogins: string[];
  createdBy: string;
}): Rule[] {
  const rulesByFileGroup = byFileGroups;
  const set = new Set<Rule>();
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
      });

      set.add({
        reviewers: [...reviewers],
        required: rule.required,
        assign: rule.assign,
      });
    });
  });
  return [...set];
}

export function identifyReviewers({
  createdBy,
  rulesByCreator,
  fileChangesGroups,
  defaultRules,
  requestedReviewerLogins,
}: {
  createdBy: string;
  rulesByCreator: Config['rulesByCreator'];
  defaultRules?: Config['defaultRules'];
  fileChangesGroups: string[];
  requestedReviewerLogins: string[];
}): Rule[] {
  const rules = rulesByCreator[createdBy];
  if (!rules) {
    info(`No rules for creator ${createdBy} were found.`);
    if (defaultRules) {
      info('Using default rules');
      return identifyReviewersByDefaultRules({
        byFileGroups: defaultRules.byFileGroups,
        fileChangesGroups,
        createdBy,
        requestedReviewerLogins,
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
  const result = new Set<Rule>();
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
    });

    result.add({
      reviewers: [...reviewers],
      required: rule.required,
      assign: rule.assign,
    });
  });
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
