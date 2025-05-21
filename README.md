# SF-CIUtils: Salesforce CI/CD Utilities 🚀

[![NPM](https://img.shields.io/npm/v/@marsson/ciutils.svg?label=@marsson/ciutils)](https://www.npmjs.com/package/@marsson/ciutils) 
[![Downloads/week](https://img.shields.io/npm/dw/@marsson/ciutils.svg)](https://npmjs.org/package/@marsson/ciutils) 
[![License](https://img.shields.io/badge/License-BSD%203--Clause-brightgreen.svg)](https://raw.githubusercontent.com/salesforcecli/ciutils/main/LICENSE.txt)
[![codecov](https://codecov.io/gh/marsson/sf-ciutils/branch/main/graph/badge.svg)](https://codecov.io/gh/marsson/sf-ciutils)

## 🌟 What is SF-CIUtils?

SF-CIUtils is a powerful toolkit for Salesforce developers who want to supercharge their CI/CD workflows! This plugin for the Salesforce CLI provides essential utilities that make continuous integration and deployment with Salesforce a breeze.

Think of it as your Swiss Army knife for Salesforce CI/CD operations - whether you're validating repository metadata, monitoring deployments, managing file uploads, or handling user permissions, SF-CIUtils has got you covered!

## ✨ Features

- **Validate Repository Metadata**: Compare your local metadata with what's in your org to catch metadata drift
- **Report on Deployments**: Get detailed, real-time information about your deployments
- **Create Files**: Upload files to Salesforce with ease
- **Remove Assignments**: Efficiently manage permission sets, permission set groups, and group assignments

## 🚀 Installation

```bash
sf plugins install @marsson/ciutils
```

Or install a specific version:

```bash
sf plugins install @marsson/ciutils@x.y.z
```

## 🔧 Commands

### `sf validate repository metadata`

This command helps you validate your local metadata against what's in your Salesforce org. It's like having a detective that spots differences between your local files and what's actually deployed!

```bash
sf validate repository metadata --folder path/to/metadata --target-org your-org
```

**Example**: Check if your local Apex classes match what's in your production org:

```bash
sf validate repository metadata --folder force-app/main/default/classes --target-org production
```

### `sf reporton deployment`

Keep an eye on your deployments with this command. It's like having a deployment dashboard right in your terminal!

```bash
sf reporton deployment --deploymentid 0AfXXXXXXXXXXXXXXX --target-org your-org
```

**Example**: Monitor a deployment and wait for it to complete:

```bash
sf reporton deployment --deploymentid 0AfXXXXXXXXXXXXXXX --target-org production --awaitcompletion
```

### `sf create file`

Upload files to your Salesforce org with this handy command. Perfect for adding documents, images, or any other files to your org!

```bash
sf create file --file path/to/file --target-org your-org
```

**Example**: Upload an image and attach it to a record:

```bash
sf create file --file assets/logo.png --title "Company Logo" --parent-id 001XXXXXXXXXXXXXXX --target-org production
```

### `sf remove assignments`

Efficiently manage user permissions by removing assignments from users. Great for cleaning up access during user offboarding!

```bash
sf remove assignments --object PermissionSet --usernames user@example.com --target-org your-org
```

**Example**: Remove multiple permission sets from multiple users:

```bash
sf remove assignments --object PermissionSet --usernames user1@example.com user2@example.com --target-org production
```

## 🧪 Development

To contribute to SF-CIUtils, follow these steps:

1. Clone the repository:
   ```bash
   git clone https://github.com/marsson/sf-ciutils.git
   ```

2. Install dependencies:
   ```bash
   yarn install
   ```

3. Build the plugin:
   ```bash
   yarn build
   ```

4. Link to your local Salesforce CLI:
   ```bash
   sf plugins link .
   ```

5. Run tests:
   ```bash
   yarn test
   ```

## 🤝 Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the BSD 3-Clause License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Thanks to the Salesforce CLI team for their amazing work
- Shoutout to all the contributors who have helped make this project better
- Special thanks to the Salesforce developer community for their continuous support

---

Happy coding! May your deployments be swift and your validations pass on the first try! 🎉
