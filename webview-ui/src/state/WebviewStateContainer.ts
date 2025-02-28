import { ExtensionMessage } from "../../../src/shared/ExtensionMessage"
import { WebviewMessage } from "../../../src/shared/WebviewMessage"
import { WebviewAction } from "./actions/types"
import { webviewReducer } from "./reducers/index"
import { WebviewState, createInitialState } from "./types"
import { vscode } from "../utils/vscode"
import { openRouterDefaultModelId, openRouterDefaultModelInfo } from "../../../src/shared/api"

export type StateChangeListener = (state: WebviewState) => void

export class WebviewStateContainer {
	private state: WebviewState
	private listeners: Set<StateChangeListener>

	constructor(initialState: WebviewState = createInitialState()) {
		this.state = initialState
		this.listeners = new Set()

		// Listen for messages from extension
		window.addEventListener("message", this.handleExtensionMessage)
	}

	getState(): Readonly<WebviewState> {
		return this.state
	}

	dispatch(action: WebviewAction): void {
		// Handle local actions
		const nextState = webviewReducer(this.state, action)
		if (nextState !== this.state) {
			this.state = nextState
			this.notifyListeners()
		}

		// Send action to extension if needed
		if (action.sendToExtension && action.toExtensionMessage) {
			this.sendMessageToExtension(action.toExtensionMessage())
		}
	}

	subscribe(listener: StateChangeListener): () => void {
		this.listeners.add(listener)
		return () => {
			this.listeners.delete(listener)
		}
	}

	private notifyListeners(): void {
		Array.from(this.listeners).forEach((listener) => {
			listener(this.state)
		})
	}

	private handleExtensionMessage = (event: MessageEvent): void => {
		const message: ExtensionMessage = event.data

		switch (message.type) {
			case "state": {
				if (message.state) {
					// Update entire state
					this.state = {
						...this.state,
						...message.state,
						didHydrateState: true,
						showWelcome: !this.hasApiKey(message.state),
					}
					this.notifyListeners()
				}
				break
			}

			case "theme": {
				if (message.text) {
					this.state = {
						...this.state,
						theme: JSON.parse(message.text),
					}
					this.notifyListeners()
				}
				break
			}

			case "workspaceUpdated": {
				this.state = {
					...this.state,
					filePaths: message.filePaths || [],
				}
				this.notifyListeners()
				break
			}

			case "partialMessage": {
				if (message.partialMessage) {
					const partialMessage = message.partialMessage
					const clineMessages = [...this.state.clineMessages]
					const lastIndex = clineMessages.findIndex((msg) => msg.ts === partialMessage.ts)

					if (lastIndex !== -1) {
						clineMessages[lastIndex] = partialMessage

						this.state = {
							...this.state,
							clineMessages,
						}
						this.notifyListeners()
					}
				}
				break
			}

			case "openRouterModels": {
				if (message.openRouterModels) {
					this.state = {
						...this.state,
						openRouterModels: {
							[openRouterDefaultModelId]: openRouterDefaultModelInfo,
							...message.openRouterModels,
						},
					}
					this.notifyListeners()
				}
				break
			}

			case "openAiModels": {
				this.state = {
					...this.state,
					openAiModels: message.openAiModels || [],
				}
				this.notifyListeners()
				break
			}

			case "mcpServers": {
				this.state = {
					...this.state,
					mcpServers: message.mcpServers || [],
				}
				this.notifyListeners()
				break
			}

			case "mcpMarketplaceCatalog": {
				if (message.mcpMarketplaceCatalog) {
					this.state = {
						...this.state,
						mcpMarketplaceCatalog: message.mcpMarketplaceCatalog,
					}
					this.notifyListeners()
				}
				break
			}
		}
	}

	private hasApiKey(state: any): boolean {
		if (!state.apiConfiguration) {
			return false
		}

		const config = state.apiConfiguration
		return [
			config.apiProvider === "vscode-lm" && config.vsCodeLmModelSelector,
			config.apiProvider === "ollama" && config.ollamaModelId,
			config.apiProvider === "lmstudio" && config.lmStudioModelId,
		].some(Boolean)
	}

	private sendMessageToExtension(message: WebviewMessage): void {
		vscode.postMessage(message)
	}

	// Initialize the webview
	initialize(): void {
		vscode.postMessage({ type: "webviewDidLaunch" })
	}
}

// Create a singleton instance
let webviewStateContainerInstance: WebviewStateContainer | undefined

export const getWebviewStateContainer = (initialState?: WebviewState): WebviewStateContainer => {
	if (!webviewStateContainerInstance) {
		webviewStateContainerInstance = new WebviewStateContainer(initialState)
	}

	return webviewStateContainerInstance
}

export const resetWebviewStateContainer = (): void => {
	webviewStateContainerInstance = undefined
}
