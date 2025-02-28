import { ApiConfiguration } from "../../../../src/shared/api"
import { ActionType, WebviewAction } from "../actions/types"

export const apiConfigReducer = (state: ApiConfiguration = {}, action: WebviewAction): ApiConfiguration => {
	switch (action.type) {
		case ActionType.SET_API_CONFIGURATION:
			return {
				...state,
				...action.payload,
			}

		default:
			return state
	}
}
