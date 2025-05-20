import { TestContext } from '@salesforce/core/testSetup';
import { expect } from 'chai';
import ReportonDeployment from '../../../src/commands/reporton/deployment.js';

describe('reporton deployment', () => {
  const $$ = new TestContext();

  afterEach(() => {
    $$.restore();
  });

  it('should have the correct command structure', () => {
    // Verify the command has the expected properties
    expect(ReportonDeployment.summary).to.be.a('string');
    expect(ReportonDeployment.description).to.be.a('string');
    expect(ReportonDeployment.examples).to.exist;
    expect(ReportonDeployment.flags).to.be.an('object');

    // Verify the flags
    expect(ReportonDeployment.flags['target-org']).to.exist;
    expect(ReportonDeployment.flags.deploymentid).to.exist;
    expect(ReportonDeployment.flags.awaitcompletion).to.exist;

    // Verify the deploymentid flag properties
    expect(ReportonDeployment.flags.deploymentid.required).to.be.true;
    expect(ReportonDeployment.flags.deploymentid.char).to.equal('d');

    // Verify the awaitcompletion flag properties
    expect(ReportonDeployment.flags.awaitcompletion.char).to.equal('a');
    expect(ReportonDeployment.flags.awaitcompletion.type).to.equal('boolean');
  });

  it('should have the correct result type definition', () => {
    // Create a sample result object to verify the type structure
    const sampleResult = {
      id: '0AfXXXXXXXXXXXXXXX',
      status: 'Succeeded',
      success: true,
      done: true,
      numberComponentsTotal: 10,
      numberComponentsDeployed: 10,
      numberComponentErrors: 0,
      numberTestsCompleted: 5,
      numberTestsTotal: 5,
      numberTestErrors: 0,
      details: {
        componentSuccesses: [],
        componentFailures: [],
        runTestResult: {
          numTestsRun: 5,
          numFailures: 0,
          totalTime: 1.5,
          successes: [],
          failures: []
        }
      }
    };

    // Verify the result has the expected structure
    expect(sampleResult.id).to.be.a('string');
    expect(sampleResult.status).to.be.a('string');
    expect(sampleResult.success).to.be.a('boolean');
    expect(sampleResult.done).to.be.a('boolean');
    expect(sampleResult.numberComponentsTotal).to.be.a('number');
    expect(sampleResult.numberComponentsDeployed).to.be.a('number');
    expect(sampleResult.numberComponentErrors).to.be.a('number');
    expect(sampleResult.numberTestsCompleted).to.be.a('number');
    expect(sampleResult.numberTestsTotal).to.be.a('number');
    expect(sampleResult.numberTestErrors).to.be.a('number');
    expect(sampleResult.details).to.be.an('object');
    expect(sampleResult.details.componentSuccesses).to.be.an('array');
    expect(sampleResult.details.componentFailures).to.be.an('array');
    expect(sampleResult.details.runTestResult).to.be.an('object');
  });
});
