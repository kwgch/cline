import { AutoApprovalSettings } from "../../../../src/shared/AutoApprovalSettings"
import { BrowserSettings } from "../../../../src/shared/BrowserSettings"
import { ChatSettings } from "../../../../src/shared/ChatSettings"
import { TelemetrySetting } from "../../../../src/shared/TelemetrySetting"
import { ActionType, WebviewAction } from "./types"

export const setAutoApprovalSettings = (settings: AutoApprovalSettings): WebviewAction => ({
	type: ActionType.SET_AUTO_APPROVAL_SETTINGS,
	payload: settings,
	sendToExtension: true,
	toExtensionMessage: () => ({
		type: "autoApprovalSettings",
		autoApprovalSettings: settings,
	}),
})

export const setBrowserSettings = (settings: BrowserSettings): WebviewAction => ({
	type: ActionType.SET_BROWSER_SETTINGS,
	payload: settings,
	sendToExtension: true,
	toExtensionMessage: () => ({
		type: "browserSettings",
		browserSettings: settings,
	}),
})

export const setChatSettings = (settings: ChatSettings): WebviewAction => ({
	type: ActionType.SET_CHAT_SETTINGS,
	payload: settings,
	sendToExtension: true,
	toExtensionMessage: () => ({
		type: "togglePlanActMode",
		chatSettings: settings,
	}),
})

export const setTelemetrySetting = (setting: TelemetrySetting): WebviewAction => ({
	type: ActionType.SET_TELEMETRY_SETTING,
	payload: setting,
	sendToExtension: true,
	toExtensionMessage: () => ({
		type: "telemetrySetting",
		text: setting,
	}),
})
