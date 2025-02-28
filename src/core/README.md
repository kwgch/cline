# Cline Core Refactoring

This directory contains the refactored version of the Cline core module. The original monolithic `Cline.ts` file has been split into several smaller, more focused modules to improve maintainability and testability.

## Directory Structure

```
src/core/
├── api/              # API communication
│   └── ApiManager.ts # Handles API requests, streaming, token management
├── task/             # Task management
│   └── TaskManager.ts # Handles task lifecycle, resumption
├── state/            # State management
│   └── StateManager.ts # Manages conversation history, messages, persistence
├── tools/            # Tool execution
│   └── ToolManager.ts # Handles various tools like file operations, commands
├── ui/               # UI communication
│   └── UIManager.ts  # Handles sending/receiving messages to/from the webview
├── checkpoint/       # Checkpoint management
│   └── CheckpointManager.ts # Handles checkpoints, diffs, and workspace state
└── Cline.ts          # Main orchestrator that uses all the modules
```

## Refactoring Approach

The refactoring follows these principles:

1. **Single Responsibility Principle**: Each module has a clear, focused responsibility.
2. **Dependency Injection**: Modules receive their dependencies through constructors.
3. **Interface-Based Design**: Modules communicate through well-defined interfaces.
4. **Reduced Coupling**: Modules have minimal knowledge of each other's internals.

## Module Responsibilities

### ApiManager

Handles all communication with the AI API, including:
- Token management
- Context window optimization
- Streaming responses
- Error handling and retries

### TaskManager

Manages the task lifecycle:
- Task initialization
- Task resumption
- Task history persistence
- Task directory management

### StateManager

Manages the state of the conversation:
- Conversation history
- UI messages
- State persistence
- State synchronization

### ToolManager

Handles tool execution:
- Command execution
- File operations
- Browser automation
- MCP server communication

### UIManager

Manages communication with the webview:
- Message streaming
- User interaction
- Content presentation
- Partial message handling

### CheckpointManager

Handles workspace checkpoints:
- Creating checkpoints
- Restoring checkpoints
- Presenting diffs
- Tracking changes

### Cline

The main orchestrator that:
- Initializes all managers
- Coordinates the task execution flow
- Handles high-level error management
- Provides a simplified interface to the rest of the extension

## Migration Plan

To migrate to this new architecture:

1. Review and test each module individually
2. Implement any missing functionality
3. Replace the original `Cline.ts` with the new version
4. Update any direct dependencies on the original Cline class

## Benefits

This refactoring provides several benefits:

- **Improved Maintainability**: Smaller, focused modules are easier to understand and modify
- **Better Testability**: Modules can be tested in isolation
- **Easier Collaboration**: Team members can work on different modules simultaneously
- **Clearer Code Organization**: Functionality is grouped logically
- **Reduced Cognitive Load**: Developers can focus on one aspect at a time
