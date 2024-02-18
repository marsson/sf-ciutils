import { execCmd, TestSession } from '@salesforce/cli-plugins-testkit';
import { expect } from 'chai';
import { ReportonDeploymentResult } from '../../../src/commands/reporton/deployment.js';

let testSession: TestSession;

const testUsername = 'user@my.test';

describe('Report on deploymet nuts', () => {
  before('prepare session', async () => {
    testSession = await TestSession.create();
  });

  after(async () => {
    await testSession?.clean();
  });

  it('should report on an existing deployment waiting for it to finish', () => {
    const result = execCmd<ReportonDeploymentResult>(
      `reporton deployment -o ${testUsername} -d "0Af8C00000Ta1sMSAR"  -a`,
      { ensureExitCode: 0 }
    ).jsonOutput?.result;
    expect(result?.id).to.equal('976549765');
  });

  // it('should say hello to a given person', () => {
  //  const result = execCmd<ReportOnDeploymentResult>('hello world --name Astro --json', {
  //    ensureExitCode: 0,
  //  }).jsonOutput?.result;
  //  expect(result?.name).to.equal('Astro');
  //  expect(result?.name).to.equal('Astro');
  // });
});
