import { ActionType, WebviewAction } from "./types"

export const setShowWelcome = (show: boolean): WebviewAction => ({
	type: ActionType.SET_SHOW_WELCOME,
	payload: show,
})

export const setShowAnnouncement = (show: boolean): WebviewAction => ({
	type: ActionType.SET_SHOW_ANNOUNCEMENT,
	payload: show,
	sendToExtension: !show,
	toExtensionMessage: () => ({
		type: "didShowAnnouncement",
	}),
})

export const setTheme = (theme: any): WebviewAction => ({
	type: ActionType.SET_THEME,
	payload: theme,
})

export const setFilePaths = (filePaths: string[]): WebviewAction => ({
	type: ActionType.SET_FILE_PATHS,
	payload: filePaths,
})

export const setOpenRouterModels = (models: Record<string, any>): WebviewAction => ({
	type: ActionType.SET_OPENROUTER_MODELS,
	payload: models,
})

export const setOpenAiModels = (models: string[]): WebviewAction => ({
	type: ActionType.SET_OPENAI_MODELS,
	payload: models,
})

export const setMcpServers = (servers: any[]): WebviewAction => ({
	type: ActionType.SET_MCP_SERVERS,
	payload: servers,
})

export const setMcpMarketplaceCatalog = (catalog: any): WebviewAction => ({
	type: ActionType.SET_MCP_MARKETPLACE_CATALOG,
	payload: catalog,
})
