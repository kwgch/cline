# Cline Technical Context

## Technologies Used

### Core Technologies

1. **TypeScript**
   - Primary language for both extension and webview
   - Provides type safety and modern JavaScript features
   - Used with strict type checking for reliability

2. **VSCode Extension API**
   - Integration with VSCode editor and services
   - Webview API for custom UI
   - Extension host lifecycle management
   - Global and workspace state persistence

3. **React**
   - Frontend framework for webview UI
   - Component-based architecture
   - Context API for state management
   - Hooks for functional component logic

4. **Node.js**
   - Runtime environment for extension code
   - File system operations
   - Process management for terminal commands
   - Network requests for API communication

### Build and Packaging

1. **esbuild**
   - Fast JavaScript/TypeScript bundler
   - Used for both development and production builds
   - Configured in esbuild.js

2. **vsce**
   - VS Code Extension Manager
   - Used for packaging and publishing the extension
   - Creates VSIX files for distribution

3. **npm**
   - Package management
   - Script running for build and development tasks
   - Dependency management

### Testing and Quality

1. **ESLint**
   - Static code analysis
   - Enforces coding standards
   - Configured in .eslintrc.json

2. **Prettier**
   - Code formatting
   - Ensures consistent style
   - Configured in .prettierrc.json

3. **VS Code Test API**
   - Extension testing framework
   - Integration tests for extension functionality

### External Integrations

1. **AI APIs**
   - OpenRouter, Anthropic, OpenAI, Google Gemini, etc.
   - API clients for different providers
   - Streaming response handling
   - Token tracking and management

2. **Puppeteer**
   - Browser automation
   - Headless Chrome control
   - Screenshot capture
   - Console log monitoring

3. **Git**
   - Version control
   - Checkpoint system for file changes
   - Diff generation and comparison

4. **Model Context Protocol (MCP)**
   - Framework for extending AI capabilities
   - Custom tool creation and management
   - Server-client communication

## Development Setup

### Environment Requirements

1. **Node.js and npm**
   - Required for development and building
   - Version specified in .nvmrc

2. **VS Code**
   - Primary development environment
   - Required for extension testing
   - Recommended extensions in .vscode/extensions.json

3. **Git**
   - Required for version control
   - git-lfs for large file storage

### Development Workflow

1. **Setup**
   ```bash
   git clone https://github.com/cline/cline.git
   cd cline
   npm run install:all  # Installs dependencies for both extension and webview
   ```

2. **Development**
   ```bash
   npm run watch  # Starts esbuild in watch mode
   # Press F5 in VS Code to launch extension in debug mode
   ```

3. **Building**
   ```bash
   npm run package  # Builds extension for production
   vsce package  # Creates VSIX file
   ```

4. **Testing**
   ```bash
   npm run test  # Runs all tests
   npm run test:webview  # Runs webview tests
   ```

5. **Versioning**
   ```bash
   npm run changeset  # Creates a changeset for version changes
   npm run version-packages  # Updates version based on changesets
   ```

## Technical Constraints

1. **VSCode Extension API Limitations**
   - Restricted access to certain VS Code APIs
   - Sandboxed webview environment
   - Limited UI customization options
   - Performance considerations for extension host

2. **AI Model Constraints**
   - Context window size limits
   - Token usage and cost considerations
   - Variation in capabilities between models
   - API rate limits and quotas

3. **Browser Automation Constraints**
   - Fixed browser window size (900x600)
   - Limited to one browser instance per task
   - Security restrictions on browser access
   - Performance impact of browser automation

4. **Cross-Platform Compatibility**
   - Must work on Windows, macOS, and Linux
   - File path handling differences
   - Terminal command variations
   - Environment-specific dependencies

## Dependencies

### Core Dependencies

1. **VSCode API**
   - `@types/vscode`: TypeScript definitions for VS Code API
   - Used for all VS Code integration points

2. **AI API Clients**
   - `@anthropic-ai/sdk`: Anthropic Claude API client
   - `openai`: OpenAI API client
   - `@google/generative-ai`: Google Gemini API client
   - Various other API clients for different providers

3. **UI Framework**
   - `react`: UI library for webview
   - `react-dom`: DOM rendering for React
   - `@vscode/codicons`: VS Code icons for UI

### Tool Dependencies

1. **File Operations**
   - `fs` (Node.js built-in): File system operations
   - `path` (Node.js built-in): Path manipulation
   - `globby`: Advanced file pattern matching

2. **Terminal Integration**
   - `execa`: Process execution
   - `strip-ansi`: Terminal output processing
   - `default-shell`: Shell detection

3. **Browser Automation**
   - `puppeteer-core`: Browser control library
   - `puppeteer-chromium-resolver`: Chrome executable management

4. **Project Analysis**
   - `web-tree-sitter`: Syntax tree parsing
   - `tree-sitter-wasms`: Language grammar definitions
   - `ignore`: .gitignore-style pattern matching

5. **MCP Integration**
   - `@modelcontextprotocol/sdk`: MCP SDK for server and client

### Development Dependencies

1. **Build Tools**
   - `esbuild`: JavaScript/TypeScript bundler
   - `typescript`: TypeScript compiler
   - `@vscode/vsce`: VS Code Extension Manager

2. **Testing Tools**
   - `@vscode/test-electron`: VS Code testing framework
   - `mocha`: Test runner
   - `chai`: Assertion library

3. **Code Quality**
   - `eslint`: Linting
   - `prettier`: Formatting
   - `husky`: Git hooks for quality checks

4. **Versioning**
   - `@changesets/cli`: Versioning and changelog management
