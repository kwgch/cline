import { AutoApprovalSettings } from '../../../shared/AutoApprovalSettings';
import { BrowserSettings } from '../../../shared/BrowserSettings';
import { ChatSettings } from '../../../shared/ChatSettings';
import { TelemetrySetting } from '../../../shared/TelemetrySetting';
import { AppState } from '../types';

/**
 * Selects the auto-approval settings from the state.
 * @param state The application state
 * @returns The auto-approval settings
 */
export const selectAutoApprovalSettings = (state: AppState): AutoApprovalSettings => 
  state.autoApprovalSettings;

/**
 * Selects the browser settings from the state.
 * @param state The application state
 * @returns The browser settings
 */
export const selectBrowserSettings = (state: AppState): BrowserSettings => 
  state.browserSettings;

/**
 * Selects the chat settings from the state.
 * @param state The application state
 * @returns The chat settings
 */
export const selectChatSettings = (state: AppState): ChatSettings => 
  state.chatSettings;

/**
 * Selects the telemetry setting from the state.
 * @param state The application state
 * @returns The telemetry setting
 */
export const selectTelemetrySetting = (state: AppState): TelemetrySetting => 
  state.telemetrySetting;

/**
 * Selects the custom instructions from the state.
 * @param state The application state
 * @returns The custom instructions
 */
export const selectCustomInstructions = (state: AppState): string | undefined => 
  state.customInstructions;
