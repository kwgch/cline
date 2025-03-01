import { ApiConfiguration, ApiProvider } from "../../../shared/api"
import { Action, ActionType } from "./types"

/**
 * Updates the API configuration.
 * @param config The new API configuration
 * @returns The action
 */
export const updateApiConfiguration = (config: ApiConfiguration): Action => ({
	type: ActionType.UPDATE_API_CONFIGURATION,
	payload: config,
})

/**
 * Sets the API provider.
 * @param provider The new API provider
 * @returns The action
 */
export const setApiProvider = (provider: ApiProvider): Action => ({
	type: ActionType.SET_API_PROVIDER,
	payload: provider,
})

/**
 * Sets the API model ID.
 * @param modelId The new API model ID
 * @returns The action
 */
export const setApiModelId = (modelId: string): Action => ({
	type: ActionType.SET_API_MODEL_ID,
	payload: modelId,
})

/**
 * Sets the API key.
 * @param key The new API key
 * @returns The action
 */
export const setApiKey = (key: string | undefined): Action => ({
	type: ActionType.SET_API_KEY,
	payload: key,
})
