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

  info(JSON.stringify(options, null, 2));

  return async <T = any>(
    url: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: any | undefined,
  ) => {

    info(`${sageBaseUrl}/api/${url}`);

    const res = body
      ? await fetch(`${sageBaseUrl}/api/${url}`, {
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
