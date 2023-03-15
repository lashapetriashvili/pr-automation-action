import { withDebugLog } from '../utils';

import {
  sageClient as sageClientFunc,
  getEmployeesWhoDontWorkToday as getEmployeesWhoDontWorkTodayFunc,
  getLeaveManagement as getLeaveManagementFunc,
} from './sage';

export const sageClient = withDebugLog(sageClientFunc);
export const getEmployeesWhoDontWorkToday = withDebugLog(getEmployeesWhoDontWorkTodayFunc);
export const getLeaveManagement = withDebugLog(getLeaveManagementFunc);
