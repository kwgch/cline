import * as vscode from 'vscode';
import { ApiConfiguration } from '../../shared/api';
import { AutoApprovalSettings } from '../../shared/AutoApprovalSettings';
import { BrowserSettings } from '../../shared/BrowserSettings';
import { ChatSettings } from '../../shared/ChatSettings';
import { HistoryItem } from '../../shared/HistoryItem';
import { TelemetrySetting } from '../../shared/TelemetrySetting';
import { UserInfo } from './reducers/userReducer';
import { updateApiConfiguration } from './actions/apiConfigActions';
import { setCustomInstructions, initializeState } from './actions/stateActions';
import { 
  updateAutoApprovalSettings,
  updateBrowserSettings,
  updateChatSettings,
  setTelemetrySetting
} from './actions/settingsActions';
import {
  addTaskToHistory,
  updateTaskInHistory,
  setCurrentTask,
  clearCurrentTask
} from './actions/taskActions';
import { setUserInfo, clearUserInfo } from './actions/userActions';
import { createInitialState } from './types';
import { getStateContainer, StateContainer } from './StateContainer';
import { getStatePersistence, StatePersistence } from './persistence/StatePersistence';

/**
 * Integrates the state management system with the ClineProvider class.
 * This class provides methods that can be used by ClineProvider to interact with the state.
 */
export class ClineProviderIntegration {
  private stateContainer: StateContainer;
  private statePersistence: StatePersistence;
  
  /**
   * Creates a new ClineProviderIntegration instance.
   * @param context The VSCode extension context
   */
  constructor(private readonly context: vscode.ExtensionContext) {
    // Initialize state container with default state
    this.stateContainer = getStateContainer(createInitialState(this.context.extension?.packageJSON?.version ?? ""));
    this.statePersistence = getStatePersistence(this.context, this.stateContainer);
    
    // Load persisted state
    this.loadPersistedState();
  }
  
  /**
   * Loads persisted state from storage.
   */
  private async loadPersistedState(): Promise<void> {
    try {
      const persistedState = await this.statePersistence.loadPersistedState();
      if (persistedState) {
        // Initialize state with persisted values
        this.stateContainer.dispatch(initializeState({
          ...createInitialState(this.context.extension?.packageJSON?.version ?? ""),
          ...persistedState,
        }));
      }
    } catch (error) {
      console.error(`Error loading persisted state: ${error}`);
    }
  }
  
  /**
   * Updates the API configuration.
   * @param config The new API configuration
   */
  async updateApiConfiguration(config: ApiConfiguration): Promise<void> {
    this.stateContainer.dispatch(updateApiConfiguration(config));
  }
  
  /**
   * Updates the custom instructions.
   * @param instructions The new custom instructions
   */
  async updateCustomInstructions(instructions?: string): Promise<void> {
    this.stateContainer.dispatch(setCustomInstructions(instructions));
  }
  
  /**
   * Updates the auto-approval settings.
   * @param settings The new auto-approval settings
   */
  async updateAutoApprovalSettings(settings: AutoApprovalSettings): Promise<void> {
    this.stateContainer.dispatch(updateAutoApprovalSettings(settings));
  }
  
  /**
   * Updates the browser settings.
   * @param settings The new browser settings
   */
  async updateBrowserSettings(settings: BrowserSettings): Promise<void> {
    this.stateContainer.dispatch(updateBrowserSettings(settings));
  }
  
  /**
   * Updates the chat settings.
   * @param settings The new chat settings
   */
  async updateChatSettings(settings: ChatSettings): Promise<void> {
    this.stateContainer.dispatch(updateChatSettings(settings));
  }
  
  /**
   * Sets the telemetry setting.
   * @param setting The new telemetry setting
   */
  async setTelemetrySetting(setting: TelemetrySetting): Promise<void> {
    this.stateContainer.dispatch(setTelemetrySetting(setting));
  }
  
  /**
   * Updates a task in the history or adds it if it doesn't exist.
   * @param item The task to update or add
   * @returns The updated task history
   */
  async updateTaskHistory(item: HistoryItem): Promise<HistoryItem[]> {
    const state = this.stateContainer.getState();
    const existingItemIndex = state.taskHistory.findIndex((h) => h.id === item.id);
    
    if (existingItemIndex !== -1) {
      this.stateContainer.dispatch(updateTaskInHistory(item));
    } else {
      this.stateContainer.dispatch(addTaskToHistory(item));
    }
    
    return this.stateContainer.getState().taskHistory;
  }
  
  /**
   * Sets the current task.
   * @param taskId The ID of the task to set as current
   */
  async setCurrentTask(taskId: string): Promise<void> {
    this.stateContainer.dispatch(setCurrentTask(taskId));
  }
  
  /**
   * Clears the current task.
   */
  async clearCurrentTask(): Promise<void> {
    this.stateContainer.dispatch(clearCurrentTask());
  }
  
  /**
   * Sets the user information.
   * @param info The new user information
   */
  async setUserInfo(info?: UserInfo): Promise<void> {
    if (info) {
      this.stateContainer.dispatch(setUserInfo(info));
    } else {
      this.stateContainer.dispatch(clearUserInfo());
    }
  }
  
  /**
   * Gets the current state.
   * @returns The current state
   */
  getState() {
    return this.stateContainer.getState();
  }
  
  /**
   * Subscribes to state changes.
   * @param listener The listener function
   * @returns A function to unsubscribe
   */
  subscribe(listener: (state: any) => void) {
    return this.stateContainer.subscribe(listener);
  }
}
