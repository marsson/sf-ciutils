/* eslint-disable */
import {SfCommand, Flags} from '@salesforce/sf-plugins-core';

import {Messages,Org, Connection} from '@salesforce/core';
import * as fs from 'fs';
import * as path from 'path';
import JSZip from 'jszip';

import { MetadataResolver,ComponentSet,RetrieveResult, MetadataComponent } from '@salesforce/source-deploy-retrieve';

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
    MetadataHelper.prepareCleanFolder(folderPath);
    const folder = await MetadataHelper.extractZipToFolder(zip, folderPath);
    const retrievedMetadata = this.getMetadataTypesFromDirectory(folder);

    this.debugLog(`Starting metadata comparison between local and retrieved metadata`);

    // Iterate through all metadata types in the local repository
    for (const metadataType in metadataTypes) {
      this.debugLog(`Processing metadata type: ${metadataType}`);

      // Get all components for this metadata type
      const localComponents = metadataTypes[metadataType];

      // Check if this metadata type exists in the retrieved metadata
      if (!retrievedMetadata[metadataType]) {
        this.debugLog(`Metadata type ${metadataType} not found in retrieved metadata - all components deleted`);

        // All components of this type were deleted in the org
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

      // Get the retrieved components for this metadata type
      const retrievedComponents = retrievedMetadata[metadataType];

      // Compare each component in the local repository with the retrieved metadata
      for (const componentName in localComponents) {
        const localComponent = localComponents[componentName];

        // Check if this component exists in the retrieved metadata
        if (!retrievedComponents[componentName]) {
          this.debugLog(`Component ${componentName} of type ${metadataType} not found in retrieved metadata - deleted`);

          // Component was deleted in the org
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
        } else {
          // Component exists in both local and retrieved metadata
          const retrievedComponent = retrievedComponents[componentName];

          // Compare the components to determine if they're the same or changed
          // For simplicity, we'll just check if the paths are different
          // In a real implementation, you might want to compare file contents
          if (localComponent.path && retrievedComponent.path &&
              this.areComponentsEqual(localComponent, retrievedComponent)) {
            this.debugLog(`Component ${componentName} of type ${metadataType} is unchanged`);

            // Component is unchanged
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
          } else {
            this.debugLog(`Component ${componentName} of type ${metadataType} has changed`);

            // Component has changed
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
          }
        }
      }
    }

    // Set the status based on the comparison results
    if (result.error.length > 0) {
      result.status = 3; // Error on component validation
    } else if (result.changed.length > 0 || result.deleted.length > 0) {
      result.status = 1; // Components altered in org
    } else {
      result.status = 0; // Repo in sync
    }

    this.debugLog(`Metadata comparison completed with status: ${result.status}`);
    this.debugLog(`Unchanged: ${result.unchanged.length}, Changed: ${result.changed.length}, Deleted: ${result.deleted.length}, Error: ${result.error.length}`);

    return result;
  }

  // Helper method to compare two components
  private areComponentsEqual(localComponent: MetadataItem, retrievedComponent: MetadataItem): boolean {
    try {
      const normalize = (content: string): string => {
        return content
          .replace(/\r\n/g, '\n')        // Normalize line endings
          .replace(/<!--[\s\S]*?-->/g, '') // Remove XML comments
          .replace(/^\s+|\s+$/gm, '')    // Trim each line
          .replace(/\s+/g, ' ')          // Normalize whitespace
          .trim();                       // Final trim
      };
      if (!localComponent.path || !retrievedComponent.path) {
        return false;
      }
      const localContent = fs.readFileSync(localComponent.path, 'utf8');
      const retrievedContent = fs.readFileSync(retrievedComponent.path, 'utf8');

      const normalizedLocal = normalize(localContent);
      const normalizedRetrieved = normalize(retrievedContent);

      if(normalizedLocal === normalizedRetrieved){
        this.log(`${localComponent.metadataName} EQUAL`)
        return true;

      }
      this.log(`${localComponent.metadataName} DIFFERENT`)
      return false;
    } catch (error) {
      this.log(`${localComponent.metadataName} ERROR`)
      this.debugLog(`Error comparing files: ${error}`);
      return false;
    }
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
