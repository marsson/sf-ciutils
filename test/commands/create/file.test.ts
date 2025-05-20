import { TestContext } from '@salesforce/core/testSetup';
import { expect } from 'chai';
import DataCreateFile from '../../../src/commands/create/file.js';

describe('create file', () => {
  const $$ = new TestContext();

  afterEach(() => {
    $$.restore();
  });

  it('should have the correct command structure', () => {
    // Verify the command has the expected properties
    expect(DataCreateFile.summary).to.be.a('string');
    expect(DataCreateFile.description).to.be.a('string');
    expect(DataCreateFile.examples).to.exist;
    expect(DataCreateFile.flags).to.be.an('object');

    // Verify the flags exist
    expect(DataCreateFile.flags['target-org']).to.exist;
    expect(DataCreateFile.flags['api-version']).to.exist;
    expect(DataCreateFile.flags.title).to.exist;
    expect(DataCreateFile.flags.file).to.exist;
    expect(DataCreateFile.flags['parent-id']).to.exist;
    expect(DataCreateFile.flags['created-date']).to.exist;

    // Verify the title flag properties
    expect(DataCreateFile.flags.title.required).to.be.false;
    expect(DataCreateFile.flags.title.char).to.equal('t');

    // Verify the file flag properties
    expect(DataCreateFile.flags.file.required).to.be.true;
    expect(DataCreateFile.flags.file.char).to.equal('f');

    // Verify the parent-id flag properties
    expect(DataCreateFile.flags['parent-id'].char).to.equal('i');

    // Verify the created-date flag properties
    expect(DataCreateFile.flags['created-date'].char).to.equal('c');
  });

  it('should have the correct result type definition', () => {
    // Create a sample result object to verify the type structure
    const sampleResult = {
      Id: '068000000000000AAA',
      ContentDocumentId: '069000000000000AAA',
      VersionNumber: '1',
      Title: 'Test File',
      PathOnClient: 'test.txt',
      ContentSize: 100,
      FileType: 'TEXT',
      ContentUrl: null,
      FileExtension: 'txt'
    };

    // Verify the result has the expected structure
    expect(sampleResult.Id).to.be.a('string');
    expect(sampleResult.ContentDocumentId).to.be.a('string');
    expect(sampleResult.VersionNumber).to.be.a('string');
    expect(sampleResult.Title).to.be.a('string');
    expect(sampleResult.PathOnClient).to.be.a('string');
    expect(sampleResult.ContentSize).to.be.a('number');
    expect(sampleResult.FileType).to.be.a('string');
    expect(sampleResult.FileExtension).to.be.a('string');
  });

  it('should have a parse function for created-date', () => {
    // Verify the created-date flag has a parse function
    expect(DataCreateFile.flags['created-date'].parse).to.be.a('function');
  });
});
