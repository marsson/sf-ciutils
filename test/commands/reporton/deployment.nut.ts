import { execCmd, TestSession } from '@salesforce/cli-plugins-testkit';
import { expect } from 'chai';
import { ReportonDeploymentResult } from '../../../src/commands/reporton/deployment.js';

let testSession: TestSession;

describe('reporton deployment NUTs', () => {
  before('prepare session', async () => {
    testSession = await TestSession.create();
  });

  after(async () => {
    await testSession?.clean();
  });

  it('should report on a specific deployment', () => {
    // Assuming the command format is "sf reporton deployment --deploymentid <id> --json"
    // Replace <deploymentId> with a valid deployment ID for testing
    const deploymentId = '<deploymentId>';
    const result = execCmd<ReportonDeploymentResult>(`reporton deployment --deploymentid ${deploymentId} --json`, {
      ensureExitCode: 0,
    }).jsonOutput?.result;
    expect(result?.id).to.equal(deploymentId);
    // Add more assertions here as needed based on the expected output of your command
  });

  // Add more test cases here for different scenarios, such as invalid deployment IDs, awaiting completion, etc.
});
