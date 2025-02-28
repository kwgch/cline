import { Anthropic } from "@anthropic-ai/sdk"
import pWaitFor from "p-wait-for"
import delay from "delay"
import { ApiHandler, buildApiHandler } from "../../api"
import { OpenAiHandler } from "../../api/providers/openai"
import { OpenRouterHandler } from "../../api/providers/openrouter"
import { ApiStream } from "../../api/transform/stream"
import { ApiConfiguration } from "../../shared/api"
import { ClineApiReqCancelReason } from "../../shared/ExtensionMessage"
import { fileExistsAtPath } from "../../utils/fs"
import { SYSTEM_PROMPT } from "../prompts/system"
import { getNextTruncationRange, getTruncatedMessages } from "../sliding-window"
import * as path from "path"
import * as fs from "fs/promises"
import { serializeError } from "serialize-error"

export interface ApiManagerOptions {
  cwd: string
  customInstructions?: string
  browserSettings: any
  providerRef: WeakRef<any>
}

export class ApiManager {
  private api: ApiHandler
  private isWaitingForFirstChunk = false
  private didAutomaticallyRetryFailedApiRequest = false

  constructor(apiConfiguration: ApiConfiguration, private options: ApiManagerOptions) {
    this.api = buildApiHandler(apiConfiguration)
  }

  getModel() {
    return this.api.getModel()
  }

  formatErrorWithStatusCode(error: any): string {
    const statusCode = error.status || error.statusCode || (error.response && error.response.status)
    const message = error.message ?? JSON.stringify(serializeError(error), null, 2)

    // Only prepend the statusCode if it's not already part of the message
    return statusCode && !message.includes(statusCode.toString()) ? `${statusCode} - ${message}` : message
  }

  async *attemptApiRequest(
    apiConversationHistory: Anthropic.MessageParam[],
    conversationHistoryDeletedRange?: [number, number],
    previousApiReqIndex: number = -1,
    onFirstChunkError?: (error: any) => Promise<void>
  ): ApiStream {
    // Wait for MCP servers to be connected before generating system prompt
    await pWaitFor(() => this.options.providerRef.deref()?.mcpHub?.isConnecting !== true, { timeout: 10_000 }).catch(() => {
      console.error("MCP servers failed to connect in time")
    })

    const mcpHub = this.options.providerRef.deref()?.mcpHub
    if (!mcpHub) {
      throw new Error("MCP hub not available")
    }

    const disableBrowserTool = false // TODO: Get from configuration
    const modelSupportsComputerUse = this.api.getModel().info.supportsComputerUse ?? false
    const supportsComputerUse = modelSupportsComputerUse && !disableBrowserTool

    let systemPrompt = await SYSTEM_PROMPT(this.options.cwd, supportsComputerUse, mcpHub, this.options.browserSettings)

    let settingsCustomInstructions = this.options.customInstructions?.trim()
    const clineRulesFilePath = path.resolve(this.options.cwd, ".clinerules")
    let clineRulesFileInstructions: string | undefined
    
    if (await fileExistsAtPath(clineRulesFilePath)) {
      try {
        const ruleFileContent = (await fs.readFile(clineRulesFilePath, "utf8")).trim()
        if (ruleFileContent) {
          clineRulesFileInstructions = `# .clinerules\n\nThe following is provided by a root-level .clinerules file where the user has specified instructions for this working directory (${this.options.cwd.toPosix()})\n\n${ruleFileContent}`
        }
      } catch {
        console.error(`Failed to read .clinerules file at ${clineRulesFilePath}`)
      }
    }

    // TODO: Add clineIgnoreInstructions

    if (settingsCustomInstructions || clineRulesFileInstructions) {
      // TODO: Add user instructions to system prompt
      // systemPrompt += addUserInstructions(settingsCustomInstructions, clineRulesFileInstructions, clineIgnoreInstructions)
    }

    // If the previous API request's total token usage is close to the context window, truncate the conversation history
    if (previousApiReqIndex >= 0) {
      // TODO: Implement context window management
    }

    // conversationHistoryDeletedRange is updated only when we're close to hitting the context window
    const truncatedConversationHistory = getTruncatedMessages(
      apiConversationHistory,
      conversationHistoryDeletedRange,
    )

    let stream = this.api.createMessage(systemPrompt, truncatedConversationHistory)
    const iterator = stream[Symbol.asyncIterator]()

    try {
      // awaiting first chunk to see if it will throw an error
      this.isWaitingForFirstChunk = true
      const firstChunk = await iterator.next()
      yield firstChunk.value
      this.isWaitingForFirstChunk = false
    } catch (error) {
      const isOpenRouter = this.api instanceof OpenRouterHandler
      if (isOpenRouter && !this.didAutomaticallyRetryFailedApiRequest) {
        console.log("first chunk failed, waiting 1 second before retrying")
        await delay(1000)
        this.didAutomaticallyRetryFailedApiRequest = true
      } else {
        if (onFirstChunkError) {
          await onFirstChunkError(error)
        }
        throw error
      }
      
      // delegate generator output from the recursive call
      yield* this.attemptApiRequest(apiConversationHistory, conversationHistoryDeletedRange, previousApiReqIndex, onFirstChunkError)
      return
    }

    // no error, so we can continue to yield all remaining chunks
    yield* iterator
  }

  calculateContextWindowLimits(contextWindow: number): { maxAllowedSize: number } {
    let maxAllowedSize: number
    switch (contextWindow) {
      case 64_000: // deepseek models
        maxAllowedSize = contextWindow - 27_000
        break
      case 128_000: // most models
        maxAllowedSize = contextWindow - 30_000
        break
      case 200_000: // claude models
        maxAllowedSize = contextWindow - 40_000
        break
      default:
        maxAllowedSize = Math.max(contextWindow - 40_000, contextWindow * 0.8)
    }
    
    return { maxAllowedSize }
  }

  shouldTruncateConversation(totalTokens: number, contextWindow: number): { shouldTruncate: boolean, keep: "half" | "quarter" } {
    const { maxAllowedSize } = this.calculateContextWindowLimits(contextWindow)
    
    if (totalTokens >= maxAllowedSize) {
      const keep = totalTokens / 2 > maxAllowedSize ? "quarter" : "half"
      return { shouldTruncate: true, keep }
    }
    
    return { shouldTruncate: false, keep: "half" }
  }

  getNextTruncationRange(
    apiConversationHistory: Anthropic.MessageParam[],
    currentRange: [number, number] | undefined,
    keep: "half" | "quarter"
  ): [number, number] | undefined {
    return getNextTruncationRange(apiConversationHistory, currentRange, keep)
  }
}
