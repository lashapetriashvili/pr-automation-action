import { Checks } from '../config/typings';
import { warning } from '../logger';

export function checkCI(checks: Checks): boolean {
  const totalInProgress = checks.check_runs.filter((check) => {
    if (check.conclusion === 'in_progress') {
      return true;
    }
  }).length;

  if (totalInProgress > 1) {
    warning(`Waiting for ${totalInProgress - 1} CI checks to finish.`);

    return false;
  }

  const totalStatus = checks.total_count;
  const totalSuccessStatuses = checks.check_runs.filter(
    (check) => check.conclusion === 'success' || check.conclusion === 'skipped',
  ).length;

  if (totalStatus - 1 !== totalSuccessStatuses) {
    warning(
      `Not all status success, ${totalSuccessStatuses} out of ${
        totalStatus - 1
      } (ignored this check) success`,
    );
    return false;
  }

  return true;
}
