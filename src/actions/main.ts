import { inspect } from 'util';
import * as core from '@actions/core';
import { Inputs, Merger, Strategy, labelStrategies } from './merger';

async function run(): Promise<void> {
  try {
    const [owner, repo] = core.getInput('repository').split('/');

    const inputs: Inputs = {
      comment: core.getInput('comment'),
      ignoreLabels:
        core.getInput('ignoreLabels') === ''
          ? []
          : core.getInput('ignoreLabels').split(','),
      ignoreLabelsStrategy: core.getInput('labelsStrategy') as labelStrategies,
      labels: core.getInput('labels') === '' ? [] : core.getInput('labels').split(','),
      labelsStrategy: core.getInput('labelsStrategy') as labelStrategies,
      owner,
      repo,
      pullRequestNumber: Number(core.getInput('pullRequestNumber', { required: true })),
      sha: core.getInput('sha', { required: true }),
      strategy: core.getInput('strategy', { required: true }) as Strategy,
      token: core.getInput('token', { required: true }),
    };

    core.debug(`Inputs: ${inspect(inputs)}`);

    const merger = new Merger(inputs);
    await merger.merge();
  } catch (error) {
    // @ts-ignore
    core.setFailed(error.message);
  }
}

run();
