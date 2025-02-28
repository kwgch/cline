import { Anthropic } from "@anthropic-ai/sdk"
import * as path from "path"
import * as fs from "fs/promises"
import { fileExistsAtPath } from "../../utils/fs"
import { findLast, findLastIndex } from "../../shared/array"
import { formatResponse } from "../prompts/responses"
import { GlobalFileNames } from "../webview/ClineProvider"
import { HistoryItem } from "../../shared/HistoryItem"
import { ClineMessage } from "../../shared/ExtensionMessage"
import { getApiMetrics } from "../../shared/getApiMetrics"
import { combineApiRequests } from "../../shared/combineApiRequests"
import { combineCommandSequences } from "../../shared/combineCommandSequences"
import getFolderSize from "get-folder-size"

export type UserContent = Array<
	Anthropic.TextBlockParam | Anthropic.ImageBlockParam | Anthropic.ToolUseBlockParam | Anthropic.ToolResultBlockParam
>

export interface TaskManagerOptions {
	taskId: string
	globalStoragePath: string
	providerRef: WeakRef<any>
}

export class TaskManager {
	constructor(private options: TaskManagerOptions) {}

	async ensureTaskDirectoryExists(): Promise<string> {
		const globalStoragePath = this.options.globalStoragePath
		if (!globalStoragePath) {
			throw new Error("Global storage uri is invalid")
		}
		const taskDir = path.join(globalStoragePath, "tasks", this.options.taskId)
		await fs.mkdir(taskDir, { recursive: true })
		return taskDir
	}

	async getSavedApiConversationHistory(): Promise<Anthropic.MessageParam[]> {
		const filePath = path.join(await this.ensureTaskDirectoryExists(), GlobalFileNames.apiConversationHistory)
		const fileExists = await fileExistsAtPath(filePath)
		if (fileExists) {
			return JSON.parse(await fs.readFile(filePath, "utf8"))
		}
		return []
	}

	async saveApiConversationHistory(apiConversationHistory: Anthropic.MessageParam[]): Promise<void> {
		try {
			const filePath = path.join(await this.ensureTaskDirectoryExists(), GlobalFileNames.apiConversationHistory)
			await fs.writeFile(filePath, JSON.stringify(apiConversationHistory))
		} catch (error) {
			// in the off chance this fails, we don't want to stop the task
			console.error("Failed to save API conversation history:", error)
		}
	}

	async getSavedClineMessages(): Promise<ClineMessage[]> {
		const filePath = path.join(await this.ensureTaskDirectoryExists(), GlobalFileNames.uiMessages)
		if (await fileExistsAtPath(filePath)) {
			return JSON.parse(await fs.readFile(filePath, "utf8"))
		} else {
			// check old location
			const oldPath = path.join(await this.ensureTaskDirectoryExists(), "claude_messages.json")
			if (await fileExistsAtPath(oldPath)) {
				const data = JSON.parse(await fs.readFile(oldPath, "utf8"))
				await fs.unlink(oldPath) // remove old file
				return data
			}
		}
		return []
	}

	async saveClineMessages(
		clineMessages: ClineMessage[],
		apiConversationHistory: Anthropic.MessageParam[],
		taskId: string,
		conversationHistoryDeletedRange?: [number, number],
		checkpointTracker?: any,
	): Promise<void> {
		try {
			const taskDir = await this.ensureTaskDirectoryExists()
			const filePath = path.join(taskDir, GlobalFileNames.uiMessages)
			await fs.writeFile(filePath, JSON.stringify(clineMessages))

			// combined as they are in ChatView
			const apiMetrics = getApiMetrics(combineApiRequests(combineCommandSequences(clineMessages.slice(1))))
			const taskMessage = clineMessages[0] // first message is always the task say
			const lastRelevantMessage =
				clineMessages[
					findLastIndex(clineMessages, (m) => !(m.ask === "resume_task" || m.ask === "resume_completed_task"))
				]

			let taskDirSize = 0
			try {
				// getFolderSize.loose silently ignores errors
				// returns # of bytes, size/1000/1000 = MB
				taskDirSize = await getFolderSize.loose(taskDir)
			} catch (error) {
				console.error("Failed to get task directory size:", taskDir, error)
			}

			await this.options.providerRef.deref()?.updateTaskHistory({
				id: taskId,
				ts: lastRelevantMessage.ts,
				task: taskMessage.text ?? "",
				tokensIn: apiMetrics.totalTokensIn,
				tokensOut: apiMetrics.totalTokensOut,
				cacheWrites: apiMetrics.totalCacheWrites,
				cacheReads: apiMetrics.totalCacheReads,
				totalCost: apiMetrics.totalCost,
				size: taskDirSize,
				shadowGitConfigWorkTree: await checkpointTracker?.getShadowGitConfigWorkTree(),
				conversationHistoryDeletedRange: conversationHistoryDeletedRange,
			})
		} catch (error) {
			console.error("Failed to save cline messages:", error)
		}
	}

	getTimeAgoText(timestamp?: number): string {
		if (!timestamp) {
			return "recently"
		}

		const now = Date.now()
		const diff = now - timestamp
		const minutes = Math.floor(diff / 60000)
		const hours = Math.floor(minutes / 60)
		const days = Math.floor(hours / 24)

		if (days > 0) {
			return `${days} day${days > 1 ? "s" : ""} ago`
		}
		if (hours > 0) {
			return `${hours} hour${hours > 1 ? "s" : ""} ago`
		}
		if (minutes > 0) {
			return `${minutes} minute${minutes > 1 ? "s" : ""} ago`
		}
		return "just now"
	}

	prepareTaskResumptionContent(
		lastMessage: ClineMessage | undefined,
		cwd: string,
		chatMode: string,
		responseText?: string,
		responseImages?: string[],
	): UserContent {
		const agoText = this.getTimeAgoText(lastMessage?.ts)
		const wasRecent = lastMessage?.ts && Date.now() - lastMessage.ts < 30_000

		let newUserContent: UserContent = []

		newUserContent.push({
			type: "text",
			text:
				`[TASK RESUMPTION] ${
					chatMode === "plan"
						? `This task was interrupted ${agoText}. The conversation may have been incomplete. Be aware that the project state may have changed since then. The current working directory is now '${cwd.toPosix()}'.\n\nNote: If you previously attempted a tool use that the user did not provide a result for, you should assume the tool use was not successful. However you are in PLAN MODE, so rather than continuing the task, you must respond to the user's message.`
						: `This task was interrupted ${agoText}. It may or may not be complete, so please reassess the task context. Be aware that the project state may have changed since then. The current working directory is now '${cwd.toPosix()}'. If the task has not been completed, retry the last step before interruption and proceed with completing the task.\n\nNote: If you previously attempted a tool use that the user did not provide a result for, you should assume the tool use was not successful and assess whether you should retry. If the last tool was a browser_action, the browser has been closed and you must launch a new browser if needed.`
				}${
					wasRecent
						? "\n\nIMPORTANT: If the last tool use was a replace_in_file or write_to_file that was interrupted, the file was reverted back to its original state before the interrupted edit, and you do NOT need to re-read the file as you already have its up-to-date contents."
						: ""
				}` +
				(responseText
					? `\n\n${chatMode === "plan" ? "New message to respond to with plan_mode_response tool (be sure to provide your response in the <response> parameter)" : "New instructions for task continuation"}:\n<user_message>\n${responseText}\n</user_message>`
					: chatMode === "plan"
						? "(The user did not provide a new message. Consider asking them how they'd like you to proceed, or to switch to Act mode to continue with the task.)"
						: ""),
		})

		if (responseImages && responseImages.length > 0) {
			newUserContent.push(...formatResponse.imageBlocks(responseImages))
		}

		return newUserContent
	}
}
