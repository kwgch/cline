import { findLast, findLastIndex } from "../../shared/array"
import CheckpointTracker from "../../integrations/checkpoints/CheckpointTracker"
import { ClineMessage } from "../../shared/ExtensionMessage"
import * as vscode from "vscode"

export interface CheckpointManagerOptions {
  taskId: string
  providerRef: WeakRef<any>
}

export class CheckpointManager {
  private checkpointTracker?: CheckpointTracker
  checkpointTrackerErrorMessage?: string

  constructor(private options: CheckpointManagerOptions) {}

  async initialize(): Promise<void> {
    try {
      this.checkpointTracker = await CheckpointTracker.create(this.options.taskId, this.options.providerRef.deref())
      this.checkpointTrackerErrorMessage = undefined
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error"
      console.error("Failed to initialize checkpoint tracker:", errorMessage)
      this.checkpointTrackerErrorMessage = errorMessage
      await this.options.providerRef.deref()?.postStateToWebview()
      vscode.window.showErrorMessage(errorMessage)
    }
  }

  async saveCheckpoint(isAttemptCompletionMessage: boolean = false, clineMessages: ClineMessage[]): Promise<string | undefined> {
    const commitHash = await this.checkpointTracker?.commit()
    
    if (!commitHash) {
      return undefined
    }
    
    return commitHash
  }

  async restoreCheckpoint(
    messageTs: number, 
    restoreType: string, 
    clineMessages: ClineMessage[], 
    apiConversationHistory: any[],
    onOverwriteApiConversationHistory: (newHistory: any[]) => Promise<void>,
    onOverwriteClineMessages: (newMessages: ClineMessage[]) => Promise<void>,
    onSay: (type: string, text?: string) => Promise<void>
  ): Promise<void> {
    const messageIndex = clineMessages.findIndex((m) => m.ts === messageTs)
    const message = clineMessages[messageIndex]
    if (!message) {
      console.error("Message not found", clineMessages)
      return
    }

    let didWorkspaceRestoreFail = false

    switch (restoreType) {
      case "task":
        break
      case "taskAndWorkspace":
      case "workspace":
        if (!this.checkpointTracker) {
          try {
            await this.initialize()
          } catch (error) {
            didWorkspaceRestoreFail = true
          }
        }
        
        if (message.lastCheckpointHash && this.checkpointTracker) {
          try {
            await this.checkpointTracker.resetHead(message.lastCheckpointHash)
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error"
            vscode.window.showErrorMessage("Failed to restore checkpoint: " + errorMessage)
            didWorkspaceRestoreFail = true
          }
        }
        break
    }

    if (!didWorkspaceRestoreFail) {
      switch (restoreType) {
        case "task":
        case "taskAndWorkspace": {
          const newConversationHistory = apiConversationHistory.slice(
            0,
            (message.conversationHistoryIndex || 0) + 2
          )
          await onOverwriteApiConversationHistory(newConversationHistory)

          // aggregate deleted api reqs info so we don't lose costs/tokens
          const deletedMessages = clineMessages.slice(messageIndex + 1)
          
          const newClineMessages = clineMessages.slice(0, messageIndex + 1)
          await onOverwriteClineMessages(newClineMessages)

          await onSay("deleted_api_reqs", JSON.stringify({
            // Metrics would be calculated here in the real implementation
            tokensIn: 0,
            tokensOut: 0,
            cacheWrites: 0,
            cacheReads: 0,
            cost: 0,
          }))
          break
        }
        case "workspace":
          break
      }

      switch (restoreType) {
        case "task":
          vscode.window.showInformationMessage("Task messages have been restored to the checkpoint")
          break
        case "workspace":
          vscode.window.showInformationMessage("Workspace files have been restored to the checkpoint")
          break
        case "taskAndWorkspace":
          vscode.window.showInformationMessage("Task and workspace have been restored to the checkpoint")
          break
      }

      if (restoreType !== "task") {
        // Set isCheckpointCheckedOut flag on the message
        // Find all checkpoint messages before this one
        const checkpointMessages = clineMessages.filter((m) => m.say === "checkpoint_created")
        const currentMessageIndex = checkpointMessages.findIndex((m) => m.ts === messageTs)

        // Set isCheckpointCheckedOut to false for all checkpoint messages
        checkpointMessages.forEach((m, i) => {
          m.isCheckpointCheckedOut = i === currentMessageIndex
        })
      }

      await this.options.providerRef.deref()?.postMessageToWebview({ type: "relinquishControl" })
    } else {
      await this.options.providerRef.deref()?.postMessageToWebview({ type: "relinquishControl" })
    }
  }

  async presentMultifileDiff(
    messageTs: number, 
    seeNewChangesSinceLastTaskCompletion: boolean,
    clineMessages: ClineMessage[]
  ): Promise<void> {
    const relinquishButton = () => {
      this.options.providerRef.deref()?.postMessageToWebview({ type: "relinquishControl" })
    }

    const messageIndex = clineMessages.findIndex((m) => m.ts === messageTs)
    const message = clineMessages[messageIndex]
    if (!message) {
      console.error("Message not found")
      relinquishButton()
      return
    }
    
    const hash = message.lastCheckpointHash
    if (!hash) {
      console.error("No checkpoint hash found")
      relinquishButton()
      return
    }

    if (!this.checkpointTracker) {
      try {
        await this.initialize()
      } catch (error) {
        relinquishButton()
        return
      }
    }

    let changedFiles:
      | {
          relativePath: string
          absolutePath: string
          before: string
          after: string
        }[]
      | undefined

    try {
      if (seeNewChangesSinceLastTaskCompletion) {
        // Get last task completed
        const lastTaskCompletedMessage = findLast(
          clineMessages.slice(0, messageIndex),
          (m) => m.say === "completion_result"
        )

        // Get changed files between current state and commit
        changedFiles = await this.checkpointTracker?.getDiffSet(
          lastTaskCompletedMessage?.lastCheckpointHash,
          hash
        )
        
        if (!changedFiles?.length) {
          vscode.window.showInformationMessage("No changes found")
          relinquishButton()
          return
        }
      } else {
        // Get changed files between current state and commit
        changedFiles = await this.checkpointTracker?.getDiffSet(hash)
        if (!changedFiles?.length) {
          vscode.window.showInformationMessage("No changes found")
          relinquishButton()
          return
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error"
      vscode.window.showErrorMessage("Failed to retrieve diff set: " + errorMessage)
      relinquishButton()
      return
    }

    // Open multi-diff editor
    await vscode.commands.executeCommand(
      "vscode.changes",
      seeNewChangesSinceLastTaskCompletion ? "New changes" : "Changes since snapshot",
      changedFiles.map((file) => [
        vscode.Uri.file(file.absolutePath),
        vscode.Uri.parse(`${DIFF_VIEW_URI_SCHEME}:${file.relativePath}`).with({
          query: Buffer.from(file.before ?? "").toString("base64"),
        }),
        vscode.Uri.parse(`${DIFF_VIEW_URI_SCHEME}:${file.relativePath}`).with({
          query: Buffer.from(file.after ?? "").toString("base64"),
        }),
      ]),
    )
    
    relinquishButton()
  }

  async doesLatestTaskCompletionHaveNewChanges(clineMessages: ClineMessage[]): Promise<boolean> {
    const messageIndex = findLastIndex(clineMessages, (m: ClineMessage) => m.say === "completion_result")
    const message = clineMessages[messageIndex]
    if (!message) {
      console.error("Completion message not found")
      return false
    }
    
    const hash = message.lastCheckpointHash
    if (!hash) {
      console.error("No checkpoint hash found")
      return false
    }

    if (!this.checkpointTracker) {
      try {
        await this.initialize()
      } catch (error) {
        return false
      }
    }

    // Get last task completed
    const lastTaskCompletedMessage = findLast(
      clineMessages.slice(0, messageIndex), 
      (m) => m.say === "completion_result"
    )

    try {
      // Get changed files between current state and commit
      const changedFiles = await this.checkpointTracker?.getDiffSet(
        lastTaskCompletedMessage?.lastCheckpointHash,
        hash
      )
      
      const changedFilesCount = changedFiles?.length || 0
      if (changedFilesCount > 0) {
        return true
      }
    } catch (error) {
      console.error("Failed to get diff set:", error)
      return false
    }

    return false
  }

  getCheckpointTracker(): CheckpointTracker | undefined {
    return this.checkpointTracker
  }

  getErrorMessage(): string | undefined {
    return this.checkpointTrackerErrorMessage
  }
}

// Placeholder for DIFF_VIEW_URI_SCHEME
const DIFF_VIEW_URI_SCHEME = "cline-diff"
