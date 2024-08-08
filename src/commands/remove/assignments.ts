import { Flags, SfCommand } from '@salesforce/sf-plugins-core';
import { Connection, Messages } from '@salesforce/core';
import {
  BatchDownloadHelper,
  mapSObjectsByKeyField,
  OrgDetails,
  SObject,
  UnassignableObject,
  UserNameOrg,
  UserNameOrgError,
} from '../../utils/Utils.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@marsson/ciutils', 'remove.assignments');
export type RemoveAssignmentsResult = {
  path: string;
};

export default class RemoveAssignments extends SfCommand<RemoveAssignmentsResult> {
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
    object: Flags.option({
      summary: messages.getMessage('flags.object.summary'),
      char: 'b',
      required: true,
      multiple: true,
      options: ['PermissionSet', 'PermissionSetGroup', 'Group'] as const,
    })(),
    usernames: Flags.string({
      summary: messages.getMessage('flags.usernames.summary'),
      char: 'u',
      required: true,
      multiple: true,
    }),
    'target-org': Flags.requiredOrg(),
  };
  private connection: Connection | undefined;
  public async run(): Promise<RemoveAssignmentsResult> {
    const { flags } = await this.parse(RemoveAssignments);
    const processTarget = new ProcessTarget();
    this.connection = flags['target-org'].getConnection();
    this.spinner.start('fetching data');

    // gets all the users from the org using batch
    const allObjects = await BatchDownloadHelper.fetchMultipleObjectsInParallell(this.connection);
    if (typeof allObjects.users === 'undefined') {
      this.log('Error on user query. log a bug on github!');
    }

    processTarget.userByUserName = mapSObjectsByKeyField(allObjects.users, 'Username');
    processTarget.groupByUserId = mapSObjectsByKeyField(allObjects.groupmembers, 'UserOrGroupId');
    processTarget.permissionsetByUserId = mapSObjectsByKeyField(allObjects.permissionsets, 'AssigneeId');
    processTarget.permissionsetGroupByUserId = mapSObjectsByKeyField(allObjects.permissionsetgroups, 'AssigneeId');
    this.spinner.stop('data fetched');

    const answeruserlist = await this.matchUsersAndGenerateOrgUserList(
      processTarget.userByUserName,
      flags['usernames']
    );
    processTarget.usernameOrgs = answeruserlist.total;
    processTarget.userNameByUserId = answeruserlist.unerroredById;

    await this.processHandler(this.connection, processTarget, flags.object);
    this.finalize(processTarget);

    return {
      path: '/Users/marcelo.cost/Projects/ciutils/src/commands/remove/assignments.ts',
    };
  }

  private async matchUsersAndGenerateOrgUserList(
    allUserByUsername: Map<string, SObject[]>,
    requestedUsers: string[]
  ): Promise<{ total: UserNameOrg[]; unerroredById: Map<string, UserNameOrg> }> {
    const response = { total: new Array<UserNameOrg>(), unerroredById: new Map<string, UserNameOrg>() };
    const userConfigs: UserNameOrg[] = [];
    const unerroredById = new Map<string, UserNameOrg>();
    const sandboxName = await OrgDetails.getSandboxName(this.connection!);

    for (const user of requestedUsers) {
      const userorg = new UserNameOrg(sandboxName, user);

      if (allUserByUsername.has(user) || allUserByUsername.has(user + '.' + sandboxName)) {
        // UGLY: Assuming there is ALWAYS 1 username/Id true, but still ugly
        if (allUserByUsername.get(user) !== undefined) {
          const userlist = allUserByUsername.get(user);
          userorg.userId = userlist![0].Id;
          userorg.username = user;
        } else {
          const userlist = allUserByUsername.get(user + '.' + sandboxName);
          userorg.userId = userlist![0].Id;
          userorg.username = user + '.' + sandboxName;
        }

        unerroredById.set(userorg.userId, userorg);
      } else {
        userorg.error = UserNameOrgError.USER_NOT_FOUND;
      }
      userConfigs.push(userorg);
    }
    response.total = userConfigs;
    response.unerroredById = unerroredById;
    return response;
  }

  // eslint-disable-next-line class-methods-use-this
  private async processHandler(conn: Connection, target: ProcessTarget, objects: string[]): Promise<void> {
    const groupAssignmentsToBeDeleted = new Array<UnassignableObject>();
    const permissionSetAssignmentsToBeDeleted = new Array<UnassignableObject>();
    const permissionSetGroupAssignmentsToBeDeleted = new Array<UnassignableObject>();

    for (const usernameorg of target.userNameByUserId.values()) {
      // groups handling
      if (objects.includes('Group')) {
        const userGroups = target.groupByUserId.get(usernameorg.userId!);
        if (userGroups !== undefined) {
          groupAssignmentsToBeDeleted.push(...UnassignableObject.createUnassignablesforGroups(userGroups));
        }
      }
      if (objects.includes('PermissionSet')) {
        const userPermissionSets = target.permissionsetByUserId.get(usernameorg.userId!);
        if (userPermissionSets !== undefined) {
          permissionSetAssignmentsToBeDeleted.push(
            ...UnassignableObject.createUnassignablesforPermissionSet(userPermissionSets)
          );
        }
      }
      if (objects.includes('PermissionSetGroup')) {
        const userPermissionSetGroups = target.permissionsetGroupByUserId.get(usernameorg.userId!);
        if (userPermissionSetGroups !== undefined) {
          permissionSetGroupAssignmentsToBeDeleted.push(
            ...UnassignableObject.createUnassignablesforPermissionSetGroup(userPermissionSetGroups)
          );
        }
      }
    }
    if (
      groupAssignmentsToBeDeleted.length +
        permissionSetGroupAssignmentsToBeDeleted.length +
        permissionSetAssignmentsToBeDeleted.length !==
      0
    ) {
      await BatchDownloadHelper.deleteObjectsFromUnassignableObjects(conn, [
        ...groupAssignmentsToBeDeleted,
        ...permissionSetAssignmentsToBeDeleted,
        ...permissionSetGroupAssignmentsToBeDeleted,
      ]);
    }
  }
  private finalize(target: ProcessTarget): void {
    const success = new Array<UserNameOrg>();
    const failure = new Array<UserNameOrg>();
    this.log(
      '\n\n\n=========================================================================================================='
    );
    this.log('Finalized proccess: Showing overall user unassigned results');
    this.log(
      '=========================================================================================================='
    );
    for (const usernameOrg of target.usernameOrgs) {
      if (usernameOrg.error === undefined) {
        success.push(usernameOrg);
      } else {
        failure.push(usernameOrg);
      }
      if (success.length !== 0) {
        this.log(
          '\n\n\n=========================================================================================================='
        );
        this.log(`Finalized Awesomely: ${success.map((anusernameOrg) => anusernameOrg.username).join(' ')}`);
        this.log(
          '=========================================================================================================='
        );
      }
    }
    if (failure.length !== 0) {
      this.log(
        '\n\n\n=========================================================================================================='
      );
      this.log('FAILURE LIST:');
      for (const failed of failure) {
        this.log(`${!failed.username}, failed with error: ${!failed.error}`);
      }
      this.log(
        '=========================================================================================================='
      );
    }
  }
}

class ProcessTarget {
  public userByUserName = new Map<string, SObject[]>();
  public userNameByUserId = new Map<string, UserNameOrg>();
  public groupByUserId = new Map<string, SObject[]>();
  public permissionsetByUserId = new Map<string, SObject[]>();
  public permissionsetGroupByUserId = new Map<string, SObject[]>();
  public usernameOrgs = new Array<UserNameOrg>();
}
