import { useCallback, useEffect, useState } from "react"
import { useEvent } from "react-use"
import { ExtensionMessage } from "../../src/shared/ExtensionMessage"
import ChatView from "./components/chat/ChatView"
import HistoryView from "./components/history/HistoryView"
import SettingsView from "./components/settings/SettingsView"
import WelcomeView from "./components/welcome/WelcomeView"
import AccountView from "./components/account/AccountView"
import { WebviewStateProvider } from "./state/WebviewStateContext"
import { useDidHydrateState, useShowAnnouncement, useShowWelcome } from "./state/hooks/useUi"
import McpView from "./components/mcp/McpView"

const AppContent = () => {
	const didHydrateState = useDidHydrateState()
	const [showWelcome] = useShowWelcome()
	const [shouldShowAnnouncement, setShowAnnouncementState] = useShowAnnouncement()
	const [showSettings, setShowSettings] = useState(false)
	const [showHistory, setShowHistory] = useState(false)
	const [showMcp, setShowMcp] = useState(false)
	const [showAccount, setShowAccount] = useState(false)
	const [showAnnouncement, setShowAnnouncement] = useState(false)

	const handleMessage = useCallback((e: MessageEvent) => {
		const message: ExtensionMessage = e.data
		switch (message.type) {
			case "action":
				switch (message.action!) {
					case "settingsButtonClicked":
						setShowSettings(true)
						setShowHistory(false)
						setShowMcp(false)
						setShowAccount(false)
						break
					case "historyButtonClicked":
						setShowSettings(false)
						setShowHistory(true)
						setShowMcp(false)
						setShowAccount(false)
						break
					case "mcpButtonClicked":
						setShowSettings(false)
						setShowHistory(false)
						setShowMcp(true)
						setShowAccount(false)
						break
					case "accountLoginClicked":
						setShowSettings(false)
						setShowHistory(false)
						setShowMcp(false)
						setShowAccount(true)
						break
					case "chatButtonClicked":
						setShowSettings(false)
						setShowHistory(false)
						setShowMcp(false)
						setShowAccount(false)
						break
				}
				break
		}
	}, [])

	useEvent("message", handleMessage)

	useEffect(() => {
		if (shouldShowAnnouncement) {
			setShowAnnouncement(true)
			setShowAnnouncementState(false)
		}
	}, [shouldShowAnnouncement, setShowAnnouncementState])

	if (!didHydrateState) {
		return null
	}

	return (
		<>
			{showWelcome ? (
				<WelcomeView />
			) : (
				<>
					{showSettings && <SettingsView onDone={() => setShowSettings(false)} />}
					{showHistory && <HistoryView onDone={() => setShowHistory(false)} />}
					{showMcp && <McpView onDone={() => setShowMcp(false)} />}
					{showAccount && <AccountView onDone={() => setShowAccount(false)} />}
					{/* Do not conditionally load ChatView, it's expensive and there's state we don't want to lose (user input, disableInput, askResponse promise, etc.) */}
					<ChatView
						showHistoryView={() => {
							setShowSettings(false)
							setShowMcp(false)
							setShowHistory(true)
						}}
						isHidden={showSettings || showHistory || showMcp || showAccount}
						showAnnouncement={showAnnouncement}
						hideAnnouncement={() => {
							setShowAnnouncement(false)
						}}
					/>
				</>
			)}
		</>
	)
}

const App = () => {
	return (
		<WebviewStateProvider>
			<AppContent />
		</WebviewStateProvider>
	)
}

export default App
