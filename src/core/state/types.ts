import { ApiConfiguration } from "../../shared/api"
import { AutoApprovalSettings } from "../../shared/AutoApprovalSettings"
import { BrowserSettings } from "../../shared/BrowserSettings"
import { ChatSettings } from "../../shared/ChatSettings"
import { ClineMessage } from "../../shared/ExtensionMessage"
import { HistoryItem } from "../../shared/HistoryItem"
import { TelemetrySetting } from "../../shared/TelemetrySetting"

/**
 * The main application state interface.
 * This represents the complete state of the core extension.
 */
export interface AppState {
	version: string
	apiConfiguration: ApiConfiguration
	customInstructions?: string
	taskHistory: HistoryItem[]
	currentTaskId?: string
	clineMessages: ClineMessage[]
	autoApprovalSettings: AutoApprovalSettings
	browserSettings: BrowserSettings
	chatSettings: ChatSettings
	userInfo?: {
		displayName: string | null
		email: string | null
		photoURL: string | null
	}
	telemetrySetting: TelemetrySetting
	// Add other state properties as needed
}

// Import default settings
import { DEFAULT_AUTO_APPROVAL_SETTINGS } from "../../shared/AutoApprovalSettings"
import { DEFAULT_BROWSER_SETTINGS } from "../../shared/BrowserSettings"
import { DEFAULT_CHAT_SETTINGS } from "../../shared/ChatSettings"

/**
 * Creates the initial state with default values.
 * @param version The extension version
 * @returns The initial application state
 */
export const createInitialState = (version: string): AppState => ({
	version,
	apiConfiguration: {
		apiProvider: "openrouter", // Default provider
	},
	taskHistory: [],
	clineMessages: [],
	autoApprovalSettings: DEFAULT_AUTO_APPROVAL_SETTINGS,
	browserSettings: DEFAULT_BROWSER_SETTINGS,
	chatSettings: DEFAULT_CHAT_SETTINGS,
	telemetrySetting: "unset",
})
