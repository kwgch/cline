import { HistoryItem } from '../../../shared/HistoryItem';
import { AppState } from '../types';

/**
 * Selects the task history from the state.
 * @param state The application state
 * @returns The task history
 */
export const selectTaskHistory = (state: AppState): HistoryItem[] => 
  state.taskHistory;

/**
 * Selects the current task ID from the state.
 * @param state The application state
 * @returns The current task ID
 */
export const selectCurrentTaskId = (state: AppState): string | undefined => 
  state.currentTaskId;

/**
 * Selects the current task from the state.
 * @param state The application state
 * @returns The current task
 */
export const selectCurrentTask = (state: AppState): HistoryItem | undefined => 
  state.currentTaskId ? state.taskHistory.find(task => task.id === state.currentTaskId) : undefined;

/**
 * Selects a task by ID from the state.
 * @param state The application state
 * @param taskId The task ID
 * @returns The task
 */
export const selectTaskById = (state: AppState, taskId: string): HistoryItem | undefined => 
  state.taskHistory.find(task => task.id === taskId);
