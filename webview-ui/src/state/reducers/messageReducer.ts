import { ClineMessage } from "../../../../src/shared/ExtensionMessage"
import { ActionType, WebviewAction } from "../actions/types"

export const messageReducer = (state: ClineMessage[] = [], action: WebviewAction): ClineMessage[] => {
	switch (action.type) {
		case ActionType.SET_MESSAGES:
			return action.payload

		case ActionType.ADD_MESSAGE:
			return [...state, action.payload]

		case ActionType.UPDATE_PARTIAL_MESSAGE:
			const partialMessage = action.payload
			const lastIndex = state.findIndex((msg) => msg.ts === partialMessage.ts)

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
