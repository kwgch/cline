import { HistoryItem } from "../../../shared/HistoryItem"
import { Action, ActionType } from "./types"

/**
 * Adds a task to the history.
 * @param task The task to add
 * @returns The action
 */
export const addTaskToHistory = (task: HistoryItem): Action => ({
	type: ActionType.ADD_TASK_TO_HISTORY,
	payload: task,
})

/**
 * Updates a task in the history.
 * @param task The task to update
 * @returns The action
 */
export const updateTaskInHistory = (task: HistoryItem): Action => ({
	type: ActionType.UPDATE_TASK_IN_HISTORY,
	payload: task,
})

/**
 * Deletes a task from the history.
 * @param taskId The ID of the task to delete
 * @returns The action
 */
export const deleteTaskFromHistory = (taskId: string): Action => ({
	type: ActionType.DELETE_TASK_FROM_HISTORY,
	payload: taskId,
})

/**
 * Sets the current task.
 * @param taskId The ID of the task to set as current
 * @returns The action
 */
export const setCurrentTask = (taskId: string): Action => ({
	type: ActionType.SET_CURRENT_TASK,
	payload: taskId,
})

/**
 * Clears the current task.
 * @returns The action
 */
export const clearCurrentTask = (): Action => ({
	type: ActionType.CLEAR_CURRENT_TASK,
})
