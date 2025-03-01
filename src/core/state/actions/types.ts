/**
 * Enum of all action types in the application.
 */
export enum ActionType {
	// API Configuration
	UPDATE_API_CONFIGURATION = "UPDATE_API_CONFIGURATION",
	SET_API_PROVIDER = "SET_API_PROVIDER",
	SET_API_MODEL_ID = "SET_API_MODEL_ID",
	SET_API_KEY = "SET_API_KEY",

	// Custom Instructions
	SET_CUSTOM_INSTRUCTIONS = "SET_CUSTOM_INSTRUCTIONS",

	// Task Management
	ADD_TASK_TO_HISTORY = "ADD_TASK_TO_HISTORY",
	UPDATE_TASK_IN_HISTORY = "UPDATE_TASK_IN_HISTORY",
	DELETE_TASK_FROM_HISTORY = "DELETE_TASK_FROM_HISTORY",
	SET_CURRENT_TASK = "SET_CURRENT_TASK",
	CLEAR_CURRENT_TASK = "CLEAR_CURRENT_TASK",

	// Messages
	ADD_MESSAGE = "ADD_MESSAGE",
	UPDATE_PARTIAL_MESSAGE = "UPDATE_PARTIAL_MESSAGE",
	CLEAR_MESSAGES = "CLEAR_MESSAGES",

	// Settings
	UPDATE_AUTO_APPROVAL_SETTINGS = "UPDATE_AUTO_APPROVAL_SETTINGS",
	UPDATE_BROWSER_SETTINGS = "UPDATE_BROWSER_SETTINGS",
	UPDATE_CHAT_SETTINGS = "UPDATE_CHAT_SETTINGS",
	SET_TELEMETRY_SETTING = "SET_TELEMETRY_SETTING",

	// User
	SET_USER_INFO = "SET_USER_INFO",
	CLEAR_USER_INFO = "CLEAR_USER_INFO",

	// State Management
	INITIALIZE_STATE = "INITIALIZE_STATE",
	RESET_STATE = "RESET_STATE",
}

/**
 * Base interface for all actions.
 */
export interface Action {
	type: ActionType
	payload?: any
}
