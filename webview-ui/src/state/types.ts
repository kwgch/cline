import { ApiConfiguration, openRouterDefaultModelId, openRouterDefaultModelInfo } from "../../../src/shared/api"
import { AutoApprovalSettings, DEFAULT_AUTO_APPROVAL_SETTINGS } from "../../../src/shared/AutoApprovalSettings"
import { BrowserSettings, DEFAULT_BROWSER_SETTINGS } from "../../../src/shared/BrowserSettings"
import { ChatSettings, DEFAULT_CHAT_SETTINGS } from "../../../src/shared/ChatSettings"
import { ClineMessage, DEFAULT_PLATFORM } from "../../../src/shared/ExtensionMessage"
import { HistoryItem } from "../../../src/shared/HistoryItem"
import { McpMarketplaceCatalog, McpServer } from "../../../src/shared/mcp"
import { TelemetrySetting } from "../../../src/shared/TelemetrySetting"

export interface WebviewState {
	version: string
	apiConfiguration: Omit<
		ApiConfiguration,
		| "apiKey"
		| "openRouterApiKey"
		| "awsAccessKey"
		| "awsSecretKey"
		| "awsSessionToken"
		| "openAiApiKey"
		| "geminiApiKey"
		| "openAiNativeApiKey"
		| "deepSeekApiKey"
		| "requestyApiKey"
		| "togetherApiKey"
		| "qwenApiKey"
		| "mistralApiKey"
		| "liteLlmApiKey"
	>
	customInstructions?: string
	taskHistory: HistoryItem[]
	currentTaskItem?: HistoryItem
	checkpointTrackerErrorMessage?: string
	clineMessages: ClineMessage[]
	shouldShowAnnouncement: boolean
	platform: "aix" | "darwin" | "freebsd" | "linux" | "openbsd" | "sunos" | "win32" | "unknown"
	autoApprovalSettings: AutoApprovalSettings
	browserSettings: BrowserSettings
	chatSettings: ChatSettings
	isLoggedIn: boolean
	userInfo?: {
		displayName: string | null
		email: string | null
		photoURL: string | null
	}
	mcpMarketplaceEnabled?: boolean
	telemetrySetting: TelemetrySetting

	// Webview-specific state
	didHydrateState: boolean
	showWelcome: boolean
	theme: any
	openRouterModels: Record<string, any>
	openAiModels: string[]
	mcpServers: McpServer[]
	mcpMarketplaceCatalog: McpMarketplaceCatalog
	filePaths: string[]
}

// Create a default initial state

export const createInitialState = (): WebviewState => ({
	version: "",
	apiConfiguration: {},
	taskHistory: [],
	clineMessages: [],
	shouldShowAnnouncement: false,
	platform: DEFAULT_PLATFORM,
	autoApprovalSettings: DEFAULT_AUTO_APPROVAL_SETTINGS,
	browserSettings: DEFAULT_BROWSER_SETTINGS,
	chatSettings: DEFAULT_CHAT_SETTINGS,
	isLoggedIn: false,
	telemetrySetting: "unset",

	// Webview-specific state
	didHydrateState: false,
	showWelcome: true,
	theme: undefined,
	openRouterModels: {
		[openRouterDefaultModelId]: openRouterDefaultModelInfo,
	},
	openAiModels: [],
	mcpServers: [],
	mcpMarketplaceCatalog: { items: [] },
	filePaths: [],
})
