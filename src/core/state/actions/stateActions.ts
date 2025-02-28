import { AppState } from '../types';
import { Action, ActionType } from './types';

/**
 * Initializes the state with the provided state object.
 * @param state The state to initialize with
 * @returns The action
 */
export const initializeState = (state: AppState): Action => ({
  type: ActionType.INITIALIZE_STATE,
  payload: state,
});

/**
 * Resets the state to its initial values.
 * @returns The action
 */
export const resetState = (): Action => ({
  type: ActionType.RESET_STATE,
});

/**
 * Sets the custom instructions.
 * @param instructions The new custom instructions
 * @returns The action
 */
export const setCustomInstructions = (instructions?: string): Action => ({
  type: ActionType.SET_CUSTOM_INSTRUCTIONS,
  payload: instructions,
});
