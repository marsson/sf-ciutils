import { execCmd, TestSession } from '@salesforce/cli-plugins-testkit';
import { expect } from 'chai';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('create file NUTs', () => {
  let session: TestSession;
  let tempDir: string;
  let testFilePath: string;

  before(async () => {
    session = await TestSession.create({
      devhubAuthStrategy: 'NONE',
      project: { name: 'create-file-test' }
    });

    // Create a temporary directory for test files
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-ciutils-test-'));

    // Create a simple test file
    testFilePath = path.join(tempDir, 'test.txt');
    fs.writeFileSync(testFilePath, 'This is a test file for the create file command.');
  });

  after(async () => {
    await session?.clean();

    // Clean up the temporary directory
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should run with help flag and show help without errors', () => {
    const command = `create file --help`;
    const output = execCmd(command, { ensureExitCode: 0 }).shellOutput.stdout;
    expect(output).to.contain('Create a file in Salesforce');
  });

  it('should fail when no file is provided', () => {
    const command = `create file`;
    const result = execCmd(command, { ensureExitCode: 1 });
    expect(result.shellOutput.stderr).to.contain('Missing required flag');
  });

  it('should fail when no target org is provided', () => {
    const command = `create file --file ${testFilePath}`;
    const result = execCmd(command, { ensureExitCode: 1 });
    expect(result.shellOutput.stderr).to.contain('Missing required flag');
  });

  it('should fail with invalid created-date format', () => {
    const command = `create file --file ${testFilePath} --created-date invalid-date`;
    const result = execCmd(command, { ensureExitCode: 1 });
    expect(result.shellOutput.stderr).to.contain('Invalid datetime format');
  });

  it('should verify the test file exists', () => {
    expect(fs.existsSync(testFilePath)).to.be.true;
    expect(fs.readFileSync(testFilePath, 'utf8')).to.equal('This is a test file for the create file command.');
  });

  // Note: The following test requires an authenticated org and would be run in a CI environment
  // with proper authentication. We're commenting it out for now.
  /*
  it('should create a file in Salesforce', () => {
    // This test requires an authenticated org
    const command = `create file --file ${testFilePath} --title "Test File" --target-org myOrg`;
    const result = execCmd(command, { ensureExitCode: 0 });

    // The actual output will depend on the state of the org
    // but we can at least check that the command ran without errors
    expect(result.shellOutput.stdout).to.contain('Successfully created file');
  });
  */
});
