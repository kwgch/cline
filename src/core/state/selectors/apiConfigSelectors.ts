import { ApiConfiguration, ApiProvider } from "../../../shared/api"
import { AppState } from "../types"

/**
 * Selects the API configuration from the state.
 * @param state The application state
 * @returns The API configuration
 */
export const selectApiConfiguration = (state: AppState): ApiConfiguration => state.apiConfiguration

/**
 * Selects the API provider from the state.
 * @param state The application state
 * @returns The API provider
 */
export const selectApiProvider = (state: AppState): ApiProvider | undefined => state.apiConfiguration.apiProvider

/**
 * Selects the API model ID from the state.
 * @param state The application state
 * @returns The API model ID
 */
export const selectApiModelId = (state: AppState): string | undefined => state.apiConfiguration.apiModelId

/**
 * Selects the API key from the state.
 * @param state The application state
 * @returns The API key
 */
export const selectApiKey = (state: AppState): string | undefined => state.apiConfiguration.apiKey
