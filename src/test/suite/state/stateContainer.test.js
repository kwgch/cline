const assert = require("assert")
const vscode = require("vscode")
const { getStateContainer, resetStateContainer } = require("../../../core/state/StateContainer")
const { createInitialState } = require("../../../core/state/types")
const { ActionType } = require("../../../core/state/actions/types")

suite("StateContainer Test Suite", () => {
	test("StateContainer should initialize with initial state", () => {
		resetStateContainer()
		const initialState = createInitialState("1.0.0")
		const stateContainer = getStateContainer(initialState)

		assert.deepStrictEqual(stateContainer.getState(), initialState)
	})

	test("StateContainer should update state when action is dispatched", () => {
		resetStateContainer()
		const initialState = createInitialState("1.0.0")
		const stateContainer = getStateContainer(initialState)

		const apiConfig = { apiProvider: "test-provider" }
		stateContainer.dispatch({
			type: ActionType.UPDATE_API_CONFIGURATION,
			payload: apiConfig,
		})

		assert.deepStrictEqual(stateContainer.getState().apiConfiguration, apiConfig)
	})

	test("StateContainer should notify subscribers when state changes", () => {
		resetStateContainer()
		const initialState = createInitialState("1.0.0")
		const stateContainer = getStateContainer(initialState)

		let notified = false
		const unsubscribe = stateContainer.subscribe(() => {
			notified = true
		})

		stateContainer.dispatch({
			type: ActionType.UPDATE_API_CONFIGURATION,
			payload: { apiProvider: "test-provider" },
		})

		assert.strictEqual(notified, true)

		// Unsubscribe should work
		notified = false
		unsubscribe()

		stateContainer.dispatch({
			type: ActionType.SET_API_PROVIDER,
			payload: "another-provider",
		})

		assert.strictEqual(notified, false)
	})

	test("StateContainer should not update state if reducer returns same state", () => {
		resetStateContainer()
		const initialState = createInitialState("1.0.0")
		const stateContainer = getStateContainer(initialState)

		let notifyCount = 0
		stateContainer.subscribe(() => {
			notifyCount++
		})

		// This should not trigger a state update since the action type is not handled
		stateContainer.dispatch({
			type: "UNKNOWN_ACTION",
			payload: {},
		})

		assert.strictEqual(notifyCount, 0)
	})

	test("StateContainer should handle INITIALIZE_STATE action", () => {
		resetStateContainer()
		const initialState = createInitialState("1.0.0")
		const stateContainer = getStateContainer(initialState)

		const newState = {
			...initialState,
			apiConfiguration: {
				apiProvider: "new-provider",
			},
		}

		stateContainer.dispatch({
			type: ActionType.INITIALIZE_STATE,
			payload: newState,
		})

		assert.deepStrictEqual(stateContainer.getState(), newState)
	})

	test("StateContainer should handle RESET_STATE action", () => {
		resetStateContainer()
		const initialState = createInitialState("1.0.0")
		const stateContainer = getStateContainer(initialState)

		// First update the state
		stateContainer.dispatch({
			type: ActionType.UPDATE_API_CONFIGURATION,
			payload: { apiProvider: "test-provider" },
		})

		// Then reset it
		stateContainer.dispatch({
			type: ActionType.RESET_STATE,
		})

		// The state should be reset to initial state
		assert.deepStrictEqual(stateContainer.getState().apiConfiguration, initialState.apiConfiguration)
	})
})
