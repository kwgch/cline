import { Action, ActionType } from '../actions/types';

/**
 * User information interface.
 */
export interface UserInfo {
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

/**
 * Reducer for user information state.
 * @param state The current user information state
 * @param action The action to apply
 * @returns The new user information state
 */
export const userReducer = (state: UserInfo | undefined, action: Action): UserInfo | undefined => {
  switch (action.type) {
    case ActionType.SET_USER_INFO:
      return action.payload;
    
    case ActionType.CLEAR_USER_INFO:
      return undefined;
    
    default:
      return state;
  }
};
