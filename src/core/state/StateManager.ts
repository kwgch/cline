import { Anthropic } from "@anthropic-ai/sdk"
import { ClineMessage, ClineApiReqInfo } from "../../shared/ExtensionMessage"
import { findLastIndex, findLast } from "../../shared/array"
import { TaskManager } from "../task/TaskManager"
import CheckpointTracker from "../../integrations/checkpoints/CheckpointTracker"

export interface StateManagerOptions {
	taskId: string
	providerRef: WeakRef<any>
	taskManager: TaskManager
}

export class StateManager {
	apiConversationHistory: Anthropic.MessageParam[] = []
	clineMessages: ClineMessage[] = []
	conversationHistoryDeletedRange?: [number, number]
	private lastMessageTs?: number
	private askResponse?: string
	private askResponseText?: string
	private askResponseImages?: string[]

	constructor(private options: StateManagerOptions) {}

	async initialize(): Promise<void> {
		this.clineMessages = await this.options.taskManager.getSavedClineMessages()
		this.apiConversationHistory = await this.options.taskManager.getSavedApiConversationHistory()
	}

	async addToApiConversationHistory(message: Anthropic.MessageParam): Promise<void> {
		this.apiConversationHistory.push(message)
		await this.options.taskManager.saveApiConversationHistory(this.apiConversationHistory)
	}

	async overwriteApiConversationHistory(newHistory: Anthropic.MessageParam[]): Promise<void> {
		this.apiConversationHistory = newHistory
		await this.options.taskManager.saveApiConversationHistory(this.apiConversationHistory)
	}

	async addToClineMessages(message: ClineMessage, checkpointTracker?: CheckpointTracker): Promise<void> {
		// these values allow us to reconstruct the conversation history at the time this cline message was created
		// it's important that apiConversationHistory is initialized before we add cline messages
		message.conversationHistoryIndex = this.apiConversationHistory.length - 1
		message.conversationHistoryDeletedRange = this.conversationHistoryDeletedRange
		this.clineMessages.push(message)
		await this.saveClineMessages(checkpointTracker)
	}

	async overwriteClineMessages(newMessages: ClineMessage[], checkpointTracker?: CheckpointTracker): Promise<void> {
		this.clineMessages = newMessages
		await this.saveClineMessages(checkpointTracker)
	}

	async saveClineMessages(checkpointTracker?: CheckpointTracker): Promise<void> {
		await this.options.taskManager.saveClineMessages(
			this.clineMessages,
			this.apiConversationHistory,
			this.options.taskId,
			this.conversationHistoryDeletedRange,
			checkpointTracker,
		)
	}

	async handleWebviewAskResponse(askResponse: string, text?: string, images?: string[]): Promise<void> {
		this.askResponse = askResponse
		this.askResponseText = text
		this.askResponseImages = images
	}

	getLastMessageTs(): number | undefined {
		return this.lastMessageTs
	}

	setLastMessageTs(ts: number): void {
		this.lastMessageTs = ts
	}

	getAskResponse(): { response: string; text?: string; images?: string[] } | undefined {
		if (!this.askResponse) return undefined

		const result = {
			response: this.askResponse,
			text: this.askResponseText,
			images: this.askResponseImages,
		}

		// Clear after retrieving
		this.askResponse = undefined
		this.askResponseText = undefined
		this.askResponseImages = undefined

		return result
	}

	updateApiReqMessage(
		lastApiReqIndex: number,
		inputTokens: number,
		outputTokens: number,
		cacheWriteTokens: number,
		cacheReadTokens: number,
		totalCost?: number,
		cancelReason?: string,
		streamingFailedMessage?: string,
	): void {
		if (lastApiReqIndex >= 0 && lastApiReqIndex < this.clineMessages.length) {
			const message = this.clineMessages[lastApiReqIndex]
			if (message && message.text) {
				try {
					const currentInfo = JSON.parse(message.text) as ClineApiReqInfo
					message.text = JSON.stringify({
						...currentInfo,
						tokensIn: inputTokens,
						tokensOut: outputTokens,
						cacheWrites: cacheWriteTokens,
						cacheReads: cacheReadTokens,
						cost: totalCost,
						cancelReason,
						streamingFailedMessage,
					} as ClineApiReqInfo)
				} catch (error) {
					console.error("Failed to update API request message:", error)
				}
			}
		}
	}

	findLastCheckpointMessage(): ClineMessage | undefined {
		return findLast(this.clineMessages, (m) => m.say === "checkpoint_created")
	}

	updateCheckpointMessages(commitHash?: string): void {
		// Set isCheckpointCheckedOut to false for all checkpoint_created messages
		this.clineMessages.forEach((message) => {
			if (message.say === "checkpoint_created") {
				message.isCheckpointCheckedOut = false
			}
		})

		if (commitHash) {
			const lastCheckpointMessage = this.findLastCheckpointMessage()
			if (lastCheckpointMessage) {
				lastCheckpointMessage.lastCheckpointHash = commitHash
			}
		}
	}

	updateCompletionResultCheckpoint(commitHash: string): void {
		const lastCompletionResultMessage = findLast(
			this.clineMessages,
			(m) => m.say === "completion_result" || m.ask === "completion_result",
		)

		if (lastCompletionResultMessage) {
			lastCompletionResultMessage.lastCheckpointHash = commitHash
		}
	}
}
