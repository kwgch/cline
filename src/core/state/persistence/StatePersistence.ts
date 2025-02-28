import * as vscode from 'vscode';
import { AppState, createInitialState } from '../types';
import { StateContainer } from '../StateContainer';
import { initializeState } from '../actions/stateActions';

// Define the keys for global state and secrets
type GlobalStateKey =
  | 'apiProvider'
  | 'apiModelId'
  | 'awsRegion'
  | 'awsUseCrossRegionInference'
  | 'awsProfile'
  | 'awsUseProfile'
  | 'vertexProjectId'
  | 'vertexRegion'
  | 'lastShownAnnouncementId'
  | 'customInstructions'
  | 'taskHistory'
  | 'openAiBaseUrl'
  | 'openAiModelId'
  | 'openAiModelInfo'
  | 'ollamaModelId'
  | 'ollamaBaseUrl'
  | 'lmStudioModelId'
  | 'lmStudioBaseUrl'
  | 'anthropicBaseUrl'
  | 'azureApiVersion'
  | 'openRouterModelId'
  | 'openRouterModelInfo'
  | 'autoApprovalSettings'
  | 'browserSettings'
  | 'chatSettings'
  | 'vsCodeLmModelSelector'
  | 'userInfo'
  | 'previousModeApiProvider'
  | 'previousModeModelId'
  | 'previousModeModelInfo'
  | 'liteLlmBaseUrl'
  | 'liteLlmModelId'
  | 'qwenApiLine'
  | 'requestyModelId'
  | 'togetherModelId'
  | 'mcpMarketplaceCatalog'
  | 'telemetrySetting';

type SecretKey =
  | 'apiKey'
  | 'openRouterApiKey'
  | 'awsAccessKey'
  | 'awsSecretKey'
  | 'awsSessionToken'
  | 'openAiApiKey'
  | 'geminiApiKey'
  | 'openAiNativeApiKey'
  | 'deepSeekApiKey'
  | 'requestyApiKey'
  | 'togetherApiKey'
  | 'qwenApiKey'
  | 'mistralApiKey'
  | 'liteLlmApiKey'
  | 'authToken'
  | 'authNonce';

/**
 * The StatePersistence class handles saving and loading state from VSCode's storage mechanisms.
 */
export class StatePersistence {
  /**
   * Creates a new StatePersistence instance.
   * @param context The VSCode extension context
   * @param stateContainer The state container
   */
  constructor(
    private context: vscode.ExtensionContext,
    private stateContainer: StateContainer
  ) {
    // Subscribe to state changes
    this.stateContainer.subscribe(this.persistState);
  }
  
  /**
   * Persists the state to storage.
   * @param state The state to persist
   */
  private persistState = async (state: AppState): Promise<void> => {
    // Persist global state
    await this.persistGlobalState(state);
    
    // Persist secrets
    await this.persistSecrets(state);
  };
  
  /**
   * Persists global state to VSCode's global state storage.
   * @param state The state to persist
   */
  private async persistGlobalState(state: AppState): Promise<void> {
    // Persist API configuration
    if (state.apiConfiguration) {
      const {
        apiProvider,
        apiModelId,
        awsRegion,
        awsUseCrossRegionInference,
        awsProfile,
        awsUseProfile,
        vertexProjectId,
        vertexRegion,
        openAiBaseUrl,
        openAiModelId,
        openAiModelInfo,
        ollamaModelId,
        ollamaBaseUrl,
        lmStudioModelId,
        lmStudioBaseUrl,
        anthropicBaseUrl,
        azureApiVersion,
        openRouterModelId,
        openRouterModelInfo,
        vsCodeLmModelSelector,
        liteLlmBaseUrl,
        liteLlmModelId,
        qwenApiLine,
        requestyModelId,
        togetherModelId,
      } = state.apiConfiguration;
      
      await this.updateGlobalState('apiProvider', apiProvider);
      await this.updateGlobalState('apiModelId', apiModelId);
      await this.updateGlobalState('awsRegion', awsRegion);
      await this.updateGlobalState('awsUseCrossRegionInference', awsUseCrossRegionInference);
      await this.updateGlobalState('awsProfile', awsProfile);
      await this.updateGlobalState('awsUseProfile', awsUseProfile);
      await this.updateGlobalState('vertexProjectId', vertexProjectId);
      await this.updateGlobalState('vertexRegion', vertexRegion);
      await this.updateGlobalState('openAiBaseUrl', openAiBaseUrl);
      await this.updateGlobalState('openAiModelId', openAiModelId);
      await this.updateGlobalState('openAiModelInfo', openAiModelInfo);
      await this.updateGlobalState('ollamaModelId', ollamaModelId);
      await this.updateGlobalState('ollamaBaseUrl', ollamaBaseUrl);
      await this.updateGlobalState('lmStudioModelId', lmStudioModelId);
      await this.updateGlobalState('lmStudioBaseUrl', lmStudioBaseUrl);
      await this.updateGlobalState('anthropicBaseUrl', anthropicBaseUrl);
      await this.updateGlobalState('azureApiVersion', azureApiVersion);
      await this.updateGlobalState('openRouterModelId', openRouterModelId);
      await this.updateGlobalState('openRouterModelInfo', openRouterModelInfo);
      await this.updateGlobalState('vsCodeLmModelSelector', vsCodeLmModelSelector);
      await this.updateGlobalState('liteLlmBaseUrl', liteLlmBaseUrl);
      await this.updateGlobalState('liteLlmModelId', liteLlmModelId);
      await this.updateGlobalState('qwenApiLine', qwenApiLine);
      await this.updateGlobalState('requestyModelId', requestyModelId);
      await this.updateGlobalState('togetherModelId', togetherModelId);
    }
    
    // Persist other state
    await this.updateGlobalState('customInstructions', state.customInstructions);
    await this.updateGlobalState('taskHistory', state.taskHistory);
    await this.updateGlobalState('autoApprovalSettings', state.autoApprovalSettings);
    await this.updateGlobalState('browserSettings', state.browserSettings);
    await this.updateGlobalState('chatSettings', state.chatSettings);
    await this.updateGlobalState('userInfo', state.userInfo);
    await this.updateGlobalState('telemetrySetting', state.telemetrySetting);
  }
  
  /**
   * Persists secrets to VSCode's secrets storage.
   * @param state The state to persist
   */
  private async persistSecrets(state: AppState): Promise<void> {
    // Persist API keys
    if (state.apiConfiguration) {
      const {
        apiKey,
        openRouterApiKey,
        awsAccessKey,
        awsSecretKey,
        awsSessionToken,
        openAiApiKey,
        geminiApiKey,
        openAiNativeApiKey,
        deepSeekApiKey,
        requestyApiKey,
        togetherApiKey,
        qwenApiKey,
        mistralApiKey,
        liteLlmApiKey,
      } = state.apiConfiguration;
      
      await this.storeSecret('apiKey', apiKey);
      await this.storeSecret('openRouterApiKey', openRouterApiKey);
      await this.storeSecret('awsAccessKey', awsAccessKey);
      await this.storeSecret('awsSecretKey', awsSecretKey);
      await this.storeSecret('awsSessionToken', awsSessionToken);
      await this.storeSecret('openAiApiKey', openAiApiKey);
      await this.storeSecret('geminiApiKey', geminiApiKey);
      await this.storeSecret('openAiNativeApiKey', openAiNativeApiKey);
      await this.storeSecret('deepSeekApiKey', deepSeekApiKey);
      await this.storeSecret('requestyApiKey', requestyApiKey);
      await this.storeSecret('togetherApiKey', togetherApiKey);
      await this.storeSecret('qwenApiKey', qwenApiKey);
      await this.storeSecret('mistralApiKey', mistralApiKey);
      await this.storeSecret('liteLlmApiKey', liteLlmApiKey);
    }
  }
  
  /**
   * Updates a value in VSCode's global state storage.
   * @param key The key to update
   * @param value The value to store
   */
  private async updateGlobalState(key: GlobalStateKey, value: any): Promise<void> {
    await this.context.globalState.update(key, value);
  }
  
  /**
   * Stores a secret in VSCode's secrets storage.
   * @param key The key to store
   * @param value The value to store
   */
  private async storeSecret(key: SecretKey, value?: string): Promise<void> {
    if (value) {
      await this.context.secrets.store(key, value);
    } else {
      await this.context.secrets.delete(key);
    }
  }
  
  /**
   * Loads persisted state from storage.
   * @returns The persisted state
   */
  async loadPersistedState(): Promise<Partial<AppState>> {
    // Load API configuration
    const [
      apiProvider,
      apiModelId,
      apiKey,
      openRouterApiKey,
      awsAccessKey,
      awsSecretKey,
      awsSessionToken,
      awsRegion,
      awsUseCrossRegionInference,
      awsProfile,
      awsUseProfile,
      vertexProjectId,
      vertexRegion,
      openAiBaseUrl,
      openAiApiKey,
      openAiModelId,
      openAiModelInfo,
      ollamaModelId,
      ollamaBaseUrl,
      lmStudioModelId,
      lmStudioBaseUrl,
      anthropicBaseUrl,
      geminiApiKey,
      openAiNativeApiKey,
      deepSeekApiKey,
      requestyApiKey,
      requestyModelId,
      togetherApiKey,
      togetherModelId,
      qwenApiKey,
      mistralApiKey,
      azureApiVersion,
      openRouterModelId,
      openRouterModelInfo,
      vsCodeLmModelSelector,
      liteLlmBaseUrl,
      liteLlmModelId,
      liteLlmApiKey,
      qwenApiLine,
    ] = await Promise.all([
      this.getGlobalState('apiProvider'),
      this.getGlobalState('apiModelId'),
      this.getSecret('apiKey'),
      this.getSecret('openRouterApiKey'),
      this.getSecret('awsAccessKey'),
      this.getSecret('awsSecretKey'),
      this.getSecret('awsSessionToken'),
      this.getGlobalState('awsRegion'),
      this.getGlobalState('awsUseCrossRegionInference'),
      this.getGlobalState('awsProfile'),
      this.getGlobalState('awsUseProfile'),
      this.getGlobalState('vertexProjectId'),
      this.getGlobalState('vertexRegion'),
      this.getGlobalState('openAiBaseUrl'),
      this.getSecret('openAiApiKey'),
      this.getGlobalState('openAiModelId'),
      this.getGlobalState('openAiModelInfo'),
      this.getGlobalState('ollamaModelId'),
      this.getGlobalState('ollamaBaseUrl'),
      this.getGlobalState('lmStudioModelId'),
      this.getGlobalState('lmStudioBaseUrl'),
      this.getGlobalState('anthropicBaseUrl'),
      this.getSecret('geminiApiKey'),
      this.getSecret('openAiNativeApiKey'),
      this.getSecret('deepSeekApiKey'),
      this.getSecret('requestyApiKey'),
      this.getGlobalState('requestyModelId'),
      this.getSecret('togetherApiKey'),
      this.getGlobalState('togetherModelId'),
      this.getSecret('qwenApiKey'),
      this.getSecret('mistralApiKey'),
      this.getGlobalState('azureApiVersion'),
      this.getGlobalState('openRouterModelId'),
      this.getGlobalState('openRouterModelInfo'),
      this.getGlobalState('vsCodeLmModelSelector'),
      this.getGlobalState('liteLlmBaseUrl'),
      this.getGlobalState('liteLlmModelId'),
      this.getSecret('liteLlmApiKey'),
      this.getGlobalState('qwenApiLine'),
    ]);
    
    // Load other state
    const [
      customInstructions,
      taskHistory,
      autoApprovalSettings,
      browserSettings,
      chatSettings,
      userInfo,
      telemetrySetting,
    ] = await Promise.all([
      this.getGlobalState('customInstructions'),
      this.getGlobalState('taskHistory'),
      this.getGlobalState('autoApprovalSettings'),
      this.getGlobalState('browserSettings'),
      this.getGlobalState('chatSettings'),
      this.getGlobalState('userInfo'),
      this.getGlobalState('telemetrySetting'),
    ]);
    
    return {
      apiConfiguration: {
        apiProvider,
        apiModelId,
        apiKey,
        openRouterApiKey,
        awsAccessKey,
        awsSecretKey,
        awsSessionToken,
        awsRegion,
        awsUseCrossRegionInference,
        awsProfile,
        awsUseProfile,
        vertexProjectId,
        vertexRegion,
        openAiBaseUrl,
        openAiApiKey,
        openAiModelId,
        openAiModelInfo,
        ollamaModelId,
        ollamaBaseUrl,
        lmStudioModelId,
        lmStudioBaseUrl,
        anthropicBaseUrl,
        geminiApiKey,
        openAiNativeApiKey,
        deepSeekApiKey,
        requestyApiKey,
        requestyModelId,
        togetherApiKey,
        togetherModelId,
        qwenApiKey,
        mistralApiKey,
        azureApiVersion,
        openRouterModelId,
        openRouterModelInfo,
        vsCodeLmModelSelector,
        liteLlmBaseUrl,
        liteLlmModelId,
        liteLlmApiKey,
        qwenApiLine,
      },
      customInstructions,
      taskHistory: taskHistory || [],
      autoApprovalSettings: autoApprovalSettings || undefined,
      browserSettings: browserSettings || undefined,
      chatSettings: chatSettings || undefined,
      userInfo,
      telemetrySetting: telemetrySetting || 'unset',
    };
  }
  
  /**
   * Gets a value from VSCode's global state storage.
   * @param key The key to get
   * @returns The value
   */
  private async getGlobalState(key: GlobalStateKey): Promise<any> {
    return await this.context.globalState.get(key);
  }
  
  /**
   * Gets a secret from VSCode's secrets storage.
   * @param key The key to get
   * @returns The value
   */
  private async getSecret(key: SecretKey): Promise<string | undefined> {
    return await this.context.secrets.get(key);
  }
}

// Singleton instance
let statePersistenceInstance: StatePersistence | undefined;

/**
 * Gets the StatePersistence instance.
 * @param context The VSCode extension context
 * @param stateContainer The state container
 * @returns The StatePersistence instance
 */
export const getStatePersistence = (
  context: vscode.ExtensionContext,
  stateContainer: StateContainer
): StatePersistence => {
  if (!statePersistenceInstance) {
    statePersistenceInstance = new StatePersistence(context, stateContainer);
  }
  
  return statePersistenceInstance;
};

/**
 * Resets the StatePersistence instance.
 * Useful for testing.
 */
export const resetStatePersistence = (): void => {
  statePersistenceInstance = undefined;
};
