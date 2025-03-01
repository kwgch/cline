import { Action, ActionType } from "../actions/types"
import { AppState, createInitialState } from "../types"
import { apiConfigReducer } from "./apiConfigReducer"
import { taskReducer } from "./taskReducer"
import { messageReducer } from "./messageReducer"
import { settingsReducer } from "./settingsReducer"
import { userReducer } from "./userReducer"

/**
 * The root reducer function that combines all domain-specific reducers.
 * @param state The current state
 * @param action The action to apply
 * @returns The new state
 */
export const rootReducer = (state: AppState, action: Action): AppState => {
	// Handle special actions
	if (action.type === ActionType.INITIALIZE_STATE) {
		return action.payload
	}

	if (action.type === ActionType.RESET_STATE) {
		return createInitialState(state.version)
	}

	// Apply domain-specific reducers
	return {
		...state,
		apiConfiguration: apiConfigReducer(state.apiConfiguration, action),
		taskHistory: taskReducer(state.taskHistory, state.currentTaskId, action),
		currentTaskId: taskReducer.currentTaskId(state.currentTaskId, action),
		clineMessages: messageReducer(state.clineMessages, action),
		autoApprovalSettings: settingsReducer.autoApproval(state.autoApprovalSettings, action),
		browserSettings: settingsReducer.browser(state.browserSettings, action),
		chatSettings: settingsReducer.chat(state.chatSettings, action),
		telemetrySetting: settingsReducer.telemetry(state.telemetrySetting, action),
		userInfo: userReducer(state.userInfo, action),
		customInstructions: action.type === ActionType.SET_CUSTOM_INSTRUCTIONS ? action.payload : state.customInstructions,
	}
}
