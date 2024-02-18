import { TestContext } from '@salesforce/core/lib/testSetup.js';
import { expect } from 'chai';
import { AuthInfo } from '@salesforce/core';
import { stubMethod } from '@salesforce/ts-sinon';
import { stubSfCommandUx } from '@salesforce/sf-plugins-core';
import ReportonDeployment from '../../../src/commands/reporton/deployment.js';

describe('reporton deployment', () => {
  const $$ = new TestContext();
  let sfCommandStubs: ReturnType<typeof stubSfCommandUx>;

  beforeEach(() => {
    sfCommandStubs = stubSfCommandUx($$.SANDBOX);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
    stubMethod($$.SANDBOX, AuthInfo, 'listAllAuthorizations').resolves([
      'Jimi Hendrix',
      'SRV',
      'shenderson',
      'SRV',
      'foo@example.com',
    ]);
  });

  describe('hub org defined', () => {
    beforeEach(() => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
      stubMethod($$.SANDBOX, {}, 'readLocallyValidatedMetaConfigsGroupedByOrgType')
        .resolves
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        ();
    });

    it('runs repoorton deployment', async () => {
      // await $$.stubAuths(testOrg);

      await ReportonDeployment.run(['-o', 'foo@example.com', '-d', '0Af8C00000Ta1y5SAB', '-a']);
      const output = sfCommandStubs.log
        .getCalls()
        .flatMap((c) => c.args)
        .join('\n');
      expect(output).to.include(
        'NoDefaultEnvError: No default environment found. Use -o or --target-org to specify an environment.'
      );
    });

    // it('runs hello world with --json and no provided name', async () => {
    //   const result = await World.run([]);
    //   expect(result.name).to.equal('World');
    // });

    // it('runs hello world --name Astro', async () => {
    //  await World.run(['--name', 'Astro']);
    //  const output = sfCommandStubs.log
    //   .getCalls()
    //   .flatMap((c) => c.args)
    //   .join('\n');
    // expect(output).to.include('Hello Astro');
    // });

    // it('runs hello world --name Astro --json', async () => {
    //  const result = await World.run(['--name', 'Astro', '--json']);
    //  expect(result.name).to.equal('Astro');
    // });
  });
});
