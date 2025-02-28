import { AutoApprovalSettings, DEFAULT_AUTO_APPROVAL_SETTINGS } from "../../../../src/shared/AutoApprovalSettings"
import { BrowserSettings, DEFAULT_BROWSER_SETTINGS } from "../../../../src/shared/BrowserSettings"
import { ChatSettings, DEFAULT_CHAT_SETTINGS } from "../../../../src/shared/ChatSettings"
import { TelemetrySetting } from "../../../../src/shared/TelemetrySetting"
import { ActionType, WebviewAction } from "../actions/types"

export const settingsReducer = {
	autoApproval: (state: AutoApprovalSettings = DEFAULT_AUTO_APPROVAL_SETTINGS, action: WebviewAction): AutoApprovalSettings => {
		switch (action.type) {
			case ActionType.SET_AUTO_APPROVAL_SETTINGS:
				return action.payload

			default:
				return state
		}
	},

	browser: (state: BrowserSettings = DEFAULT_BROWSER_SETTINGS, action: WebviewAction): BrowserSettings => {
		switch (action.type) {
			case ActionType.SET_BROWSER_SETTINGS:
				return action.payload

			default:
				return state
		}
	},

	chat: (state: ChatSettings = DEFAULT_CHAT_SETTINGS, action: WebviewAction): ChatSettings => {
		switch (action.type) {
			case ActionType.SET_CHAT_SETTINGS:
				return action.payload

			default:
				return state
		}
	},

	telemetry: (state: TelemetrySetting = "unset", action: WebviewAction): TelemetrySetting => {
		switch (action.type) {
			case ActionType.SET_TELEMETRY_SETTING:
				return action.payload

			default:
				return state
		}
	},

	customInstructions: (state: string | undefined = undefined, action: WebviewAction): string | undefined => {
		switch (action.type) {
			case ActionType.SET_CUSTOM_INSTRUCTIONS:
				return action.payload

			default:
				return state
		}
	},
}
