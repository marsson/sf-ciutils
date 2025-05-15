import { execCmd, TestSession } from '@salesforce/cli-plugins-testkit';
import { expect } from 'chai';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('validate repository metadata NUTs', () => {
  let session: TestSession;
  let tempDir: string;

  before(async () => {
    session = await TestSession.create({
      devhubAuthStrategy: 'NONE',
      project: { name: 'validate-repo-metadata-test' }
    });

    // Create a temporary directory for test files
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-ciutils-test-'));

    // Create a simple metadata structure for testing
    const classesDir = path.join(tempDir, 'classes');
    fs.mkdirSync(classesDir, { recursive: true });

    // Create a simple Apex class file
    fs.writeFileSync(
      path.join(classesDir, 'TestClass.cls'),
      'public class TestClass { public static void testMethod() { System.debug(\'Hello World\'); } }'
    );

    // Create a metadata XML file
    fs.writeFileSync(
      path.join(classesDir, 'TestClass.cls-meta.xml'),
      '<?xml version="1.0" encoding="UTF-8"?>\n<ApexClass xmlns="http://soap.sforce.com/2006/04/metadata">\n    <apiVersion>58.0</apiVersion>\n    <status>Active</status>\n</ApexClass>'
    );
  });

  after(async () => {
    await session?.clean();

    // Clean up the temporary directory
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should run with folder flag and show help without errors', () => {
    const command = `validate repository metadata --help`;
    const output = execCmd(command, { ensureExitCode: 0 }).shellOutput.stdout;
    expect(output).to.contain('Validates the metadata in the repository');
  });

  it('should fail when no folder is provided', () => {
    const command = `validate repository metadata`;
    const result = execCmd(command, { ensureExitCode: 1 });
    expect(result.shellOutput.stderr).to.contain('Missing required flag');
  });

  it('should fail when no target org is provided', () => {
    const command = `validate repository metadata --folder ${tempDir}`;
    const result = execCmd(command, { ensureExitCode: 1 });
    expect(result.shellOutput.stderr).to.contain('Missing required flag');
  });

  // Note: The following test requires an authenticated org and would be run in a CI environment
  // with proper authentication. We're commenting it out for now.
  /*
  it('should validate repository metadata against an org', () => {
    // This test requires an authenticated org
    const command = `validate repository metadata --folder ${tempDir} --target-org myOrg`;
    const output = execCmd(command, { ensureExitCode: 0 }).shellOutput.stdout;

    // The actual output will depend on the state of the org and the local files
    // but we can at least check that the command ran without errors
    expect(output).to.satisfy((text: string) => {
      return text.includes('Result Status: Repo in sync') ||
             text.includes('Components Altered in ORG') ||
             text.includes('Error on component validation to ORG');
    });

    // Verify that no components are reported as "Unknown" type
    expect(output).to.not.include('Type: Unknown');
  });
  */

  it('should create a proper file structure for testing', () => {
    // Verify that our test setup created the expected files
    expect(fs.existsSync(path.join(tempDir, 'classes'))).to.be.true;
    expect(fs.existsSync(path.join(tempDir, 'classes', 'TestClass.cls'))).to.be.true;
    expect(fs.existsSync(path.join(tempDir, 'classes', 'TestClass.cls-meta.xml'))).to.be.true;

    // Create additional test files for different metadata types
    const objectsDir = path.join(tempDir, 'objects');
    fs.mkdirSync(objectsDir, { recursive: true });

    // Create a custom object
    fs.writeFileSync(
      path.join(objectsDir, 'TestObject__c.object-meta.xml'),
      '<?xml version="1.0" encoding="UTF-8"?>\n<CustomObject xmlns="http://soap.sforce.com/2006/04/metadata">\n    <label>Test Object</label>\n    <pluralLabel>Test Objects</pluralLabel>\n    <nameField>\n        <label>Name</label>\n        <type>Text</type>\n    </nameField>\n    <deploymentStatus>Deployed</deploymentStatus>\n    <sharingModel>ReadWrite</sharingModel>\n</CustomObject>'
    );

    // Verify the new files were created
    expect(fs.existsSync(path.join(objectsDir, 'TestObject__c.object-meta.xml'))).to.be.true;
  });
});
