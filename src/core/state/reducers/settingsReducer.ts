import { AutoApprovalSettings, DEFAULT_AUTO_APPROVAL_SETTINGS } from '../../../shared/AutoApprovalSettings';
import { BrowserSettings, DEFAULT_BROWSER_SETTINGS } from '../../../shared/BrowserSettings';
import { ChatSettings, DEFAULT_CHAT_SETTINGS } from '../../../shared/ChatSettings';
import { TelemetrySetting } from '../../../shared/TelemetrySetting';
import { Action, ActionType } from '../actions/types';

/**
 * Collection of reducers for various settings.
 */
export const settingsReducer = {
  /**
   * Reducer for auto-approval settings.
   * @param state The current auto-approval settings
   * @param action The action to apply
   * @returns The new auto-approval settings
   */
  autoApproval: (state: AutoApprovalSettings = DEFAULT_AUTO_APPROVAL_SETTINGS, action: Action): AutoApprovalSettings => {
    switch (action.type) {
      case ActionType.UPDATE_AUTO_APPROVAL_SETTINGS:
        return action.payload;
      
      default:
        return state;
    }
  },
  
  /**
   * Reducer for browser settings.
   * @param state The current browser settings
   * @param action The action to apply
   * @returns The new browser settings
   */
  browser: (state: BrowserSettings = DEFAULT_BROWSER_SETTINGS, action: Action): BrowserSettings => {
    switch (action.type) {
      case ActionType.UPDATE_BROWSER_SETTINGS:
        return action.payload;
      
      default:
        return state;
    }
  },
  
  /**
   * Reducer for chat settings.
   * @param state The current chat settings
   * @param action The action to apply
   * @returns The new chat settings
   */
  chat: (state: ChatSettings = DEFAULT_CHAT_SETTINGS, action: Action): ChatSettings => {
    switch (action.type) {
      case ActionType.UPDATE_CHAT_SETTINGS:
        return action.payload;
      
      default:
        return state;
    }
  },
  
  /**
   * Reducer for telemetry setting.
   * @param state The current telemetry setting
   * @param action The action to apply
   * @returns The new telemetry setting
   */
  telemetry: (state: TelemetrySetting = 'unset', action: Action): TelemetrySetting => {
    switch (action.type) {
      case ActionType.SET_TELEMETRY_SETTING:
        return action.payload;
      
      default:
        return state;
    }
  },
};
