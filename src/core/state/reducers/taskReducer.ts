import { HistoryItem } from "../../../shared/HistoryItem"
import { Action, ActionType } from "../actions/types"

/**
 * Reducer for task history state.
 * @param state The current task history state
 * @param currentTaskId The current task ID
 * @param action The action to apply
 * @returns The new task history state
 */
export const taskReducer = (state: HistoryItem[] = [], currentTaskId: string | undefined, action: Action): HistoryItem[] => {
	switch (action.type) {
		case ActionType.ADD_TASK_TO_HISTORY:
			return [...state, action.payload]

		case ActionType.UPDATE_TASK_IN_HISTORY:
			return state.map((task) => (task.id === action.payload.id ? { ...task, ...action.payload } : task))

		case ActionType.DELETE_TASK_FROM_HISTORY:
			return state.filter((task) => task.id !== action.payload)

		default:
			return state
	}
}

/**
 * Reducer for current task ID state.
 * @param state The current task ID state
 * @param action The action to apply
 * @returns The new current task ID state
 */
taskReducer.currentTaskId = (state: string | undefined, action: Action): string | undefined => {
	switch (action.type) {
		case ActionType.SET_CURRENT_TASK:
			return action.payload

		case ActionType.CLEAR_CURRENT_TASK:
			return undefined

		default:
			return state
	}
}
