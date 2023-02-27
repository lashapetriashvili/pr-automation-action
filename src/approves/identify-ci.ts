import { Checks } from '../config/typings';
import { warning, info } from '../logger';

export function checkCI(checks: Checks): boolean {
  info(JSON.stringify(checks, null, 2));

  if (checks.check_runs.some((check) => check.status !== 'completed')) {
    warning('Waiting for CI checks to complete.');
    return false;
  }

  return true;
}
