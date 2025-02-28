import { ClineMessage } from "../../../../src/shared/ExtensionMessage"
import { ActionType, WebviewAction } from "./types"

export const setMessages = (messages: ClineMessage[]): WebviewAction => ({
	type: ActionType.SET_MESSAGES,
	payload: messages,
})

export const addMessage = (message: ClineMessage): WebviewAction => ({
	type: ActionType.ADD_MESSAGE,
	payload: message,
})

export const updatePartialMessage = (message: ClineMessage): WebviewAction => ({
	type: ActionType.UPDATE_PARTIAL_MESSAGE,
	payload: message,
})

export const clearMessages = (): WebviewAction => ({
	type: ActionType.CLEAR_MESSAGES,
	payload: undefined,
	sendToExtension: true,
	toExtensionMessage: () => ({
		type: "clearTask",
	}),
})

export const sendNewTask = (text: string, images?: string[]): WebviewAction => ({
	type: ActionType.CLEAR_MESSAGES, // This will clear messages first
	payload: undefined,
	sendToExtension: true,
	toExtensionMessage: () => ({
		type: "newTask",
		text,
		images,
	}),
})
