import { ApiConfiguration } from "../../../../src/shared/api"
import { ActionType, WebviewAction } from "./types"

export const setApiConfiguration = (config: ApiConfiguration): WebviewAction => ({
	type: ActionType.SET_API_CONFIGURATION,
	payload: config,
	sendToExtension: true,
	toExtensionMessage: () => ({
		type: "apiConfiguration",
		apiConfiguration: config,
	}),
})

export const setCustomInstructions = (instructions?: string): WebviewAction => ({
	type: ActionType.SET_CUSTOM_INSTRUCTIONS,
	payload: instructions,
	sendToExtension: true,
	toExtensionMessage: () => ({
		type: "customInstructions",
		text: instructions,
	}),
})
