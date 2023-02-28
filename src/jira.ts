import fetch from 'node-fetch';
import { info } from './logger';

const options = (token: string) => {
  return {
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Basic ${token}`,
    },
  };
};

export default class JiraClient {
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
      info('Jira request success');
      info(JSON.stringify(res, null, 2));
      const json = await res.json();
      return json as T;
    }
  };
}
