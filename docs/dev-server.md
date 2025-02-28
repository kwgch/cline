# Enhanced Development Server

This document explains how to use the Enhanced Development Server feature in Cline, which improves the development workflow by reducing the need for frequent rebuilds.

## Overview

The Enhanced Development Server provides the following capabilities:

1. **Hot Module Replacement (HMR)** - Changes to your code are automatically applied without requiring a full page reload.
2. **Development Proxy Server** - A proxy server that sits between your browser and development server, enabling debugging and HMR.
3. **Watch Mode with Selective Rebuilding** - File watchers monitor specified directories and trigger reloads only when relevant files change.

## Using the Development Server

### Starting a Development Server

You can start a development server using the `DevServerManager` class:

```typescript
import { DevServerManager, DevServerType } from "../integrations/dev-server";
import { TerminalManager } from "../integrations/terminal/TerminalManager";

// Create a terminal manager
const terminalManager = new TerminalManager();

// Create a development server manager
const devServerManager = new DevServerManager(terminalManager);

// Start a development server
const serverInfo = await devServerManager.startServer({
  name: "My App",
  cwd: "/path/to/project",
  command: "npm run dev",
  type: DevServerType.React, // Or other types: Node, Vue, Angular, Next, Vite, Webpack, Custom
  port: 3000, // The port your development server runs on
  watchPaths: ["/path/to/project/src"], // Directories to watch for changes
  proxyEnabled: true, // Enable the proxy server
  proxyPort: 3001, // The port for the proxy server
  hotReloadEnabled: true, // Enable hot module replacement
});

// The server URL will be available in serverInfo.url
console.log(`Server running at ${serverInfo.url}`);
```

### Stopping a Development Server

To stop a development server:

```typescript
await devServerManager.stopServer(serverInfo.id);
```

### Reloading a Development Server

To trigger a reload of a development server:

```typescript
await devServerManager.reloadServer(serverInfo.id);
```

### Getting Server Information

To get information about all running servers:

```typescript
const servers = devServerManager.getAllServers();
```

To get information about a specific server:

```typescript
const server = devServerManager.getServer(serverId);
```

To get servers by status:

```typescript
const runningServers = devServerManager.getServersByStatus(DevServerStatus.Running);
```

## Configuration Options

When starting a development server, you can configure the following options:

| Option | Type | Description |
|--------|------|-------------|
| `name` | string | The name of the server |
| `cwd` | string | The working directory for the server |
| `command` | string | The command to start the server |
| `type` | DevServerType | The type of server (Node, React, Vue, Angular, Next, Vite, Webpack, Custom) |
| `port` | number | The port the server runs on |
| `watchPaths` | string[] | Directories to watch for changes |
| `proxyEnabled` | boolean | Whether to enable the proxy server |
| `proxyPort` | number | The port for the proxy server |
| `hotReloadEnabled` | boolean | Whether to enable hot module replacement |

## Server Types

The following server types are supported:

- `DevServerType.Node` - Node.js server
- `DevServerType.React` - React application
- `DevServerType.Vue` - Vue.js application
- `DevServerType.Angular` - Angular application
- `DevServerType.Next` - Next.js application
- `DevServerType.Vite` - Vite application
- `DevServerType.Webpack` - Webpack application
- `DevServerType.Custom` - Custom server type

## Server Status

A server can have the following statuses:

- `DevServerStatus.Starting` - The server is starting
- `DevServerStatus.Running` - The server is running
- `DevServerStatus.Stopping` - The server is stopping
- `DevServerStatus.Stopped` - The server is stopped
- `DevServerStatus.Error` - The server encountered an error

## Events

The `DevServerManager` emits the following events:

- `started` - Emitted when a server starts
- `stopped` - Emitted when a server stops
- `reloaded` - Emitted when a server is reloaded
- `error` - Emitted when a server encounters an error
- `log` - Emitted when a server logs a message

## Example: React Application

Here's an example of starting a development server for a React application:

```typescript
const serverInfo = await devServerManager.startServer({
  name: "React App",
  cwd: "/path/to/react-app",
  command: "npm start",
  type: DevServerType.React,
  port: 3000,
  watchPaths: ["/path/to/react-app/src"],
  proxyEnabled: true,
  proxyPort: 3001,
  hotReloadEnabled: true,
});
```

## Example: Node.js Server

Here's an example of starting a development server for a Node.js server:

```typescript
const serverInfo = await devServerManager.startServer({
  name: "Node Server",
  cwd: "/path/to/node-server",
  command: "npm run dev",
  type: DevServerType.Node,
  port: 3000,
  watchPaths: ["/path/to/node-server/src"],
  proxyEnabled: true,
  proxyPort: 3001,
  hotReloadEnabled: true,
});
```

## Troubleshooting

### Common Issues

1. **Server doesn't start**
   - Check that the command is correct
   - Check that the working directory is correct
   - Check the terminal output for errors

2. **Hot reload doesn't work**
   - Check that `hotReloadEnabled` is set to `true`
   - Check that the `watchPaths` are correct
   - Check that the proxy server is enabled and configured correctly

3. **Proxy server doesn't work**
   - Check that `proxyEnabled` is set to `true`
   - Check that the `proxyPort` is available
   - Check that the main server port is correct

### Getting Help

If you encounter issues not covered here, please:
- Check the [GitHub issues](https://github.com/cline/cline/issues)
- Join the [Discord community](https://discord.gg/cline)
