/* eslint-disable */
import {SfCommand, Flags} from '@salesforce/sf-plugins-core';
import {Messages, Connection} from '@salesforce/core';
import * as fs from 'fs';
import * as path from 'path';
import JSZip from 'jszip';
import { MetadataResolver } from '@salesforce/source-deploy-retrieve';

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

  private getMetadataTypesFromDirectory(directory: string): MetadataType {
    this.debugLog(`Starting getMetadataTypesFromDirectory for directory: ${directory}`);

    const metadataTypes: MetadataType = {};

    try {
      let components: any[] = [];

      if (this.resolverCache.has(directory)) {
        this.debugLog(`Using cached components for directory: ${directory}`);
        components = this.resolverCache.get(directory) || [];
      } else {
        this.debugLog(`Creating MetadataResolver instance for directory: ${directory}`);
        const resolver = new MetadataResolver();

        this.debugLog(`Resolving components from: ${directory}`);
        components = resolver.getComponentsFromPath(directory);

        this.resolverCache.set(directory, components);
        this.debugLog(`Cached ${components.length} components for: ${directory}`);
      }

      if (components.length > 0) {
        this.debugLog(`Processing ${components.length} components`);

        for (const component of components) {
          const typeName = component.type.name;
          const fullName = component.fullName;
          const contentPath = component.content ?? component.xml;
          const absolutePath = contentPath ? path.resolve(contentPath) : null;

          const metadataItem: MetadataItem = {
            metadataName: fullName,
            path: absolutePath,
          };

          if (!component.content) {
            this.debugLog(`[WARN] No content for ${component.type.name} ${component.fullName}, using XML instead: ${component.xml}`);
          }
          
          if (!metadataTypes[typeName]) {
            metadataTypes[typeName] = {};
          }

          metadataTypes[typeName][fullName] = metadataItem;
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


  // Retrieve metadata using JSForce
  private async retrieveMetadata(metadata: MetadataType ): Promise<any> {

    const metadataTypes = MetadataHelper.getMetadataRequest(metadata);
    this.debugLog(`Starting retrieveMetadata with ${metadataTypes.length} metadata types`);

    const retrieveRequest = {
      apiVersion: 58,
      singlePackage: true,
      unpackaged: {
        types: metadataTypes,
        version: '58.0',
        objectPermissions: []
      }
    };

    this.debugLog(`Retrieve request details: API Version: ${retrieveRequest.apiVersion}, Single Package: ${retrieveRequest.singlePackage}`);
    this.debugLog(`Types to retrieve: ${metadataTypes.map(t => t.name).join(', ')}`);

    try {
      // Start the retrieve request
      this.debugLog(`Initiating metadata retrieve request`);
      const retrieveResult = await this.connection.metadata.retrieve(retrieveRequest);
      this.debugLog(`Retrieve request initiated with ID: ${retrieveResult.id}`);

      // Check the status of the retrieve request
      this.debugLog(`Checking initial retrieve status`);
      let result = await this.connection.metadata.checkRetrieveStatus(retrieveResult.id);
      this.debugLog(`Initial status: done=${result.done}, success=${result.success || false}`);

      // Wait for the retrieve to complete
      let pollCount = 0;
      while (!result.done) {
        pollCount++;
        // Wait for 10 seconds before checking again
        await new Promise(resolve => setTimeout(resolve, 5000));
        result = await this.connection.metadata.checkRetrieveStatus(retrieveResult.id);
        if (pollCount % 5 === 0) {
          this.log(`Waiting for metadata retrieve to complete... (${pollCount } seconds)`);
        }
      }

      if (result.success) {
        this.debugLog(`Metadata retrieve completed successfully`);
        if (result.fileProperties) {
          const fileCount = Array.isArray(result.fileProperties) ? result.fileProperties.length : 1;
          this.debugLog(`Retrieved ${fileCount} file(s)`);
        }

        // Extract the zip file
        this.debugLog(`Extracting zip file from retrieve result`);
        try {
          const zip = await JSZip.loadAsync(result.zipFile, { base64: true });
          this.debugLog(`Zip file extracted successfully with ${Object.keys(zip.files).length} entries`);
          return { zip, result };
        } catch (zipError) {
          this.handleError('extracting zip file', zipError as Error);
        }
      } else {
        const errorMsg = result.errorMessage || 'Unknown error';
        this.handleError('metadata retrieve', new Error(errorMsg));
      }
    } catch (error) {
      this.handleError('retrieveMetadata', error as Error);
    }
  }

  // Compare retrieved metadata with local files
  private async compareMetadata(zip: JSZip, metadataTypes: MetadataType): Promise<ValidateRepositoryMetadataResult> {

    const result: ValidateRepositoryMetadataResult = {
      status: 0,
      unchanged: [],
      changed: [],
      deleted: [],
      error: []
    };

    // Extract files from the zip to a temp folder:
    const folderPath = './.sf-tempFolder';
    // Check if folder exists
    // If it exists, remove everything inside
    MetadataHelper.prepareCleanFolder(folderPath)
    const folder = await MetadataHelper.extractZipToFolder(zip,folderPath);
    const retrievedMetadata = this.getMetadataTypesFromDirectory(folder);
    if (retrievedMetadata === metadataTypes)
      this.log('bla');

  return result;
  }

  // Cache for MetadataResolver instances to improve performance
  private resolverCache = new Map<string, any[]>();


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
      this.debugLog(`Step 1: Getting metadata types from directory: ${folder}`);
      this.log('Getting metadata types...');
      const metadataTypes = this.getMetadataTypesFromDirectory(folder);
      this.debugLog(`Found ${Object.keys(metadataTypes).length} metadata types in directory`);

      // Retrieve metadata from the org
      this.debugLog(`Step 2: Retrieving metadata from org`);
      this.log('Retrieving metadata from org...');
      const { zip } = await this.retrieveMetadata(metadataTypes);
      this.debugLog(`Successfully retrieved metadata from org`);

      // Compare retrieved metadata with local files
      this.debugLog(`Step 3: Comparing retrieved metadata with local files`);
      this.log('Comparing metadata with local files...');
      const comparisonResult = await this.compareMetadata(zip, metadataTypes);
      this.debugLog(`Comparison completed with status: ${comparisonResult.status}`);

      // Display the results
      this.debugLog(`Step 4: Displaying results`);
      this.createTable(comparisonResult);
      this.debugLog(`Results displayed to user`);

      this.debugLog(`ValidateRepositoryMetadata.run() completed successfully`);
      return comparisonResult;
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

class MetadataHelper {

  static async extractZipToFolder(zip: JSZip, outputDir: string): Promise<string> {
    const targetFolder = path.resolve(outputDir);

    // Ensure output folder exists and is clean
    if (fs.existsSync(targetFolder)) {
      const entries = fs.readdirSync(targetFolder, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(targetFolder, entry.name);
        if (entry.isDirectory()) {
          fs.rmSync(fullPath, { recursive: true, force: true });
        } else {
          fs.unlinkSync(fullPath);
        }
      }
    } else {
      fs.mkdirSync(targetFolder, { recursive: true });
    }

    const zipFilePaths = Object.keys(zip.files).filter(f => !zip.files[f].dir);

    for (const zipFilePath of zipFilePaths) {
      const file = zip.file(zipFilePath);
      if (!file) continue;

      const fileContent = await file.async('nodebuffer');

      const fullPath = path.join(targetFolder, zipFilePath);
      const dirPath = path.dirname(fullPath);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }

      fs.writeFileSync(fullPath, fileContent);
    }

    return targetFolder;
  }

  static getMetadataRequest(metadataTypes: MetadataType): { name: string; members: string[] }[] {
    return Object.keys(metadataTypes).map(type => {
      const members = Object.keys(metadataTypes[type]);
      return {
        name: type,
        members: members.length > 0 ? members : ['*'],
      };
    });
  }

  static prepareCleanFolder(folderPath: string): void {
    // If the folder exists
    if (fs.existsSync(folderPath)) {
      const entries = fs.readdirSync(folderPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(folderPath, entry.name);
        if (entry.isDirectory()) {
          fs.rmSync(fullPath, { recursive: true, force: true });
        } else {
          fs.unlinkSync(fullPath);
        }
      }
    } else {
      // Create the folder if it doesn't exist
      fs.mkdirSync(folderPath, { recursive: true });
    }
  }

}
