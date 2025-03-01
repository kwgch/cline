import { ClineMessage } from "../../../shared/ExtensionMessage"
import { findLastIndex } from "../../../shared/array"
import { Action, ActionType } from "../actions/types"

/**
 * Reducer for messages state.
 * @param state The current messages state
 * @param action The action to apply
 * @returns The new messages state
 */
export const messageReducer = (state: ClineMessage[] = [], action: Action): ClineMessage[] => {
	switch (action.type) {
		case ActionType.ADD_MESSAGE:
			return [...state, action.payload]

		case ActionType.UPDATE_PARTIAL_MESSAGE:
			const partialMessage = action.payload
			const lastIndex = findLastIndex(state, (msg) => msg.ts === partialMessage.ts)

			if (lastIndex !== -1) {
				const newState = [...state]
				newState[lastIndex] = partialMessage
				return newState
			}

			return state

		case ActionType.CLEAR_MESSAGES:
			return []

		default:
			return state
	}
}
