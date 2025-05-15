
# SF-CIUtils Developer Guidelines

## Project Overview
SF-CIUtils is a Salesforce CLI plugin that provides utilities for continuous integration in Salesforce development. It's built using TypeScript and the OCLIF (Open CLI Framework) to extend Salesforce CLI functionality.

## Project Structure
- `/src/commands/` - Command implementations organized by topic
  - `/create/` - Commands for creating resources
  - `/remove/` - Commands for removing resources
  - `/reporton/` - Commands for reporting on deployments
  - `/validate/` - Commands for validating repository metadata
- `/src/utils/` - Shared utility functions
- `/messages/` - Externalized strings for internationalization
- `/test/` - Test files mirroring the src structure
- `/lib/` - Compiled JavaScript output

## Development Workflow

### Setup
1. Clone the repository
2. Install dependencies: `yarn install`
3. Build the project: `yarn build`

### Running Commands Locally
Use the local run file to test your commands:
```bash
./bin/dev <command> [flags]
```

### Testing
- Run all tests: `yarn test`
- Run only unit tests: `yarn test:only`
- Tests are written using Mocha and should be placed in the `/test` directory

### Code Quality
- Linting: `yarn lint`
- Formatting: `yarn format`
- Pre-commit hooks are configured with Husky to ensure code quality

## Best Practices
1. **Command Structure**:
  - Follow the OCLIF command pattern
  - Use the SfCommand base class
  - Externalize strings in the messages directory

2. **Error Handling**:
  - Use structured error handling
  - Provide clear error messages

3. **Testing**:
  - Write unit tests for all commands
  - Aim for at least 95% code coverage

4. **Git Workflow**:
  - Create feature branches for new work
  - Follow conventional commit message format
  - Run tests locally before pushing

## Building and Publishing
- Build the plugin: `yarn build`
- Link for local testing: `sf plugins link .`
- Package for distribution: `yarn prepack`

## Additional Resources
- [OCLIF Documentation](https://oclif.io/docs/introduction)
- [Salesforce CLI Plugin Developer Guide](https://developer.salesforce.com/docs/atlas.en-us.sfdx_cli_plugins.meta/sfdx_cli_plugins/cli_plugins_architecture_sf_cli.htm)
