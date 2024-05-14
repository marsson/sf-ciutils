/* tslint:disable */

import { Connection } from '@salesforce/core';
import { ExecuteAnonymousResult } from 'jsforce/lib/api/tooling.js';
import { RecordResult, Error } from 'jsforce/record-result.js';

class AssignmentHelper {
  // public static matchUsersToList(orgUsers: object[], selectedUsers: string[]): UserNameOrg[] {
  //   return orgList;
  // }
}

enum ProcessStatus {
  SUCCESS,
  FAILURE,
  UNPROCCESSED,
}

class OrgDetails {
  private static MARSSON_EXCEPTION_APEX: string =
    'System.Domain d = System.DomainParser.parse(URL.getOrgDomainUrl()); throw new HandledException(d.getSandboxName());';
  private static isASandbox: boolean | undefined;
  private static sandboxName: string | undefined;

  public static async isSandbox(con: Connection): Promise<boolean> {
    if (this.isASandbox !== undefined) {
      return this.isASandbox;
    }
    const result: ExecuteAnonymousResult = await con.tooling.executeAnonymous(this.MARSSON_EXCEPTION_APEX);

    if (result.exceptionMessage?.startsWith('System.HandledException:')) {
      this.sandboxName = result.exceptionMessage?.replace('System.HandledException: ', '');
      this.isASandbox = true;
      return this.isASandbox;
    }

    this.isASandbox = false;
    return false;
  }

  public static async getSandboxName(con: Connection): Promise<string | void> {
    if ((await this.isSandbox(con)) === true) {
      return this.sandboxName;
    }
    return;
  }
}

class UserNameOrg {
  public username: string | undefined;
  public orgUsername: string | undefined;
  public userId: string | undefined;
  public error: UserNameOrgError | undefined;
  public groups: UnassignableObject[];
  public permissionsets: UnassignableObject[];
  public permissionsetgroups: UnassignableObject[];

  public constructor(orgName: string | void, username: string) {
    this.username = username;
    if (typeof orgName === 'string') {
      this.orgUsername = username + '.' + orgName;
    }
    this.groups = new Array<UnassignableObject>();
    this.permissionsets = new Array<UnassignableObject>();
    this.permissionsetgroups = new Array<UnassignableObject>();
  }
}
enum UserNameOrgError {
  NO_ERROR = '',
  USER_NOT_FOUND = 'Username not found in org',
}

class UnassignableObject {
  public static OBJECT_CONVERT = new Map<string, string>([
    ['Group', 'GroupMember'],
    ['PermissionSet', 'PermissionSetAssignment'],
    ['PermissionSetGroup', 'PermissionSetAssignment'],
  ]);

  public unassinableType: string;
  public objectid: string;
  public parentId: string;
  public processStatus: ProcessStatus = ProcessStatus.UNPROCCESSED;
  public errorMessage: string | undefined;

  public constructor(unasObject: string, objId: string, parentId: string) {
    this.unassinableType = unasObject;
    this.objectid = objId;
    this.processStatus = ProcessStatus.UNPROCCESSED;
    this.parentId = parentId;
  }

  public static createUnassignablesforGroups(groups: SObject[]): UnassignableObject[] {
    const response = new Array<UnassignableObject>();
    for (const sobject of groups) {
      response.push(new UnassignableObject('Group', sobject.Id, sobject['UserOrGroupId'] as string));
    }
    return response;
  }
  public static createUnassignablesforPermissionSet(groups: SObject[]): UnassignableObject[] {
    const response = new Array<UnassignableObject>();
    for (const sobject of groups) {
      response.push(new UnassignableObject('PermissionSet', sobject.Id, sobject['AssigneeId'] as string));
    }
    return response;
  }
  public static createUnassignablesforPermissionSetGroup(groups: SObject[]): UnassignableObject[] {
    const response = new Array<UnassignableObject>();
    for (const sobject of groups) {
      response.push(new UnassignableObject('PermissionSetGroup', sobject.Id, sobject['AssigneeId'] as string));
    }
    return response;
  }
}

class BatchDownloadHelper {
  public static fetchAllUsers(conn: Connection): Promise<SObject[]> {
    const usersAndPermsetAssignments = this.bulkQuery(conn, 'SELECT Id, Username FROM User');
    return usersAndPermsetAssignments;
    // Use the fetched User IDs to then query for PermissionSetAssignments and GroupMembers using similar Bulk API calls or logic.
  }
  public static async fetchMultipleObjectsInParallell(
    conn: Connection
  ): Promise<{ users: SObject[]; groupmembers: SObject[]; permissionsets: SObject[]; permissionsetgroups: SObject[] }> {
    // create return object.
    const response = {
      users: new Array<SObject>(),
      groupmembers: new Array<SObject>(),
      permissionsets: new Array<SObject>(),
      permissionsetgroups: new Array<SObject>(),
    };
    const queries = [];
    queries.push({ objectName: 'User', query: 'SELECT Id,Username FROM User' });
    queries.push({ objectName: 'GroupMember', query: 'SELECT Id,UserOrGroupId FROM GroupMember' });
    queries.push({
      objectName: 'PermissionSetAssignment',
      query: 'SELECT Id,AssigneeId FROM PermissionSetAssignment WHERE PermissionSetId != NULL',
    });
    queries.push({
      objectName: 'PermissionSetAssignment',
      query: 'SELECT Id,AssigneeId FROM PermissionSetAssignment WHERE PermissionSetGroupId != NULL',
    });

    const queryPromises = queries.map((q) => this.bulkQuery(conn, q.query));

    const results = await Promise.all(queryPromises);
    response.users = results[0];
    response.groupmembers = results[1];
    response.permissionsets = results[2];
    response.permissionsetgroups = results[3];
    return response;
  }

  public static async deleteObjectsFromUnassignableObjects(
    conn: Connection,
    unassignableObjects: UnassignableObject[]
  ): Promise<void> {
    const unassignableByType = new Map<string, UnassignableObject[]>();

    for (const unassignable of unassignableObjects) {
      if (!unassignableByType.has(unassignable.unassinableType)) {
        unassignableByType.set(unassignable.unassinableType, new Array<UnassignableObject>());
      }
      unassignableByType.get(unassignable.unassinableType)!.push(unassignable);
    }

    for (const currenKey of unassignableByType.keys()) {
      const records = unassignableByType.get(currenKey)!.map((unobj) => ({ Id: unobj.objectid }));
      // eslint-disable-next-line no-await-in-loop
      const results = await this.bulkDeleteRecords(conn, records, currenKey);
      BatchDownloadHelper.updateUnassignableDeletionResult(
        records,
        results,
        unassignableByType.get(currenKey) as UnassignableObject[]
      );
    }
  }

  public static async bulkDeleteRecords(
    conn: Connection,
    records: SObject[],
    objectType: string
  ): Promise<RecordResult[]> {
    // Create a Bulk API job for deletion
    const job = conn.bulk.createJob(UnassignableObject.OBJECT_CONVERT.get(objectType) as string, 'delete');
    const batch = job.createBatch();

    // Initiate the bulk delete operation
    void batch.execute(records);

    // Handling the async operation with proper event listeners
    return new Promise<RecordResult[]>((resolve, reject) => {
      void batch.on('queue', () => {
        batch.poll(1000, 60000); // Poll every 1 second, timeout after 1 minute
      });

      void batch.on('response', (result) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        resolve(result);
      });

      void batch.on('error', (error) => {
        reject(error);
      });
    });
  }
  public static updateUnassignableDeletionResult(
    records: SObject[],
    results: RecordResult[],
    unassignableObjects: UnassignableObject[]
  ): void {
    for (let i = 0; i < records.length; i++) {
      const object = unassignableObjects[i];
      const result = results[i];

      if (result.success === true) {
        object.processStatus = ProcessStatus.SUCCESS;
      } else {
        object.processStatus = ProcessStatus.FAILURE;
        object.errorMessage = '';
        for (const err of result.errors) {
          object.errorMessage = object.errorMessage + err.message;
        }
      }
    }
  }

  private static async bulkQuery(conn: Connection, query: string): Promise<SObject[]> {
    return new Promise((resolve, reject) => {
      const records: object[] = [];

      conn.bulk
        .query(query)
        .on('record', (rec: SObject) => {
          records.push(rec); // Accumulate records
        })
        .on('end', () => {
          resolve(records as SObject[]); // Resolve the promise with the accumulated records once all have been received
        })
        .on('error', (err: Error) => {
          reject(err); // Reject the promise on error
        });
    });
  }
}

// Define the SObject type with a mandatory Id property of type string
interface SObject {
  [key: string]: unknown; // Allow other properties of any type
  Id: string;
}

function mapSObjectsByKeyField(sobjects: SObject[], keyField: string): Map<string, SObject[]> {
  const map = new Map<string, SObject[]>();

  sobjects.forEach((sobject) => {
    const key = sobject[keyField] as string;
    if (!map.has(key)) {
      map.set(key, new Array<SObject>());
    }
    map.get(key)!.push(sobject);
  });

  return map;
}

export {
  OrgDetails,
  UserNameOrg,
  BatchDownloadHelper,
  AssignmentHelper,
  mapSObjectsByKeyField,
  UnassignableObject,
  SObject,
  UserNameOrgError,
};
