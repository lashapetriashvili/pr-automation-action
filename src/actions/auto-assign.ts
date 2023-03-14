import { info, error, warning, debug } from '../logger';
import fetch from 'node-fetch';

export async function run(): Promise<void> {
  const fetchData = async (url: string, method: string) => {
    const options = {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Auth-Token':
          'a1b6b8ac30db14623956b95990ecb221888f8c09d1c3159c782fb421b6dd3a55a7c483425371a279',
      },
    };

    return await fetch(url, { method, ...options });
  };

  const res = await fetchData('https://aleph1.sage.hr/api/employees', 'GET');

  res.json().then((data) => info(JSON.stringify(data, null, 2)));

  return;
}

run();
