import { ClineMessage } from "../../../../src/shared/ExtensionMessage"
import { WebviewState } from "../types"

export const selectMessages = (state: WebviewState): ClineMessage[] => state.clineMessages

export const selectLastMessage = (state: WebviewState): ClineMessage | undefined =>
	state.clineMessages.length > 0 ? state.clineMessages[state.clineMessages.length - 1] : undefined

export const selectTaskHistory = (state: WebviewState): WebviewState["taskHistory"] => state.taskHistory

export const selectCurrentTaskItem = (state: WebviewState): WebviewState["currentTaskItem"] => state.currentTaskItem
