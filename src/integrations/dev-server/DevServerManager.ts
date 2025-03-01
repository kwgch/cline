import * as vscode from "vscode"
import * as path from "path"
import { EventEmitter } from "events"
import { TerminalManager } from "../terminal/TerminalManager"
import { TerminalInfo } from "../terminal/TerminalRegistry"
import { ProxyServer } from "./ProxyServer"

export interface DevServerEvents {
	started: [serverInfo: DevServerInfo]
	stopped: [serverInfo: DevServerInfo]
	reloaded: [serverInfo: DevServerInfo]
	error: [error: Error, serverInfo?: DevServerInfo]
	log: [message: string, serverInfo: DevServerInfo]
}

export interface DevServerInfo {
	id: string
	name: string
	url: string
	cwd: string
	type: DevServerType
	status: DevServerStatus
	terminalId?: number
	port?: number
	watchPaths?: string[]
	proxyEnabled?: boolean
	proxyPort?: number
	hotReloadEnabled?: boolean
}

export enum DevServerType {
	Node = "node",
	React = "react",
	Vue = "vue",
	Angular = "angular",
	Next = "next",
	Vite = "vite",
	Webpack = "webpack",
	Custom = "custom",
}

export enum DevServerStatus {
	Starting = "starting",
	Running = "running",
	Stopping = "stopping",
	Stopped = "stopped",
	Error = "error",
}

/**
 * DevServerManager manages development servers for the extension.
 * It provides capabilities for:
 * - Starting and stopping development servers
 * - Hot module replacement
 * - Development proxy server for debugging
 * - Watch modes with selective rebuilding
 */
export class DevServerManager extends EventEmitter<DevServerEvents> {
	private servers: Map<string, DevServerInfo> = new Map()
	private terminalManager: TerminalManager
	private disposables: vscode.Disposable[] = []
	private fileWatchers: Map<string, vscode.FileSystemWatcher> = new Map()
	private proxyServers: Map<string, ProxyServer> = new Map()

	constructor(terminalManager: TerminalManager) {
		super()
		this.terminalManager = terminalManager

		// Listen for file changes to trigger hot reload
		this.disposables.push(
			vscode.workspace.onDidSaveTextDocument((document) => {
				this.handleFileChange(document.uri.fsPath)
			}),
		)
	}

	/**
	 * Start a development server
	 * @param options Server configuration options
	 * @returns The server info
	 */
	async startServer(options: {
		name: string
		cwd: string
		command: string
		type?: DevServerType
		port?: number
		watchPaths?: string[]
		proxyEnabled?: boolean
		proxyPort?: number
		hotReloadEnabled?: boolean
	}): Promise<DevServerInfo> {
		const {
			name,
			cwd,
			command,
			type = DevServerType.Custom,
			port,
			watchPaths = [],
			proxyEnabled = false,
			proxyPort,
			hotReloadEnabled = true,
		} = options

		// Generate a unique ID for the server
		const id = `${name}-${Date.now()}`

		// Create server info
		const serverInfo: DevServerInfo = {
			id,
			name,
			url: port ? `http://localhost:${port}` : "",
			cwd,
			type,
			status: DevServerStatus.Starting,
			port,
			watchPaths,
			proxyEnabled,
			proxyPort,
			hotReloadEnabled,
		}

		// Store server info
		this.servers.set(id, serverInfo)

		try {
			// Get or create terminal
			const terminalInfo = await this.terminalManager.getOrCreateTerminal(cwd)
			terminalInfo.terminal.show()
			serverInfo.terminalId = terminalInfo.id

			// Setup file watchers if hot reload is enabled
			if (hotReloadEnabled && watchPaths.length > 0) {
				this.setupFileWatchers(serverInfo)
			}

			// Setup proxy server if enabled
			if (proxyEnabled && port && proxyPort) {
				await this.setupProxyServer(serverInfo)
			}

			// Start the server
			const process = this.terminalManager.runCommand(terminalInfo, command)

			// Listen for output
			process.on("line", (line) => {
				// Check for common server startup patterns
				if (
					line.includes("started server") ||
					line.includes("listening on port") ||
					line.includes("development server running at") ||
					line.includes("compiled successfully") ||
					line.includes("ready in")
				) {
					serverInfo.status = DevServerStatus.Running
					this.servers.set(id, serverInfo)
					this.emit("started", serverInfo)
				}

				// Emit log event
				this.emit("log", line, serverInfo)
			})

			// Wait for the process to complete or continue
			await process

			return serverInfo
		} catch (error) {
			serverInfo.status = DevServerStatus.Error
			this.servers.set(id, serverInfo)
			this.emit("error", error instanceof Error ? error : new Error(String(error)), serverInfo)
			throw error
		}
	}

	/**
	 * Stop a development server
	 * @param id The server ID
	 */
	async stopServer(id: string): Promise<void> {
		const serverInfo = this.servers.get(id)
		if (!serverInfo) {
			throw new Error(`Server with ID ${id} not found`)
		}

		serverInfo.status = DevServerStatus.Stopping
		this.servers.set(id, serverInfo)

		try {
			// Remove file watchers
			this.removeFileWatchers(serverInfo)

			// Stop proxy server if enabled
			if (serverInfo.proxyEnabled && serverInfo.proxyPort) {
				await this.stopProxyServer(serverInfo)
			}

			// If we have a terminal ID, send SIGINT to stop the server
			if (serverInfo.terminalId !== undefined) {
				const terminalInfo = await this.getTerminalInfo(serverInfo.terminalId)
				if (terminalInfo) {
					// Send CTRL+C to stop the server
					terminalInfo.terminal.sendText("\u0003", false)
				}
			}

			serverInfo.status = DevServerStatus.Stopped
			this.servers.set(id, serverInfo)
			this.emit("stopped", serverInfo)
		} catch (error) {
			serverInfo.status = DevServerStatus.Error
			this.servers.set(id, serverInfo)
			this.emit("error", error instanceof Error ? error : new Error(String(error)), serverInfo)
			throw error
		}
	}

	/**
	 * Reload a development server
	 * @param id The server ID
	 */
	async reloadServer(id: string): Promise<void> {
		const serverInfo = this.servers.get(id)
		if (!serverInfo) {
			throw new Error(`Server with ID ${id} not found`)
		}

		try {
			// If hot reload is enabled, we can just trigger a file change event
			// Otherwise, we need to restart the server
			if (serverInfo.hotReloadEnabled) {
				// Send a message to the proxy server to trigger a reload
				if (serverInfo.proxyEnabled && serverInfo.proxyPort) {
					const proxyServer = this.proxyServers.get(serverInfo.id)
					if (proxyServer) {
						// Trigger hot reload via proxy server
						proxyServer.triggerHotReload()
						this.emit("log", "Hot reload triggered via proxy server", serverInfo)
					}
				}

				// Emit reloaded event
				this.emit("reloaded", serverInfo)
			} else {
				// Stop and restart the server
				await this.stopServer(id)

				// TODO: Implement server restart
				// For a full implementation, we would need to store the original server options
				// and restart the server with the same options

				// For now, just emit the event
				this.emit("reloaded", serverInfo)
			}
		} catch (error) {
			this.emit("error", error instanceof Error ? error : new Error(String(error)), serverInfo)
			throw error
		}
	}

	/**
	 * Get all running servers
	 * @returns Array of server info objects
	 */
	getAllServers(): DevServerInfo[] {
		return Array.from(this.servers.values())
	}

	/**
	 * Get a server by ID
	 * @param id The server ID
	 * @returns The server info or undefined if not found
	 */
	getServer(id: string): DevServerInfo | undefined {
		return this.servers.get(id)
	}

	/**
	 * Get servers by status
	 * @param status The server status
	 * @returns Array of server info objects
	 */
	getServersByStatus(status: DevServerStatus): DevServerInfo[] {
		return Array.from(this.servers.values()).filter((server) => server.status === status)
	}

	/**
	 * Handle file changes for hot reload
	 * @param filePath The path of the changed file
	 */
	private handleFileChange(filePath: string): void {
		// Check if any server is watching this file
		for (const serverInfo of this.servers.values()) {
			if (
				serverInfo.status === DevServerStatus.Running &&
				serverInfo.hotReloadEnabled &&
				serverInfo.watchPaths &&
				serverInfo.watchPaths.some((watchPath) => filePath.startsWith(watchPath))
			) {
				// Trigger a reload for this server
				this.reloadServer(serverInfo.id).catch((error) => {
					this.emit("error", error, serverInfo)
				})
			}
		}
	}

	/**
	 * Setup file watchers for a server
	 * @param serverInfo The server info
	 */
	private setupFileWatchers(serverInfo: DevServerInfo): void {
		if (!serverInfo.watchPaths) {
			return
		}

		// Create a file watcher for each watch path
		for (const watchPath of serverInfo.watchPaths) {
			const pattern = new vscode.RelativePattern(watchPath, "**/*")
			const watcher = vscode.workspace.createFileSystemWatcher(pattern)

			// Watch for file changes
			watcher.onDidChange((uri) => {
				this.handleFileChange(uri.fsPath)
			})

			// Store the watcher
			this.fileWatchers.set(`${serverInfo.id}-${watchPath}`, watcher)
		}
	}

	/**
	 * Remove file watchers for a server
	 * @param serverInfo The server info
	 */
	private removeFileWatchers(serverInfo: DevServerInfo): void {
		if (!serverInfo.watchPaths) {
			return
		}

		// Remove and dispose each file watcher
		for (const watchPath of serverInfo.watchPaths) {
			const key = `${serverInfo.id}-${watchPath}`
			const watcher = this.fileWatchers.get(key)
			if (watcher) {
				watcher.dispose()
				this.fileWatchers.delete(key)
			}
		}
	}

	/**
	 * Setup a proxy server for debugging
	 * @param serverInfo The server info
	 */
	private async setupProxyServer(serverInfo: DevServerInfo): Promise<void> {
		if (!serverInfo.port || !serverInfo.proxyPort) {
			throw new Error("Server port and proxy port are required for proxy server setup")
		}

		try {
			// Create proxy server
			const proxyServer = new ProxyServer({
				targetUrl: `http://localhost:${serverInfo.port}`,
				port: serverInfo.proxyPort,
				injectHmr: serverInfo.hotReloadEnabled,
				logRequests: true,
				enableDebugTools: true,
			})

			// Listen for proxy server events
			proxyServer.on("started", (port) => {
				this.emit("log", `Proxy server started on port ${port}`, serverInfo)
			})

			proxyServer.on("stopped", () => {
				this.emit("log", "Proxy server stopped", serverInfo)
			})

			proxyServer.on("error", (error) => {
				this.emit("error", error, serverInfo)
			})

			proxyServer.on("log", (message) => {
				this.emit("log", `[Proxy] ${message}`, serverInfo)
			})

			// Start proxy server
			await proxyServer.start()

			// Store proxy server
			this.proxyServers.set(serverInfo.id, proxyServer)

			// Update server info with proxy URL
			serverInfo.url = `http://localhost:${serverInfo.proxyPort}`
			this.servers.set(serverInfo.id, serverInfo)
		} catch (error) {
			this.emit("error", error instanceof Error ? error : new Error(String(error)), serverInfo)
			throw error
		}
	}

	/**
	 * Stop a proxy server
	 * @param serverInfo The server info
	 */
	private async stopProxyServer(serverInfo: DevServerInfo): Promise<void> {
		const proxyServer = this.proxyServers.get(serverInfo.id)
		if (!proxyServer) {
			return
		}

		try {
			// Stop proxy server
			await proxyServer.stop()

			// Remove proxy server
			this.proxyServers.delete(serverInfo.id)
		} catch (error) {
			this.emit("error", error instanceof Error ? error : new Error(String(error)), serverInfo)
			throw error
		}
	}

	/**
	 * Get terminal info for a terminal ID
	 * @param terminalId The terminal ID
	 * @returns The terminal info or undefined if not found
	 */
	private async getTerminalInfo(terminalId: number): Promise<TerminalInfo | undefined> {
		try {
			return await vscode.commands.executeCommand<TerminalInfo>("cline.getTerminalInfo", terminalId)
		} catch (error) {
			console.error(`Error getting terminal info for terminal ${terminalId}:`, error)
			return undefined
		}
	}

	/**
	 * Dispose all resources
	 */
	dispose(): void {
		// Stop all servers
		for (const serverInfo of this.servers.values()) {
			if (serverInfo.status === DevServerStatus.Running) {
				this.stopServer(serverInfo.id).catch((error) => {
					console.error(`Error stopping server ${serverInfo.id}:`, error)
				})
			}
		}

		// Dispose all file watchers
		for (const watcher of this.fileWatchers.values()) {
			watcher.dispose()
		}
		this.fileWatchers.clear()

		// Dispose all disposables
		for (const disposable of this.disposables) {
			disposable.dispose()
		}
		this.disposables = []

		// Stop all proxy servers
		for (const proxyServer of this.proxyServers.values()) {
			proxyServer.stop().catch((error) => {
				console.error("Error stopping proxy server:", error)
			})
		}
		this.proxyServers.clear()

		// Clear servers
		this.servers.clear()
	}
}
