# Core Extension State Implementation

This document provides detailed implementation guidance for the core extension state management system, based on the architecture outlined in the [State Architecture Design](./state-architecture-design.md). It focuses on the implementation of the state container, reducers, actions, and persistence layer in the core extension.

## Directory Structure

The new state management system will be organized in the following directory structure:

```
src/
└── core/
    └── state/
        ├── index.ts                 # Main exports
        ├── StateContainer.ts        # State container implementation
        ├── types.ts                 # State type definitions
        ├── actions/
        │   ├── index.ts             # Action exports
        │   ├── types.ts             # Action type definitions
        │   ├── apiConfigActions.ts  # API configuration actions
        │   ├── taskActions.ts       # Task management actions
        │   └── ...                  # Other action modules
        ├── reducers/
        │   ├── index.ts             # Root reducer
        │   ├── apiConfigReducer.ts  # API configuration reducer
        │   ├── taskReducer.ts       # Task management reducer
        │   └── ...                  # Other reducer modules
        ├── selectors/
        │   ├── index.ts             # Selector exports
        │   ├── apiConfigSelectors.ts # API configuration selectors
        │   ├── taskSelectors.ts     # Task management selectors
        │   └── ...                  # Other selector modules
        ├── persistence/
        │   ├── index.ts             # Persistence exports
        │   ├── StatePersistence.ts  # State persistence implementation
        │   └── migrations.ts        # State migration utilities
        └── sync/
            ├── index.ts             # Sync exports
            ├── StateSynchronizer.ts # State synchronizer implementation
            └── messageHandlers.ts   # Message handling utilities
```

## State Container Implementation

The `StateContainer` class will be the central piece of the state management system, responsible for holding the current state and dispatching actions.

```typescript
// src/core/state/StateContainer.ts
import { Action } from './actions/types';
import { AppState } from './types';
import { rootReducer } from './reducers';

export type StateChangeListener = (state: AppState) => void;

export class StateContainer {
  private state: AppState;
  private listeners: Set<StateChangeListener>;
  
  constructor(initialState: AppState) {
    this.state = initialState;
    this.listeners = new Set();
  }
  
  getState(): Readonly<AppState> {
    return this.state;
  }
  
  dispatch(action: Action): void {
    const nextState = rootReducer(this.state, action);
    if (nextState !== this.state) {
      this.state = nextState;
      this.notifyListeners();
    }
  }
  
  subscribe(listener: StateChangeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
  
  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }
}

// Create a singleton instance
let stateContainerInstance: StateContainer | undefined;

export const getStateContainer = (initialState?: AppState): StateContainer => {
  if (!stateContainerInstance && initialState) {
    stateContainerInstance = new StateContainer(initialState);
  } else if (!stateContainerInstance) {
    throw new Error('StateContainer must be initialized with initial state');
  }
  
  return stateContainerInstance;
};

export const resetStateContainer = (): void => {
  stateContainerInstance = undefined;
};
```

## State Types

The state types will define the structure of the application state.

```typescript
// src/core/state/types.ts
import { ApiConfiguration } from '../../shared/api';
import { AutoApprovalSettings } from '../../shared/AutoApprovalSettings';
import { BrowserSettings } from '../../shared/BrowserSettings';
import { ChatSettings } from '../../shared/ChatSettings';
import { ClineMessage } from '../../shared/ExtensionMessage';
import { HistoryItem } from '../../shared/HistoryItem';
import { TelemetrySetting } from '../../shared/TelemetrySetting';

export interface AppState {
  version: string;
  apiConfiguration: ApiConfiguration;
  customInstructions?: string;
  taskHistory: HistoryItem[];
  currentTaskId?: string;
  clineMessages: ClineMessage[];
  autoApprovalSettings: AutoApprovalSettings;
  browserSettings: BrowserSettings;
  chatSettings: ChatSettings;
  userInfo?: {
    displayName: string | null;
    email: string | null;
    photoURL: string | null;
  };
  telemetrySetting: TelemetrySetting;
  // Add other state properties as needed
}

// Create a default initial state
import { DEFAULT_AUTO_APPROVAL_SETTINGS } from '../../shared/AutoApprovalSettings';
import { DEFAULT_BROWSER_SETTINGS } from '../../shared/BrowserSettings';
import { DEFAULT_CHAT_SETTINGS } from '../../shared/ChatSettings';

export const createInitialState = (version: string): AppState => ({
  version,
  apiConfiguration: {
    apiProvider: 'openrouter', // Default provider
  },
  taskHistory: [],
  clineMessages: [],
  autoApprovalSettings: DEFAULT_AUTO_APPROVAL_SETTINGS,
  browserSettings: DEFAULT_BROWSER_SETTINGS,
  chatSettings: DEFAULT_CHAT_SETTINGS,
  telemetrySetting: 'unset',
});
```

## Actions

Actions define the operations that can change the state. They are organized by domain to keep the codebase maintainable.

```typescript
// src/core/state/actions/types.ts
export enum ActionType {
  // API Configuration
  UPDATE_API_CONFIGURATION = 'UPDATE_API_CONFIGURATION',
  SET_API_PROVIDER = 'SET_API_PROVIDER',
  SET_API_MODEL_ID = 'SET_API_MODEL_ID',
  SET_API_KEY = 'SET_API_KEY',
  
  // Custom Instructions
  SET_CUSTOM_INSTRUCTIONS = 'SET_CUSTOM_INSTRUCTIONS',
  
  // Task Management
  ADD_TASK_TO_HISTORY = 'ADD_TASK_TO_HISTORY',
  UPDATE_TASK_IN_HISTORY = 'UPDATE_TASK_IN_HISTORY',
  DELETE_TASK_FROM_HISTORY = 'DELETE_TASK_FROM_HISTORY',
  SET_CURRENT_TASK = 'SET_CURRENT_TASK',
  CLEAR_CURRENT_TASK = 'CLEAR_CURRENT_TASK',
  
  // Messages
  ADD_MESSAGE = 'ADD_MESSAGE',
  UPDATE_PARTIAL_MESSAGE = 'UPDATE_PARTIAL_MESSAGE',
  CLEAR_MESSAGES = 'CLEAR_MESSAGES',
  
  // Settings
  UPDATE_AUTO_APPROVAL_SETTINGS = 'UPDATE_AUTO_APPROVAL_SETTINGS',
  UPDATE_BROWSER_SETTINGS = 'UPDATE_BROWSER_SETTINGS',
  UPDATE_CHAT_SETTINGS = 'UPDATE_CHAT_SETTINGS',
  SET_TELEMETRY_SETTING = 'SET_TELEMETRY_SETTING',
  
  // User
  SET_USER_INFO = 'SET_USER_INFO',
  CLEAR_USER_INFO = 'CLEAR_USER_INFO',
  
  // State Management
  INITIALIZE_STATE = 'INITIALIZE_STATE',
  RESET_STATE = 'RESET_STATE',
}

export interface Action {
  type: ActionType;
  payload?: any;
}

// src/core/state/actions/index.ts
export * from './types';
export * from './apiConfigActions';
export * from './taskActions';
export * from './messageActions';
export * from './settingsActions';
export * from './userActions';
export * from './stateActions';
```

### API Configuration Actions

```typescript
// src/core/state/actions/apiConfigActions.ts
import { ApiConfiguration, ApiProvider } from '../../../shared/api';
import { Action, ActionType } from './types';

export const updateApiConfiguration = (config: ApiConfiguration): Action => ({
  type: ActionType.UPDATE_API_CONFIGURATION,
  payload: config,
});

export const setApiProvider = (provider: ApiProvider): Action => ({
  type: ActionType.SET_API_PROVIDER,
  payload: provider,
});

export const setApiModelId = (modelId: string): Action => ({
  type: ActionType.SET_API_MODEL_ID,
  payload: modelId,
});

export const setApiKey = (key: string | undefined): Action => ({
  type: ActionType.SET_API_KEY,
  payload: key,
});

// Add other API configuration actions as needed
```

### Task Actions

```typescript
// src/core/state/actions/taskActions.ts
import { HistoryItem } from '../../../shared/HistoryItem';
import { Action, ActionType } from './types';

export const addTaskToHistory = (task: HistoryItem): Action => ({
  type: ActionType.ADD_TASK_TO_HISTORY,
  payload: task,
});

export const updateTaskInHistory = (task: HistoryItem): Action => ({
  type: ActionType.UPDATE_TASK_IN_HISTORY,
  payload: task,
});

export const deleteTaskFromHistory = (taskId: string): Action => ({
  type: ActionType.DELETE_TASK_FROM_HISTORY,
  payload: taskId,
});

export const setCurrentTask = (taskId: string): Action => ({
  type: ActionType.SET_CURRENT_TASK,
  payload: taskId,
});

export const clearCurrentTask = (): Action => ({
  type: ActionType.CLEAR_CURRENT_TASK,
});
```

### Message Actions

```typescript
// src/core/state/actions/messageActions.ts
import { ClineMessage } from '../../../shared/ExtensionMessage';
import { Action, ActionType } from './types';

export const addMessage = (message: ClineMessage): Action => ({
  type: ActionType.ADD_MESSAGE,
  payload: message,
});

export const updatePartialMessage = (message: ClineMessage): Action => ({
  type: ActionType.UPDATE_PARTIAL_MESSAGE,
  payload: message,
});

export const clearMessages = (): Action => ({
  type: ActionType.CLEAR_MESSAGES,
});
```

### Settings Actions

```typescript
// src/core/state/actions/settingsActions.ts
import { AutoApprovalSettings } from '../../../shared/AutoApprovalSettings';
import { BrowserSettings } from '../../../shared/BrowserSettings';
import { ChatSettings } from '../../../shared/ChatSettings';
import { TelemetrySetting } from '../../../shared/TelemetrySetting';
import { Action, ActionType } from './types';

export const updateAutoApprovalSettings = (settings: AutoApprovalSettings): Action => ({
  type: ActionType.UPDATE_AUTO_APPROVAL_SETTINGS,
  payload: settings,
});

export const updateBrowserSettings = (settings: BrowserSettings): Action => ({
  type: ActionType.UPDATE_BROWSER_SETTINGS,
  payload: settings,
});

export const updateChatSettings = (settings: ChatSettings): Action => ({
  type: ActionType.UPDATE_CHAT_SETTINGS,
  payload: settings,
});

export const setTelemetrySetting = (setting: TelemetrySetting): Action => ({
  type: ActionType.SET_TELEMETRY_SETTING,
  payload: setting,
});
```

### User Actions

```typescript
// src/core/state/actions/userActions.ts
import { Action, ActionType } from './types';

export interface UserInfo {
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

export const setUserInfo = (userInfo: UserInfo): Action => ({
  type: ActionType.SET_USER_INFO,
  payload: userInfo,
});

export const clearUserInfo = (): Action => ({
  type: ActionType.CLEAR_USER_INFO,
});
```

### State Actions

```typescript
// src/core/state/actions/stateActions.ts
import { AppState } from '../types';
import { Action, ActionType } from './types';

export const initializeState = (state: AppState): Action => ({
  type: ActionType.INITIALIZE_STATE,
  payload: state,
});

export const resetState = (): Action => ({
  type: ActionType.RESET_STATE,
});
```

## Reducers

Reducers are pure functions that take the current state and an action, and return a new state. They are organized by domain to keep the codebase maintainable.

```typescript
// src/core/state/reducers/index.ts
import { Action, ActionType } from '../actions/types';
import { AppState, createInitialState } from '../types';
import { apiConfigReducer } from './apiConfigReducer';
import { taskReducer } from './taskReducer';
import { messageReducer } from './messageReducer';
import { settingsReducer } from './settingsReducer';
import { userReducer } from './userReducer';

export const rootReducer = (state: AppState, action: Action): AppState => {
  // Handle special actions
  if (action.type === ActionType.INITIALIZE_STATE) {
    return action.payload;
  }
  
  if (action.type === ActionType.RESET_STATE) {
    return createInitialState(state.version);
  }
  
  // Apply domain-specific reducers
  return {
    ...state,
    apiConfiguration: apiConfigReducer(state.apiConfiguration, action),
    taskHistory: taskReducer(state.taskHistory, state.currentTaskId, action),
    currentTaskId: taskReducer.currentTaskId(state.currentTaskId, action),
    clineMessages: messageReducer(state.clineMessages, action),
    autoApprovalSettings: settingsReducer.autoApproval(state.autoApprovalSettings, action),
    browserSettings: settingsReducer.browser(state.browserSettings, action),
    chatSettings: settingsReducer.chat(state.chatSettings, action),
    telemetrySetting: settingsReducer.telemetry(state.telemetrySetting, action),
    userInfo: userReducer(state.userInfo, action),
  };
};
```

### API Configuration Reducer

```typescript
// src/core/state/reducers/apiConfigReducer.ts
import { ApiConfiguration } from '../../../shared/api';
import { Action, ActionType } from '../actions/types';

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
```

### Task Reducer

```typescript
// src/core/state/reducers/taskReducer.ts
import { HistoryItem } from '../../../shared/HistoryItem';
import { Action, ActionType } from '../actions/types';

export const taskReducer = (
  state: HistoryItem[] = [],
  currentTaskId: string | undefined,
  action: Action
): HistoryItem[] => {
  switch (action.type) {
    case ActionType.ADD_TASK_TO_HISTORY:
      return [...state, action.payload];
    
    case ActionType.UPDATE_TASK_IN_HISTORY:
      return state.map(task => 
        task.id === action.payload.id ? { ...task, ...action.payload } : task
      );
    
    case ActionType.DELETE_TASK_FROM_HISTORY:
      return state.filter(task => task.id !== action.payload);
    
    default:
      return state;
  }
};

// Separate reducer for currentTaskId
taskReducer.currentTaskId = (state: string | undefined, action: Action): string | undefined => {
  switch (action.type) {
    case ActionType.SET_CURRENT_TASK:
      return action.payload;
    
    case ActionType.CLEAR_CURRENT_TASK:
      return undefined;
    
    default:
      return state;
  }
};
```

### Message Reducer

```typescript
// src/core/state/reducers/messageReducer.ts
import { ClineMessage } from '../../../shared/ExtensionMessage';
import { findLastIndex } from '../../../shared/array';
import { Action, ActionType } from '../actions/types';

export const messageReducer = (state: ClineMessage[] = [], action: Action): ClineMessage[] => {
  switch (action.type) {
    case ActionType.ADD_MESSAGE:
      return [...state, action.payload];
    
    case ActionType.UPDATE_PARTIAL_MESSAGE:
      const partialMessage = action.payload;
      const lastIndex = findLastIndex(state, (msg) => msg.ts === partialMessage.ts);
      
      if (lastIndex !== -1) {
        const newState = [...state];
        newState[lastIndex] = partialMessage;
        return newState;
      }
      
      return state;
    
    case ActionType.CLEAR_MESSAGES:
      return [];
    
    default:
      return state;
  }
};
```

### Settings Reducer

```typescript
// src/core/state/reducers/settingsReducer.ts
import { AutoApprovalSettings, DEFAULT_AUTO_APPROVAL_SETTINGS } from '../../../shared/AutoApprovalSettings';
import { BrowserSettings, DEFAULT_BROWSER_SETTINGS } from '../../../shared/BrowserSettings';
import { ChatSettings, DEFAULT_CHAT_SETTINGS } from '../../../shared/ChatSettings';
import { TelemetrySetting } from '../../../shared/TelemetrySetting';
import { Action, ActionType } from '../actions/types';

export const settingsReducer = {
  autoApproval: (state: AutoApprovalSettings = DEFAULT_AUTO_APPROVAL_SETTINGS, action: Action): AutoApprovalSettings => {
    switch (action.type) {
      case ActionType.UPDATE_AUTO_APPROVAL_SETTINGS:
        return action.payload;
      
      default:
        return state;
    }
  },
  
  browser: (state: BrowserSettings = DEFAULT_BROWSER_SETTINGS, action: Action): BrowserSettings => {
    switch (action.type) {
      case ActionType.UPDATE_BROWSER_SETTINGS:
        return action.payload;
      
      default:
        return state;
    }
  },
  
  chat: (state: ChatSettings = DEFAULT_CHAT_SETTINGS, action: Action): ChatSettings => {
    switch (action.type) {
      case ActionType.UPDATE_CHAT_SETTINGS:
        return action.payload;
      
      default:
        return state;
    }
  },
  
  telemetry: (state: TelemetrySetting = 'unset', action: Action): TelemetrySetting => {
    switch (action.type) {
      case ActionType.SET_TELEMETRY_SETTING:
        return action.payload;
      
      default:
        return state;
    }
  },
};
```

### User Reducer

```typescript
// src/core/state/reducers/userReducer.ts
import { Action, ActionType } from '../actions/types';
import { UserInfo } from '../actions/userActions';

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
```

## Selectors

Selectors are functions that extract specific pieces of state. They help encapsulate the state structure and provide a consistent API for accessing state.

```typescript
// src/core/state/selectors/index.ts
export * from './apiConfigSelectors';
export * from './taskSelectors';
export * from './messageSelectors';
export * from './settingsSelectors';
export * from './userSelectors';
```

### API Configuration Selectors

```typescript
// src/core/state/selectors/apiConfigSelectors.ts
import { ApiConfiguration, ApiProvider } from '../../../shared/api';
import { AppState } from '../types';

export const selectApiConfiguration = (state: AppState): ApiConfiguration => 
  state.apiConfiguration;

export const selectApiProvider = (state: AppState): ApiProvider | undefined => 
  state.apiConfiguration.apiProvider;

export const selectApiModelId = (state: AppState): string | undefined => 
  state.apiConfiguration.apiModelId;

export const selectApiKey = (state: AppState): string | undefined => 
  state.apiConfiguration.apiKey;

// Add other API configuration selectors as needed
```

### Task Selectors

```typescript
// src/core/state/selectors/taskSelectors.ts
import { HistoryItem } from '../../../shared/HistoryItem';
import { AppState } from '../types';

export const selectTaskHistory = (state: AppState): HistoryItem[] => 
  state.taskHistory;

export const selectCurrentTaskId = (state: AppState): string | undefined => 
  state.currentTaskId;

export const selectCurrentTask = (state: AppState): HistoryItem | undefined => 
  state.currentTaskId ? state.taskHistory.find(task => task.id === state.currentTaskId) : undefined;

export const selectTaskById = (state: AppState, taskId: string): HistoryItem | undefined => 
  state.taskHistory.find(task => task.id === taskId);
```

### Message Selectors

```typescript
// src/core/state/selectors/messageSelectors.ts
import { ClineMessage } from '../../../shared/ExtensionMessage';
import { AppState } from '../types';

export const selectMessages = (state: AppState): ClineMessage[] => 
  state.clineMessages;

export const selectLastMessage = (state: AppState): ClineMessage | undefined => 
  state.clineMessages.length > 0 ? state.clineMessages[state.clineMessages.length - 1] : undefined;
```

### Settings Selectors

```typescript
// src/core/state/selectors/settingsSelectors.ts
import { AutoApprovalSettings } from '../../../shared/AutoApprovalSettings';
import { BrowserSettings } from '../../../shared/BrowserSettings';
import { ChatSettings } from '../../../shared/ChatSettings';
import { TelemetrySetting } from '../../../shared/TelemetrySetting';
import { AppState } from '../types';

export const selectAutoApprovalSettings = (state: AppState): AutoApprovalSettings => 
  state.autoApprovalSettings;

export const selectBrowserSettings = (state: AppState): BrowserSettings => 
  state.browserSettings;

export const selectChatSettings = (state: AppState): ChatSettings => 
  state.chatSettings;

export const selectTelemetrySetting = (state: AppState): TelemetrySetting => 
  state.telemetrySetting;
```

### User Selectors

```typescript
// src/core/state/selectors/userSelectors.ts
import { AppState } from '../types';
import { UserInfo } from '../actions/userActions';

export const selectUserInfo = (state: AppState): UserInfo | undefined => 
  state.userInfo;

export const selectIsLoggedIn = (state: AppState): boolean => 
  !!state.userInfo;
```

## State Persistence

The state persistence layer handles saving and loading state from VSCode's storage mechanisms.

```typescript
// src/core/state/persistence/StatePersistence.ts
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

export class StatePersistence {
  constructor(
    private context: vscode.ExtensionContext,
    private stateContainer: StateContainer
  ) {
    // Subscribe to state changes
    this.stateContainer.subscribe(this.persistState);
  }
  
  private persistState = async (state: AppState): Promise<void> => {
    // Persist global state
    await this.persistGlobalState(state);
    
    // Persist secrets
    await this.persistSecrets(state);
  };
  
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
  
  private async updateGlobalState(key: GlobalStateKey, value: any): Promise<void> {
    await this.context.globalState.update(key, value);
  }
  
  private async storeSecret(key: SecretKey, value?: string): Promise<void> {
    if (value) {
      await this.context.secrets.store(key, value);
    } else {
      await this.context.secrets.delete(key);
    }
  }
  
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
      autoApprovalSettings: autoApprovalSettings || DEFAULT_AUTO_APPROVAL_SETTINGS,
      browserSettings: browserSettings || DEFAULT_BROWSER_SETTINGS,
      chatSettings: chatSettings || DEFAULT_CHAT_SETTINGS,
      userInfo,
      telemetrySetting: telemetrySetting || 'unset',
    };
  }
  
  private async getGlobalState(key: GlobalStateKey): Promise<any> {
    return await this.context.globalState.get(key);
  }
  
  private async getSecret(key: SecretKey): Promise<string | undefined> {
    return await this.context.secrets.get(key);
  }
}

// Create a singleton instance
let statePersistenceInstance: StatePersistence | undefined;

export const getStatePersistence = (
  context: vscode.ExtensionContext,
  stateContainer: StateContainer
): StatePersistence => {
  if (!statePersistenceInstance) {
    statePersistenceInstance = new StatePersistence(context, stateContainer);
  }
  
  return statePersistenceInstance;
};

export const resetStatePersistence = (): void => {
  statePersistenceInstance = undefined;
};
```

## Integration with ClineProvider

To integrate the new state management system with the existing `ClineProvider` class, we'll create a compatibility layer that gradually migrates the state management from `ClineProvider` to the new system.

```typescript
// src/core/webview/ClineProvider.ts (partial)
import { getStateContainer } from '../state/StateContainer';
import { getStatePersistence } from '../state/persistence/StatePersistence';
import { createInitialState } from '../state/types';
import { 
  updateApiConfiguration, 
  setCustomInstructions, 
  updateAutoApprovalSettings,
  updateBrowserSettings,
  updateChatSettings,
  setTelemetrySetting,
  addTaskToHistory,
  updateTaskInHistory,
  setCurrentTask,
  clearCurrentTask,
  setUserInfo,
  clearUserInfo,
} from '../state/actions';

export class ClineProvider implements vscode.WebviewViewProvider {
  // ... existing code ...
  
  private stateContainer: StateContainer;
  private statePersistence: StatePersistence;
  
  constructor(
    readonly context: vscode.ExtensionContext,
    private readonly outputChannel: vscode.OutputChannel,
  ) {
    this.outputChannel.appendLine("ClineProvider instantiated");
    ClineProvider.activeInstances.add(this);
    
    // Initialize state container with default state
    this.stateContainer = getStateContainer(createInitialState(this.context.extension?.packageJSON?.version ?? ""));
    this.statePersistence = getStatePersistence(this.context, this.stateContainer);
    
    // Load persisted state
    this.loadPersistedState();
    
    // Initialize other components
    this.workspaceTracker = new WorkspaceTracker(this);
    this.mcpHub = new McpHub(this);
    this.authManager = new FirebaseAuthManager(this);
  }
  
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
      this.outputChannel.appendLine(`Error loading persisted state: ${error}`);
    }
  }
  
  // Compatibility methods that use the new state management system
  
  async updateApiConfiguration(config: ApiConfiguration): Promise<void> {
    this.stateContainer.dispatch(updateApiConfiguration(config));
  }
  
  async updateCustomInstructions(instructions?: string): Promise<void> {
    this.stateContainer.dispatch(setCustomInstructions(instructions));
  }
  
  async updateAutoApprovalSettings(settings: AutoApprovalSettings): Promise<void> {
    this.stateContainer.dispatch(updateAutoApprovalSettings(settings));
  }
  
  async updateBrowserSettings(settings: BrowserSettings): Promise<void> {
    this.stateContainer.dispatch(updateBrowserSettings(settings));
  }
  
  async updateChatSettings(settings: ChatSettings): Promise<void> {
    this.stateContainer.dispatch(updateChatSettings(settings));
  }
  
  async setTelemetrySetting(setting: TelemetrySetting): Promise<void> {
    this.stateContainer.dispatch(setTelemetrySetting(setting));
  }
  
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
  
  async setUserInfo(info?: { displayName: string | null; email: string | null; photoURL: string | null }): Promise<void> {
    if (info) {
      this.stateContainer.dispatch(setUserInfo(info));
    } else {
      this.stateContainer.dispatch(clearUserInfo());
    }
  }
  
  // ... other methods ...
}
```

## Conclusion

This implementation provides a solid foundation for the core extension state management system. It follows the architecture outlined in the State Architecture Design document and addresses the pain points identified in the State Management Audit.

The key benefits of this implementation include:

1. **Unidirectional Data Flow**: State changes follow a predictable path through actions and reducers.
2. **Type Safety**: All state transitions are strongly typed with explicit action types.
3. **Separation of Concerns**: State logic is organized by domain, making it easier to maintain.
4. **Single Source of Truth**: The state container serves as the single source of truth for all state.
5. **Compatibility**: The implementation includes a compatibility layer for gradual migration.

The next steps in the implementation process would be:

1. Implement the state synchronizer for communication with the webview
2. Create the webview state management system
3. Gradually migrate existing code to use the new state management system
4. Add developer tools for debugging and monitoring state changes
