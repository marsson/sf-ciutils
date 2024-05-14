import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { Messages, Connection } from '@salesforce/core';
import { DeployResult } from 'jsforce/api/metadata';
import Table from 'cli-table3';
import { MultiBar } from 'cli-progress';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@marsson/ciutils', 'reporton.deployment');

export type ReportonDeploymentResult = DeployResult;
export default class ReportonDeployment extends SfCommand<ReportonDeploymentResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static readonly flags = {
    'target-org': Flags.requiredOrg(),
    deploymentid: Flags.salesforceId({
      summary: messages.getMessage('flags.deploymentid.summary'),
      char: 'd',
      required: true,
      length: 'both',
      startsWith: '0Af',
    }),
    awaitcompletion: Flags.boolean({
      summary: messages.getMessage('flags.awaitcompletion.summary'),
      char: 'a',
    }),
  };
  private connection: Connection | undefined;
  private deploymentStatus!: DeployResult;
  private multiBar: MultiBar = new MultiBar({
    format: 'Deployment Progress | {bar} | {percentage}% || {value}/{total} {filename}}',
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591',
    hideCursor: true,
    noTTYOutput: true,
    notTTYSchedule: 10000,
    emptyOnZero: true,
  });
  private isComplete: boolean = false;

  public async run(): Promise<ReportonDeploymentResult> {
    const { flags } = await this.parse(ReportonDeployment);
    const deploymentId = flags.deploymentid;
    this.connection = flags['target-org'].getConnection();
    this.displayHeader(deploymentId);
    await this.updateDeployResult(deploymentId);
    // Correctly initializing the progress bars with the total expected count
    // Updating the progress bars with the current progress

    if (flags.awaitcompletion) {
      await this.awaitDeploymentCompletion(deploymentId);
    } else {
      await this.updateDeployResult(deploymentId);
      this.updateProgressBars();
    }

    this.printDeploymentReport();

    return this.deploymentStatus;
  }

  // Placeholder: Initialize your progress bar here
  /* eslint-disable no-await-in-loop */
  private async awaitDeploymentCompletion(deploymentId: string): Promise<void> {
    do {
      await this.updateDeployResult(deploymentId);
      this.updateProgressBars();

      if (!this.isComplete) {
        // Only wait if the deployment is not complete
        await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait for 5 seconds
      }
    } while (!this.isComplete);
  }
  /* eslint-enable no-await-in-loop */

  private async updateDeployResult(deploymentid: string): Promise<void> {
    try {
      this.deploymentStatus = await this.connection!.metadata.checkDeployStatus(deploymentid, true);
    } catch (e) {
      throw new Error('Invalid ID or expired deployment');
    }
    this.isComplete = this.deploymentStatus.status === 'Succeeded' || this.deploymentStatus.status === 'Failed';
  }
  private updateProgressBars(): void {
    // Ensure progress bars are updated only if deploymentStatus has been fetched
    const b1 = this.multiBar.create(
      this.deploymentStatus.numberComponentsTotal,
      this.deploymentStatus.numberComponentsDeployed + this.deploymentStatus.numberComponentErrors,
      { filename: 'Components' }
    );
    const b2 = this.multiBar.create(
      this.deploymentStatus.numberTestsTotal,
      this.deploymentStatus.numberTestsCompleted + this.deploymentStatus.numberTestErrors,
      { filename: 'Test Methods' }
    );
    b1.setTotal(this.deploymentStatus.numberComponentsTotal);
    b2.setTotal(this.deploymentStatus.numberTestsTotal);
    b1.update(this.deploymentStatus.numberComponentsDeployed + this.deploymentStatus.numberComponentErrors);
    b2.update(this.deploymentStatus.numberTestsCompleted + this.deploymentStatus.numberTestErrors);
  }

  // Example helper function that needs to use UX methods
  private displayHeader(header: string): void {
    this.log('*** Analysing ***');
    this.log(`\n\nJob ID | ${header}\n\n`);
  }

  private printDeploymentReport(): void {
    const result = this.deploymentStatus.status;
    if (result === 'Failed') {
      this.printErrors();
      process.exit(1);
    }
    this.printSuccess();
  }
  private printErrors(): void {
    const result: DeployResult = this.deploymentStatus;

    if (result.details.componentFailures.length > 0) {
      this.log(
        '\n\n\n=========================================================================================================='
      );
      this.log(`FAILURE: Showing ${result.details.componentFailures.length} Component Deployment Errors`);
      this.log(
        '=========================================================================================================='
      );
      const t1 = new Table({
        head: ['Api Name', 'Type', 'Line', 'Column', 'Error Message'],
        colWidths: [60, 20, 6, 8, 100],
        wordWrap: true,
      });
      const errorMap = result.details.componentFailures.map((compError) => [
        compError.fileName,
        compError.componentType,
        compError.lineNumber ?? 'N/A',
        compError.columnNumber ?? 'N/A',
        compError.problem,
      ]);
      t1.push(...errorMap);
      this.log(t1.toString());
    }

    if (result.details.runTestResult?.failures && result.details.runTestResult?.failures.length > 0) {
      this.log(
        '\n\n\n=========================================================================================================='
      );
      this.log(`FAILURE: Showing ${result.details.runTestResult.failures.length} Test Execution Errors`);
      this.log(
        '=========================================================================================================='
      );
      const testErrors = result.details.runTestResult.failures;
      const t1 = new Table({
        head: ['Class Name', 'Method Name', 'Error Message'],
        colWidths: [40, 40, 120],
        wordWrap: true,
      });
      const errorMap = testErrors.map((testError) => [testError.name, testError.methodName, testError.message]);
      t1.push(...errorMap);
      this.log(t1.toString());
    }
  }
  private printSuccess(): void {
    this.log(
      '\n\n=========================================================================================================='
    );
    this.log('SUCCESS: The deployment completed awesomely!');
    this.log(
      '=========================================================================================================='
    );
  }
}
