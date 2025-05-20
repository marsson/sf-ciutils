/* eslint-disable */
import {SfCommand, Flags} from '@salesforce/sf-plugins-core';
import {ux} from '@oclif/core'
import {Messages, Connection} from '@salesforce/core';
import { promises as fsPromises, statSync } from 'fs';
import * as fs from 'fs';
import * as path from 'path';
//import JSZip from 'jszip';

import { MetadataResolver,ComponentSet } from '@salesforce/source-deploy-retrieve';

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
    debug: Flags.boolean({
      summary: 'Show debug logs',
      char: 'd',
      required: false,
      default: false,
    }),
  };

  private connection!: Connection;
  private debugMode = false;

  // Helper method for conditional debug logging
  private debugLog(message: string): void {
    if (this.debugMode) {
      this.log(`[DEBUG] ${message}`);
    }
  }

  // Helper method for standardized error handling
  private handleError(context: string, error: Error, throwError = true): Error {
    const errorMessage = `Error in ${context}: ${error.message}`;
    this.debugLog(errorMessage);
    this.debugLog(`Error stack: ${error.stack}`);

    const formattedError = new Error(errorMessage);

    if (throwError) {
      throw formattedError;
    }

    return formattedError;
  }

  private getMetadataTypesFromFolder(directory: string): MetadataType {
    this.debugLog(`Starting getMetadataTypesFromDirectory for directory: ${directory}`);

    const metadataTypes: MetadataType = {};
    try {
      const resolver = new MetadataResolver();
      const components = resolver.getComponentsFromPath(directory);

      if (components.length > 0) {
        this.debugLog(`Processing ${components.length} components`);

        for (const component of components) {
          const allComponents = [component, ...component.getChildren()];

          for (const subComponent of allComponents) {
            const typeName = subComponent.type.name;
            const fullName = subComponent.fullName;
            const contentPath = subComponent.content ?? subComponent.xml;
            const absolutePath = contentPath ? path.resolve(contentPath) : null;

            const metadataItem: MetadataItem = {
              metadataName: fullName,
              path: absolutePath,
            };

            if (!metadataTypes[typeName]) {
              metadataTypes[typeName] = {};
            }

            if (!metadataTypes[typeName][fullName]) {
              metadataTypes[typeName][fullName] = metadataItem;
            } else {
              this.debugLog(`[DUPLICATE] Skipping duplicate: ${typeName} - ${fullName}`);
            }
          }
        }
      } else {
        this.debugLog(`No metadata components found in: ${directory}`);
      }

      this.debugLog(`Completed scan. Found ${Object.keys(metadataTypes).length} metadata types.`);
      return metadataTypes;

    } catch (error) {
      this.handleError('getMetadataTypesFromDirectory', error as Error);
      return metadataTypes;
    }
  }


  // Compare retrieved metadata with local files

  private async compareMetadata(
    downloadedMetadataTypes: MetadataType,
    metadataTypes: MetadataType
  ): Promise<ValidateRepositoryMetadataResult> {
    const result: ValidateRepositoryMetadataResult = {
      status: 0,
      unchanged: [],
      changed: [],
      deleted: [],
      error: []
    };

    this.debugLog(`Starting metadata comparison between local and retrieved metadata`);

    for (const metadataType in metadataTypes) {
      this.debugLog(`Processing metadata type: ${metadataType}`);
      const localComponents = metadataTypes[metadataType];

      if (!downloadedMetadataTypes[metadataType]) {
        this.debugLog(`Metadata type ${metadataType} not found in retrieved metadata - all components deleted`);

        for (const componentName in localComponents) {
          const component = localComponents[componentName];

          result.deleted.push({
            changed: false,
            componentType: metadataType,
            created: false,
            createdDate: new Date().toISOString(),
            deleted: true,
            fileName: component.path || '',
            fullName: component.metadataName,
            success: true,
            metadataTypeOrigin: metadataType
          });
        }
        continue;
      }

      const retrievedComponents = downloadedMetadataTypes[metadataType];

      for (const componentName in localComponents) {
        const localComponent = localComponents[componentName];
        const retrievedComponent = retrievedComponents[componentName];

        this.debugLog(`🔍 Comparing ${metadataType}.${componentName}`);

        if (!retrievedComponent) {
          this.debugLog(`Component ${componentName} of type ${metadataType} not found in retrieved metadata - deleted`);

          result.deleted.push({
            changed: false,
            componentType: metadataType,
            created: false,
            createdDate: new Date().toISOString(),
            deleted: true,
            fileName: localComponent.path || '',
            fullName: localComponent.metadataName,
            success: true,
            metadataTypeOrigin: metadataType
          });
          continue;
        }

        const areEqual = this.areComponentsEqual(localComponent, retrievedComponent);

        if (
          localComponent.path &&
          retrievedComponent.path &&
          areEqual === true
        ) {
          this.debugLog(`✅ Component ${componentName} of type ${metadataType} is unchanged`);

          result.unchanged.push({
            changed: false,
            componentType: metadataType,
            created: false,
            createdDate: new Date().toISOString(),
            deleted: false,
            fileName: localComponent.path || '',
            fullName: localComponent.metadataName,
            success: true,
            metadataTypeOrigin: metadataType
          });
        } else if (areEqual === false) {
          this.debugLog(`⚠️ Component ${componentName} of type ${metadataType} has changed`);

          result.changed.push({
            changed: true,
            componentType: metadataType,
            created: false,
            createdDate: new Date().toISOString(),
            deleted: false,
            fileName: localComponent.path || '',
            fullName: localComponent.metadataName,
            success: true,
            metadataTypeOrigin: metadataType
          });
        } else {
          this.debugLog(`⏭️ Skipping ${componentName} of type ${metadataType} — possibly a directory or unreadable file.`);
          // Optional: add to result.error if needed
        }
      }
    }

    if (result.error.length > 0) {
      result.status = 3;
    } else if (result.changed.length > 0 || result.deleted.length > 0) {
      result.status = 1;
    } else {
      result.status = 0;
    }

    this.debugLog(`Metadata comparison completed with status: ${result.status}`);
    this.debugLog(`Unchanged: ${result.unchanged.length}, Changed: ${result.changed.length}, Deleted: ${result.deleted.length}, Error: ${result.error.length}`);

    return result;
  }

  // Helper method to compare two components

  private areComponentsEqual(localComponent: MetadataItem, retrievedComponent: MetadataItem): boolean | null {
    try {
      const normalize = (content: string): string => {
        return content
          .replace(/\r\n/g, '\n')
          .replace(/<!--[\s\S]*?-->/g, '') // Remove XML comments
          .replace(/^\s+|\s+$/gm, '')      // Trim each line
          .replace(/\s+/g, ' ')            // Normalize whitespace
          .trim();
      };

      if (!localComponent.path || !retrievedComponent.path) {
        return false;
      }

      const isFile = (p: string) => {
        try {
          return statSync(p).isFile();
        } catch {
          return false;
        }
      };

      if (!isFile(localComponent.path) || !isFile(retrievedComponent.path)) {
        this.debugLog(`[SKIP] One of the components is a directory. Skipping comparison for ${localComponent.metadataName}`);
        return null;
      }

      const localContent = fs.readFileSync(localComponent.path, 'utf8');
      const retrievedContent = fs.readFileSync(retrievedComponent.path, 'utf8');

      const normalizedLocal = normalize(localContent);
      const normalizedRetrieved = normalize(retrievedContent);

      if (normalizedLocal === normalizedRetrieved) {
        this.log(`${localComponent.metadataName} EQUAL`);
        return true;
      }

      this.log(`${localComponent.metadataName} DIFFERENT`);
      return false;
    } catch (error) {
      this.log(`${localComponent.metadataName} ERROR`);
      if (error instanceof Error && 'errno' in error) {
        this.debugLog(`Error comparing files: ${(error as { errno: number }).errno}`);
        if ((error as { errno: number }).errno === -21) {
          return null;
        }
      }
      return false;
    }
  }
  // Cache for MetadataResolver instances to improve performance
  /*
  private resolverCache = new Map<string, any[]>();
*/
  private getComponentSetFromFolder(path:string): ComponentSet {
    const resolver = new MetadataResolver();
    const components = resolver.getComponentsFromPath(path);
    return  new ComponentSet(components);
  }

  private async retrieveComponents(componentSet:ComponentSet, conn: Connection): Promise<string | undefined>  {
     ux.action.start('Retrieving metadata from org'); // 👈 Starts the spinner
   try{
     const outputPath = path.join(process.cwd(), '.output');
     await fsPromises.rm(outputPath, { recursive: true, force: true });
    const retrieve = await componentSet.retrieve({
      usernameOrConnection: conn,
      output: outputPath,
      merge: false, // Optional: if true, will merge into local project
    });

// Optionally wait for the result:
    const result = await retrieve.pollStatus(5000, 300000);

    if (result.response.status === 'Succeeded') {
      ux.action.stop('✔️ Retrieve complete'); // 👈 Spinner stops with success message
      console.log(result.getFileResponses());
    } else {
      ux.action.stop(`❌ Failed: ${result.response.status}`);
    }
     // ✅ Return the actual folder path

     const entries = fs.readdirSync(outputPath, { withFileTypes: true });
     const firstFolder = entries.find(entry => entry.isDirectory());


     return firstFolder ? path.join(outputPath, firstFolder.name) : undefined;

  } catch (error) {
    ux.action.stop('❌ Error during retrieve');
    throw error;
    }
  }

  public async run(): Promise<ValidateRepositoryMetadataResult> {
    const {flags} = await this.parse(ValidateRepositoryMetadata);

    // Set debug mode based on flag
    this.debugMode = flags.debug;

    this.debugLog(`Starting ValidateRepositoryMetadata.run()`);
    this.debugLog(`Parsing command flags`);

    const folder = flags.folder;
    this.debugLog(`Using folder: ${folder}`);

    this.debugLog(`Getting connection from target org: ${flags['target-org'].getUsername()}`);
    this.connection = flags['target-org'].getConnection();
    this.debugLog(`Connection established to org: ${this.connection.getUsername()}`);

    try {
      // Get metadata types from the directory
      this.debugLog(`Step 1: Getting componentSet from directory: ${folder}`);
      this.log('Getting componentSet...');
      const componentSet = this.getComponentSetFromFolder(folder);


      // Retrieve metadata from the org
      this.debugLog(`Step 2: Retrieving metadata from org`);
      this.log('Retrieving metadata from org...');
      const resultFolder = await this.retrieveComponents(componentSet,this.connection);
      this.debugLog(`Successfully retrieved metadata from org`);

      const originalMetadata  = this.getMetadataTypesFromFolder(folder);
      const retrievedMetadata = this.getMetadataTypesFromFolder(resultFolder as string);


      // Compare retrieved metadata with local files
      this.debugLog(`Step 3: Comparing retrieved metadata with local files`);
      this.log('Comparing metadata with local files...');
      const comparisonResult = await this.compareMetadata(retrievedMetadata, originalMetadata);
      this.debugLog(`Comparison completed with status: ${comparisonResult.status}`);

      // Display the results
      this.debugLog(`Step 4: Displaying results`);
      this.createTable(comparisonResult);
      this.debugLog(`Results displayed to user`);

      this.debugLog(`ValidateRepositoryMetadata.run() completed successfully`);
     // return comparisonResult;
      return {
        status: 3,
        unchanged: [],
        changed: [],
        deleted: [],
        error: []
      };
    } catch (error) {
      // Log the error but don't throw it since we're in the main run method
      const formattedError = this.handleError('ValidateRepositoryMetadata.run', error as Error, false);
      this.error(`Error: ${formattedError.message}`);

      // Return a default error result
      this.debugLog(`Returning default error result`);
      return {
        status: 3,
        unchanged: [],
        changed: [],
        deleted: [],
        error: []
      };
    }
  }

  private createTable(result: ValidateRepositoryMetadataResult): void {
    this.debugLog(`Creating result table with status: ${result.status}`);

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

    // Helper function to create component data for tables
    const createComponentData = (components: DeployResult[]) => {
      return components.map((component) => ({
        'Component Name': component.fullName,
        'Type': component.componentType,
        'Metadata Type Origin': component.metadataTypeOrigin || 'Unknown'
      }));
    };

    if (result.changed.length > 0) {
      this.log('\n📌 Altered components:');
      this.table({
        data: createComponentData(result.changed)
      });
    } else {
      this.debugLog(`No altered components to display`);
    }

    if (result.deleted.length > 0) {
      this.log('\n🧽 Removed components:');
      this.table({
        data: createComponentData(result.deleted)
      });
    }

    if (result.error.length > 0) {
      this.log('\n❌ Errored out Components:');
      this.table({
        data: createComponentData(result.error)
      });
    } else {
      this.debugLog(`No components with errors to display`);
    }

    this.debugLog(`Result table creation completed`);
  }
  // Helper function to find the matching local file

}


export type ValidateRepositoryMetadataResult = {
  status: number; // 0 = deployment success all files the same, 1= deployment success but files are different, 3 = failure on deployment.
  unchanged: DeployResult [];
  changed: DeployResult [];
  deleted: DeployResult [];
  error: DeployResult [];
};


type MetadataItem = {
  path: string | null;
  metadataName: string;
};

type MetadataType = {
  [metadataType: string]: {
    [metadataName: string]: MetadataItem;
  };
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
  metadataTypeOrigin?: string; // Added to trace back to the original MetadataType
};
