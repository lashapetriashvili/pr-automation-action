import { withDebugLog } from '../utils';

import {
  sageClient as sageClientFunc,
} from './sage';

export const sageClient = withDebugLog(sageClientFunc);
