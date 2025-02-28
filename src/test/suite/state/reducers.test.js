const assert = require('assert');
const { apiConfigReducer } = require('../../../core/state/reducers/apiConfigReducer');
const { taskReducer } = require('../../../core/state/reducers/taskReducer');
const { messageReducer } = require('../../../core/state/reducers/messageReducer');
const { settingsReducer } = require('../../../core/state/reducers/settingsReducer');
const { userReducer } = require('../../../core/state/reducers/userReducer');
const { ActionType } = require('../../../core/state/actions/types');

suite('Reducers Test Suite', () => {
  // API Config Reducer Tests
  suite('apiConfigReducer', () => {
    test('should return initial state', () => {
      const initialState = {};
      const action = { type: 'UNKNOWN_ACTION' };
      const newState = apiConfigReducer(initialState, action);
      
      assert.deepStrictEqual(newState, initialState);
    });
    
    test('should handle UPDATE_API_CONFIGURATION', () => {
      const initialState = {};
      const payload = { apiProvider: 'test-provider', apiModelId: 'test-model' };
      const action = { type: ActionType.UPDATE_API_CONFIGURATION, payload };
      const newState = apiConfigReducer(initialState, action);
      
      assert.deepStrictEqual(newState, payload);
    });
    
    test('should handle SET_API_PROVIDER', () => {
      const initialState = { apiModelId: 'test-model' };
      const payload = 'new-provider';
      const action = { type: ActionType.SET_API_PROVIDER, payload };
      const newState = apiConfigReducer(initialState, action);
      
      assert.deepStrictEqual(newState, { ...initialState, apiProvider: payload });
    });
    
    test('should handle SET_API_MODEL_ID', () => {
      const initialState = { apiProvider: 'test-provider' };
      const payload = 'new-model';
      const action = { type: ActionType.SET_API_MODEL_ID, payload };
      const newState = apiConfigReducer(initialState, action);
      
      assert.deepStrictEqual(newState, { ...initialState, apiModelId: payload });
    });
    
    test('should handle SET_API_KEY', () => {
      const initialState = { apiProvider: 'test-provider' };
      const payload = 'api-key';
      const action = { type: ActionType.SET_API_KEY, payload };
      const newState = apiConfigReducer(initialState, action);
      
      assert.deepStrictEqual(newState, { ...initialState, apiKey: payload });
    });
  });
  
  // Task Reducer Tests
  suite('taskReducer', () => {
    test('should return initial state', () => {
      const initialState = [];
      const action = { type: 'UNKNOWN_ACTION' };
      const newState = taskReducer(initialState, undefined, action);
      
      assert.deepStrictEqual(newState, initialState);
    });
    
    test('should handle ADD_TASK_TO_HISTORY', () => {
      const initialState = [];
      const payload = { id: 'task-1', task: 'Test Task' };
      const action = { type: ActionType.ADD_TASK_TO_HISTORY, payload };
      const newState = taskReducer(initialState, undefined, action);
      
      assert.deepStrictEqual(newState, [payload]);
    });
    
    test('should handle UPDATE_TASK_IN_HISTORY', () => {
      const initialState = [
        { id: 'task-1', task: 'Test Task' },
        { id: 'task-2', task: 'Another Task' }
      ];
      const payload = { id: 'task-1', task: 'Updated Task' };
      const action = { type: ActionType.UPDATE_TASK_IN_HISTORY, payload };
      const newState = taskReducer(initialState, undefined, action);
      
      assert.deepStrictEqual(newState, [
        payload,
        { id: 'task-2', task: 'Another Task' }
      ]);
    });
    
    test('should handle DELETE_TASK_FROM_HISTORY', () => {
      const initialState = [
        { id: 'task-1', task: 'Test Task' },
        { id: 'task-2', task: 'Another Task' }
      ];
      const payload = 'task-1';
      const action = { type: ActionType.DELETE_TASK_FROM_HISTORY, payload };
      const newState = taskReducer(initialState, undefined, action);
      
      assert.deepStrictEqual(newState, [
        { id: 'task-2', task: 'Another Task' }
      ]);
    });
    
    test('currentTaskId should handle SET_CURRENT_TASK', () => {
      const initialState = undefined;
      const payload = 'task-1';
      const action = { type: ActionType.SET_CURRENT_TASK, payload };
      const newState = taskReducer.currentTaskId(initialState, action);
      
      assert.strictEqual(newState, payload);
    });
    
    test('currentTaskId should handle CLEAR_CURRENT_TASK', () => {
      const initialState = 'task-1';
      const action = { type: ActionType.CLEAR_CURRENT_TASK };
      const newState = taskReducer.currentTaskId(initialState, action);
      
      assert.strictEqual(newState, undefined);
    });
  });
  
  // Message Reducer Tests
  suite('messageReducer', () => {
    test('should return initial state', () => {
      const initialState = [];
      const action = { type: 'UNKNOWN_ACTION' };
      const newState = messageReducer(initialState, action);
      
      assert.deepStrictEqual(newState, initialState);
    });
    
    test('should handle ADD_MESSAGE', () => {
      const initialState = [];
      const payload = { ts: 123, text: 'Test Message' };
      const action = { type: ActionType.ADD_MESSAGE, payload };
      const newState = messageReducer(initialState, action);
      
      assert.deepStrictEqual(newState, [payload]);
    });
    
    test('should handle UPDATE_PARTIAL_MESSAGE', () => {
      const initialState = [
        { ts: 123, text: 'Test Message' },
        { ts: 456, text: 'Another Message' }
      ];
      const payload = { ts: 123, text: 'Updated Message' };
      const action = { type: ActionType.UPDATE_PARTIAL_MESSAGE, payload };
      const newState = messageReducer(initialState, action);
      
      assert.deepStrictEqual(newState, [
        payload,
        { ts: 456, text: 'Another Message' }
      ]);
    });
    
    test('should handle CLEAR_MESSAGES', () => {
      const initialState = [
        { ts: 123, text: 'Test Message' },
        { ts: 456, text: 'Another Message' }
      ];
      const action = { type: ActionType.CLEAR_MESSAGES };
      const newState = messageReducer(initialState, action);
      
      assert.deepStrictEqual(newState, []);
    });
  });
  
  // Settings Reducer Tests
  suite('settingsReducer', () => {
    test('autoApproval should return initial state', () => {
      const initialState = { autoApprove: [] };
      const action = { type: 'UNKNOWN_ACTION' };
      const newState = settingsReducer.autoApproval(initialState, action);
      
      assert.deepStrictEqual(newState, initialState);
    });
    
    test('autoApproval should handle UPDATE_AUTO_APPROVAL_SETTINGS', () => {
      const initialState = { autoApprove: [] };
      const payload = { autoApprove: ['tool1', 'tool2'] };
      const action = { type: ActionType.UPDATE_AUTO_APPROVAL_SETTINGS, payload };
      const newState = settingsReducer.autoApproval(initialState, action);
      
      assert.deepStrictEqual(newState, payload);
    });
    
    test('browser should handle UPDATE_BROWSER_SETTINGS', () => {
      const initialState = { showBrowser: false };
      const payload = { showBrowser: true };
      const action = { type: ActionType.UPDATE_BROWSER_SETTINGS, payload };
      const newState = settingsReducer.browser(initialState, action);
      
      assert.deepStrictEqual(newState, payload);
    });
    
    test('chat should handle UPDATE_CHAT_SETTINGS', () => {
      const initialState = { showTimestamps: false };
      const payload = { showTimestamps: true };
      const action = { type: ActionType.UPDATE_CHAT_SETTINGS, payload };
      const newState = settingsReducer.chat(initialState, action);
      
      assert.deepStrictEqual(newState, payload);
    });
    
    test('telemetry should handle SET_TELEMETRY_SETTING', () => {
      const initialState = 'unset';
      const payload = 'enabled';
      const action = { type: ActionType.SET_TELEMETRY_SETTING, payload };
      const newState = settingsReducer.telemetry(initialState, action);
      
      assert.strictEqual(newState, payload);
    });
  });
  
  // User Reducer Tests
  suite('userReducer', () => {
    test('should return initial state', () => {
      const initialState = undefined;
      const action = { type: 'UNKNOWN_ACTION' };
      const newState = userReducer(initialState, action);
      
      assert.strictEqual(newState, initialState);
    });
    
    test('should handle SET_USER_INFO', () => {
      const initialState = undefined;
      const payload = { displayName: 'Test User', email: 'test@example.com', photoURL: 'https://example.com/photo.jpg' };
      const action = { type: ActionType.SET_USER_INFO, payload };
      const newState = userReducer(initialState, action);
      
      assert.deepStrictEqual(newState, payload);
    });
    
    test('should handle CLEAR_USER_INFO', () => {
      const initialState = { displayName: 'Test User', email: 'test@example.com', photoURL: 'https://example.com/photo.jpg' };
      const action = { type: ActionType.CLEAR_USER_INFO };
      const newState = userReducer(initialState, action);
      
      assert.strictEqual(newState, undefined);
    });
  });
});
