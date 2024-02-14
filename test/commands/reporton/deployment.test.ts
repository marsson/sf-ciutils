import { TestContext } from '@salesforce/core/lib/testSetup.js';
import { expect } from 'chai';
import { stubSfCommandUx } from '@salesforce/sf-plugins-core';
import ReportonDeployment from '../../../src/commands/reporton/deployment.js';

describe('reporton deployment', () => {
  const $$ = new TestContext();
  let sfCommandStubs: ReturnType<typeof stubSfCommandUx>;

  beforeEach(() => {
    sfCommandStubs = stubSfCommandUx($$.SANDBOX);
  });

  afterEach(() => {
    $$.restore();
  });

  it('runs reporton deployment with a specific deployment ID', async () => {
    // Replace '0AfExampleId' with a mock or example deployment ID appropriate for your tests
    const deploymentId = '0AfExampleId';
    await ReportonDeployment.run(['--deploymentid', deploymentId, '--target-org', 'testOrg']);
    const output = sfCommandStubs.log
      .getCalls()
      .flatMap((c) => c.args)
      .join('\n');
    // Adjust expected output based on your command's logging
    expect(output).to.include(`Deployment ID | ${deploymentId}`);
  });

  it('runs reporton deployment with --json and specific deployment ID', async () => {
    const deploymentId = '0AfExampleId';
    const result = await ReportonDeployment.run(['--deploymentid', deploymentId, '--target-org', 'testOrg', '--json']);
    // Adjust these expectations based on the actual JSON output of your command
    expect(result.id).to.equal(deploymentId);
    // Add additional checks as needed for other properties in your JSON output
  });

  // Add additional tests as necessary for other scenarios, such as awaiting completion, invalid IDs, etc.
});
