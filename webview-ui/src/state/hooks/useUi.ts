import { useCallback } from "react"
import { McpMarketplaceCatalog, McpServer } from "../../../../src/shared/mcp"
import {
	setMcpMarketplaceCatalog,
	setMcpServers,
	setOpenAiModels,
	setOpenRouterModels,
	setShowAnnouncement,
	setShowWelcome,
} from "../actions/uiActions"
import {
	selectCheckpointTrackerErrorMessage,
	selectDidHydrateState,
	selectFilePaths,
	selectMcpMarketplaceCatalog,
	selectMcpServers,
	selectOpenAiModels,
	selectOpenRouterModels,
	selectShouldShowAnnouncement,
	selectShowWelcome,
	selectTheme,
} from "../selectors/uiSelectors"
import { useWebviewState } from "../WebviewStateContext"

export const useShowWelcome = (): [boolean, (show: boolean) => void] => {
	const { state, dispatch } = useWebviewState()
	const showWelcome = selectShowWelcome(state)

	const setShowWelcomeAction = useCallback(
		(show: boolean) => {
			dispatch(setShowWelcome(show))
		},
		[dispatch],
	)

	return [showWelcome, setShowWelcomeAction]
}

export const useShowAnnouncement = (): [boolean, (show: boolean) => void] => {
	const { state, dispatch } = useWebviewState()
	const shouldShowAnnouncement = selectShouldShowAnnouncement(state)

	const setShowAnnouncementAction = useCallback(
		(show: boolean) => {
			dispatch(setShowAnnouncement(show))
		},
		[dispatch],
	)

	return [shouldShowAnnouncement, setShowAnnouncementAction]
}

export const useTheme = (): any => {
	const { state } = useWebviewState()
	return selectTheme(state)
}

export const useFilePaths = (): string[] => {
	const { state } = useWebviewState()
	return selectFilePaths(state)
}

export const useOpenRouterModels = (): [Record<string, any>, (models: Record<string, any>) => void] => {
	const { state, dispatch } = useWebviewState()
	const models = selectOpenRouterModels(state)

	const setModels = useCallback(
		(newModels: Record<string, any>) => {
			dispatch(setOpenRouterModels(newModels))
		},
		[dispatch],
	)

	return [models, setModels]
}

export const useOpenAiModels = (): [string[], (models: string[]) => void] => {
	const { state, dispatch } = useWebviewState()
	const models = selectOpenAiModels(state)

	const setModels = useCallback(
		(newModels: string[]) => {
			dispatch(setOpenAiModels(newModels))
		},
		[dispatch],
	)

	return [models, setModels]
}

export const useMcpServers = (): [McpServer[], (servers: McpServer[]) => void] => {
	const { state, dispatch } = useWebviewState()
	const servers = selectMcpServers(state)

	const setServers = useCallback(
		(newServers: McpServer[]) => {
			dispatch(setMcpServers(newServers))
		},
		[dispatch],
	)

	return [servers, setServers]
}

export const useMcpMarketplaceCatalog = (): [McpMarketplaceCatalog, (catalog: McpMarketplaceCatalog) => void] => {
	const { state, dispatch } = useWebviewState()
	const catalog = selectMcpMarketplaceCatalog(state)

	const setCatalog = useCallback(
		(newCatalog: McpMarketplaceCatalog) => {
			dispatch(setMcpMarketplaceCatalog(newCatalog))
		},
		[dispatch],
	)

	return [catalog, setCatalog]
}

export const useDidHydrateState = (): boolean => {
	const { state } = useWebviewState()
	return selectDidHydrateState(state)
}

export const useCheckpointTrackerErrorMessage = (): string | undefined => {
	const { state } = useWebviewState()
	return selectCheckpointTrackerErrorMessage(state)
}
