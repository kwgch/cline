/**
 * Settings for context optimization to reduce token usage
 */
export interface ContextOptimizationSettings {
	/**
	 * Whether context optimization is enabled
	 */
	enabled: boolean

	/**
	 * Whether to use smart truncation for conversation history
	 * instead of the default sliding window approach
	 */
	useSmartTruncation: boolean

	/**
	 * Maximum number of files to include in environment details
	 */
	maxFiles: number

	/**
	 * Maximum number of terminal lines to include per terminal
	 */
	maxTerminalLines: number

	/**
	 * Whether to include inactive terminals in environment details
	 */
	includeInactiveTerminals: boolean

	/**
	 * Whether to include file details in the first API request only
	 * This can significantly reduce token usage in subsequent requests
	 */
	includeFileDetailsInFirstRequestOnly: boolean

	/**
	 * Whether to include diagnostics (errors and warnings) in environment details
	 */
	includeDiagnostics: boolean

	/**
	 * Whether to use hierarchical file structure representation
	 * This can significantly reduce token usage for large projects
	 */
	useHierarchicalFileStructure: boolean

	/**
	 * Maximum depth for hierarchical file structure
	 * Higher values show more nested directories but use more tokens
	 */
	maxFileStructureDepth: number

	/**
	 * Maximum files per directory for hierarchical file structure
	 * Higher values show more files but use more tokens
	 */
	maxFilesPerDirectory: number

	/**
	 * Whether to include environment details in every API request
	 * Setting to false will only include them in the first request
	 */
	includeEnvironmentDetailsInEveryRequest: boolean
}

/**
 * Default settings for context optimization
 */
export const DEFAULT_CONTEXT_OPTIMIZATION_SETTINGS: ContextOptimizationSettings = {
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
	includeEnvironmentDetailsInEveryRequest: false,
}
