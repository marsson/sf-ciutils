# ciutils

[![NPM](https://img.shields.io/npm/v/ciutils.svg?label=ciutils)](https://www.npmjs.com/package/ciutils) [![Downloads/week](https://img.shields.io/npm/dw/ciutils.svg)](https://npmjs.org/package/ciutils) [![License](https://img.shields.io/badge/License-BSD%203--Clause-brightgreen.svg)](https://raw.githubusercontent.com/salesforcecli/ciutils/main/LICENSE.txt)

## Using the template

This repository provides a template for creating a plugin for the Salesforce CLI. To convert this template to a working plugin:

1. Please get in touch with the Platform CLI team. We want to help you develop your plugin.
2. Generate your plugin:

   ```
   sf plugins install dev
   sf dev generate plugin

   git init -b main
   git add . && git commit -m "chore: initial commit"
   ```

3. Create your plugin's repo in the salesforcecli github org
4. When you're ready, replace the contents of this README with the information you want.

## Learn about `sf` plugins

Salesforce CLI plugins are based on the [oclif plugin framework](<(https://oclif.io/docs/introduction.html)>). Read the [plugin developer guide](https://developer.salesforce.com/docs/atlas.en-us.sfdx_cli_plugins.meta/sfdx_cli_plugins/cli_plugins_architecture_sf_cli.htm) to learn about Salesforce CLI plugin development.

This repository contains a lot of additional scripts and tools to help with general Salesforce node development and enforce coding standards. You should familiarize yourself with some of the [node developer packages](#tooling) used by Salesforce.

Additionally, there are some additional tests that the Salesforce CLI will enforce if this plugin is ever bundled with the CLI. These test are included by default under the `posttest` script and it is required to keep these tests active in your plugin if you plan to have it bundled.

### Tooling

- [@salesforce/core](https://github.com/forcedotcom/sfdx-core)
- [@salesforce/kit](https://github.com/forcedotcom/kit)
- [@salesforce/sf-plugins-core](https://github.com/salesforcecli/sf-plugins-core)
- [@salesforce/ts-types](https://github.com/forcedotcom/ts-types)
- [@salesforce/ts-sinon](https://github.com/forcedotcom/ts-sinon)
- [@salesforce/dev-config](https://github.com/forcedotcom/dev-config)
- [@salesforce/dev-scripts](https://github.com/forcedotcom/dev-scripts)

### Hooks

For cross clouds commands, e.g. `sf env list`, we utilize [oclif hooks](https://oclif.io/docs/hooks) to get the relevant information from installed plugins.

This plugin includes sample hooks in the [src/hooks directory](src/hooks). You'll just need to add the appropriate logic. You can also delete any of the hooks if they aren't required for your plugin.

# Everything past here is only a suggestion as to what should be in your specific plugin's description

This plugin is bundled with the [Salesforce CLI](https://developer.salesforce.com/tools/sfdxcli). For more information on the CLI, read the [getting started guide](https://developer.salesforce.com/docs/atlas.en-us.sfdx_setup.meta/sfdx_setup/sfdx_setup_intro.htm).

We always recommend using the latest version of these commands bundled with the CLI, however, you can install a specific version or tag if needed.

## Install

```bash
sf plugins install ciutils@x.y.z
```

## Issues

Please report any issues at https://github.com/forcedotcom/cli/issues

## Contributing

1. Please read our [Code of Conduct](CODE_OF_CONDUCT.md)
2. Create a new issue before starting your project so that we can keep track of
   what you are trying to add/fix. That way, we can also offer suggestions or
   let you know if there is already an effort in progress.
3. Fork this repository.
4. [Build the plugin locally](#build)
5. Create a _topic_ branch in your fork. Note, this step is recommended but technically not required if contributing using a fork.
6. Edit the code in your fork.
7. Write appropriate tests for your changes. Try to achieve at least 95% code coverage on any new code. No pull request will be accepted without unit tests.
8. Sign CLA (see [CLA](#cla) below).
9. Send us a pull request when you are done. We'll review your code, suggest any needed changes, and merge it in.

### CLA

External contributors will be required to sign a Contributor's License
Agreement. You can do so by going to https://cla.salesforce.com/sign-cla.

### Build

To build the plugin locally, make sure to have yarn installed and run the following commands:

```bash
# Clone the repository
git clone git@github.com:salesforcecli/ciutils

# Install the dependencies and compile
yarn && yarn build
```

To use your plugin, run using the local `./bin/dev` or `./bin/dev.cmd` file.

```bash
# Run using local run file.
./bin/dev hello world
```

There should be no differences when running via the Salesforce CLI or using the local run file. However, it can be useful to link the plugin to do some additional testing or run your commands from anywhere on your machine.

```bash
# Link your plugin to the sf cli
sf plugins link .
# To verify
sf plugins
```

## Commands

<!-- commands -->
* [`sf create file`](#sf-create-file)
* [`sf remove assignments`](#sf-remove-assignments)
* [`sf reporton deployment`](#sf-reporton-deployment)
* [`sf validate repository metadata`](#sf-validate-repository-metadata)

## `sf create file`

Upload a local file to an org.

```
USAGE
  $ sf create file -o <value> -f <value> [--json] [--flags-dir <value>] [--api-version <value>] [-t <value>] [-i
    <value>] [-c <value>]

FLAGS
  -c, --created-date=<value>  Datetime value in ISO 8601 format (e.g., 2024-08-09T15:30:00Z).
  -f, --file=<value>          (required) Path of file to upload.
  -i, --parent-id=<value>     ID of the record to attach the file to.
  -o, --target-org=<value>    (required) Username or alias of the target org. Not required if the `target-org`
                              configuration variable is already set.
  -t, --title=<value>         New title given to the file (ContentDocument) after it's uploaded.
      --api-version=<value>   Override the api version used for api requests made by this command

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Upload a local file to an org.

  This command always creates a new file in the org; you can't update an existing file. After a successful upload, the
  command displays the ID of the new ContentDocument record which represents the uploaded file.

  By default, the uploaded file isn't attached to a record; in the Salesforce UI the file shows up in the Files tab. You
  can optionally attach the file to an existing record, such as an account, as long as you know its record ID.

  You can also give the file a new name after it's been uploaded; by default its name in the org is the same as the
  local file name.

EXAMPLES
  Upload the local file "resources/astro.png" to your default org:

    $ sf create file --file resources/astro.png

  Give the file a different filename after it's uploaded to the org with alias "my-scratch":

    $ sf create file --file resources/astro.png --title AstroOnABoat.png --target-org my-scratch

  Attach the file to a record in the org:

    $ sf create file --file path/to/astro.png --parent-id a03fakeLoJWPIA3
```

## `sf remove assignments`

Summary of a command.

```
USAGE
  $ sf remove assignments -b PermissionSet|PermissionSetGroup|Group... -u <value>... -o <value> [--json] [--flags-dir
    <value>] [-n <value>]

FLAGS
  -b, --object=<option>...    (required) The object for which the assignment will be removed.
                              <options: PermissionSet|PermissionSetGroup|Group>
  -n, --name=<value>          Description of a flag.
  -o, --target-org=<value>    (required) Username or alias of the target org. Not required if the `target-org`
                              configuration variable is already set.
  -u, --usernames=<value>...  (required) The list of usernames to be unassigned from the selected object. If in a
                              sandbox, the script will look for "usename" and "username".sandbox for unassignment.

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Summary of a command.

  More information about a command. Don't repeat the summary.

EXAMPLES
  $ sf remove assignments

FLAG DESCRIPTIONS
  -n, --name=<value>  Description of a flag.

    More information about a flag. Don't repeat the summary.
```

## `sf reporton deployment`

Summary of a command.

```
USAGE
  $ sf reporton deployment -o <value> -d <value> [--json] [--flags-dir <value>] [-a]

FLAGS
  -a, --awaitcompletion       If the aplication should respond every 30 sec until the deployment is complete.
  -d, --deploymentid=<value>  (required) The id of the deployment that we want to report on.
  -o, --target-org=<value>    (required) Username or alias of the target org. Not required if the `target-org`
                              configuration variable is already set.

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Summary of a command.

  More information about a command. Don't repeat the summary.

EXAMPLES
  $ sf reporton deployment
```

## `sf validate repository metadata`

Summary of a command.

```
USAGE
  $ sf validate repository metadata -o <value> -f <value> [--json] [--flags-dir <value>] [-n <value>]

FLAGS
  -f, --folder=<value>      (required) The path to the deployment folder (ex. force-app/main/default/obects).
  -n, --name=<value>        Description of a flag.
  -o, --target-org=<value>  (required) Username or alias of the target org. Not required if the `target-org`
                            configuration variable is already set.

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Summary of a command.

  More information about a command. Don't repeat the summary.

EXAMPLES
  $ sf validate repository metadata

FLAG DESCRIPTIONS
  -n, --name=<value>  Description of a flag.

    More information about a flag. Don't repeat the summary.
```
<!-- commandsstop -->
