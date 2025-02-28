import { useCallback } from "react"
import { ClineMessage } from "../../../../src/shared/ExtensionMessage"
import { HistoryItem } from "../../../../src/shared/HistoryItem"
import { clearMessages, sendNewTask } from "../actions/messageActions"
import { selectCurrentTaskItem, selectLastMessage, selectMessages, selectTaskHistory } from "../selectors/messageSelectors"
import { useWebviewState } from "../WebviewStateContext"

export const useMessages = (): {
	messages: ClineMessage[]
	clearMessages: () => void
	sendNewTask: (text: string, images?: string[]) => void
} => {
	const { state, dispatch } = useWebviewState()
	const messages = selectMessages(state)

	const clearMessagesAction = useCallback(() => {
		dispatch(clearMessages())
	}, [dispatch])

	const sendNewTaskAction = useCallback(
		(text: string, images?: string[]) => {
			dispatch(sendNewTask(text, images))
		},
		[dispatch],
	)

	return {
		messages,
		clearMessages: clearMessagesAction,
		sendNewTask: sendNewTaskAction,
	}
}

export const useLastMessage = (): ClineMessage | undefined => {
	const { state } = useWebviewState()
	return selectLastMessage(state)
}

export const useTaskHistory = (): HistoryItem[] => {
	const { state } = useWebviewState()
	return selectTaskHistory(state)
}

export const useCurrentTaskItem = (): HistoryItem | undefined => {
	const { state } = useWebviewState()
	return selectCurrentTaskItem(state)
}
