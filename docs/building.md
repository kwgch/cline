# Building the Cline Extension

This guide explains how to build the Cline VSCode extension from source and create a VSIX package for distribution.

## Prerequisites

Before you begin, ensure you have the following installed:

- [Node.js](https://nodejs.org/) (LTS version recommended)
- [npm](https://www.npmjs.com/) (comes with Node.js)
- [Git](https://git-scm.com/) with [git-lfs](https://git-lfs.com/) for large file storage
- [Visual Studio Code](https://code.visualstudio.com/)
- [vsce](https://github.com/microsoft/vscode-vsce) - VS Code Extension Manager

To install vsce globally:

```bash
npm install -g @vscode/vsce
```

## Setting Up the Development Environment

1. Clone the repository:

```bash
git clone https://github.com/cline/cline.git
```

2. Navigate to the project directory:

```bash
cd cline
```

3. Install dependencies for both the extension and webview UI:

```bash
npm run install:all
```

## Building the Extension

The Cline extension consists of two main parts:
- The core extension (TypeScript code in the `src` directory)
- The webview UI (React application in the `webview-ui` directory)

### Development Build

For development and testing:

```bash
npm run compile
```

This will:
- Check types with TypeScript
- Run ESLint
- Bundle the extension using esbuild

### Production Build

To create a production build:

```bash
npm run package
```

This will:
- Build the webview UI
- Check types with TypeScript
- Run ESLint
- Bundle the extension for production using esbuild with minification

## Creating a VSIX File

A VSIX file is a package format used to distribute VS Code extensions. There are two ways to create a VSIX file:

### Streamlined Packaging Process (Recommended)

The recommended way to create a VSIX package is to use the streamlined packaging script:

```bash
# Full build with all checks
npm run package:vsix

# Quick build that skips non-essential checks
npm run package:vsix:quick
```

The streamlined packaging script provides several advantages:
- Automatically detects which components need to be rebuilt
- Provides better error handling with clear error messages
- Includes a "package-only" mode that skips non-essential checks
- Creates backups to ensure the process can be safely interrupted

For more details and advanced options, see [VSIX Packaging Notes](./vsix-packaging-notes.md).

### Standard Packaging Process

Alternatively, you can use the standard process:

1. Ensure you've built the extension for production:

```bash
npm run package
```

2. Use vsce to package the extension:

```bash
vsce package
```

This will create a `.vsix` file in the root directory of the project, named something like `claude-dev-3.4.9.vsix` (version number may vary).

### Creating a Pre-release VSIX

If you want to create a pre-release version:

```bash
vsce package --pre-release
```

Or with the streamlined process:

```bash
npm run package:vsix -- --pre-release
```

## Installing the VSIX File

There are several ways to install the VSIX file:

### Using VS Code UI

1. Open VS Code
2. Go to the Extensions view (Ctrl+Shift+X)
3. Click on the "..." menu in the top-right of the Extensions view
4. Select "Install from VSIX..."
5. Navigate to and select your VSIX file

### Using VS Code CLI

```bash
code --install-extension claude-dev-3.4.9.vsix
```

### Using vsce

```bash
vsce install claude-dev-3.4.9.vsix
```

## Publishing to Marketplace

The Cline extension uses two scripts for publishing:

- For regular releases:
  ```bash
  npm run publish:marketplace
  ```

- For pre-releases:
  ```bash
  npm run publish:marketplace:prerelease
  ```

These commands will publish the extension to both the VS Code Marketplace and the Open VSX Registry.

> **Note:** Publishing requires appropriate credentials and permissions for both marketplaces.

## Troubleshooting

### Common Issues

1. **Missing dependencies**
   - Ensure you've run `npm run install:all` to install all dependencies

2. **Build errors**
   - Check the error messages for specific issues
   - Run `npm run lint` to check for linting errors
   - Run `npm run check-types` to check for type errors

3. **VSIX creation fails**
   - Ensure the `package.json` has all required fields
   - Check that all files referenced in `package.json` exist
   - Verify that the `.vscodeignore` file doesn't exclude necessary files

### Getting Help

If you encounter issues not covered here, please:
- Check the [GitHub issues](https://github.com/cline/cline/issues)
- Join the [Discord community](https://discord.gg/cline)
