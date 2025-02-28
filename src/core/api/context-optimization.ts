import { Anthropic } from "@anthropic-ai/sdk"
import { ContextOptimizationSettings } from "../../shared/ContextOptimizationSettings"
import { smartTruncateMessages, containsImportantContent } from "../sliding-window/smart-truncation"

/**
 * Optimizes the conversation history to reduce token usage
 *
 * @param messages The full conversation history
 * @param settings Context optimization settings
 * @returns Optimized conversation history
 */
export function optimizeConversationHistory(
	messages: Anthropic.Messages.MessageParam[],
	settings: ContextOptimizationSettings,
): Anthropic.Messages.MessageParam[] {
	if (!settings.enabled) {
		return messages
	}

	// Use smart truncation if enabled
	if (settings.useSmartTruncation) {
		return smartTruncateMessages(messages, 0.5)
	}

	// Otherwise use default sliding window approach
	return messages
}

/**
 * Optimizes environment details based on settings and request context
 *
 * @param environmentDetails The original environment details
 * @param settings Context optimization settings
 * @param isFirstRequest Whether this is the first API request in the conversation
 * @returns Optimized environment details or empty string if details should be omitted
 */
export function optimizeEnvironmentDetails(
	environmentDetails: string,
	settings: ContextOptimizationSettings,
	isFirstRequest: boolean,
): string {
	if (!settings.enabled) {
		return environmentDetails
	}

	// Skip environment details for non-first requests if configured
	if (!isFirstRequest && !settings.includeEnvironmentDetailsInEveryRequest) {
		return ""
	}

	// Skip file details for non-first requests if configured
	if (!isFirstRequest && settings.includeFileDetailsInFirstRequestOnly) {
		// Remove the file details section
		const fileDetailsSectionRegex = /# Current Working Directory \([^)]+\) Files\n[\s\S]*?(?=\n\n# |$)/
		return environmentDetails.replace(fileDetailsSectionRegex, "")
	}

	return environmentDetails
}

/**
 * Optimizes system prompt to reduce token usage
 *
 * @param systemPrompt The original system prompt
 * @param settings Context optimization settings
 * @param isFirstRequest Whether this is the first API request in the conversation
 * @returns Optimized system prompt
 */
export function optimizeSystemPrompt(
	systemPrompt: string,
	settings: ContextOptimizationSettings,
	isFirstRequest: boolean,
): string {
	if (!settings.enabled) {
		return systemPrompt
	}

	// For non-first requests, we can use a shorter system prompt
	if (!isFirstRequest) {
		// Keep only the essential parts of the system prompt
		const essentialSections = ["TOOL USE", "RULES", "OBJECTIVE"]

		const sections = systemPrompt.split(/====\n\n/)
		const filteredSections = sections.filter((section) => {
			const sectionTitle = section.split("\n")[0]
			return essentialSections.some((essential) => sectionTitle.includes(essential))
		})

		return filteredSections.join("====\n\n")
	}

	return systemPrompt
}

/**
 * Determines if a message should be included in the context
 *
 * @param message The message to check
 * @param index The index of the message in the conversation history
 * @param totalMessages The total number of messages in the conversation history
 * @returns True if the message should be included
 */
export function shouldIncludeMessage(message: Anthropic.Messages.MessageParam, index: number, totalMessages: number): boolean {
	// Always include the first message (task)
	if (index === 0) {
		return true
	}

	// Always include the last few messages
	if (index >= totalMessages - 4) {
		return true
	}

	// Always include messages with important content
	if (containsImportantContent(message)) {
		return true
	}

	// Include other messages based on their position
	// This is a simple heuristic that keeps more recent messages
	const keepPercentage = 0.7 // Keep 70% of messages
	const normalizedPosition = index / totalMessages
	return normalizedPosition >= 1 - keepPercentage
}

/**
 * Applies selective context inclusion to reduce token usage
 *
 * @param messages The full conversation history
 * @returns Filtered conversation history
 */
export function applySelectiveContextInclusion(messages: Anthropic.Messages.MessageParam[]): Anthropic.Messages.MessageParam[] {
	// If we have 6 or fewer messages, don't filter
	if (messages.length <= 6) {
		return messages
	}

	// Filter messages based on importance and position
	const filteredMessages = messages.filter((message, index) => shouldIncludeMessage(message, index, messages.length))

	// Add a summary message if we removed any messages
	if (filteredMessages.length < messages.length) {
		// Find the position to insert the summary (after the first message)
		const summaryPosition = 1

		// Create a summary message
		const summaryMessage: Anthropic.Messages.MessageParam = {
			role: "assistant",
			content: [
				{
					type: "text",
					text: `[CONTEXT SUMMARY: ${messages.length - filteredMessages.length} messages were removed to optimize context window usage. The conversation continues with the most relevant messages.]`,
				},
			],
		}

		// Insert the summary message
		filteredMessages.splice(summaryPosition, 0, summaryMessage)
	}

	return filteredMessages
}

/**
 * Applies all context optimization strategies
 *
 * @param messages The full conversation history
 * @param systemPrompt The system prompt
 * @param environmentDetails The environment details
 * @param settings Context optimization settings
 * @param isFirstRequest Whether this is the first API request in the conversation
 * @returns Optimized context components
 */
export function optimizeContext(
	messages: Anthropic.Messages.MessageParam[],
	systemPrompt: string,
	environmentDetails: string,
	settings: ContextOptimizationSettings,
	isFirstRequest: boolean,
): {
	messages: Anthropic.Messages.MessageParam[]
	systemPrompt: string
	environmentDetails: string
} {
	if (!settings.enabled) {
		return { messages, systemPrompt, environmentDetails }
	}

	// Apply conversation history optimization
	const optimizedMessages = optimizeConversationHistory(messages, settings)

	// Apply system prompt optimization
	const optimizedSystemPrompt = optimizeSystemPrompt(systemPrompt, settings, isFirstRequest)

	// Apply environment details optimization
	const optimizedEnvironmentDetails = optimizeEnvironmentDetails(environmentDetails, settings, isFirstRequest)

	return {
		messages: optimizedMessages,
		systemPrompt: optimizedSystemPrompt,
		environmentDetails: optimizedEnvironmentDetails,
	}
}
