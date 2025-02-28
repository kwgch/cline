#!/usr/bin/env node

/**
 * Streamlined VSIX Packaging Script
 * 
 * This script provides a more resilient build pipeline for creating VSIX packages:
 * - Handles partial builds by checking what components need to be rebuilt
 * - Provides better error handling with clear error messages
 * - Includes a "package-only" mode that skips non-essential checks
 * 
 * Usage:
 *   node scripts/package-vsix.js [options]
 * 
 * Options:
 *   --package-only     Skip non-essential checks and only package the extension
 *   --skip-webview     Skip rebuilding the webview UI
 *   --skip-lint        Skip linting
 *   --skip-type-check  Skip TypeScript type checking
 *   --verbose          Show detailed output
 *   --help             Show help
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Configuration
const config = {
  packageOnly: false,
  skipWebview: false,
  skipLint: false,
  skipTypeCheck: false,
  verbose: false,
  help: false
};

// Parse command line arguments
process.argv.slice(2).forEach(arg => {
  if (arg === '--package-only') config.packageOnly = true;
  if (arg === '--skip-webview') config.skipWebview = true;
  if (arg === '--skip-lint') config.skipLint = true;
  if (arg === '--skip-type-check') config.skipTypeCheck = true;
  if (arg === '--verbose') config.verbose = true;
  if (arg === '--help') config.help = true;
});

// Show help if requested
if (config.help) {
  console.log(`
Streamlined VSIX Packaging Script

Usage:
  node scripts/package-vsix.js [options]

Options:
  --package-only     Skip non-essential checks and only package the extension
  --skip-webview     Skip rebuilding the webview UI
  --skip-lint        Skip linting
  --skip-type-check  Skip TypeScript type checking
  --verbose          Show detailed output
  --help             Show help
  `);
  process.exit(0);
}

// If package-only mode is enabled, set all skip flags
if (config.packageOnly) {
  config.skipWebview = true;
  config.skipLint = true;
  config.skipTypeCheck = true;
}

// Utility functions
const log = {
  info: (message) => console.log(`\x1b[36m[INFO]\x1b[0m ${message}`),
  success: (message) => console.log(`\x1b[32m[SUCCESS]\x1b[0m ${message}`),
  warning: (message) => console.log(`\x1b[33m[WARNING]\x1b[0m ${message}`),
  error: (message) => console.error(`\x1b[31m[ERROR]\x1b[0m ${message}`),
  verbose: (message) => {
    if (config.verbose) {
      console.log(`\x1b[90m[VERBOSE]\x1b[0m ${message}`);
    }
  }
};

/**
 * Execute a command and return its output
 * @param {string} command - Command to execute
 * @param {Object} options - Options for child_process.execSync
 * @returns {string} - Command output
 */
function exec(command, options = {}) {
  log.verbose(`Executing: ${command}`);
  try {
    const output = execSync(command, {
      encoding: 'utf8',
      stdio: config.verbose ? 'inherit' : 'pipe',
      ...options
    });
    return output;
  } catch (error) {
    if (!options.ignoreError) {
      log.error(`Command failed: ${command}`);
      log.error(error.message);
      throw error;
    }
    return error.message;
  }
}

/**
 * Execute a command asynchronously with real-time output
 * @param {string} command - Command to execute
 * @param {string[]} args - Command arguments
 * @returns {Promise<number>} - Exit code
 */
function execAsync(command, args) {
  return new Promise((resolve, reject) => {
    log.verbose(`Executing async: ${command} ${args.join(' ')}`);
    
    const child = spawn(command, args, {
      stdio: 'pipe',
      shell: true
    });
    
    child.stdout.on('data', (data) => {
      process.stdout.write(data.toString());
    });
    
    child.stderr.on('data', (data) => {
      process.stderr.write(data.toString());
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        resolve(code);
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });
    
    child.on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * Check if a directory or file has been modified since the last build
 * @param {string} path - Path to check
 * @param {Date} lastBuildTime - Last build time
 * @returns {boolean} - True if modified, false otherwise
 */
function hasBeenModified(path, lastBuildTime) {
  if (!fs.existsSync(path)) {
    return false;
  }
  
  const stats = fs.statSync(path);
  
  if (stats.isDirectory()) {
    const files = fs.readdirSync(path);
    return files.some(file => hasBeenModified(`${path}/${file}`, lastBuildTime));
  }
  
  return stats.mtime > lastBuildTime;
}

/**
 * Get the last build time
 * @returns {Date} - Last build time or null if no build exists
 */
function getLastBuildTime() {
  const distPath = path.join(__dirname, '..', 'dist', 'extension.js');
  if (fs.existsSync(distPath)) {
    return fs.statSync(distPath).mtime;
  }
  return null;
}

/**
 * Check if the webview UI needs to be rebuilt
 * @returns {boolean} - True if rebuild needed, false otherwise
 */
function needsWebviewRebuild() {
  const lastBuildTime = getLastBuildTime();
  if (!lastBuildTime) {
    return true;
  }
  
  return hasBeenModified(path.join(__dirname, '..', 'webview-ui', 'src'), lastBuildTime);
}

/**
 * Check if the extension needs to be rebuilt
 * @returns {boolean} - True if rebuild needed, false otherwise
 */
function needsExtensionRebuild() {
  const lastBuildTime = getLastBuildTime();
  if (!lastBuildTime) {
    return true;
  }
  
  return hasBeenModified(path.join(__dirname, '..', 'src'), lastBuildTime);
}

/**
 * Create a backup of the package.json file
 * @returns {Object} - Original package.json content
 */
function backupPackageJson() {
  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  fs.writeFileSync(`${packageJsonPath}.bak`, JSON.stringify(packageJson, null, 2));
  return packageJson;
}

/**
 * Restore the package.json file from backup
 */
function restorePackageJson() {
  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  if (fs.existsSync(`${packageJsonPath}.bak`)) {
    fs.copyFileSync(`${packageJsonPath}.bak`, packageJsonPath);
    fs.unlinkSync(`${packageJsonPath}.bak`);
  }
}

/**
 * Ensure the dist directory exists
 */
function ensureDistDirectory() {
  const distPath = path.join(__dirname, '..', 'dist');
  if (!fs.existsSync(distPath)) {
    fs.mkdirSync(distPath, { recursive: true });
  }
}

/**
 * Main function
 */
async function main() {
  try {
    log.info('Starting VSIX packaging process...');
    
    // Backup package.json
    const originalPackageJson = backupPackageJson();
    
    // Ensure dist directory exists
    ensureDistDirectory();
    
    // Build steps
    let buildSteps = [];
    
    // Check if webview UI needs to be rebuilt
    if (!config.skipWebview && needsWebviewRebuild()) {
      buildSteps.push({
        name: 'Building webview UI',
        command: 'npm',
        args: ['run', 'build:webview']
      });
    } else if (config.skipWebview) {
      log.warning('Skipping webview UI build');
    } else {
      log.info('Webview UI is up to date, skipping build');
    }
    
    // Check if TypeScript type checking is needed
    if (!config.skipTypeCheck) {
      buildSteps.push({
        name: 'Checking TypeScript types',
        command: 'npm',
        args: ['run', 'check-types']
      });
    } else {
      log.warning('Skipping TypeScript type checking');
    }
    
    // Check if linting is needed
    if (!config.skipLint) {
      buildSteps.push({
        name: 'Linting code',
        command: 'npm',
        args: ['run', 'lint']
      });
    } else {
      log.warning('Skipping linting');
    }
    
    // Check if extension needs to be rebuilt
    if (needsExtensionRebuild() || buildSteps.length === 0) {
      buildSteps.push({
        name: 'Building extension',
        command: 'node',
        args: ['esbuild.js', '--production']
      });
    } else {
      log.info('Extension is up to date, skipping build');
    }
    
    // Execute build steps
    for (const step of buildSteps) {
      log.info(step.name);
      try {
        await execAsync(step.command, step.args);
      } catch (error) {
        log.error(`${step.name} failed: ${error.message}`);
        
        // Ask user if they want to continue
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        });
        
        const answer = await new Promise(resolve => {
          rl.question('Do you want to continue with packaging? (y/N) ', resolve);
        });
        
        rl.close();
        
        if (answer.toLowerCase() !== 'y') {
          throw new Error('Build process aborted by user');
        }
        
        log.warning('Continuing with packaging despite build errors');
      }
    }
    
    // Package the extension
    log.info('Creating VSIX package...');
    await execAsync('vsce', ['package']);
    
    // Get the VSIX filename
    const vsixFilename = fs.readdirSync(path.join(__dirname, '..')).find(file => file.endsWith('.vsix'));
    
    if (vsixFilename) {
      log.success(`VSIX package created successfully: ${vsixFilename}`);
    } else {
      log.error('Failed to find the created VSIX package');
    }
    
  } catch (error) {
    log.error(`VSIX packaging failed: ${error.message}`);
    process.exit(1);
  } finally {
    // Restore package.json
    restorePackageJson();
  }
}

// Run the main function
main();
