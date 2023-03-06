/* import { expect } from 'chai'; */
/* import { Checks } from '../config/typings'; */
/* import { areCIChecksPassed } from './identify-ci'; */
/**/
/* const checks: Checks = { */
/*   total_count: 4, */
/*   check_runs: [ */
/*     { */
/*       id: 12345, */
/*       head_sha: 'a1b2c3d4e5f6', */
/*       node_id: 'MDEyOkNoZWNrUmV1bjoyMjQ5MjQ5', */
/*       name: 'Lint', */
/*       status: 'completed', */
/*       conclusion: 'success', */
/*       started_at: '2023-03-05T10:15:00Z', */
/*       completed_at: '2023-03-05T10:20:00Z', */
/*       external_id: '12345', */
/*       url: 'test.com', */
/*       details_url: 'test.com', */
/*       check_suite: { */
/*         id: 12345, */
/*         node_id: 'MDEyOkNoZWNrU3VpdGU6MjI0OTI0OQ==', */
/*         head_branch: 'master', */
/*         head_sha: 'a1b2c3d4e5f6', */
/*         } */
/*       output: { */
/*         title: 'Lint Results', */
/*         summary: 'No linting errors found', */
/*         annotations_count: 0, */
/*         annotations_url: */
/*           'https://api.github.com/repos/octocat/Hello-World/check-runs/12345/annotations', */
/*         text: 'No linting errors found', */
/*       }, */
/*       html_url: 'https://github.com/octocat/Hello-World/runs/12345', */
/*     }, */
/*   ], */
/* }; */
/**/
/* // Generate function with return several data from Checks interface */
/* // function should get  */
/**/
/* describe('should test checkCI: ', () => { */
/*   it('should return false if there are more than one CI checks in progress', () => { */
/*     // Generate only required example data from Checks interface */
/*     const checks: Checks = { */
/*       total_count: 4, */
/*       check_runs: [ */
/*         { */
/*           id: 12345, */
/*           head_sha: 'a1b2c3d4e5f6', */
/*           name: 'Lint', */
/*           status: 'completed', */
/*           conclusion: 'success', */
/*           started_at: '2023-03-05T10:15:00Z', */
/*           completed_at: '2023-03-05T10:20:00Z', */
/*           output: { */
/*             title: 'Lint Results', */
/*             summary: 'No linting errors found', */
/*             annotations_count: 0, */
/*             annotations_url: */
/*               'https://api.github.com/repos/octocat/Hello-World/check-runs/12345/annotations', */
/*             text: 'No linting errors found', */
/*           }, */
/*           html_url: 'https://github.com/octocat/Hello-World/runs/12345', */
/*         }, */
/*       ], */
/*     }; */
/**/
/*     const result = areCIChecksPassed(checks); */
/**/
/*     expect(result).to.be.equal(false); */
/*   }); */
/**/
/*   it('should return true if there is one "in_progress" CI and other "success" CI', () => { */
/*     const checks: Checks = { */
/*       total_count: 3, */
/*       check_runs: [ */
/*         { */
/*           name: 'test', */
/*           status: 'completed', */
/*           conclusion: 'success', */
/*         }, */
/*         { */
/*           name: 'test 2', */
/*           status: 'in_progress', */
/*           conclusion: '', */
/*         }, */
/*         { */
/*           name: 'test 3', */
/*           status: 'in_progress', */
/*           conclusion: 'success', */
/*         }, */
/*       ], */
/*     }; */
/**/
/*     const result = areCIChecksPassed(checks); */
/**/
/*     expect(result).to.be.equal(true); */
/*   }); */
/**/
/*   it('should return false if there is list one error CI', () => { */
/*     const checks: Checks = { */
/*       total_count: 3, */
/*       check_runs: [ */
/*         { */
/*           name: 'test', */
/*           status: 'completed', */
/*           conclusion: 'success', */
/*         }, */
/*         { */
/*           name: 'test 2', */
/*           status: 'in_progress', */
/*           conclusion: '', */
/*         }, */
/*         { */
/*           name: 'test 3', */
/*           status: 'in_progress', */
/*           conclusion: 'error', */
/*         }, */
/*       ], */
/*     }; */
/**/
/*     const result = areCIChecksPassed(checks); */
/**/
/*     expect(result).to.be.equal(false); */
/*   }); */
/* }); */
