import { Checks } from '../config/typings';
import { warning } from '../logger';

export function checkCI(checks: Checks): boolean {
  if (checks.check_runs.some((check) => check.status !== 'completed')) {
    warning('Waiting for CI checks to complete.');
    return false;
  }

  return true;
}
