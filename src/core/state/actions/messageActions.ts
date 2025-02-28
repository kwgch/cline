import { ClineMessage } from '../../../shared/ExtensionMessage';
import { Action, ActionType } from './types';

/**
 * Adds a message to the conversation.
 * @param message The message to add
 * @returns The action
 */
export const addMessage = (message: ClineMessage): Action => ({
  type: ActionType.ADD_MESSAGE,
  payload: message,
});

/**
 * Updates a partial message in the conversation.
 * @param message The partial message to update
 * @returns The action
 */
export const updatePartialMessage = (message: ClineMessage): Action => ({
  type: ActionType.UPDATE_PARTIAL_MESSAGE,
  payload: message,
});

/**
 * Clears all messages from the conversation.
 * @returns The action
 */
export const clearMessages = (): Action => ({
  type: ActionType.CLEAR_MESSAGES,
});
