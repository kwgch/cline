import { ApiConfiguration, ApiProvider } from "../../../../src/shared/api"
import { WebviewState } from "../types"

export const selectApiConfiguration = (state: WebviewState): ApiConfiguration => state.apiConfiguration

export const selectApiProvider = (state: WebviewState): ApiProvider | undefined => state.apiConfiguration.apiProvider

export const selectApiModelId = (state: WebviewState): string | undefined => state.apiConfiguration.apiModelId

export const selectCustomInstructions = (state: WebviewState): string | undefined => state.customInstructions
