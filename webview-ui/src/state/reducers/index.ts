import { WebviewAction } from "../actions/types"
import { WebviewState } from "../types"
import { apiConfigReducer } from "./apiConfigReducer"
import { messageReducer } from "./messageReducer"
import { settingsReducer } from "./settingsReducer"
import { uiReducer } from "./uiReducer"

export const webviewReducer = (state: WebviewState, action: WebviewAction): WebviewState => {
	// Apply domain-specific reducers
	return {
		...state,
		apiConfiguration: apiConfigReducer(state.apiConfiguration, action),
		clineMessages: messageReducer(state.clineMessages, action),
		autoApprovalSettings: settingsReducer.autoApproval(state.autoApprovalSettings, action),
		browserSettings: settingsReducer.browser(state.browserSettings, action),
		chatSettings: settingsReducer.chat(state.chatSettings, action),
		telemetrySetting: settingsReducer.telemetry(state.telemetrySetting, action),
		customInstructions: settingsReducer.customInstructions(state.customInstructions, action),
		showWelcome: uiReducer.showWelcome(state.showWelcome, action),
		shouldShowAnnouncement: uiReducer.shouldShowAnnouncement(state.shouldShowAnnouncement, action),
		theme: uiReducer.theme(state.theme, action),
		filePaths: uiReducer.filePaths(state.filePaths, action),
		openRouterModels: uiReducer.openRouterModels(state.openRouterModels, action),
		openAiModels: uiReducer.openAiModels(state.openAiModels, action),
		mcpServers: uiReducer.mcpServers(state.mcpServers, action),
		mcpMarketplaceCatalog: uiReducer.mcpMarketplaceCatalog(state.mcpMarketplaceCatalog, action),
	}
}
