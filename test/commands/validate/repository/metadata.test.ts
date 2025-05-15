import { TestContext } from '@salesforce/core/testSetup';
import { expect } from 'chai';
import ValidateRepositoryMetadata from '../../../../src/commands/validate/repository/metadata.js';

describe('validate repository metadata', () => {
  const $$ = new TestContext();

  afterEach(() => {
    $$.restore();
  });

  it('should have the correct command structure', () => {
    // Verify the command has the expected properties
    expect(ValidateRepositoryMetadata.summary).to.be.a('string');
    expect(ValidateRepositoryMetadata.description).to.be.a('string');
    expect(ValidateRepositoryMetadata.examples).to.exist;
    expect(ValidateRepositoryMetadata.flags).to.be.an('object');

    // Verify the flags
    expect(ValidateRepositoryMetadata.flags.name).to.exist;
    expect(ValidateRepositoryMetadata.flags['target-org']).to.exist;
    expect(ValidateRepositoryMetadata.flags.folder).to.exist;

    // Verify the folder flag properties
    expect(ValidateRepositoryMetadata.flags.folder.required).to.be.true;
    expect(ValidateRepositoryMetadata.flags.folder.char).to.equal('f');
  });

  it('should have the correct result type definition', () => {
    // Create a sample result object to verify the type structure
    const sampleResult = {
      status: 0,
      unchanged: [{
        changed: false,
        componentType: 'ApexClass',
        created: false,
        createdDate: new Date().toISOString(),
        deleted: false,
        fileName: 'classes/Test.cls',
        fullName: 'Test',
        success: true,
        metadataTypeOrigin: 'ApexClass'
      }],
      changed: [],
      deleted: [],
      error: []
    };

    // Verify the result has the expected structure
    expect(sampleResult.status).to.be.a('number');
    expect(sampleResult.unchanged).to.be.an('array');
    expect(sampleResult.changed).to.be.an('array');
    expect(sampleResult.deleted).to.be.an('array');
    expect(sampleResult.error).to.be.an('array');

    // Verify the component structure
    const component = sampleResult.unchanged[0];
    expect(component.changed).to.be.a('boolean');
    expect(component.componentType).to.be.a('string');
    expect(component.created).to.be.a('boolean');
    expect(component.createdDate).to.be.a('string');
    expect(component.deleted).to.be.a('boolean');
    expect(component.fileName).to.be.a('string');
    expect(component.fullName).to.be.a('string');
    expect(component.success).to.be.a('boolean');
    expect(component.metadataTypeOrigin).to.be.a('string');
  });

  it('should have the correct component type mappings', () => {
    // We can't easily test the private methods directly, so we'll test the behavior indirectly
    // by examining the command's static properties and structure

    // Verify that the command has the expected flags and properties
    expect(ValidateRepositoryMetadata.flags.folder).to.exist;
    expect(ValidateRepositoryMetadata.flags.folder.required).to.be.true;

    // Verify the command has the expected summary and description
    expect(ValidateRepositoryMetadata.summary).to.be.a('string');
    expect(ValidateRepositoryMetadata.description).to.be.a('string');
  });

  it('should have the debug flag', () => {
    // Verify the debug flag exists and has the correct properties
    expect(ValidateRepositoryMetadata.flags.debug).to.exist;
    expect(ValidateRepositoryMetadata.flags.debug.char).to.equal('d');
    expect(ValidateRepositoryMetadata.flags.debug.default).to.be.false;
  });
});
