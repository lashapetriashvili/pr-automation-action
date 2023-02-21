import { alt } from "joi";

export type Rule = {
  reviewers: string[];
  required: number;
  assign?: number;
  ifChanged?: string[];
};

export type DefaultRules = {
  byFileGroups: Record<string, Rule[]>;
};

type Options = {
  ignoredLabels: string[];
};

export type Config = {
  fileChangesGroups: Record<string, string[]>;
  defaultRules?: DefaultRules;
  rulesByCreator: Record<string, Rule[]>;
  options?: Options;
  postReviewOptions?: {};
};

export type ReviewerBySate = {
  requiredChanges: string[];
  approve: string[];
  commeted: string[];
};

export type State = 'CHANGES_REQUESTED' | 'APPROVED' | 'COMMETED';

export type Author = {
  login: string;
};

export interface Reviewer {
  author: Author;
  state: State;
  body: string;
  createdAt?: Date;
  updatedAt?: Date;
  submittedAt?: Date;
}
