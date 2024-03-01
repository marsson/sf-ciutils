// import { join } from 'node:path';
import { stubMethod } from '@salesforce/ts-sinon';
// import { Config } from '@oclif/core';
import { Messages, ConfigFile } from '@salesforce/core';
// import { Ux } from '@salesforce/sf-plugins-core';
import { execCmd } from '@salesforce/cli-plugins-testkit';
// import { ensureJsonMap, ensureString, AnyJson } from '@salesforce/ts-types';
// import { isString } from '@salesforce/ts-types';
// import { MetadataApiDeploy } from '@salesforce/source-deploy-retrieve';
import { expect } from 'chai';
import { TestContext, MockTestOrgData } from '@salesforce/core/lib/testSetup.js';
import ReportonDeploymentResult from '../../../src/commands/reporton/deployment.js';
// import { DeployResult } from '@salesforce/source-deploy-retrieve';
// import ReportOnDeployment, {ReportonDeploymentResult} from '../../../src/commands/reporton/deployment.js'
// import { getDeployResult } from './deployResponses.js';

// const sObjectId = '0011100001zhhyUAAQ';
Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
// const messages = Messages.loadMessages('ciutils', 'reporton.deployment');

describe('reporton:deployment', () => {
  const $$ = new TestContext();
  const testOrg = new MockTestOrgData();
  const sandbox = $$.SANDBOX;
  testOrg.username = 'test@org.com';
  testOrg.loginUrl = 'https://test.salesforce.com';
  testOrg.instanceUrl = 'https://test.my.sf.com';
  // const defaultDir = join('my', 'default', 'package');
  const stashedDeployId = 'IMA000STASHID';

  // const deployResult: DeployResult = getDeployResult('successSync');
  // const expectedResults: DeployCommandResult = deployResult.response as DeployCommandResult;
  // expectedResults.deployedSource = deployResult.getFileResponses();
  // expectedResults.outboundFiles = [];
  // expectedResults.deploys = [deployResult.response];

  // Stubs
  //  const oclifConfigStub: Config = fromStub(stubInterface<Config>(sandbox));
  // let checkDeployStatusStub: sinon.SinonStub;

  // let uxLogStub: sinon.SinonStub;
  // let pollStatusStub: sinon.SinonStub;

  // const runReportCmd = async (params: string[], result?: MetadataApiDeployStatus) => {
  //  const cmd = new ReportOnDeployment(params, oclifConfigStub);

  // uxLogStub = stubMethod(sandbox, Ux.prototype, 'log');
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  stubMethod(sandbox, ConfigFile.prototype, 'get').returns({ jobid: stashedDeployId });

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
  // checkDeployStatusStub = sandbox.stub(cmd, 'report').resolves({ response: result ?? expectedResults });

  // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-return
  // return cmd.runIt();
  // };

  beforeEach(async () => {
    await $$.stubAuths(testOrg);
    await $$.stubConfig({ 'target-org': testOrg.username });

    //  pollStatusStub = sandbox.stub(MetadataApiDeploy.prototype, 'pollStatus');
  });

  afterEach(() => {
    $$.restore();
    sandbox.restore();
  });

  it('No Default Environment', () => {
    const result = execCmd<ReportonDeploymentResult>('reporton:deployment', { ensureExitCode: 1 });
    expect(result.shellOutput.stderr).to.contain('No default environment found');
  });
});
