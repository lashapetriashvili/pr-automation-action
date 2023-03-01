import fetch from 'node-fetch';
import { info } from './logger';

export function getIssueIdFromBranch(branch: string): string | null {
  const split = branch.split('-');

  if (split.length < 2) {
    return null;
  }

  if (!split[0].match(/^[a-zA-Z]+$/)) {
    return null;
  }

  if (!split[1].match(/^[0-9]+$/)) {
    return null;
  }

  return `${split[0]}-${split[1]}`;
}

const options = (token: string) => {
  return {
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Basic ${token}`,
    },
  };
};

export function getTransitionId(transitions: any[], transitionName: string) {
  const transition = transitions.find(
    (t: any) => t.name.toLowerCase() === transitionName.toLowerCase(),
  );

  if (!transition) {
    throw new Error(`Transition ${transitionName} not found`);
  }

  return transition.id;
}

export function jiraClient(token: string) {
  const options = {
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Basic ${token}`,
    },
  };

  return async <T = any>(
    url: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: any | undefined,
  ) => {
    const res = body
      ? await fetch(url, {
          method,
          body: JSON.stringify(body),
          ...options,
        })
      : await fetch(url, { method, ...options });

    if (res.status === 200) {
      const json = await res.json();
      return json as T;
    }
  };
}

export class JiraClient {
  constructor(private token: string) {
    this.token = token;
  }

  request = async <T = any>(
    url: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: any | undefined,
  ) => {
    const res = body
      ? await fetch(url, {
          method,
          body: JSON.stringify(body),
          ...options(this.token),
        })
      : await fetch(url, { method, ...options(this.token) });

    if (res.status === 200) {
      const json = await res.json();
      return json as T;
    }
  };
}
