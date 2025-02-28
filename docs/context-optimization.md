# Context Optimization in Cline

This document explains the context optimization strategies implemented in Cline to reduce token usage when making LLM API requests.

## Overview

Large Language Models (LLMs) have a limited context window size, which can be a constraint when working with large projects or long conversations. Cline implements several optimization strategies to reduce the size of the context sent to the LLM API, allowing for more efficient token usage and longer conversations.

## Optimization Strategies

### 1. Smart Conversation History Truncation

Instead of simply removing the oldest messages when the context window gets too large, Cline uses a smart truncation approach that scores messages based on their relevance to the current task.

#### Message Scoring

Messages are scored based on:

- **Recency**: More recent messages are given higher scores
- **Content Type**: Messages containing important content like tool usage, file content, error messages, and task definitions are given higher scores
- **User Feedback**: Messages containing user feedback are prioritized

#### Truncation Process

1. The first message (task definition) is always preserved
2. The last few messages are always preserved to maintain conversation flow
3. Messages with important content are preserved
4. Less relevant messages are removed based on their scores
5. A summary message is added to indicate that messages were removed

### 2. Hierarchical File Structure Representation

Instead of sending a flat list of all files in the project, Cline uses a hierarchical tree representation that significantly reduces the token count while still providing a clear overview of the project structure.

#### Features

- **Depth Limiting**: Only shows directories up to a configurable maximum depth
- **File Count Limiting**: Only shows a configurable maximum number of files per directory
- **Visual Representation**: Uses indentation and icons to represent the file hierarchy
- **Summary Information**: Provides counts of hidden files and directories

### 3. Environment Details Optimization

Environment details (file listings, open tabs, terminal output, etc.) can consume a significant portion of the context window. Cline optimizes these details in several ways:

- **Selective Inclusion**: Only includes environment details in the first API request by default
- **File Details Control**: Can be configured to include file details only in the first request
- **Terminal Output Truncation**: Limits the number of terminal lines included
- **Inactive Terminals**: Can be configured to exclude inactive terminals

### 4. System Prompt Optimization

The system prompt provides instructions to the LLM but can be quite large. Cline optimizes it by:

- **Selective Section Inclusion**: Only includes essential sections (TOOL USE, RULES, OBJECTIVE) in non-first requests
- **Custom Instructions**: Only includes custom instructions in the first request

### 5. Selective Context Inclusion

For very long conversations, Cline can selectively include only the most relevant messages:

- **Important Content Detection**: Messages with task definitions, critical tool results, or error messages are always included
- **Position-Based Selection**: More recent messages are more likely to be included
- **Summary Addition**: A summary message is added to indicate that messages were removed

## Configuration

Context optimization can be configured through the `ContextOptimizationSettings` interface:

```typescript
interface ContextOptimizationSettings {
  // Whether context optimization is enabled
  enabled: boolean;

  // Whether to use smart truncation for conversation history
  useSmartTruncation: boolean;

  // Maximum number of files to include in environment details
  maxFiles: number;

  // Maximum number of terminal lines to include per terminal
  maxTerminalLines: number;

  // Whether to include inactive terminals in environment details
  includeInactiveTerminals: boolean;

  // Whether to include file details in the first API request only
  includeFileDetailsInFirstRequestOnly: boolean;

  // Whether to include diagnostics (errors and warnings) in environment details
  includeDiagnostics: boolean;

  // Whether to use hierarchical file structure representation
  useHierarchicalFileStructure: boolean;

  // Maximum depth for hierarchical file structure
  maxFileStructureDepth: number;

  // Maximum files per directory for hierarchical file structure
  maxFilesPerDirectory: number;

  // Whether to include environment details in every API request
  includeEnvironmentDetailsInEveryRequest: boolean;
}
```

### Default Settings

The default settings are:

```typescript
const DEFAULT_CONTEXT_OPTIMIZATION_SETTINGS: ContextOptimizationSettings = {
  enabled: true,
  useSmartTruncation: true,
  maxFiles: 100,
  maxTerminalLines: 50,
  includeInactiveTerminals: false,
  includeFileDetailsInFirstRequestOnly: true,
  includeDiagnostics: true,
  useHierarchicalFileStructure: true,
  maxFileStructureDepth: 4,
  maxFilesPerDirectory: 5,
  includeEnvironmentDetailsInEveryRequest: false
};
```

## Implementation Details

The context optimization is implemented in several files:

- `src/shared/ContextOptimizationSettings.ts`: Defines the settings interface and default values
- `src/core/sliding-window/smart-truncation.ts`: Implements smart truncation of conversation history
- `src/core/environment/hierarchical-file-structure.ts`: Implements hierarchical file structure representation
- `src/core/environment/optimized-details.ts`: Implements environment details optimization
- `src/core/api/context-optimization.ts`: Implements the overall context optimization strategy
- `src/core/api/ApiManager.ts`: Integrates context optimization into the API request flow

## Benefits

The context optimization strategies provide several benefits:

- **Reduced Token Usage**: Significantly reduces the number of tokens sent to the LLM API
- **Longer Conversations**: Allows for longer conversations without hitting context limits
- **Improved Response Time**: Smaller context sizes lead to faster API responses
- **Cost Reduction**: Fewer tokens means lower API costs
- **Better Context Management**: More relevant context is preserved, improving the quality of responses

## Future Improvements

Potential future improvements to context optimization include:

- **Semantic Deduplication**: Identify and remove semantically similar content
- **Conversation Summarization**: Generate summaries of removed conversation parts
- **Dynamic Optimization**: Adjust optimization parameters based on context size and task requirements
- **Content Compression**: Use techniques like entity references to compress repetitive content
- **Relevance-Based File Selection**: Only include files relevant to the current task
