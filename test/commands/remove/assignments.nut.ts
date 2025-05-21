import { execCmd, TestSession } from '@salesforce/cli-plugins-testkit';
import { expect } from 'chai';

describe('remove assignments NUTs', () => {
  let session: TestSession;

  before(async () => {
    session = await TestSession.create({
      devhubAuthStrategy: 'NONE',
      project: { name: 'remove-assignments-test' }
    });
  });

  after(async () => {
    await session?.clean();
  });

  it('should run with help flag and show help without errors', () => {
    const command = `remove assignments --help`;
    const output = execCmd(command, { ensureExitCode: 0 }).shellOutput.stdout;
    expect(output).to.contain('Remove assignments from users');
  });

  it('should fail when no object is provided', () => {
    const command = `remove assignments --usernames user@example.com`;
    const result = execCmd(command, { ensureExitCode: 1 });
    expect(result.shellOutput.stderr).to.contain('Missing required flag');
  });

  it('should fail when no usernames are provided', () => {
    const command = `remove assignments --object PermissionSet`;
    const result = execCmd(command, { ensureExitCode: 1 });
    expect(result.shellOutput.stderr).to.contain('Missing required flag');
  });

  it('should fail when no target org is provided', () => {
    const command = `remove assignments --object PermissionSet --usernames user@example.com`;
    const result = execCmd(command, { ensureExitCode: 1 });
    expect(result.shellOutput.stderr).to.contain('Missing required flag');
  });

  // Note: The following test requires an authenticated org and would be run in a CI environment
  // with proper authentication. We're commenting it out for now.
  /*
  it('should remove assignments from users', () => {
    // This test requires an authenticated org
    const command = `remove assignments --object PermissionSet --usernames user@example.com --target-org myOrg`;
    const output = execCmd(command, { ensureExitCode: 0 }).shellOutput.stdout;

    // The actual output will depend on the state of the org and the users
    // but we can at least check that the command ran without errors
    expect(output).to.satisfy((text: string) => {
      return text.includes('Finalized proccess') ||
             text.includes('Finalized Awesomely');
    });
  });
  */
});
