import { Anthropic } from "@anthropic-ai/sdk"
import pWaitFor from "p-wait-for"
import { ClineMessage, ClineAsk, ClineSay } from "../../shared/ExtensionMessage"
import { StateManager } from "../state/StateManager"
import { AssistantMessageContent } from "../assistant-message"
import cloneDeep from "clone-deep"

export interface UIManagerOptions {
  providerRef: WeakRef<any>
  stateManager: StateManager
}

export class UIManager {
  // Streaming state
  private isWaitingForFirstChunk = false
  private isStreaming = false
  private currentStreamingContentIndex = 0
  private assistantMessageContent: AssistantMessageContent[] = []
  private presentAssistantMessageLocked = false
  private presentAssistantMessageHasPendingUpdates = false
  private userMessageContent: (Anthropic.TextBlockParam | Anthropic.ImageBlockParam)[] = []
  private userMessageContentReady = false
  private didRejectTool = false
  private didAlreadyUseTool = false
  private didCompleteReadingStream = false
  private abort = false

  constructor(private options: UIManagerOptions) {}

  async ask(
    type: ClineAsk,
    text?: string,
    partial?: boolean
  ): Promise<{ response: string; text?: string; images?: string[] }> {
    if (this.abort) {
      throw new Error("UIManager instance aborted")
    }
    
    let askTs: number
    if (partial !== undefined) {
      const lastMessage = this.options.stateManager.clineMessages.at(-1)
      const isUpdatingPreviousPartial =
        lastMessage && lastMessage.partial && lastMessage.type === "ask" && lastMessage.ask === type
      
      if (partial) {
        if (isUpdatingPreviousPartial) {
          // existing partial message, so update it
          lastMessage.text = text
          lastMessage.partial = partial
          await this.options.providerRef.deref()?.postMessageToWebview({
            type: "partialMessage",
            partialMessage: lastMessage,
          })
          throw new Error("Current ask promise was ignored 1")
        } else {
          // this is a new partial message, so add it with partial state
          askTs = Date.now()
          this.options.stateManager.setLastMessageTs(askTs)
          await this.options.stateManager.addToClineMessages({
            ts: askTs,
            type: "ask",
            ask: type,
            text,
            partial,
          })
          await this.options.providerRef.deref()?.postStateToWebview()
          throw new Error("Current ask promise was ignored 2")
        }
      } else {
        // partial=false means its a complete version of a previously partial message
        if (isUpdatingPreviousPartial) {
          // this is the complete version of a previously partial message
          askTs = lastMessage.ts
          this.options.stateManager.setLastMessageTs(askTs)
          lastMessage.text = text
          lastMessage.partial = false
          await this.options.stateManager.saveClineMessages()
          await this.options.providerRef.deref()?.postMessageToWebview({
            type: "partialMessage",
            partialMessage: lastMessage,
          })
        } else {
          // this is a new partial=false message, so add it like normal
          askTs = Date.now()
          this.options.stateManager.setLastMessageTs(askTs)
          await this.options.stateManager.addToClineMessages({
            ts: askTs,
            type: "ask",
            ask: type,
            text,
          })
          await this.options.providerRef.deref()?.postStateToWebview()
        }
      }
    } else {
      // this is a new non-partial message, so add it like normal
      askTs = Date.now()
      this.options.stateManager.setLastMessageTs(askTs)
      await this.options.stateManager.addToClineMessages({
        ts: askTs,
        type: "ask",
        ask: type,
        text,
      })
      await this.options.providerRef.deref()?.postStateToWebview()
    }

    await pWaitFor(() => {
      const response = this.options.stateManager.getAskResponse()
      return response !== undefined || this.options.stateManager.getLastMessageTs() !== askTs
    }, { interval: 100 })
    
    if (this.options.stateManager.getLastMessageTs() !== askTs) {
      throw new Error("Current ask promise was ignored")
    }
    
    const result = this.options.stateManager.getAskResponse()
    if (!result) {
      throw new Error("No ask response available")
    }
    
    return result
  }

  async say(type: ClineSay, text?: string, images?: string[], partial?: boolean): Promise<void> {
    if (this.abort) {
      throw new Error("UIManager instance aborted")
    }

    if (partial !== undefined) {
      const lastMessage = this.options.stateManager.clineMessages.at(-1)
      const isUpdatingPreviousPartial =
        lastMessage && lastMessage.partial && lastMessage.type === "say" && lastMessage.say === type
      
      if (partial) {
        if (isUpdatingPreviousPartial) {
          // existing partial message, so update it
          lastMessage.text = text
          lastMessage.images = images
          lastMessage.partial = partial
          await this.options.providerRef.deref()?.postMessageToWebview({
            type: "partialMessage",
            partialMessage: lastMessage,
          })
        } else {
          // this is a new partial message, so add it with partial state
          const sayTs = Date.now()
          this.options.stateManager.setLastMessageTs(sayTs)
          await this.options.stateManager.addToClineMessages({
            ts: sayTs,
            type: "say",
            say: type,
            text,
            images,
            partial,
          })
          await this.options.providerRef.deref()?.postStateToWebview()
        }
      } else {
        // partial=false means its a complete version of a previously partial message
        if (isUpdatingPreviousPartial) {
          // this is the complete version of a previously partial message
          this.options.stateManager.setLastMessageTs(lastMessage.ts)
          lastMessage.text = text
          lastMessage.images = images
          lastMessage.partial = false
          await this.options.stateManager.saveClineMessages()
          await this.options.providerRef.deref()?.postMessageToWebview({
            type: "partialMessage",
            partialMessage: lastMessage,
          })
        } else {
          // this is a new partial=false message, so add it like normal
          const sayTs = Date.now()
          this.options.stateManager.setLastMessageTs(sayTs)
          await this.options.stateManager.addToClineMessages({
            ts: sayTs,
            type: "say",
            say: type,
            text,
            images,
          })
          await this.options.providerRef.deref()?.postStateToWebview()
        }
      }
    } else {
      // this is a new non-partial message, so add it like normal
      const sayTs = Date.now()
      this.options.stateManager.setLastMessageTs(sayTs)
      await this.options.stateManager.addToClineMessages({
        ts: sayTs,
        type: "say",
        say: type,
        text,
        images,
      })
      await this.options.providerRef.deref()?.postStateToWebview()
    }
  }

  async removeLastPartialMessageIfExistsWithType(type: "ask" | "say", askOrSay: ClineAsk | ClineSay): Promise<void> {
    const lastMessage = this.options.stateManager.clineMessages.at(-1)
    if (lastMessage?.partial && lastMessage.type === type && (lastMessage.ask === askOrSay || lastMessage.say === askOrSay)) {
      this.options.stateManager.clineMessages.pop()
      await this.options.stateManager.saveClineMessages()
      await this.options.providerRef.deref()?.postStateToWebview()
    }
  }

  setAssistantMessageContent(content: AssistantMessageContent[]): void {
    this.assistantMessageContent = content
  }
  
  getAssistantMessageContent(): AssistantMessageContent[] {
    return this.assistantMessageContent
  }

  getUserMessageContent(): (Anthropic.TextBlockParam | Anthropic.ImageBlockParam)[] {
    return this.userMessageContent
  }

  setUserMessageContent(content: (Anthropic.TextBlockParam | Anthropic.ImageBlockParam)[]): void {
    this.userMessageContent = content
  }

  isUserMessageContentReady(): boolean {
    return this.userMessageContentReady
  }

  setUserMessageContentReady(ready: boolean): void {
    this.userMessageContentReady = ready
  }

  setDidRejectTool(rejected: boolean): void {
    this.didRejectTool = rejected
  }

  getDidRejectTool(): boolean {
    return this.didRejectTool
  }

  setDidAlreadyUseTool(used: boolean): void {
    this.didAlreadyUseTool = used
  }

  getDidAlreadyUseTool(): boolean {
    return this.didAlreadyUseTool
  }

  setDidCompleteReadingStream(completed: boolean): void {
    this.didCompleteReadingStream = completed
  }

  getDidCompleteReadingStream(): boolean {
    return this.didCompleteReadingStream
  }

  setAbort(abort: boolean): void {
    this.abort = abort
  }

  getAbort(): boolean {
    return this.abort
  }

  async presentAssistantMessage(): Promise<void> {
    if (this.abort) {
      throw new Error("UIManager instance aborted")
    }

    if (this.presentAssistantMessageLocked) {
      this.presentAssistantMessageHasPendingUpdates = true
      return
    }
    
    this.presentAssistantMessageLocked = true
    this.presentAssistantMessageHasPendingUpdates = false

    if (this.currentStreamingContentIndex >= this.assistantMessageContent.length) {
      // If streaming is finished and we're out of bounds, we're ready for the next request
      if (this.didCompleteReadingStream) {
        this.userMessageContentReady = true
      }
      
      this.presentAssistantMessageLocked = false
      return
    }

    const block = cloneDeep(this.assistantMessageContent[this.currentStreamingContentIndex])
    
    // Process the block based on its type
    // This would be a simplified version of the original implementation
    // Actual implementation would handle text blocks, tool use blocks, etc.
    
    // For example, handling text blocks:
    if (block.type === "text" && !this.didRejectTool && !this.didAlreadyUseTool) {
      let content = block.content
      if (content) {
        // Process content (remove thinking tags, etc.)
        content = content.replace(/<thinking>\s?/g, "")
        content = content.replace(/\s?<\/thinking>/g, "")
        
        // Handle partial XML tags at the end
        const lastOpenBracketIndex = content.lastIndexOf("<")
        if (lastOpenBracketIndex !== -1) {
          const possibleTag = content.slice(lastOpenBracketIndex)
          const hasCloseBracket = possibleTag.includes(">")
          if (!hasCloseBracket) {
            let tagContent: string
            if (possibleTag.startsWith("</")) {
              tagContent = possibleTag.slice(2).trim()
            } else {
              tagContent = possibleTag.slice(1).trim()
            }
            
            const isLikelyTagName = /^[a-zA-Z_]+$/.test(tagContent)
            const isOpeningOrClosing = possibleTag === "<" || possibleTag === "</"
            
            if (isOpeningOrClosing || isLikelyTagName) {
              content = content.slice(0, lastOpenBracketIndex).trim()
            }
          }
        }
      }

      await this.say("text", content, undefined, block.partial)
    }
    
    // Handle tool use blocks and other types would be implemented here
    
    // Move to next block if complete
    if (!block.partial) {
      this.currentStreamingContentIndex++
    }

    this.presentAssistantMessageLocked = false
    
    // Check for pending updates
    if (this.presentAssistantMessageHasPendingUpdates) {
      await this.presentAssistantMessage()
    }
  }

  resetStreamingState(): void {
    this.currentStreamingContentIndex = 0
    this.assistantMessageContent = []
    this.didCompleteReadingStream = false
    this.userMessageContent = []
    this.userMessageContentReady = false
    this.didRejectTool = false
    this.didAlreadyUseTool = false
    this.presentAssistantMessageLocked = false
    this.presentAssistantMessageHasPendingUpdates = false
  }
}
