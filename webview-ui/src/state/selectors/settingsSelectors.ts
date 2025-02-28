import { AutoApprovalSettings } from "../../../../src/shared/AutoApprovalSettings"
import { BrowserSettings } from "../../../../src/shared/BrowserSettings"
import { ChatSettings } from "../../../../src/shared/ChatSettings"
import { TelemetrySetting } from "../../../../src/shared/TelemetrySetting"
import { WebviewState } from "../types"

export const selectAutoApprovalSettings = (state: WebviewState): AutoApprovalSettings => state.autoApprovalSettings

export const selectBrowserSettings = (state: WebviewState): BrowserSettings => state.browserSettings

export const selectChatSettings = (state: WebviewState): ChatSettings => state.chatSettings

export const selectTelemetrySetting = (state: WebviewState): TelemetrySetting => state.telemetrySetting

export const selectPlatform = (state: WebviewState): WebviewState["platform"] => state.platform

export const selectIsLoggedIn = (state: WebviewState): boolean => state.isLoggedIn

export const selectUserInfo = (state: WebviewState): WebviewState["userInfo"] => state.userInfo

export const selectMcpMarketplaceEnabled = (state: WebviewState): boolean | undefined => state.mcpMarketplaceEnabled
