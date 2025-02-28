import { openRouterDefaultModelId, openRouterDefaultModelInfo } from "../../../../src/shared/api"
import { McpMarketplaceCatalog, McpServer } from "../../../../src/shared/mcp"
import { ActionType, WebviewAction } from "../actions/types"

export const uiReducer = {
	showWelcome: (state: boolean = true, action: WebviewAction): boolean => {
		switch (action.type) {
			case ActionType.SET_SHOW_WELCOME:
				return action.payload

			default:
				return state
		}
	},

	shouldShowAnnouncement: (state: boolean = false, action: WebviewAction): boolean => {
		switch (action.type) {
			case ActionType.SET_SHOW_ANNOUNCEMENT:
				return action.payload

			default:
				return state
		}
	},

	theme: (state: any = undefined, action: WebviewAction): any => {
		switch (action.type) {
			case ActionType.SET_THEME:
				return action.payload

			default:
				return state
		}
	},

	filePaths: (state: string[] = [], action: WebviewAction): string[] => {
		switch (action.type) {
			case ActionType.SET_FILE_PATHS:
				return action.payload

			default:
				return state
		}
	},

	openRouterModels: (
		state: Record<string, any> = { [openRouterDefaultModelId]: openRouterDefaultModelInfo },
		action: WebviewAction,
	): Record<string, any> => {
		switch (action.type) {
			case ActionType.SET_OPENROUTER_MODELS:
				return {
					[openRouterDefaultModelId]: openRouterDefaultModelInfo,
					...action.payload,
				}

			default:
				return state
		}
	},

	openAiModels: (state: string[] = [], action: WebviewAction): string[] => {
		switch (action.type) {
			case ActionType.SET_OPENAI_MODELS:
				return action.payload

			default:
				return state
		}
	},

	mcpServers: (state: McpServer[] = [], action: WebviewAction): McpServer[] => {
		switch (action.type) {
			case ActionType.SET_MCP_SERVERS:
				return action.payload

			default:
				return state
		}
	},

	mcpMarketplaceCatalog: (state: McpMarketplaceCatalog = { items: [] }, action: WebviewAction): McpMarketplaceCatalog => {
		switch (action.type) {
			case ActionType.SET_MCP_MARKETPLACE_CATALOG:
				return action.payload

			default:
				return state
		}
	},
}
