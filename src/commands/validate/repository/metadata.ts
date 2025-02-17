/* eslint-disable */
//Needed as I do not know the fucking structure of deployment warnings...
import {spawn} from 'node:child_process';
import {SfCommand, Flags} from '@salesforce/sf-plugins-core';
import {Messages} from '@salesforce/core';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@marsson/ciutils', 'validate.repository.metadata');

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
    'target-org': Flags.requiredOrg(),
    folder: Flags.directory({
      summary: messages.getMessage('flags.folder.summary'),
      char: 'f',
      required: true,
      exists: true,
    }),
  };

  private static executeSfCommand(org: string, folder: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const child = spawn(
        'sf',
        [
          'project',
          'deploy',
          'start',
          '--source-dir',
          folder,
          '--dry-run',
          '-l',
          'NoTestRun',
          '-o',
          org,
          '--json',
        ],
        {
          shell: true, // Runs command in a shell
          stdio: ['ignore', 'pipe', 'pipe'], // Capture stdout and stderr
        }
      );

      let output = '';
      let errorOutput = '';

      // Capture stdout (command output)
      child.stdout.on('data', (data) => {
        output += data.toString();
      });

      // Capture stderr (error messages)
      child.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve(output.trim()); // Return the raw JSON string
        } else {
          //reject(new Error(`Process exited with code ${code ?? 1}: ${errorOutput.trim()}`));
          resolve(output.trim()); // Return the raw JSON string
          console.log
        }
      });

      child.on('error', (error) => {
        reject(error);
      });
    });
  }

  private static generateResultFromJSON(ajson: ValidationResult): ValidateRepositoryMetadataResult {
    const result: ValidateRepositoryMetadataResult = {
      status: 0,
      unchanged: [],
      changed: [],
      deleted: [],
      error: []
    };

    ajson.result.details.componentSuccesses.forEach((component: DeployResult) => {
      if (component.fullName === 'package.xml') {
        return;
      }

      if (component.created) {
        result.deleted.push(component);
        result.status = 1;
        return;
      }
      if (component.changed) {
        result.changed.push(component);
        result.status = 1;
        return;
      }
      result.unchanged.push(component);
    });

    ajson.result.details.componentFailures.forEach((component: DeployResult) => {
      result.error.push(component);
      result.status = 3;
    })

    return result;
  }


  public async run(): Promise<ValidateRepositoryMetadataResult> {
    const {flags} = await this.parse(ValidateRepositoryMetadata);
    const folder = flags.folder;
    const org = flags['target-org'].getUsername() as string;
    let jsonString = '';
    try {
      jsonString = await ValidateRepositoryMetadata.executeSfCommand(org, folder);
    } catch (error) {
      this.error(`Error running deploy start: ${(error as Error).message}`);
    }

    const validationResult: ValidationResult = JSON.parse(jsonString);
    const result: ValidateRepositoryMetadataResult = ValidateRepositoryMetadata.generateResultFromJSON(validationResult);
    this.createTable(result);

    return result;
  }

  private createTable(result: ValidateRepositoryMetadataResult): void {

    switch (result.status) {
      case 0:
        this.log('\n✅ Result Status: Repo in sync');
        return;
      case 1:
        this.log('\n📌 Result Status: Components Altered in ORG:');
        break;
      case 3:
        this.log('\n❌ Result Status: Error on component validation to ORG:');
    }

    if (result.changed.length > 0) {

      this.log('\n📌 Altered components:');
      this.table({
        data: result.changed.map((component) => ({
          'Component Name': component.fullName,  // Column Name in Table
          'Type': component.componentType       // Column Name in Table
        }))
      });
    }
    if (result.deleted.length > 0) {
      this.log('\n🧽 Removed components:');
      this.table({
        data: result.deleted.map((component) => ({
          'Component Name': component.fullName,  // Column Name in Table
          'Type': component.componentType       // Column Name in Table
        }))
      });
    }
    if (result.error.length > 0) {
      this.log('\n❌ Errored out Components:');
      this.table({
        data: result.error.map((component) => ({
          'Component Name': component.fullName,  // Column Name in Table
          'Type': component.componentType,      // Column Name in Table
        }))
      });
    }
  }

}


export type ValidateRepositoryMetadataResult = {
  status: number; // 0 = deployment success all files the same, 1= deployment success but files are different, 3 = failure on deployment.
  unchanged: DeployResult [];
  changed: DeployResult [];
  deleted: DeployResult [];
  error: DeployResult [];
};

type ValidationResult = {
  status: number;
  result: {
    checkOnly: boolean;
    completedDate: string;
    createdBy: string;
    createdByName: string;
    createdDate: string;
    details: {
      componentSuccesses: DeployResult[];
      runTestResult: RunTestResult;
      componentFailures: DeployResult[];
    };
    done: boolean;
    id: string;
    ignoreWarnings: boolean;
    lastModifiedDate: string;
    numberComponentErrors: number;
    numberComponentsDeployed: number;
    numberComponentsTotal: number;
    numberTestErrors: number;
    numberTestsCompleted: number;
    numberTestsTotal: number;
    rollbackOnError: boolean;
    runTestsEnabled: boolean;
    startDate: string;
    status: string;
    success: boolean;
    files: MetadataFile[];
    zipSize: number;
    zipFileCount: number;
    deployUrl: string;
  };
  warnings: any[];
};

type DeployResult = {
  changed: boolean;
  componentType: string;
  created: boolean;
  createdDate: string;
  deleted: boolean;
  fileName: string;
  fullName: string;
  id?: string;
  success: boolean;
};

type RunTestResult = {
  numFailures: number;
  numTestsRun: number;
  totalTime: number;
  codeCoverage: any[];
  codeCoverageWarnings: any[];
  failures: any[];
  flowCoverage: any[];
  flowCoverageWarnings: any[];
  successes: any[];
};

type MetadataFile = {
  fullName: string;
  type: string;
  state: string;
  filePath: string;
};
