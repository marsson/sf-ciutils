import { Connection } from '@salesforce/core';
import { ExecuteAnonymousResult } from 'jsforce/lib/api/tooling.js';

class AssignmentHelper {
  // public static matchUsersToList(orgUsers: object[], selectedUsers: string[]): UserNameOrg[] {
  //   return orgList;
  // }
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
  public constructor(orgName: string | void, username: string) {
    this.username = username;
    if (typeof orgName === 'string') {
      this.orgUsername = username + '.' + orgName;
    }
  }
}

class BatchDownloadHelper {
  public static fetchAllUsers(conn: Connection): Promise<object[]> {
    const usersAndPermsetAssignments = this.bulkQuery(conn, 'SELECT Id, Username FROM User');
    return usersAndPermsetAssignments;
    // Use the fetched User IDs to then query for PermissionSetAssignments and GroupMembers using similar Bulk API calls or logic.
  }

  private static async bulkQuery(conn: Connection, query: string): Promise<object[]> {
    return new Promise((resolve, reject) => {
      const records: object[] = [];

      conn.bulk
        .query(query)
        .on('record', (rec: object) => {
          records.push(rec); // Accumulate records
        })
        .on('end', () => {
          resolve(records); // Resolve the promise with the accumulated records once all have been received
        })
        .on('error', (err: Error) => {
          reject(err); // Reject the promise on error
        });
    });
  }
}

export { OrgDetails, UserNameOrg, BatchDownloadHelper, AssignmentHelper };
