import fetch from 'node-fetch';
import { info } from '../logger';

export function sageClient({
  sageBaseUrl,
  sageToken,
}: {
  sageBaseUrl: string;
  sageToken: string;
}) {
  const options = {
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Auth-Token': sageToken,
    },
  };

  return async <T = any>(
    url: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: any | undefined,
  ) => {
    const res = body
      ? await fetch(`https://aleph1.sage.hr/api/employees`, {
          method,
          body: JSON.stringify(body),
          ...options,
        })
      : await fetch(url, { method, ...options });

    info(`Sage response: ${JSON.stringify(res, null, 2)}`);

    if (res.status === 200) {
      const json = await res.json();
      return json as T;
    }
  };
}
