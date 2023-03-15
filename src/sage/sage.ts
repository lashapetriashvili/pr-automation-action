import fetch from 'node-fetch';
import { info } from '../logger';

type SageResponse<T> = {
  data: T[];
  meta: {
    current_page: number;
    next_page: number | null;
    per_page: number;
    total_pages: number;
    total_count: number;
  };
};

type SageEmployee = SageResponse<{
  id: number;
  first_name: string;
  last_email: string;
  email: string;
}>;

type SageLeaveManagement = SageResponse<{
  id: string;
  status: string;
  status_code: 'approved' | 'canceled';
  start_date: string;
  end_date: string;
  employee_id: number;
}>;

export async function getEmployees({
  sageBaseUrl,
  sageToken,
  reviewersEmails,
}: {
  sageBaseUrl: string;
  sageToken: string;
  reviewersEmails: string[];
}): Promise<string[]> {
  const client = sageClient({
    sageBaseUrl,
    sageToken,
  });

  const leaveManagement = await getLeaveManagement({
    sageBaseUrl,
    sageToken,
  });

  info(JSON.stringify(leaveManagement));

  let page: number | null = 1;
  let data: string[] = [];

  do {
    const sageResponse: SageEmployee | undefined = await client(
      `employees?page=${page}`,
      'GET',
    );

    if (sageResponse !== undefined) {
      page = sageResponse.meta.next_page;

      const employees = sageResponse.data.filter((employee) =>
        leaveManagement.includes(employee.id),
      );

      data = [...data, ...employees.map((employee) => employee.email)];
    } else {
      page = null;
    }
  } while (page !== null);

  info(JSON.stringify(data));

  const filteredEmployees = data.filter(
    (employee) => !reviewersEmails.includes(employee),
  );

  info(JSON.stringify(filteredEmployees));

  return filteredEmployees;
}

export async function getLeaveManagement({
  sageBaseUrl,
  sageToken,
}: {
  sageBaseUrl: string;
  sageToken: string;
}): Promise<number[]> {
  const client = sageClient({
    sageBaseUrl,
    sageToken,
  });

  /* const from = new Date().toISOString().split('T')[0]; */
  /* const to = new Date().toISOString().split('T')[0]; */
  const from = '2023-03-14';
  const to = '2023-03-14';

  let page: number | null = 1;
  let data: number[] = [];

  do {
    const sageResponse: SageLeaveManagement | undefined = await client(
      `leave-management/requests?from=${from}&to=${to}&page=${page}`,
      'GET',
    );

    if (sageResponse !== undefined) {
      page = sageResponse.meta.next_page;

      const approvedLeaveManagement = sageResponse.data.filter(
        (leaveManagement) => leaveManagement.status_code === 'approved',
      );

      data = [
        ...data,
        ...approvedLeaveManagement.map((leaveManagement) => leaveManagement.employee_id),
      ];
    } else {
      page = null;
    }
  } while (page !== null);

  return data;
}

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
    const fullUrl = `${sageBaseUrl}/api/${url}`;

    info(`Sage request: ${fullUrl}`);
    const res = body
      ? await fetch(fullUrl, {
          method,
          body: JSON.stringify(body),
          ...options,
        })
      : await fetch(fullUrl, { method, ...options });

    if (res.status === 200) {
      const json = await res.json();
      return json as T;
    } else {
      return undefined;
    }
  };
}
