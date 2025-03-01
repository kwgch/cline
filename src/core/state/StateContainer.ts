import { Action } from "./actions/types"
import { AppState } from "./types"
import { rootReducer } from "./reducers"

/**
 * Callback function type for state change listeners.
 */
export type StateChangeListener = (state: AppState) => void

/**
 * The StateContainer class is the central piece of the state management system.
 * It holds the current state and dispatches actions to update it.
 */
export class StateContainer {
	private state: AppState
	private listeners: Set<StateChangeListener>

	/**
	 * Creates a new StateContainer instance.
	 * @param initialState The initial state
	 */
	constructor(initialState: AppState) {
		this.state = initialState
		this.listeners = new Set()
	}

	/**
	 * Gets the current state.
	 * @returns The current state (readonly)
	 */
	getState(): Readonly<AppState> {
		return this.state
	}

	/**
	 * Dispatches an action to update the state.
	 * @param action The action to dispatch
	 */
	dispatch(action: Action): void {
		const nextState = rootReducer(this.state, action)
		if (nextState !== this.state) {
			this.state = nextState
			this.notifyListeners()
		}
	}

	/**
	 * Subscribes to state changes.
	 * @param listener The listener function
	 * @returns A function to unsubscribe
	 */
	subscribe(listener: StateChangeListener): () => void {
		this.listeners.add(listener)
		return () => {
			this.listeners.delete(listener)
		}
	}

	/**
	 * Notifies all listeners of a state change.
	 */
	private notifyListeners(): void {
		for (const listener of this.listeners) {
			listener(this.state)
		}
	}
}

// Singleton instance
let stateContainerInstance: StateContainer | undefined

/**
 * Gets the StateContainer instance.
 * @param initialState The initial state (required for first call)
 * @returns The StateContainer instance
 */
export const getStateContainer = (initialState?: AppState): StateContainer => {
	if (!stateContainerInstance && initialState) {
		stateContainerInstance = new StateContainer(initialState)
	} else if (!stateContainerInstance) {
		throw new Error("StateContainer must be initialized with initial state")
	}

	return stateContainerInstance
}

/**
 * Resets the StateContainer instance.
 * Useful for testing.
 */
export const resetStateContainer = (): void => {
	stateContainerInstance = undefined
}
