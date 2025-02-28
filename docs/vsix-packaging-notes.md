# VSIX Packaging Notes

This document contains notes and workarounds for creating a VSIX package for the Cline extension, especially when encountering build issues.

## Standard Build Process

The standard build process for creating a VSIX package is:

1. Run `npm run package` to build the extension (including the webview UI)
2. Run `vsce package` to create the VSIX file

This is documented in the [building.md](./building.md) file.

## Common Build Issues and Workarounds

### Webview UI Build Issues

#### Issue: External CSS Import Error

When building the webview UI, you might encounter an error like:

```
Module not found: Error: You attempted to import "../../node_modules/@vscode/codicons/dist/codicon.css" which falls outside of the project src/ directory. Relative imports outside of src/ are not supported.
```

**Workaround:**
1. Install the codicons package in the webview-ui directory:
   ```
   cd webview-ui
   npm install @vscode/codicons --save
   ```

2. Update the import in `webview-ui/src/index.tsx` to use the installed package:
   ```typescript
   // Change this:
   import "../../node_modules/@vscode/codicons/dist/codicon.css"
   
   // To this:
   import "@vscode/codicons/dist/codicon.css"
   ```

#### Issue: Missing Dependencies

If you encounter errors about missing dependencies like `rewire`, install them:

```
cd webview-ui
npm install rewire --save-dev
```

### Creating a VSIX Without Full Build

If you need to create a VSIX package without running the full build process (e.g., for testing or when encountering build errors):

1. Temporarily modify the `vscode:prepublish` script in `package.json`:
   ```json
   "vscode:prepublish": "echo 'Skipping build for packaging'"
   ```

2. Create a minimal `dist/extension.js` file:
   ```javascript
   // This is a placeholder extension.js file for packaging purposes only
   const vscode = require('vscode');

   function activate(context) {
       console.log('Cline extension is now active');
       
       // Register a simple command
       let disposable = vscode.commands.registerCommand('cline.helloWorld', function () {
           vscode.window.showInformationMessage('Hello from Cline!');
       });
       
       context.subscriptions.push(disposable);
   }

   function deactivate() {}

   module.exports = { activate, deactivate };
   ```

3. Run `vsce package` with the `--no-dependencies` flag:
   ```
   vsce package --no-yarn --no-dependencies
   ```

4. After creating the VSIX, restore the original `vscode:prepublish` script in `package.json`.

## Important Notes

- The VSIX file will be created in the project root directory with a name like `claude-dev-3.4.9.vsix` (version may vary).
- This approach creates a non-functional VSIX for packaging purposes only. The extension won't work properly when installed.
- For production builds, always use the standard build process.
- Remember to restore any temporary changes made to the codebase after creating the VSIX.

## Build Artifacts to Include in .gitignore

Ensure the following build artifacts are included in your `.gitignore` file:

```
# Build output
out
dist
build
*.vsix

# Dependencies
node_modules
tmp
.vscode-test/

# Logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Coverage reports
coverage/

# Temporary files
.temp
.tmp
