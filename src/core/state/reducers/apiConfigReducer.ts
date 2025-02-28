import { ApiConfiguration } from '../../../shared/api';
import { Action, ActionType } from '../actions/types';

/**
 * Reducer for API configuration state.
 * @param state The current API configuration state
 * @param action The action to apply
 * @returns The new API configuration state
 */
export const apiConfigReducer = (state: ApiConfiguration = {}, action: Action): ApiConfiguration => {
  switch (action.type) {
    case ActionType.UPDATE_API_CONFIGURATION:
      return {
        ...state,
        ...action.payload,
      };
    
    case ActionType.SET_API_PROVIDER:
      return {
        ...state,
        apiProvider: action.payload,
      };
    
    case ActionType.SET_API_MODEL_ID:
      return {
        ...state,
        apiModelId: action.payload,
      };
    
    case ActionType.SET_API_KEY:
      return {
        ...state,
        apiKey: action.payload,
      };
    
    default:
      return state;
  }
};
