# Webview State Implementation

This document provides detailed implementation guidance for the webview state management system, based on the architecture outlined in the [State Architecture Design](./state-architecture-design.md). It focuses on the implementation of the state container, actions, reducers, and React integration in the webview UI.

## Directory Structure

The new webview state management system will be organized in the following directory structure:

```
webview-ui/
└── src/
    └── state/
        ├── index.ts                 # Main exports
        ├── WebviewStateContainer.ts # State container implementation
        ├── types.ts                 # State type definitions
        ├── WebviewStateContext.tsx  # React context provider
        ├── actions/
        │   ├── index.ts             # Action exports
        │   ├── types.ts             # Action type definitions
        │   ├── apiConfigActions.ts  # API configuration actions
        │   ├── messageActions.ts    # Message actions
        │   └── ...                  # Other action modules
        ├── reducers/
        │   ├── index.ts             # Root reducer
        │   ├── apiConfigReducer.ts  # API configuration reducer
        │   ├── messageReducer.ts    # Message reducer
        │   └── ...                  # Other reducer modules
        ├── selectors/
        │   ├── index.ts             # Selector exports
        │   ├── apiConfigSelectors.ts # API configuration selectors
        │   ├── messageSelectors.ts  # Message selectors
        │   └── ...                  # Other selector modules
        └── hooks/
            ├── index.ts             # Hook exports
            ├── useApiConfiguration.ts # API configuration hook
            ├── useMessages.ts       # Messages hook
            └── ...                  # Other custom hooks
```

## State Types

The state types will define the structure of the webview state, which is a subset of the core extension state.

```typescript
// webview-ui/src/state/types.ts
import { ApiConfiguration } from '../../../src/shared/api';
import { AutoApprovalSettings } from '../../../src/shared/AutoApprovalSettings';
import { BrowserSettings } from '../../../src/shared/BrowserSettings';
import { ChatSettings } from '../../../src/shared/ChatSettings';
import { ClineMessage } from '../../../src/shared/ExtensionMessage';
import { HistoryItem } from '../../../src/shared/HistoryItem';
import { McpMarketplaceCatalog, McpServer } from '../../../src/shared/mcp';
import { TelemetrySetting } from '../../../src/shared/TelemetrySetting';

export interface WebviewState {
  version: string;
  apiConfiguration: Omit<ApiConfiguration, 'apiKey' | 'openRouterApiKey' | 'awsAccessKey' | 'awsSecretKey' | 'awsSessionToken' | 'openAiApiKey' | 'geminiApiKey' | 'openAiNativeApiKey' | 'deepSeekApiKey' | 'requestyApiKey' | 'togetherApiKey' | 'qwenApiKey' | 'mistralApiKey' | 'liteLlmApiKey'>;
  customInstructions?: string;
  taskHistory: HistoryItem[];
  currentTaskItem?: HistoryItem;
  checkpointTrackerErrorMessage?: string;
  clineMessages: ClineMessage[];
  shouldShowAnnouncement: boolean;
  platform: 'aix' | 'darwin' | 'freebsd' | 'linux' | 'openbsd' | 'sunos' | 'win32' | 'unknown';
  autoApprovalSettings: AutoApprovalSettings;
  browserSettings: BrowserSettings;
  chatSettings: ChatSettings;
  isLoggedIn: boolean;
  userInfo?: {
    displayName: string | null;
    email: string | null;
    photoURL: string | null;
  };
  mcpMarketplaceEnabled?: boolean;
  telemetrySetting: TelemetrySetting;
  
  // Webview-specific state
  didHydrateState: boolean;
  showWelcome: boolean;
  theme: any;
  openRouterModels: Record<string, any>;
  openAiModels: string[];
  mcpServers: McpServer[];
  mcpMarketplaceCatalog: McpMarketplaceCatalog;
  filePaths: string[];
}

// Create a default initial state
import { DEFAULT_AUTO_APPROVAL_SETTINGS } from '../../../src/shared/AutoApprovalSettings';
import { DEFAULT_BROWSER_SETTINGS } from '../../../src/shared/BrowserSettings';
import { DEFAULT_CHAT_SETTINGS } from '../../../src/shared/ChatSettings';
import { DEFAULT_PLATFORM } from '../../../src/shared/ExtensionMessage';
import { openRouterDefaultModelId, openRouterDefaultModelInfo } from '../../../src/shared/api';

export const createInitialState = (): WebviewState => ({
  version: '',
  apiConfiguration: {},
  taskHistory: [],
  clineMessages: [],
  shouldShowAnnouncement: false,
  platform: DEFAULT_PLATFORM,
  autoApprovalSettings: DEFAULT_AUTO_APPROVAL_SETTINGS,
  browserSettings: DEFAULT_BROWSER_SETTINGS,
  chatSettings: DEFAULT_CHAT_SETTINGS,
  isLoggedIn: false,
  telemetrySetting: 'unset',
  
  // Webview-specific state
  didHydrateState: false,
  showWelcome: true,
  theme: undefined,
  openRouterModels: {
    [openRouterDefaultModelId]: openRouterDefaultModelInfo,
  },
  openAiModels: [],
  mcpServers: [],
  mcpMarketplaceCatalog: { items: [] },
  filePaths: [],
});
```

## Webview State Container

The `WebviewStateContainer` class will be responsible for managing the webview state and handling communication with the core extension.

```typescript
// webview-ui/src/state/WebviewStateContainer.ts
import { ExtensionMessage } from '../../../src/shared/ExtensionMessage';
import { WebviewMessage } from '../../../src/shared/WebviewMessage';
import { WebviewAction } from './actions/types';
import { webviewReducer } from './reducers';
import { WebviewState, createInitialState } from './types';
import { vscode } from '../utils/vscode';

export type StateChangeListener = (state: WebviewState) => void;

export class WebviewStateContainer {
  private state: WebviewState;
  private listeners: Set<StateChangeListener>;
  
  constructor(initialState: WebviewState = createInitialState()) {
    this.state = initialState;
    this.listeners = new Set();
    
    // Listen for messages from extension
    window.addEventListener('message', this.handleExtensionMessage);
  }
  
  getState(): Readonly<WebviewState> {
    return this.state;
  }
  
  dispatch(action: WebviewAction): void {
    // Handle local actions
    const nextState = webviewReducer(this.state, action);
    if (nextState !== this.state) {
      this.state = nextState;
      this.notifyListeners();
    }
    
    // Send action to extension if needed
    if (action.sendToExtension) {
      this.sendMessageToExtension(action.toExtensionMessage());
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
  
  private handleExtensionMessage = (event: MessageEvent): void => {
    const message: ExtensionMessage = event.data;
    
    switch (message.type) {
      case 'state': {
        if (message.state) {
          // Update entire state
          this.state = {
            ...this.state,
            ...message.state,
            didHydrateState: true,
            showWelcome: !this.hasApiKey(message.state),
          };
          this.notifyListeners();
        }
        break;
      }
      
      case 'theme': {
        if (message.text) {
          this.state = {
            ...this.state,
            theme: JSON.parse(message.text),
          };
          this.notifyListeners();
        }
        break;
      }
      
      case 'workspaceUpdated': {
        this.state = {
          ...this.state,
          filePaths: message.filePaths || [],
        };
        this.notifyListeners();
        break;
      }
      
      case 'partialMessage': {
        if (message.partialMessage) {
          const partialMessage = message.partialMessage;
          const clineMessages = [...this.state.clineMessages];
          const lastIndex = clineMessages.findIndex((msg) => msg.ts === partialMessage.ts);
          
          if (lastIndex !== -1) {
            clineMessages[lastIndex] = partialMessage;
            
            this.state = {
              ...this.state,
              clineMessages,
            };
            this.notifyListeners();
          }
        }
        break;
      }
      
      case 'openRouterModels': {
        if (message.openRouterModels) {
          this.state = {
            ...this.state,
            openRouterModels: {
              [openRouterDefaultModelId]: openRouterDefaultModelInfo,
              ...message.openRouterModels,
            },
          };
          this.notifyListeners();
        }
        break;
      }
      
      case 'openAiModels': {
        this.state = {
          ...this.state,
          openAiModels: message.openAiModels || [],
        };
        this.notifyListeners();
        break;
      }
      
      case 'mcpServers': {
        this.state = {
          ...this.state,
          mcpServers: message.mcpServers || [],
        };
        this.notifyListeners();
        break;
      }
      
      case 'mcpMarketplaceCatalog': {
        if (message.mcpMarketplaceCatalog) {
          this.state = {
            ...this.state,
            mcpMarketplaceCatalog: message.mcpMarketplaceCatalog,
          };
          this.notifyListeners();
        }
        break;
      }
    }
  };
  
  private hasApiKey(state: any): boolean {
    if (!state.apiConfiguration) {
      return false;
    }
    
    const config = state.apiConfiguration;
    return [
      config.apiProvider === 'vscode-lm' && config.vsCodeLmModelSelector,
      config.apiProvider === 'ollama' && config.ollamaModelId,
      config.apiProvider === 'lmstudio' && config.lmStudioModelId,
    ].some(Boolean);
  }
  
  private sendMessageToExtension(message: WebviewMessage): void {
    vscode.postMessage(message);
  }
  
  // Initialize the webview
  initialize(): void {
    vscode.postMessage({ type: 'webviewDidLaunch' });
  }
}

// Create a singleton instance
let webviewStateContainerInstance: WebviewStateContainer | undefined;

export const getWebviewStateContainer = (initialState?: WebviewState): WebviewStateContainer => {
  if (!webviewStateContainerInstance) {
    webviewStateContainerInstance = new WebviewStateContainer(initialState);
  }
  
  return webviewStateContainerInstance;
};

export const resetWebviewStateContainer = (): void => {
  webviewStateContainerInstance = undefined;
};
```

## Actions

Actions define the operations that can change the state. They are organized by domain to keep the codebase maintainable.

```typescript
// webview-ui/src/state/actions/types.ts
import { WebviewMessage } from '../../../../src/shared/WebviewMessage';

export enum ActionType {
  // API Configuration
  SET_API_CONFIGURATION = 'SET_API_CONFIGURATION',
  
  // Custom Instructions
  SET_CUSTOM_INSTRUCTIONS = 'SET_CUSTOM_INSTRUCTIONS',
  
  // Messages
  SET_MESSAGES = 'SET_MESSAGES',
  ADD_MESSAGE = 'ADD_MESSAGE',
  UPDATE_PARTIAL_MESSAGE = 'UPDATE_PARTIAL_MESSAGE',
  CLEAR_MESSAGES = 'CLEAR_MESSAGES',
  
  // Settings
  SET_AUTO_APPROVAL_SETTINGS = 'SET_AUTO_APPROVAL_SETTINGS',
  SET_BROWSER_SETTINGS = 'SET_BROWSER_SETTINGS',
  SET_CHAT_SETTINGS = 'SET_CHAT_SETTINGS',
  SET_TELEMETRY_SETTING = 'SET_TELEMETRY_SETTING',
  
  // UI State
  SET_SHOW_WELCOME = 'SET_SHOW_WELCOME',
  SET_SHOW_ANNOUNCEMENT = 'SET_SHOW_ANNOUNCEMENT',
  
  // Webview-specific
  SET_THEME = 'SET_THEME',
  SET_FILE_PATHS = 'SET_FILE_PATHS',
  SET_OPENROUTER_MODELS = 'SET_OPENROUTER_MODELS',
  SET_OPENAI_MODELS = 'SET_OPENAI_MODELS',
  SET_MCP_SERVERS = 'SET_MCP_SERVERS',
  SET_MCP_MARKETPLACE_CATALOG = 'SET_MCP_MARKETPLACE_CATALOG',
}

export interface WebviewAction {
  type: ActionType;
  payload?: any;
  sendToExtension?: boolean;
  toExtensionMessage?: () => WebviewMessage;
}

// webview-ui/src/state/actions/index.ts
export * from './types';
export * from './apiConfigActions';
export * from './messageActions';
export * from './settingsActions';
export * from './uiActions';
```

### API Configuration Actions

```typescript
// webview-ui/src/state/actions/apiConfigActions.ts
import { ApiConfiguration } from '../../../../src/shared/api';
import { ActionType, WebviewAction } from './types';

export const setApiConfiguration = (config: ApiConfiguration): WebviewAction => ({
  type: ActionType.SET_API_CONFIGURATION,
  payload: config,
  sendToExtension: true,
  toExtensionMessage: () => ({
    type: 'apiConfiguration',
    apiConfiguration: config,
  }),
});
```

### Message Actions

```typescript
// webview-ui/src/state/actions/messageActions.ts
import { ClineMessage } from '../../../../src/shared/ExtensionMessage';
import { ActionType, WebviewAction } from './types';

export const setMessages = (messages: ClineMessage[]): WebviewAction => ({
  type: ActionType.SET_MESSAGES,
  payload: messages,
});

export const addMessage = (message: ClineMessage): WebviewAction => ({
  type: ActionType.ADD_MESSAGE,
  payload: message,
});

export const updatePartialMessage = (message: ClineMessage): WebviewAction => ({
  type: ActionType.UPDATE_PARTIAL_MESSAGE,
  payload: message,
});

export const clearMessages = (): WebviewAction => ({
  type: ActionType.CLEAR_MESSAGES,
  payload: undefined,
  sendToExtension: true,
  toExtensionMessage: () => ({
    type: 'clearTask',
  }),
});

export const sendNewTask = (text: string, images?: string[]): WebviewAction => ({
  type: ActionType.CLEAR_MESSAGES, // This will clear messages first
  payload: undefined,
  sendToExtension: true,
  toExtensionMessage: () => ({
    type: 'newTask',
    text,
    images,
  }),
});
```

### Settings Actions

```typescript
// webview-ui/src/state/actions/settingsActions.ts
import { AutoApprovalSettings } from '../../../../src/shared/AutoApprovalSettings';
import { BrowserSettings } from '../../../../src/shared/BrowserSettings';
import { ChatSettings } from '../../../../src/shared/ChatSettings';
import { TelemetrySetting } from '../../../../src/shared/TelemetrySetting';
import { ActionType, WebviewAction } from './types';

export const setAutoApprovalSettings = (settings: AutoApprovalSettings): WebviewAction => ({
  type: ActionType.SET_AUTO_APPROVAL_SETTINGS,
  payload: settings,
  sendToExtension: true,
  toExtensionMessage: () => ({
    type: 'autoApprovalSettings',
    autoApprovalSettings: settings,
  }),
});

export const setBrowserSettings = (settings: BrowserSettings): WebviewAction => ({
  type: ActionType.SET_BROWSER_SETTINGS,
  payload: settings,
  sendToExtension: true,
  toExtensionMessage: () => ({
    type: 'browserSettings',
    browserSettings: settings,
  }),
});

export const setChatSettings = (settings: ChatSettings): WebviewAction => ({
  type: ActionType.SET_CHAT_SETTINGS,
  payload: settings,
  sendToExtension: true,
  toExtensionMessage: () => ({
    type: 'togglePlanActMode',
    chatSettings: settings,
  }),
});

export const setTelemetrySetting = (setting: TelemetrySetting): WebviewAction => ({
  type: ActionType.SET_TELEMETRY_SETTING,
  payload: setting,
  sendToExtension: true,
  toExtensionMessage: () => ({
    type: 'telemetrySetting',
    text: setting,
  }),
});
```

### UI Actions

```typescript
// webview-ui/src/state/actions/uiActions.ts
import { ActionType, WebviewAction } from './types';

export const setShowWelcome = (show: boolean): WebviewAction => ({
  type: ActionType.SET_SHOW_WELCOME,
  payload: show,
});

export const setShowAnnouncement = (show: boolean): WebviewAction => ({
  type: ActionType.SET_SHOW_ANNOUNCEMENT,
  payload: show,
  sendToExtension: !show,
  toExtensionMessage: () => ({
    type: 'didShowAnnouncement',
  }),
});

export const setTheme = (theme: any): WebviewAction => ({
  type: ActionType.SET_THEME,
  payload: theme,
});

export const setFilePaths = (filePaths: string[]): WebviewAction => ({
  type: ActionType.SET_FILE_PATHS,
  payload: filePaths,
});

export const setOpenRouterModels = (models: Record<string, any>): WebviewAction => ({
  type: ActionType.SET_OPENROUTER_MODELS,
  payload: models,
});

export const setOpenAiModels = (models: string[]): WebviewAction => ({
  type: ActionType.SET_OPENAI_MODELS,
  payload: models,
});

export const setMcpServers = (servers: any[]): WebviewAction => ({
  type: ActionType.SET_MCP_SERVERS,
  payload: servers,
});

export const setMcpMarketplaceCatalog = (catalog: any): WebviewAction => ({
  type: ActionType.SET_MCP_MARKETPLACE_CATALOG,
  payload: catalog,
});
```

## Reducers

Reducers are pure functions that take the current state and an action, and return a new state. They are organized by domain to keep the codebase maintainable.

```typescript
// webview-ui/src/state/reducers/index.ts
import { ActionType, WebviewAction } from '../actions/types';
import { WebviewState } from '../types';
import { apiConfigReducer } from './apiConfigReducer';
import { messageReducer } from './messageReducer';
import { settingsReducer } from './settingsReducer';
import { uiReducer } from './uiReducer';

export const webviewReducer = (state: WebviewState, action: WebviewAction): WebviewState => {
  // Apply domain-specific reducers
  return {
    ...state,
    apiConfiguration: apiConfigReducer(state.apiConfiguration, action),
    clineMessages: messageReducer(state.clineMessages, action),
    autoApprovalSettings: settingsReducer.autoApproval(state.autoApprovalSettings, action),
    browserSettings: settingsReducer.browser(state.browserSettings, action),
    chatSettings: settingsReducer.chat(state.chatSettings, action),
    telemetrySetting: settingsReducer.telemetry(state.telemetrySetting, action),
    customInstructions: settingsReducer.customInstructions(state.customInstructions, action),
    showWelcome: uiReducer.showWelcome(state.showWelcome, action),
    shouldShowAnnouncement: uiReducer.shouldShowAnnouncement(state.shouldShowAnnouncement, action),
    theme: uiReducer.theme(state.theme, action),
    filePaths: uiReducer.filePaths(state.filePaths, action),
    openRouterModels: uiReducer.openRouterModels(state.openRouterModels, action),
    openAiModels: uiReducer.openAiModels(state.openAiModels, action),
    mcpServers: uiReducer.mcpServers(state.mcpServers, action),
    mcpMarketplaceCatalog: uiReducer.mcpMarketplaceCatalog(state.mcpMarketplaceCatalog, action),
  };
};
```

### API Configuration Reducer

```typescript
// webview-ui/src/state/reducers/apiConfigReducer.ts
import { ApiConfiguration } from '../../../../src/shared/api';
import { ActionType, WebviewAction } from '../actions/types';

export const apiConfigReducer = (state: ApiConfiguration = {}, action: WebviewAction): ApiConfiguration => {
  switch (action.type) {
    case ActionType.SET_API_CONFIGURATION:
      return {
        ...state,
        ...action.payload,
      };
    
    default:
      return state;
  }
};
```

### Message Reducer

```typescript
// webview-ui/src/state/reducers/messageReducer.ts
import { ClineMessage } from '../../../../src/shared/ExtensionMessage';
import { ActionType, WebviewAction } from '../actions/types';

export const messageReducer = (state: ClineMessage[] = [], action: WebviewAction): ClineMessage[] => {
  switch (action.type) {
    case ActionType.SET_MESSAGES:
      return action.payload;
    
    case ActionType.ADD_MESSAGE:
      return [...state, action.payload];
    
    case ActionType.UPDATE_PARTIAL_MESSAGE:
      const partialMessage = action.payload;
      const lastIndex = state.findIndex((msg) => msg.ts === partialMessage.ts);
      
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
// webview-ui/src/state/reducers/settingsReducer.ts
import { AutoApprovalSettings, DEFAULT_AUTO_APPROVAL_SETTINGS } from '../../../../src/shared/AutoApprovalSettings';
import { BrowserSettings, DEFAULT_BROWSER_SETTINGS } from '../../../../src/shared/BrowserSettings';
import { ChatSettings, DEFAULT_CHAT_SETTINGS } from '../../../../src/shared/ChatSettings';
import { TelemetrySetting } from '../../../../src/shared/TelemetrySetting';
import { ActionType, WebviewAction } from '../actions/types';

export const settingsReducer = {
  autoApproval: (state: AutoApprovalSettings = DEFAULT_AUTO_APPROVAL_SETTINGS, action: WebviewAction): AutoApprovalSettings => {
    switch (action.type) {
      case ActionType.SET_AUTO_APPROVAL_SETTINGS:
        return action.payload;
      
      default:
        return state;
    }
  },
  
  browser: (state: BrowserSettings = DEFAULT_BROWSER_SETTINGS, action: WebviewAction): BrowserSettings => {
    switch (action.type) {
      case ActionType.SET_BROWSER_SETTINGS:
        return action.payload;
      
      default:
        return state;
    }
  },
  
  chat: (state: ChatSettings = DEFAULT_CHAT_SETTINGS, action: WebviewAction): ChatSettings => {
    switch (action.type) {
      case ActionType.SET_CHAT_SETTINGS:
        return action.payload;
      
      default:
        return state;
    }
  },
  
  telemetry: (state: TelemetrySetting = 'unset', action: WebviewAction): TelemetrySetting => {
    switch (action.type) {
      case ActionType.SET_TELEMETRY_SETTING:
        return action.payload;
      
      default:
        return state;
    }
  },
  
  customInstructions: (state: string | undefined = undefined, action: WebviewAction): string | undefined => {
    switch (action.type) {
      case ActionType.SET_CUSTOM_INSTRUCTIONS:
        return action.payload;
      
      default:
        return state;
    }
  },
};
```

### UI Reducer

```typescript
// webview-ui/src/state/reducers/uiReducer.ts
import { openRouterDefaultModelId, openRouterDefaultModelInfo } from '../../../../src/shared/api';
import { McpMarketplaceCatalog, McpServer } from '../../../../src/shared/mcp';
import { ActionType, WebviewAction } from '../actions/types';

export const uiReducer = {
  showWelcome: (state: boolean = true, action: WebviewAction): boolean => {
    switch (action.type) {
      case ActionType.SET_SHOW_WELCOME:
        return action.payload;
      
      default:
        return state;
    }
  },
  
  shouldShowAnnouncement: (state: boolean = false, action: WebviewAction): boolean => {
    switch (action.type) {
      case ActionType.SET_SHOW_ANNOUNCEMENT:
        return action.payload;
      
      default:
        return state;
    }
  },
  
  theme: (state: any = undefined, action: WebviewAction): any => {
    switch (action.type) {
      case ActionType.SET_THEME:
        return action.payload;
      
      default:
        return state;
    }
  },
  
  filePaths: (state: string[] = [], action: WebviewAction): string[] => {
    switch (action.type) {
      case ActionType.SET_FILE_PATHS:
        return action.payload;
      
      default:
        return state;
    }
  },
  
  openRouterModels: (state: Record<string, any> = { [openRouterDefaultModelId]: openRouterDefaultModelInfo }, action: WebviewAction): Record<string, any> => {
    switch (action.type) {
      case ActionType.SET_OPENROUTER_MODELS:
        return {
          [openRouterDefaultModelId]: openRouterDefaultModelInfo,
          ...action.payload,
        };
      
      default:
        return state;
    }
  },
  
  openAiModels: (state: string[] = [], action: WebviewAction): string[] => {
    switch (action.type) {
      case ActionType.SET_OPENAI_MODELS:
        return action.payload;
      
      default:
        return state;
    }
  },
  
  mcpServers: (state: McpServer[] = [], action: WebviewAction): McpServer[] => {
    switch (action.type) {
      case ActionType.SET_MCP_SERVERS:
        return action.payload;
      
      default:
        return state;
    }
  },
  
  mcpMarketplaceCatalog: (state: McpMarketplaceCatalog = { items: [] }, action: WebviewAction): McpMarketplaceCatalog => {
    switch (action.type) {
      case ActionType.SET_MCP_MARKETPLACE_CATALOG:
        return action.payload;
      
      default:
        return state;
    }
  },
};
```

## Selectors

Selectors are functions that extract specific pieces of state. They help encapsulate the state structure and provide a consistent API for accessing state.

```typescript
// webview-ui/src/state/selectors/index.ts
export * from './apiConfigSelectors';
export * from './messageSelectors';
export * from './settingsSelectors';
export * from './uiSelectors';
```

### API Configuration Selectors

```typescript
// webview-ui/src/state/selectors/apiConfigSelectors.ts
import { ApiConfiguration, ApiProvider } from '../../../../src/shared/api';
import { WebviewState } from '../types';

export const selectApiConfiguration = (state: WebviewState): ApiConfiguration => 
  state.apiConfiguration;

export const selectApiProvider = (state: WebviewState): ApiProvider | undefined => 
  state.apiConfiguration.apiProvider;

export const selectApiModelId = (state: WebviewState): string | undefined => 
  state.apiConfiguration.apiModelId;

// Add other API configuration selectors as needed
```

### Message Selectors

```typescript
// webview-ui/src/state/selectors/messageSelectors.ts
import { ClineMessage } from '../../../../src/shared/ExtensionMessage';
import { WebviewState } from '../types';

export const selectMessages = (state: WebviewState): ClineMessage[] => 
  state.clineMessages;

export const selectLastMessage = (state: WebviewState): ClineMessage | undefined => 
  state.clineMessages.length > 0 ? state.clineMessages[state.clineMessages.length - 1] : undefined;
```

### Settings Selectors

```typescript
// webview-ui/src/state/selectors/settingsSelectors.ts
import { AutoApprovalSettings } from '../../../../src/shared/AutoApprovalSettings';
import { BrowserSettings } from '../../../../src/shared/BrowserSettings';
import { ChatSettings } from '../../../../src/shared/ChatSettings';
import { TelemetrySetting } from '../../../../src/shared/TelemetrySetting';
import { WebviewState } from '../types';

export const selectAutoApprovalSettings = (state: WebviewState): AutoApprovalSettings => 
  state.autoApprovalSettings;

export const selectBrowserSettings = (state: WebviewState): BrowserSettings => 
  state.browserSettings;

export const selectChatSettings = (state: WebviewState): ChatSettings => 
  state.chatSettings;

export const selectTelemetrySetting = (state: WebviewState): TelemetrySetting => 
  state.telemetrySetting;

export const selectCustomInstructions = (state: WebviewState): string | undefined => 
  state.customInstructions;
```

### UI Selectors

```typescript
// webview-ui/src/state/selectors/uiSelectors.ts
import { McpMarketplaceCatalog, McpServer } from '../../../../src/shared/mcp';
import { WebviewState } from '../types';

export const selectShowWelcome = (state: WebviewState): boolean => 
  state.showWelcome;

export const selectShouldShowAnnouncement = (state: WebviewState): boolean => 
  state.shouldShowAnnouncement;

export const selectTheme = (state: WebviewState): any => 
  state.theme;

export const selectFilePaths = (state: WebviewState): string[] => 
  state.filePaths;

export const selectOpenRouterModels = (state: WebviewState): Record<string, any> => 
  state.openRouterModels;

export const selectOpenAiModels = (state: WebviewState): string[] => 
  state.openAiModels;

export const selectMcpServers = (state: WebviewState): McpServer[] => 
  state.mcpServers;

export const selectMcpMarketplaceCatalog = (state: WebviewState): McpMarketplaceCatalog => 
  state.mcpMarketplaceCatalog;
```

## React Integration

The React integration provides hooks and components for accessing the state.

```typescript
// webview-ui/src/state/WebviewStateContext.tsx
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { WebviewAction } from './actions/types';
import { WebviewState, createInitialState } from './types';
import { WebviewStateContainer, getWebviewStateContainer } from './WebviewStateContainer';

interface WebviewStateContextValue {
  state: WebviewState;
  dispatch: (action: WebviewAction) => void;
}

const WebviewStateContext = createContext<WebviewStateContextValue | undefined>(undefined);

export const WebviewStateProvider: React.FC<{
  children: React.ReactNode;
  initialState?: WebviewState;
}> = ({ children, initialState = createInitialState() }) => {
  const stateContainerRef = useRef<WebviewStateContainer>(
    getWebviewStateContainer(initialState)
  );
  const [state, setState] = useState<WebviewState>(stateContainerRef.current.getState());
  
  useEffect(() => {
    // Subscribe to state changes
    const unsubscribe = stateContainerRef.current.subscribe(setState);
    
    // Initialize the webview
    stateContainerRef.current.initialize();
    
    return unsubscribe;
  }, []);
  
  const dispatch = (action: WebviewAction) => {
    stateContainerRef.current.dispatch(action);
  };
  
  const value: WebviewStateContextValue = {
    state,
    dispatch,
  };
  
  return (
    <WebviewStateContext.Provider value={value}>
      {children}
    </WebviewStateContext.Provider>
  );
};

export const useWebviewState = (): WebviewStateContextValue => {
  const context = useContext(WebviewStateContext);
  if (context === undefined) {
    throw new Error('useWebviewState must be used within a WebviewStateProvider');
  }
  return context;
};
```

## Custom Hooks

Custom hooks provide a convenient way to access and modify specific parts of the state.

```typescript
// webview-ui/src/state/hooks/index.ts
export * from './useApiConfiguration';
export * from './useMessages';
export * from './useSettings';
export * from './useUi';
```

### API Configuration Hook

```typescript
// webview-ui/src/state/hooks/useApiConfiguration.ts
import { useCallback } from 'react';
import { ApiConfiguration } from '../../../../src/shared/api';
import { setApiConfiguration } from '../actions/apiConfigActions';
import { selectApiConfiguration } from '../selectors/apiConfigSelectors';
import { useWebviewState } from '../WebviewStateContext';

export const useApiConfiguration = (): [ApiConfiguration, (config: ApiConfiguration) => void] => {
  const { state, dispatch } = useWebviewState();
  const apiConfiguration = selectApiConfiguration(state);
  
  const updateApiConfiguration = useCallback((config: ApiConfiguration) => {
    dispatch(setApiConfiguration(config));
  }, [dispatch]);
  
  return [apiConfiguration, updateApiConfiguration];
};
```

### Messages Hook

```typescript
// webview-ui/src/state/hooks/useMessages.ts
import { useCallback } from 'react';
import { ClineMessage } from '../../../../src/shared/ExtensionMessage';
import { clearMessages, sendNewTask } from '../actions/messageActions';
import { selectMessages } from '../selectors/messageSelectors';
import { useWebviewState } from '../WebviewStateContext';

export const useMessages = (): {
  messages: ClineMessage[];
  clearMessages: () => void;
  sendNewTask: (text: string, images?: string[]) => void;
} => {
  const { state, dispatch } = useWebviewState();
  const messages = selectMessages(state);
  
  const clearMessagesAction = useCallback(() => {
    dispatch(clearMessages());
  }, [dispatch]);
  
  const sendNewTaskAction = useCallback((text: string, images?: string[]) => {
    dispatch(sendNewTask(text, images));
  }, [dispatch]);
  
  return {
    messages,
    clearMessages: clearMessagesAction,
    sendNewTask: sendNewTaskAction,
  };
};
```

### Settings Hook

```typescript
// webview-ui/src/state/hooks/useSettings.ts
import { useCallback } from 'react';
import { AutoApprovalSettings } from '../../../../src/shared/AutoApprovalSettings';
import { BrowserSettings } from '../../../../src/shared/BrowserSettings';
import { ChatSettings } from '../../../../src/shared/ChatSettings';
import { TelemetrySetting } from '../../../../src/shared/TelemetrySetting';
import { setAutoApprovalSettings, setBrowserSettings, setChatSettings, setTelemetrySetting } from '../actions/settingsActions';
import { selectAutoApprovalSettings, selectBrowserSettings, selectChatSettings, selectCustomInstructions, selectTelemetrySetting } from '../selectors/settingsSelectors';
import { useWebviewState } from '../WebviewStateContext';

export const useAutoApprovalSettings = (): [AutoApprovalSettings, (settings: AutoApprovalSettings) => void] => {
  const { state, dispatch } = useWebviewState();
  const settings = selectAutoApprovalSettings(state);
  
  const updateSettings = useCallback((newSettings: AutoApprovalSettings) => {
    dispatch(setAutoApprovalSettings(newSettings));
  }, [dispatch]);
  
  return [settings, updateSettings];
};

export const useBrowserSettings = (): [BrowserSettings, (settings: BrowserSettings) => void] => {
  const { state, dispatch } = useWebviewState();
  const settings = selectBrowserSettings(state);
  
  const updateSettings = useCallback((newSettings: BrowserSettings) => {
    dispatch(setBrowserSettings(newSettings));
  }, [dispatch]);
  
  return [settings, updateSettings];
};

export const useChatSettings = (): [ChatSettings, (settings: ChatSettings) => void] => {
  const { state, dispatch } = useWebviewState();
  const settings = selectChatSettings(state);
  
  const updateSettings = useCallback((newSettings: ChatSettings) => {
    dispatch(setChatSettings(newSettings));
  }, [dispatch]);
  
  return [settings, updateSettings];
};

export const useTelemetrySetting = (): [TelemetrySetting, (setting: TelemetrySetting) => void] => {
  const { state, dispatch } = useWebviewState();
  const setting = selectTelemetrySetting(state);
  
  const updateSetting = useCallback((newSetting: TelemetrySetting) => {
    dispatch(setTelemetrySetting(newSetting));
  }, [dispatch]);
  
  return [setting, updateSetting];
};

export const useCustomInstructions = (): string | undefined => {
  const { state } = useWebviewState();
  return selectCustomInstructions(state);
};
```

### UI Hook

```typescript
// webview-ui/src/state/hooks/useUi.ts
import { useCallback } from 'react';
import { McpMarketplaceCatalog, McpServer } from '../../../../src/shared/mcp';
import { setShowAnnouncement, setShowWelcome } from '../actions/uiActions';
import { selectFilePaths, selectMcpMarketplaceCatalog, selectMcpServers, selectOpenAiModels, selectOpenRouterModels, selectShouldShowAnnouncement, selectShowWelcome, selectTheme } from '../selectors/uiSelectors';
import { useWebviewState } from '../WebviewStateContext';

export const useShowWelcome = (): [boolean, (show: boolean) => void] => {
  const { state, dispatch } = useWebviewState();
  const showWelcome = selectShowWelcome(state);
  
  const setShowWelcomeAction = useCallback((show: boolean) => {
    dispatch(setShowWelcome(show));
  }, [dispatch]);
  
  return [showWelcome, setShowWelcomeAction];
};

export const useShowAnnouncement = (): [boolean, (show: boolean) => void] => {
  const { state, dispatch } = useWebviewState();
  const shouldShowAnnouncement = selectShouldShowAnnouncement(state);
  
  const setShowAnnouncementAction = useCallback((show: boolean) => {
    dispatch(setShowAnnouncement(show));
  }, [dispatch]);
  
  return [shouldShowAnnouncement, setShowAnnouncementAction];
};

export const useTheme = (): any => {
  const { state } = useWebviewState();
  return selectTheme(state);
};

export const useFilePaths = (): string[] => {
  const { state } = useWebviewState();
  return selectFilePaths(state);
};

export const useOpenRouterModels = (): Record<string, any> => {
  const { state } = useWebviewState();
  return selectOpenRouterModels(state);
};

export const useOpenAiModels = (): string[] => {
  const { state } = useWebviewState();
  return selectOpenAiModels(state);
};

export const useMcpServers = (): McpServer[] => {
  const { state } = useWebviewState();
  return selectMcpServers(state);
};

export const useMcpMarketplaceCatalog = (): McpMarketplaceCatalog => {
  const { state } = useWebviewState();
  return selectMcpMarketplaceCatalog(state);
};
```

## Integration with App Component

To integrate the new state management system with the existing React components, we'll update the `App.tsx` file to use the `WebviewStateProvider`.

```typescript
// webview-ui/src/App.tsx
import React from 'react';
import { WebviewStateProvider } from './state/WebviewStateContext';
import { MainView } from './components/MainView';

const App: React.FC = () => {
  return (
    <WebviewStateProvider>
      <MainView />
    </WebviewStateProvider>
  );
};

export default App;
```

## Migrating Components

Existing components that use the `ExtensionStateContext` will need to be migrated to use the new hooks. Here's an example of migrating a component:

### Before

```typescript
import React from 'react';
import { useExtensionState } from '../context/ExtensionStateContext';

export const ApiConfigurationForm: React.FC = () => {
  const { apiConfiguration, setApiConfiguration } = useExtensionState();
  
  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setApiConfiguration({
      ...apiConfiguration,
      apiProvider: e.target.value,
    });
  };
  
  return (
    <div>
      <select value={apiConfiguration?.apiProvider} onChange={handleProviderChange}>
        <option value="anthropic">Anthropic</option>
        <option value="openrouter">OpenRouter</option>
        {/* Other options */}
      </select>
      {/* Other form fields */}
    </div>
  );
};
```

### After

```typescript
import React from 'react';
import { useApiConfiguration } from '../state/hooks/useApiConfiguration';

export const ApiConfigurationForm: React.FC = () => {
  const [apiConfiguration, updateApiConfiguration] = useApiConfiguration();
  
  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateApiConfiguration({
      ...apiConfiguration,
      apiProvider: e.target.value,
    });
  };
  
  return (
    <div>
      <select value={apiConfiguration?.apiProvider} onChange={handleProviderChange}>
        <option value="anthropic">Anthropic</option>
        <option value="openrouter">OpenRouter</option>
        {/* Other options */}
      </select>
      {/* Other form fields */}
    </div>
  );
};
```

## Conclusion

This implementation provides a solid foundation for the webview state management system. It follows the architecture outlined in the State Architecture Design document and addresses the pain points identified in the State Management Audit.

The key benefits of this implementation include:

1. **Unidirectional Data Flow**: State changes follow a predictable path through actions and reducers.
2. **Type Safety**: All state transitions are strongly typed with explicit action types.
3. **Separation of Concerns**: State logic is organized by domain, making it easier to maintain.
4. **React Integration**: The state is seamlessly integrated with React components through context and hooks.
5. **Communication with Core Extension**: The implementation handles communication with the core extension through a well-defined message protocol.

The next steps in the implementation process would be:

1. Gradually migrate existing components to use the new state management system
2. Add developer tools for debugging and monitoring state changes
3. Implement error handling and recovery mechanisms
4. Add state versioning for backward compatibility
