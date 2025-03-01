import { Action, ActionType } from "./types"
import { UserInfo } from "../reducers/userReducer"

/**
 * Sets the user information.
 * @param userInfo The new user information
 * @returns The action
 */
export const setUserInfo = (userInfo: UserInfo): Action => ({
	type: ActionType.SET_USER_INFO,
	payload: userInfo,
})

/**
 * Clears the user information.
 * @returns The action
 */
export const clearUserInfo = (): Action => ({
	type: ActionType.CLEAR_USER_INFO,
})
