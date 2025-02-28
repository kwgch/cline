import React, { createContext, useContext, useEffect, useRef, useState } from "react"
import { WebviewAction } from "./actions/types"
import { WebviewState, createInitialState } from "./types"
import { WebviewStateContainer, getWebviewStateContainer } from "./WebviewStateContainer"

interface WebviewStateContextValue {
	state: WebviewState
	dispatch: (action: WebviewAction) => void
}

const WebviewStateContext = createContext<WebviewStateContextValue | undefined>(undefined)

export const WebviewStateProvider: React.FC<{
	children: React.ReactNode
	initialState?: WebviewState
}> = ({ children, initialState = createInitialState() }) => {
	const stateContainerRef = useRef<WebviewStateContainer>(getWebviewStateContainer(initialState))
	const [state, setState] = useState<WebviewState>(stateContainerRef.current.getState())

	useEffect(() => {
		// Subscribe to state changes
		const unsubscribe = stateContainerRef.current.subscribe(setState)

		// Initialize the webview
		stateContainerRef.current.initialize()

		return unsubscribe
	}, [])

	const dispatch = (action: WebviewAction) => {
		stateContainerRef.current.dispatch(action)
	}

	const value: WebviewStateContextValue = {
		state,
		dispatch,
	}

	return <WebviewStateContext.Provider value={value}>{children}</WebviewStateContext.Provider>
}

export const useWebviewState = (): WebviewStateContextValue => {
	const context = useContext(WebviewStateContext)
	if (context === undefined) {
		throw new Error("useWebviewState must be used within a WebviewStateProvider")
	}
	return context
}
