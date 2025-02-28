import { AppState } from '../types';
import { UserInfo } from '../reducers/userReducer';

/**
 * Selects the user information from the state.
 * @param state The application state
 * @returns The user information
 */
export const selectUserInfo = (state: AppState): UserInfo | undefined => 
  state.userInfo;

/**
 * Selects whether the user is logged in from the state.
 * @param state The application state
 * @returns Whether the user is logged in
 */
export const selectIsLoggedIn = (state: AppState): boolean => 
  !!state.userInfo;

/**
 * Selects the user's display name from the state.
 * @param state The application state
 * @returns The user's display name
 */
export const selectUserDisplayName = (state: AppState): string | null | undefined => 
  state.userInfo?.displayName;

/**
 * Selects the user's email from the state.
 * @param state The application state
 * @returns The user's email
 */
export const selectUserEmail = (state: AppState): string | null | undefined => 
  state.userInfo?.email;

/**
 * Selects the user's photo URL from the state.
 * @param state The application state
 * @returns The user's photo URL
 */
export const selectUserPhotoURL = (state: AppState): string | null | undefined => 
  state.userInfo?.photoURL;
