import { execCmd, TestSession } from '@salesforce/cli-plugins-testkit';
import { expect } from 'chai';

describe('reporton deployment NUTs', () => {
  let session: TestSession;

  before(async () => {
    session = await TestSession.create({
      devhubAuthStrategy: 'NONE',
      project: { name: 'reporton-deployment-test' }
    });
  });

  after(async () => {
    await session?.clean();
  });

  it('should run with help flag and show help without errors', () => {
    const command = `reporton deployment --help`;
    const output = execCmd(command, { ensureExitCode: 0 }).shellOutput.stdout;
    expect(output).to.contain('Report on deployment status');
  });

  it('should fail when no deploymentid is provided', () => {
    const command = `reporton deployment`;
    const result = execCmd(command, { ensureExitCode: 1 });
    expect(result.shellOutput.stderr).to.contain('Missing required flag');
  });

  it('should fail when no target org is provided', () => {
    const command = `reporton deployment --deploymentid 0Af0000000000000AAA`;
    const result = execCmd(command, { ensureExitCode: 1 });
    expect(result.shellOutput.stderr).to.contain('Missing required flag');
  });

  it('should fail with invalid deployment ID format', () => {
    const command = `reporton deployment --deploymentid invalid-id`;
    const result = execCmd(command, { ensureExitCode: 1 });
    expect(result.shellOutput.stderr).to.contain('Expected a Salesforce ID');
  });

  // Note: The following test requires an authenticated org and would be run in a CI environment
  // with proper authentication. We're commenting it out for now.
  /*
  it('should report on deployment status', () => {
    // This test requires an authenticated org and a valid deployment ID
    const command = `reporton deployment --deploymentid 0Af0000000000000AAA --target-org myOrg`;
    const result = execCmd(command, { ensureExitCode: 0 });

    // The actual output will depend on the state of the deployment
    // but we can at least check that the command ran without errors
    expect(result.shellOutput.stdout).to.satisfy((text: string) => {
      return text.includes('Analysing') ||
             text.includes('Job ID');
    });
  });
  */
});
