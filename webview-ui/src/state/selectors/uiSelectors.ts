import { McpMarketplaceCatalog, McpServer } from "../../../../src/shared/mcp"
import { WebviewState } from "../types"

export const selectShowWelcome = (state: WebviewState): boolean => state.showWelcome

export const selectShouldShowAnnouncement = (state: WebviewState): boolean => state.shouldShowAnnouncement

export const selectTheme = (state: WebviewState): any => state.theme

export const selectFilePaths = (state: WebviewState): string[] => state.filePaths

export const selectOpenRouterModels = (state: WebviewState): Record<string, any> => state.openRouterModels

export const selectOpenAiModels = (state: WebviewState): string[] => state.openAiModels

export const selectMcpServers = (state: WebviewState): McpServer[] => state.mcpServers

export const selectMcpMarketplaceCatalog = (state: WebviewState): McpMarketplaceCatalog => state.mcpMarketplaceCatalog

export const selectDidHydrateState = (state: WebviewState): boolean => state.didHydrateState

export const selectCheckpointTrackerErrorMessage = (state: WebviewState): string | undefined =>
	state.checkpointTrackerErrorMessage
