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

export class JiraClient {
  constructor(private token: string) {
    this.token = token;
  }

  request = async <T = any>(
    url: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: any | undefined,
  ) => {
    info(JSON.stringify({ url, method, body }, null, 2));
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
