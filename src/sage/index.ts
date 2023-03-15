import { withDebugLog } from '../utils';

import {
  sageClient as sageClientFunc,
  getEmployees as getEmployeesFunc,
  getLeaveManagement as getLeaveManagementFunc,
} from './sage';

export const sageClient = withDebugLog(sageClientFunc);
export const getEmployees = withDebugLog(getEmployeesFunc);
export const getLeaveManagement = withDebugLog(getLeaveManagementFunc);
