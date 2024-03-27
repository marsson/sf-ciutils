import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { Connection, Messages } from '@salesforce/core';
import { OrgDetails, UserNameOrg, BatchDownloadHelper } from '../../utils/Utils.js';
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
    const users: UserNameOrg[] = [];
    this.connection = flags['target-org'].getConnection();
    this.spinner.start('fetching data');
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const allUsers = await BatchDownloadHelper.fetchAllUsers(this.connection);
    if (typeof allUsers === 'undefined') {
      this.log('this sucks');
    }
    this.spinner.stop('data fetched');
    const orgName = await OrgDetails.getSandboxName(this.connection);
    for (const ausername of flags['usernames']) {
      users.push(new UserNameOrg(orgName, ausername));
    }

    const aName = await OrgDetails.getSandboxName(this.connection);
    this.log(aName as string);
    const name = flags.name ?? 'world';
    this.log(`hello ${name} from /Users/marcelo.cost/Projects/ciutils/src/commands/remove/assignments.ts`);
    return {
      path: '/Users/marcelo.cost/Projects/ciutils/src/commands/remove/assignments.ts',
    };
  }
}
