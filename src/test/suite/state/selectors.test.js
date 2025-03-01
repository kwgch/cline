const assert = require("assert")
const {
	selectApiConfiguration,
	selectApiProvider,
	selectApiModelId,
	selectApiKey,
} = require("../../../core/state/selectors/apiConfigSelectors")
const {
	selectTaskHistory,
	selectCurrentTaskId,
	selectCurrentTask,
	selectTaskById,
} = require("../../../core/state/selectors/taskSelectors")
const {
	selectMessages,
	selectLastMessage,
	selectMessagesByType,
	selectMessagesByTimeRange,
} = require("../../../core/state/selectors/messageSelectors")
const {
	selectAutoApprovalSettings,
	selectBrowserSettings,
	selectChatSettings,
	selectTelemetrySetting,
	selectCustomInstructions,
} = require("../../../core/state/selectors/settingsSelectors")
const {
	selectUserInfo,
	selectIsLoggedIn,
	selectUserDisplayName,
	selectUserEmail,
	selectUserPhotoURL,
} = require("../../../core/state/selectors/userSelectors")

suite("Selectors Test Suite", () => {
	// API Config Selectors Tests
	suite("apiConfigSelectors", () => {
		const state = {
			apiConfiguration: {
				apiProvider: "test-provider",
				apiModelId: "test-model",
				apiKey: "test-key",
			},
		}

		test("selectApiConfiguration should return the API configuration", () => {
			const result = selectApiConfiguration(state)
			assert.deepStrictEqual(result, state.apiConfiguration)
		})

		test("selectApiProvider should return the API provider", () => {
			const result = selectApiProvider(state)
			assert.strictEqual(result, state.apiConfiguration.apiProvider)
		})

		test("selectApiModelId should return the API model ID", () => {
			const result = selectApiModelId(state)
			assert.strictEqual(result, state.apiConfiguration.apiModelId)
		})

		test("selectApiKey should return the API key", () => {
			const result = selectApiKey(state)
			assert.strictEqual(result, state.apiConfiguration.apiKey)
		})
	})

	// Task Selectors Tests
	suite("taskSelectors", () => {
		const task1 = { id: "task-1", task: "Test Task" }
		const task2 = { id: "task-2", task: "Another Task" }
		const state = {
			taskHistory: [task1, task2],
			currentTaskId: "task-1",
		}

		test("selectTaskHistory should return the task history", () => {
			const result = selectTaskHistory(state)
			assert.deepStrictEqual(result, state.taskHistory)
		})

		test("selectCurrentTaskId should return the current task ID", () => {
			const result = selectCurrentTaskId(state)
			assert.strictEqual(result, state.currentTaskId)
		})

		test("selectCurrentTask should return the current task", () => {
			const result = selectCurrentTask(state)
			assert.deepStrictEqual(result, task1)
		})

		test("selectTaskById should return the task with the specified ID", () => {
			const result = selectTaskById(state, "task-2")
			assert.deepStrictEqual(result, task2)
		})

		test("selectTaskById should return undefined if the task is not found", () => {
			const result = selectTaskById(state, "task-3")
			assert.strictEqual(result, undefined)
		})
	})

	// Message Selectors Tests
	suite("messageSelectors", () => {
		const message1 = { ts: 100, say: "text", text: "Message 1" }
		const message2 = { ts: 200, say: "tool", text: "Message 2" }
		const message3 = { ts: 300, say: "text", text: "Message 3" }
		const state = {
			clineMessages: [message1, message2, message3],
		}

		test("selectMessages should return all messages", () => {
			const result = selectMessages(state)
			assert.deepStrictEqual(result, state.clineMessages)
		})

		test("selectLastMessage should return the last message", () => {
			const result = selectLastMessage(state)
			assert.deepStrictEqual(result, message3)
		})

		test("selectMessagesByType should return messages of the specified type", () => {
			const result = selectMessagesByType(state, "text")
			assert.deepStrictEqual(result, [message1, message3])
		})

		test("selectMessagesByTimeRange should return messages in the specified time range", () => {
			const result = selectMessagesByTimeRange(state, 150, 250)
			assert.deepStrictEqual(result, [message2])
		})
	})

	// Settings Selectors Tests
	suite("settingsSelectors", () => {
		const state = {
			autoApprovalSettings: { autoApprove: ["tool1", "tool2"] },
			browserSettings: { showBrowser: true },
			chatSettings: { showTimestamps: true },
			telemetrySetting: "enabled",
			customInstructions: "Test instructions",
		}

		test("selectAutoApprovalSettings should return the auto-approval settings", () => {
			const result = selectAutoApprovalSettings(state)
			assert.deepStrictEqual(result, state.autoApprovalSettings)
		})

		test("selectBrowserSettings should return the browser settings", () => {
			const result = selectBrowserSettings(state)
			assert.deepStrictEqual(result, state.browserSettings)
		})

		test("selectChatSettings should return the chat settings", () => {
			const result = selectChatSettings(state)
			assert.deepStrictEqual(result, state.chatSettings)
		})

		test("selectTelemetrySetting should return the telemetry setting", () => {
			const result = selectTelemetrySetting(state)
			assert.strictEqual(result, state.telemetrySetting)
		})

		test("selectCustomInstructions should return the custom instructions", () => {
			const result = selectCustomInstructions(state)
			assert.strictEqual(result, state.customInstructions)
		})
	})

	// User Selectors Tests
	suite("userSelectors", () => {
		const userInfo = {
			displayName: "Test User",
			email: "test@example.com",
			photoURL: "https://example.com/photo.jpg",
		}
		const state = {
			userInfo,
		}

		test("selectUserInfo should return the user information", () => {
			const result = selectUserInfo(state)
			assert.deepStrictEqual(result, userInfo)
		})

		test("selectIsLoggedIn should return true if the user is logged in", () => {
			const result = selectIsLoggedIn(state)
			assert.strictEqual(result, true)
		})

		test("selectIsLoggedIn should return false if the user is not logged in", () => {
			const result = selectIsLoggedIn({ userInfo: undefined })
			assert.strictEqual(result, false)
		})

		test("selectUserDisplayName should return the user display name", () => {
			const result = selectUserDisplayName(state)
			assert.strictEqual(result, userInfo.displayName)
		})

		test("selectUserEmail should return the user email", () => {
			const result = selectUserEmail(state)
			assert.strictEqual(result, userInfo.email)
		})

		test("selectUserPhotoURL should return the user photo URL", () => {
			const result = selectUserPhotoURL(state)
			assert.strictEqual(result, userInfo.photoURL)
		})
	})
})
