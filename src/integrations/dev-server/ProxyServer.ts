import * as http from "http"
import * as https from "https"
import * as net from "net"
import * as url from "url"
import WebSocket from "ws"
import { EventEmitter } from "events"

export interface ProxyServerEvents {
	started: [port: number]
	stopped: []
	error: [error: Error]
	request: [req: http.IncomingMessage, res: http.ServerResponse]
	websocketConnection: [socket: WebSocket]
	log: [message: string]
}

export interface ProxyServerOptions {
	targetUrl: string
	port: number
	injectHmr?: boolean
	logRequests?: boolean
	enableDebugTools?: boolean
}

/**
 * ProxyServer provides a development proxy server for debugging and hot module replacement.
 * It intercepts requests to the development server and can:
 * 1. Provide debugging information
 * 2. Enable hot module replacement
 * 3. Inject development tools
 */
export class ProxyServer extends EventEmitter<ProxyServerEvents> {
	private server: http.Server | null = null
	private wsServer: WebSocket.Server | null = null
	private clients: Set<WebSocket> = new Set()
	private options: ProxyServerOptions
	private isRunning: boolean = false

	constructor(options: ProxyServerOptions) {
		super()
		this.options = options
	}

	/**
	 * Start the proxy server
	 */
	async start(): Promise<void> {
		if (this.isRunning) {
			return
		}

		try {
			// Create HTTP server
			this.server = http.createServer((req, res) => {
				this.handleRequest(req, res)
			})

			// Create WebSocket server for HMR
			this.wsServer = new WebSocket.Server({ server: this.server })
			this.wsServer.on("connection", (socket: WebSocket) => {
				this.handleWebSocketConnection(socket)
			})

			// Start listening
			await new Promise<void>((resolve, reject) => {
				if (!this.server) {
					reject(new Error("Server not initialized"))
					return
				}

				this.server.on("error", (error) => {
					reject(error)
				})

				this.server.listen(this.options.port, () => {
					this.isRunning = true
					this.emit("started", this.options.port)
					this.emit("log", `Proxy server started on port ${this.options.port}`)
					resolve()
				})
			})
		} catch (error) {
			this.emit("error", error instanceof Error ? error : new Error(String(error)))
			throw error
		}
	}

	/**
	 * Stop the proxy server
	 */
	async stop(): Promise<void> {
		if (!this.isRunning) {
			return
		}

		try {
			// Close all WebSocket connections
			for (const client of this.clients) {
				client.close()
			}
			this.clients.clear()

			// Close WebSocket server
			if (this.wsServer) {
				await new Promise<void>((resolve, reject) => {
					this.wsServer?.close((error?: Error) => {
						if (error) {
							reject(error)
						} else {
							resolve()
						}
					})
				})
				this.wsServer = null
			}

			// Close HTTP server
			if (this.server) {
				await new Promise<void>((resolve, reject) => {
					this.server?.close((error?: Error) => {
						if (error) {
							reject(error)
						} else {
							resolve()
						}
					})
				})
				this.server = null
			}

			this.isRunning = false
			this.emit("stopped")
			this.emit("log", "Proxy server stopped")
		} catch (error) {
			this.emit("error", error instanceof Error ? error : new Error(String(error)))
			throw error
		}
	}

	/**
	 * Trigger a hot reload for all connected clients
	 */
	triggerHotReload(): void {
		if (!this.isRunning || !this.options.injectHmr) {
			return
		}

		// Send reload message to all clients
		const message = JSON.stringify({ type: "reload" })
		for (const client of this.clients) {
			if (client.readyState === WebSocket.OPEN) {
				client.send(message)
			}
		}

		this.emit("log", "Hot reload triggered")
	}

	/**
	 * Handle HTTP requests
	 * @param req The request
	 * @param res The response
	 */
	private handleRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
		this.emit("request", req, res)

		if (this.options.logRequests) {
			this.emit("log", `${req.method} ${req.url}`)
		}

		// Parse target URL
		const targetUrl = new url.URL(this.options.targetUrl)
		const options: http.RequestOptions = {
			hostname: targetUrl.hostname,
			port: targetUrl.port,
			path: req.url,
			method: req.method,
			headers: req.headers,
		}

		// Create proxy request
		const proxyReq = (targetUrl.protocol === "https:" ? https : http).request(options, (proxyRes) => {
			// Copy status code and headers
			res.writeHead(proxyRes.statusCode || 200, proxyRes.headers)

			// If this is an HTML response and we need to inject HMR, modify the content
			if (
				(this.options.injectHmr &&
					proxyRes.headers["content-type"]?.includes("text/html") &&
					req.url?.endsWith(".html")) ||
				req.url === "/"
			) {
				let body = ""
				proxyRes.on("data", (chunk) => {
					body += chunk
				})
				proxyRes.on("end", () => {
					// Inject HMR script
					const hmrScript = `
						<script>
							(function() {
								const socket = new WebSocket('ws://${req.headers.host}');
								socket.onmessage = function(event) {
									const message = JSON.parse(event.data);
									if (message.type === 'reload') {
										console.log('[HMR] Reloading page...');
										window.location.reload();
									}
								};
								socket.onopen = function() {
									console.log('[HMR] Connected to development server');
								};
								socket.onclose = function() {
									console.log('[HMR] Disconnected from development server');
								};
							})();
						</script>
					`
					// Inject before closing body tag
					const modifiedBody = body.replace("</body>", `${hmrScript}</body>`)
					res.end(modifiedBody)
				})
			} else {
				// Stream the response directly
				proxyRes.pipe(res)
			}
		})

		// Handle errors
		proxyReq.on("error", (error) => {
			this.emit("error", error)
			res.writeHead(500)
			res.end(`Proxy error: ${error.message}`)
		})

		// Pipe request body to proxy request
		req.pipe(proxyReq)
	}

	/**
	 * Handle WebSocket connections
	 * @param socket The WebSocket connection
	 */
	private handleWebSocketConnection(socket: WebSocket): void {
		this.clients.add(socket)
		this.emit("websocketConnection", socket)
		this.emit("log", "New WebSocket connection")

		// Handle disconnection
		socket.on("close", () => {
			this.clients.delete(socket)
			this.emit("log", "WebSocket connection closed")
		})

		// Send initial connection message
		socket.send(JSON.stringify({ type: "connected" }))
	}

	/**
	 * Check if the proxy server is running
	 * @returns True if the server is running, false otherwise
	 */
	isServerRunning(): boolean {
		return this.isRunning
	}

	/**
	 * Get the number of connected clients
	 * @returns The number of connected clients
	 */
	getConnectedClientCount(): number {
		return this.clients.size
	}
}
