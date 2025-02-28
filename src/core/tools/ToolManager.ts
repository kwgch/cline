import { Anthropic } from "@anthropic-ai/sdk"
import * as vscode from "vscode"
import { TerminalManager } from "../../integrations/terminal/TerminalManager"
import { BrowserSession } from "../../services/browser/BrowserSession"
import { UrlContentFetcher } from "../../services/browser/UrlContentFetcher"
import { DiffViewProvider } from "../../integrations/editor/DiffViewProvider"
import { ClineIgnoreController } from "../ignore/ClineIgnoreController"
import { formatResponse } from "../prompts/responses"
import { AutoApprovalSettings } from "../../shared/AutoApprovalSettings"
import { BrowserSettings } from "../../shared/BrowserSettings"
import { showSystemNotification } from "../../integrations/notifications"
import { serializeError } from "serialize-error"
import { constructNewFileContent } from "../assistant-message/diff"
import { fileExistsAtPath } from "../../utils/fs"
import { getReadablePath } from "../../utils/path"
import { fixModelHtmlEscaping, removeInvalidChars } from "../../utils/string"
import { ToolParamName, ToolUseName } from "../assistant-message"
import * as path from "path"
import delay from "delay"
import { listFiles } from "../../services/glob/list-files"
import { regexSearchFiles } from "../../services/ripgrep"
import { parseSourceCodeForDefinitionsTopLevel } from "../../services/tree-sitter"
import { extractTextFromFile } from "../../integrations/misc/extract-text"
import { BrowserAction, BrowserActionResult, browserActions, ClineSayBrowserAction, ClineSayTool } from "../../shared/ExtensionMessage"

export type ToolResponse = string | Array<Anthropic.TextBlockParam | Anthropic.ImageBlockParam>

export interface ToolManagerOptions {
  cwd: string
  providerRef: WeakRef<any>
  context: vscode.ExtensionContext
  autoApprovalSettings: AutoApprovalSettings
  browserSettings: BrowserSettings
  onSay: (type: string, text?: string, images?: string[], partial?: boolean) => Promise<void>
  onAsk: (type: string, text?: string, partial?: boolean) => Promise<{ response: string; text?: string; images?: string[] }>
  onToolError: (action: string, error: Error) => Promise<void>
}

export class ToolManager {
  private terminalManager: TerminalManager
  urlContentFetcher: UrlContentFetcher
  browserSession: BrowserSession
  private diffViewProvider: DiffViewProvider
  private clineIgnoreController: ClineIgnoreController
  private didEditFile: boolean = false

  constructor(public options: ToolManagerOptions) {
    this.terminalManager = new TerminalManager()
    this.urlContentFetcher = new UrlContentFetcher(options.context)
    this.browserSession = new BrowserSession(options.context, options.browserSettings)
    this.diffViewProvider = new DiffViewProvider(options.cwd)
    this.clineIgnoreController = new ClineIgnoreController(options.cwd)
    
    this.clineIgnoreController.initialize().catch((error) => {
      console.error("Failed to initialize ClineIgnoreController:", error)
    })
  }

  async dispose(): Promise<void> {
    this.terminalManager.disposeAll()
    this.urlContentFetcher.closeBrowser()
    await this.browserSession.closeBrowser()
    this.clineIgnoreController.dispose()
    await this.diffViewProvider.revertChanges()
  }

  shouldAutoApproveTool(toolName: ToolUseName): boolean {
    if (this.options.autoApprovalSettings.enabled) {
      switch (toolName) {
        case "read_file":
        case "list_files":
        case "list_code_definition_names":
        case "search_files":
          return this.options.autoApprovalSettings.actions.readFiles
        case "write_to_file":
        case "replace_in_file":
          return this.options.autoApprovalSettings.actions.editFiles
        case "execute_command":
          return this.options.autoApprovalSettings.actions.executeCommands
        case "browser_action":
          return this.options.autoApprovalSettings.actions.useBrowser
        case "access_mcp_resource":
        case "use_mcp_tool":
          return this.options.autoApprovalSettings.actions.useMcp
      }
    }
    return false
  }

  // Helper to remove closing tag in partial content
  private removeClosingTag(tag: ToolParamName, text?: string): string {
    if (!text) {
      return ""
    }
    
    // This regex dynamically constructs a pattern to match the closing tag:
    // - Optionally matches whitespace before the tag
    // - Matches '<' or '</' optionally followed by any subset of characters from the tag name
    const tagRegex = new RegExp(
      `\\s?<\/?${tag
        .split("")
        .map((char) => `(?:${char})?`)
        .join("")}$`,
      "g",
    )
    return text.replace(tagRegex, "")
  }

  async sayAndCreateMissingParamError(toolName: ToolUseName, paramName: string, relPath?: string): Promise<ToolResponse> {
    await this.options.onSay(
      "error",
      `Cline tried to use ${toolName}${
        relPath ? ` for '${relPath.toPosix()}'` : ""
      } without value for required parameter '${paramName}'. Retrying...`,
    )
    return formatResponse.toolError(formatResponse.missingToolParameterError(paramName))
  }

  async executeCommandTool(command: string): Promise<[boolean, ToolResponse]> {
    const terminalInfo = await this.terminalManager.getOrCreateTerminal(this.options.cwd)
    terminalInfo.terminal.show()
    const process = this.terminalManager.runCommand(terminalInfo, command)

    let userFeedback: { text?: string; images?: string[] } | undefined
    let didContinue = false
    const sendCommandOutput = async (line: string): Promise<void> => {
      try {
        const { response, text, images } = await this.options.onAsk("command_output", line)
        if (response === "yesButtonClicked") {
          // proceed while running
        } else {
          userFeedback = { text, images }
        }
        didContinue = true
        process.continue() // continue past the await
      } catch {
        // This can only happen if this ask promise was ignored, so ignore this error
      }
    }

    let result = ""
    process.on("line", (line) => {
      result += line + "\n"
      if (!didContinue) {
        sendCommandOutput(line)
      } else {
        this.options.onSay("command_output", line)
      }
    })

    let completed = false
    process.once("completed", () => {
      completed = true
    })

    process.once("no_shell_integration", async () => {
      await this.options.onSay("shell_integration_warning")
    })

    await process

    // Wait for a short delay to ensure all messages are sent to the webview
    await delay(50)

    result = result.trim()

    if (userFeedback) {
      await this.options.onSay("user_feedback", userFeedback.text, userFeedback.images)
      return [
        true,
        formatResponse.toolResult(
          `Command is still running in the user's terminal.${
            result.length > 0 ? `\nHere's the output so far:\n${result}` : ""
          }\n\nThe user provided the following feedback:\n<feedback>\n${userFeedback.text}\n</feedback>`,
          userFeedback.images,
        ),
      ]
    }

    if (completed) {
      return [false, `Command executed.${result.length > 0 ? `\nOutput:\n${result}` : ""}`]
    } else {
      return [
        false,
        `Command is still running in the user's terminal.${
          result.length > 0 ? `\nHere's the output so far:\n${result}` : ""
        }\n\nYou will be updated on the terminal status and new output in the future.`,
      ]
    }
  }

  async executeReadFileTool(relPath: string, partial: boolean): Promise<ToolResponse> {
    const sharedMessageProps: ClineSayTool = {
      tool: "readFile",
      path: getReadablePath(this.options.cwd, this.removeClosingTag("path", relPath)),
    }

    if (partial) {
      const partialMessage = JSON.stringify({
        ...sharedMessageProps,
        content: undefined,
      } satisfies ClineSayTool)
      
      if (this.shouldAutoApproveTool("read_file")) {
        await this.options.onSay("tool", partialMessage, undefined, partial)
      } else {
        await this.options.onAsk("tool", partialMessage, partial)
      }
      
      return ""
    }

    if (!relPath) {
      return await this.sayAndCreateMissingParamError("read_file", "path")
    }

    const accessAllowed = this.clineIgnoreController.validateAccess(relPath)
    if (!accessAllowed) {
      await this.options.onSay("clineignore_error", relPath)
      return formatResponse.toolError(formatResponse.clineIgnoreError(relPath))
    }

    const absolutePath = path.resolve(this.options.cwd, relPath)
    const completeMessage = JSON.stringify({
      ...sharedMessageProps,
      content: absolutePath,
    } satisfies ClineSayTool)
    
    if (this.shouldAutoApproveTool("read_file")) {
      await this.options.onSay("tool", completeMessage, undefined, false)
    } else {
      this.showNotificationForApprovalIfAutoApprovalEnabled(
        `Cline wants to read ${path.basename(absolutePath)}`
      )
      
      const { response, text, images } = await this.options.onAsk("tool", completeMessage, false)
      if (response !== "yesButtonClicked") {
        await this.options.onSay("user_feedback", text, images)
        return formatResponse.toolDenied()
      }
      
      if (text || images?.length) {
        await this.options.onSay("user_feedback", text, images)
      }
    }
    
    const content = await extractTextFromFile(absolutePath)
    return content
  }

  async executeListFilesTool(relDirPath: string, recursiveRaw: string | undefined, partial: boolean): Promise<ToolResponse> {
    const recursive = recursiveRaw?.toLowerCase() === "true"
    const sharedMessageProps: ClineSayTool = {
      tool: !recursive ? "listFilesTopLevel" : "listFilesRecursive",
      path: getReadablePath(this.options.cwd, this.removeClosingTag("path", relDirPath)),
    }

    if (partial) {
      const partialMessage = JSON.stringify({
        ...sharedMessageProps,
        content: "",
      } satisfies ClineSayTool)
      
      if (this.shouldAutoApproveTool("list_files")) {
        await this.options.onSay("tool", partialMessage, undefined, partial)
      } else {
        await this.options.onAsk("tool", partialMessage, partial)
      }
      
      return ""
    }

    if (!relDirPath) {
      return await this.sayAndCreateMissingParamError("list_files", "path")
    }

    const absolutePath = path.resolve(this.options.cwd, relDirPath)
    const [files, didHitLimit] = await listFiles(absolutePath, recursive, 200)
    const result = formatResponse.formatFilesList(
      absolutePath,
      files,
      didHitLimit,
      this.clineIgnoreController,
    )
    
    const completeMessage = JSON.stringify({
      ...sharedMessageProps,
      content: result,
    } satisfies ClineSayTool)
    
    if (this.shouldAutoApproveTool("list_files")) {
      await this.options.onSay("tool", completeMessage, undefined, false)
    } else {
      this.showNotificationForApprovalIfAutoApprovalEnabled(
        `Cline wants to view directory ${path.basename(absolutePath)}/`
      )
      
      const { response, text, images } = await this.options.onAsk("tool", completeMessage, false)
      if (response !== "yesButtonClicked") {
        await this.options.onSay("user_feedback", text, images)
        return formatResponse.toolDenied()
      }
      
      if (text || images?.length) {
        await this.options.onSay("user_feedback", text, images)
      }
    }
    
    return result
  }

  // More tool implementations...

  private showNotificationForApprovalIfAutoApprovalEnabled(message: string): void {
    if (this.options.autoApprovalSettings.enabled && this.options.autoApprovalSettings.enableNotifications) {
      showSystemNotification({
        subtitle: "Approval Required",
        message,
      })
    }
  }

  // Add more tool execution methods as needed
}
