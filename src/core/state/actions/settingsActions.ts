import { AutoApprovalSettings } from '../../../shared/AutoApprovalSettings';
import { BrowserSettings } from '../../../shared/BrowserSettings';
import { ChatSettings } from '../../../shared/ChatSettings';
import { TelemetrySetting } from '../../../shared/TelemetrySetting';
import { Action, ActionType } from './types';

/**
 * Updates the auto-approval settings.
 * @param settings The new auto-approval settings
 * @returns The action
 */
export const updateAutoApprovalSettings = (settings: AutoApprovalSettings): Action => ({
  type: ActionType.UPDATE_AUTO_APPROVAL_SETTINGS,
  payload: settings,
});

/**
 * Updates the browser settings.
 * @param settings The new browser settings
 * @returns The action
 */
export const updateBrowserSettings = (settings: BrowserSettings): Action => ({
  type: ActionType.UPDATE_BROWSER_SETTINGS,
  payload: settings,
});

/**
 * Updates the chat settings.
 * @param settings The new chat settings
 * @returns The action
 */
export const updateChatSettings = (settings: ChatSettings): Action => ({
  type: ActionType.UPDATE_CHAT_SETTINGS,
  payload: settings,
});

/**
 * Sets the telemetry setting.
 * @param setting The new telemetry setting
 * @returns The action
 */
export const setTelemetrySetting = (setting: TelemetrySetting): Action => ({
  type: ActionType.SET_TELEMETRY_SETTING,
  payload: setting,
});
