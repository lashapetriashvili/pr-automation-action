import { expect } from 'chai';
import { Checks } from '../config/typings';
import { areCIChecksPassed } from './identify-ci';

const checksExample: Checks['check_runs'][0] = {
  id: 123456789,
  name: 'test',
  node_id: 'CR_kwDOI96ACv7RnFA',
  head_sha: 'fd7939a8109877cb96576d666e32db5c',
  external_id: '6189ca65-e70d-51b1-22754dbd6f9',
  url: 'http://test.com/check-runs/11806205716',
  html_url: 'http://test.com/actions/runs/4348595805/jobs/123456789',
  details_url: 'http://test.com/actions/runs/4348595805/jobs/123456789',
  status: 'in_progress',
  conclusion: null,
  started_at: '2023-03-06T22:34:31Z',
  completed_at: null,
  output: {
    title: null,
    summary: null,
    text: null,
    annotations_count: 0,
    annotations_url: 'http://test.com/check-runs/11806205716/annotations',
  },
  check_suite: {
    id: 12345678,
  },
  app: {
    id: 1234,
    slug: 'github-actions',
    node_id: 'MDM6QXBwMTUzNjg=',
    owner: {
      login: 'github',
      id: 1234,
      node_id: 'MDEyOk9yZ2FuaXk5MTk=',
      avatar_url: 'https://avatars.test.com/u/9919?v=4',
      gravatar_id: '',
      url: 'http://api.test.com/users/github',
      html_url: 'http://test.com/github',
      followers_url: 'http://api.test.com/users/github/followers',
      following_url: 'http://api.test.com/users/github/following{/other_user}',
      gists_url: 'http://api.test.com/users/github/gists{/gist_id}',
      starred_url: 'http://api.test.com/users/github/starred{/owner}{/repo}',
      subscriptions_url: 'http://api.test.com/users/github/subscriptions',
      organizations_url: 'http://api.test.com/users/github/orgs',
      repos_url: 'http://api.test.com/users/github/repos',
      events_url: 'http://api.test.com/users/github/events{/privacy}',
      received_events_url: 'http://api.test.com/users/github/received_events',
      type: 'Organization',
      site_admin: false,
    },
    name: 'GitHub Actions',
    description: 'test',
    external_url: 'https://help.github.com/en/actions',
    html_url: 'http://test.com/apps/github-actions',
    created_at: '2018-07-30T09:30:17Z',
    updated_at: '2019-12-10T19:04:12Z',
    permissions: {
      actions: 'write',
      administration: 'read',
      checks: 'write',
      contents: 'write',
      deployments: 'write',
      discussions: 'write',
      issues: 'write',
      merge_queues: 'write',
      metadata: 'read',
      packages: 'write',
      pages: 'write',
      pull_requests: 'write',
      repository_hooks: 'write',
      repository_projects: 'write',
      security_events: 'write',
      statuses: 'write',
      vulnerability_alerts: 'read',
    },
    events: [
      'branch_protection_rule',
      'check_run',
      'check_suite',
      'create',
      'delete',
      'deployment',
      'deployment_status',
      'discussion',
      'discussion_comment',
      'fork',
      'gollum',
      'issues',
      'issue_comment',
      'label',
      'merge_group',
      'milestone',
      'page_build',
      'project',
      'project_card',
      'project_column',
      'public',
      'pull_request',
      'pull_request_review',
      'pull_request_review_comment',
      'push',
      'registry_package',
      'release',
      'repository',
      'repository_dispatch',
      'status',
      'watch',
      'workflow_dispatch',
      'workflow_run',
    ],
  },
  pull_requests: [
    {
      url: 'http://test.com/pulls/80',
      id: 123456789,
      number: 80,
      head: {
        ref: 'test',
        sha: 'f8fd79377cb96576d666e32775a2fdb5c',
        repo: {
          id: 123456789,
          url: 'http://test.com',
          name: 'test',
        },
      },
      base: {
        ref: 'main',
        sha: '95bb33c74f4a1099048a798b3feb89097fc',
        repo: {
          id: 123456789,
          url: 'http://test.com',
          name: 'test',
        },
      },
    },
  ],
};

function generateCheckRunData(
  name: string,
  status: 'in_progress' | 'queued' | 'completed',
  conclusion:
    | 'success'
    | 'failure'
    | 'neutral'
    | 'cancelled'
    | 'skipped'
    | 'timed_out'
    | 'action_required'
    | null,
): Checks['check_runs'][0] {
  return {
    ...checksExample,
    name,
    status,
    conclusion,
  };
}

describe('should test areCIChecksPassed: ', () => {
  it('should return true if there is not any required CI checks', () => {
    const checks: Checks = {
      total_count: 0,
      check_runs: [],
    };

    expect(areCIChecksPassed(checks, [])).to.be.equal(true);
    expect(areCIChecksPassed(checks, undefined)).to.be.equal(true);
  });

  const checks: Checks = {
    total_count: 3,
    check_runs: [
      generateCheckRunData('test', 'in_progress', null),
      generateCheckRunData('test 2', 'completed', 'success'),
      generateCheckRunData('test 3', 'completed', 'timed_out'),
    ],
  };

  it('should return error message if required CI checks in progress', () => {
    const result = areCIChecksPassed(checks, ['test']);

    expect(result).to.be.equal('Waiting for "test" CI check to pass.');
  });

  it('should return true if required CI checks is completed', () => {
    const result = areCIChecksPassed(checks, ['test 2']);

    expect(result).to.be.equal(true);
  });

  it('should return error message if required CI checks is failed', () => {
    const result = areCIChecksPassed(checks, ['test 3']);

    expect(result).to.be.equal('Waiting for "test 3" CI check to pass.');
  });
});
