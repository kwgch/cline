import { ClineMessage } from "../../../shared/ExtensionMessage"
import { AppState } from "../types"

/**
 * Selects all messages from the state.
 * @param state The application state
 * @returns The messages
 */
export const selectMessages = (state: AppState): ClineMessage[] => state.clineMessages

/**
 * Selects the last message from the state.
 * @param state The application state
 * @returns The last message
 */
export const selectLastMessage = (state: AppState): ClineMessage | undefined =>
	state.clineMessages.length > 0 ? state.clineMessages[state.clineMessages.length - 1] : undefined

/**
 * Selects messages by type from the state.
 * @param state The application state
 * @param type The message type
 * @returns The messages of the specified type
 */
export const selectMessagesByType = (state: AppState, type: string): ClineMessage[] =>
	state.clineMessages.filter((message) => message.say === type || message.ask === type)

/**
 * Selects messages by timestamp range from the state.
 * @param state The application state
 * @param startTs The start timestamp
 * @param endTs The end timestamp
 * @returns The messages in the specified timestamp range
 */
export const selectMessagesByTimeRange = (state: AppState, startTs: number, endTs: number): ClineMessage[] =>
	state.clineMessages.filter((message) => message.ts >= startTs && message.ts <= endTs)
