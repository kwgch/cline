import { useCallback } from "react"
import { ApiConfiguration } from "../../../../src/shared/api"
import { setApiConfiguration, setCustomInstructions } from "../actions/apiConfigActions"
import {
	selectApiConfiguration,
	selectApiModelId,
	selectApiProvider,
	selectCustomInstructions,
} from "../selectors/apiConfigSelectors"
import { useWebviewState } from "../WebviewStateContext"

export const useApiConfiguration = (): [ApiConfiguration, (config: ApiConfiguration) => void] => {
	const { state, dispatch } = useWebviewState()
	const apiConfiguration = selectApiConfiguration(state)

	const updateApiConfiguration = useCallback(
		(config: ApiConfiguration) => {
			dispatch(setApiConfiguration(config))
		},
		[dispatch],
	)

	return [apiConfiguration, updateApiConfiguration]
}

export const useApiProvider = (): string | undefined => {
	const { state } = useWebviewState()
	return selectApiProvider(state)
}

export const useApiModelId = (): string | undefined => {
	const { state } = useWebviewState()
	return selectApiModelId(state)
}

export const useCustomInstructions = (): [string | undefined, (instructions?: string) => void] => {
	const { state, dispatch } = useWebviewState()
	const customInstructions = selectCustomInstructions(state)

	const updateCustomInstructions = useCallback(
		(instructions?: string) => {
			dispatch(setCustomInstructions(instructions))
		},
		[dispatch],
	)

	return [customInstructions, updateCustomInstructions]
}
