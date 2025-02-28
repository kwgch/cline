import { useCallback } from "react"
import { AutoApprovalSettings } from "../../../../src/shared/AutoApprovalSettings"
import { BrowserSettings } from "../../../../src/shared/BrowserSettings"
import { ChatSettings } from "../../../../src/shared/ChatSettings"
import { TelemetrySetting } from "../../../../src/shared/TelemetrySetting"
import { WebviewState } from "../types"
import { setAutoApprovalSettings, setBrowserSettings, setChatSettings, setTelemetrySetting } from "../actions/settingsActions"
import {
	selectAutoApprovalSettings,
	selectBrowserSettings,
	selectChatSettings,
	selectIsLoggedIn,
	selectMcpMarketplaceEnabled,
	selectPlatform,
	selectTelemetrySetting,
	selectUserInfo,
} from "../selectors/settingsSelectors"
import { useWebviewState } from "../WebviewStateContext"

export const useAutoApprovalSettings = (): [AutoApprovalSettings, (settings: AutoApprovalSettings) => void] => {
	const { state, dispatch } = useWebviewState()
	const settings = selectAutoApprovalSettings(state)

	const updateSettings = useCallback(
		(newSettings: AutoApprovalSettings) => {
			dispatch(setAutoApprovalSettings(newSettings))
		},
		[dispatch],
	)

	return [settings, updateSettings]
}

export const useBrowserSettings = (): [BrowserSettings, (settings: BrowserSettings) => void] => {
	const { state, dispatch } = useWebviewState()
	const settings = selectBrowserSettings(state)

	const updateSettings = useCallback(
		(newSettings: BrowserSettings) => {
			dispatch(setBrowserSettings(newSettings))
		},
		[dispatch],
	)

	return [settings, updateSettings]
}

export const useChatSettings = (): [ChatSettings, (settings: ChatSettings) => void] => {
	const { state, dispatch } = useWebviewState()
	const settings = selectChatSettings(state)

	const updateSettings = useCallback(
		(newSettings: ChatSettings) => {
			dispatch(setChatSettings(newSettings))
		},
		[dispatch],
	)

	return [settings, updateSettings]
}

export const useTelemetrySetting = (): [TelemetrySetting, (setting: TelemetrySetting) => void] => {
	const { state, dispatch } = useWebviewState()
	const setting = selectTelemetrySetting(state)

	const updateSetting = useCallback(
		(newSetting: TelemetrySetting) => {
			dispatch(setTelemetrySetting(newSetting))
		},
		[dispatch],
	)

	return [setting, updateSetting]
}

export const usePlatform = (): WebviewState["platform"] => {
	const { state } = useWebviewState()
	return selectPlatform(state)
}

export const useIsLoggedIn = (): boolean => {
	const { state } = useWebviewState()
	return selectIsLoggedIn(state)
}

export const useUserInfo = (): WebviewState["userInfo"] => {
	const { state } = useWebviewState()
	return selectUserInfo(state)
}

export const useMcpMarketplaceEnabled = (): boolean | undefined => {
	const { state } = useWebviewState()
	return selectMcpMarketplaceEnabled(state)
}
