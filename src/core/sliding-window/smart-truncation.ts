import { Anthropic } from "@anthropic-ai/sdk"

/**
 * Scores a message based on its relevance to the current task.
 * Higher scores indicate higher relevance.
 *
 * @param message The message to score
 * @param index The index of the message in the conversation history
 * @param totalMessages The total number of messages in the conversation history
 * @returns A score between 0 and 1
 */
export function scoreMessageRelevance(message: Anthropic.Messages.MessageParam, index: number, totalMessages: number): number {
	// Base score - more recent messages are more relevant
	// Use a non-linear recency function to prioritize very recent messages
	const recencyScore = Math.pow(index / totalMessages, 1.5)

	// Initialize content score
	let contentScore = 0

	// Check for tool use/results which are typically more important
	if (Array.isArray(message.content)) {
		// Check for tool use blocks
		const hasToolUse = message.content.some(
			(block) => block.type === "tool_use" || (block.type === "text" && block.text.includes("<tool_use>")),
		)

		// Check for tool results
		const hasToolResult = message.content.some(
			(block) =>
				block.type === "tool_result" ||
				(block.type === "text" && block.text.includes("[") && block.text.includes("Result]")),
		)

		// Tool use and results are important context
		if (hasToolUse) {
			contentScore += 0.3
		}
		if (hasToolResult) {
			contentScore += 0.3
		}

		// Check for file content which is important
		const hasFileContent = message.content.some(
			(block) =>
				block.type === "text" && (block.text.includes("<file_content") || block.text.includes("<final_file_content")),
		)

		if (hasFileContent) {
			contentScore += 0.2
		}

		// Check for error messages which are important
		const hasError = message.content.some(
			(block) => block.type === "text" && block.text.includes("Error") && block.text.includes(":"),
		)

		if (hasError) {
			contentScore += 0.25
		}

		// Check for task-related content
		const hasTaskContent = message.content.some(
			(block) => block.type === "text" && (block.text.includes("<task>") || block.text.includes("</task>")),
		)

		if (hasTaskContent) {
			contentScore += 0.4
		}

		// Check for user feedback which is important
		const hasUserFeedback = message.content.some((block) => block.type === "text" && block.text.includes("<feedback>"))

		if (hasUserFeedback) {
			contentScore += 0.3
		}
	}

	// Combine scores - recency is the primary factor, content is secondary
	return 0.6 * recencyScore + 0.4 * contentScore
}

/**
 * Identifies the optimal messages to remove based on relevance scoring.
 *
 * @param messages The full conversation history
 * @param targetReduction The approximate percentage of tokens to remove (0.5 = 50%)
 * @returns An array of indices to remove
 */
export function identifyMessagesToRemove(messages: Anthropic.Messages.MessageParam[], targetReduction: number = 0.5): number[] {
	// Always keep the first message (task message) and the last two message pairs
	const messagesToConsider = messages.slice(1, -4)

	if (messagesToConsider.length <= 2) {
		return [] // Not enough messages to remove
	}

	// Score each message
	const scoredMessages = messagesToConsider.map((message, idx) => ({
		index: idx + 1, // +1 because we're skipping the first message
		score: scoreMessageRelevance(message, idx + 1, messages.length),
		message,
	}))

	// Sort by score (ascending - lowest scores first)
	scoredMessages.sort((a, b) => a.score - b.score)

	// Determine how many messages to remove
	const removeCount = Math.floor(messagesToConsider.length * targetReduction)

	// Get indices to remove (lowest scoring messages)
	const indicesToRemove = scoredMessages
		.slice(0, removeCount)
		.map((item) => item.index)
		.sort((a, b) => a - b) // Sort numerically to maintain order

	return indicesToRemove
}

/**
 * Creates a truncated version of the conversation history by removing
 * less relevant messages based on smart scoring.
 *
 * @param messages The full conversation history
 * @param targetReduction The approximate percentage of tokens to remove (0.5 = 50%)
 * @returns A new array with less relevant messages removed
 */
export function smartTruncateMessages(
	messages: Anthropic.Messages.MessageParam[],
	targetReduction: number = 0.5,
): Anthropic.Messages.MessageParam[] {
	// If we have 6 or fewer messages, don't truncate
	if (messages.length <= 6) {
		return messages
	}

	// Get indices to remove
	const indicesToRemove = identifyMessagesToRemove(messages, targetReduction)

	if (indicesToRemove.length === 0) {
		return messages
	}

	// Create a new array without the removed messages
	const truncatedMessages = messages.filter((_, index) => index === 0 || !indicesToRemove.includes(index))

	// Add a summary message if we removed any messages
	if (indicesToRemove.length > 0) {
		// Find the position to insert the summary (after the first message)
		const summaryPosition = 1

		// Create a summary message
		const summaryMessage: Anthropic.Messages.MessageParam = {
			role: "assistant",
			content: [
				{
					type: "text",
					text: `[CONTEXT SUMMARY: ${indicesToRemove.length} less relevant messages were removed to optimize context window usage. The removed messages contained tool usage and results that are no longer relevant to the current task.]`,
				},
			],
		}

		// Insert the summary message
		truncatedMessages.splice(summaryPosition, 0, summaryMessage)
	}

	return truncatedMessages
}

/**
 * Determines if a message contains important content that should not be removed
 *
 * @param message The message to check
 * @returns True if the message contains important content
 */
export function containsImportantContent(message: Anthropic.Messages.MessageParam): boolean {
	if (!Array.isArray(message.content)) {
		return false
	}

	// Check for task definition
	const hasTaskDefinition = message.content.some(
		(block) => block.type === "text" && "text" in block && block.text.includes("<task>"),
	)

	// Check for critical tool results
	const hasCriticalToolResult = message.content.some((block) => {
		if (block.type !== "tool_result" || !("content" in block)) {
			return false
		}

		const content = typeof block.content === "string" ? block.content : ""
		return (
			content.includes("successfully created") ||
			content.includes("successfully updated") ||
			content.includes("successfully installed")
		)
	})

	// Check for error messages
	const hasErrorMessage = message.content.some(
		(block) =>
			block.type === "text" &&
			"text" in block &&
			block.text.includes("Error:") &&
			!block.text.includes("This error is not critical"),
	)

	return hasTaskDefinition || hasCriticalToolResult || hasErrorMessage
}
