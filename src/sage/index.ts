import { withDebugLog } from '../utils';

import {
  sageClient as sageClientFunc,
  getEmployeesWhoDontWorkToday as getEmployeesWhoDontWorkTodayFunc,
  filterReviewersWhoDontWorkToday as filterReviewersWhoDontWorkTodayFunc,
  getLeaveManagement as getLeaveManagementFunc,
} from './sage';

export const sageClient = withDebugLog(sageClientFunc);
export const getEmployeesWhoDontWorkToday = withDebugLog(getEmployeesWhoDontWorkTodayFunc);
export const filterReviewersWhoDontWorkToday = withDebugLog(filterReviewersWhoDontWorkTodayFunc);
export const getLeaveManagement = withDebugLog(getLeaveManagementFunc);
