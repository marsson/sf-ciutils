
import { spawn } from 'node:child_process';
import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { Messages } from '@salesforce/core';




Messages.importMessagesDirectoryFromMetaUrl(import.meta.url)
const messages = Messages.loadMessages('@marsson/ciutils', 'validate.repository.metadata');

export type ValidateRepositoryMetadataResult = {
  path: string;
};

export default class ValidateRepositoryMetadata extends SfCommand<ValidateRepositoryMetadataResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');
  public static readonly flags = {
    name: Flags.string({
      summary: messages.getMessage('flags.name.summary'),
      description: messages.getMessage('flags.name.description'),
      char: 'n',
      required: false,
    }),
  };

  private static executeSfCommand(): Promise<void> {
    return new Promise((resolve, reject) => {
      const child = spawn('sf', ['project', 'deploy', 'start', '--source-dir', 'force-app/main/default/objects','--dry-run','-l','NoTestRun', '-o','GovernanceOrg-PROD', '--json' ], {
        stdio: 'inherit', // Ensures output is printed to console
        shell: true, // Runs command in a shell
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Process exited with code ${code ?? 1}`));
        }
      });

      child.on('error', (error) => {
        reject(error);
      });
    });
  }



  public async run(): Promise<ValidateRepositoryMetadataResult> {
   // const { flags } = await this.parse(ValidateRepositoryMetadata);

   // const name = flags.name ?? 'world';
   // this.log(`hello ${name} from src/commands/validate/repository/metadata.ts`);
    try {
      await ValidateRepositoryMetadata.executeSfCommand();
    } catch (error) {
      this.error(`Error running deploy start: ${(error as Error).message}`);
    }

    return {
      path: 'src/commands/validate/repository/metadata.ts',
    };
  }
}
