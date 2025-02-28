import { describe, it, beforeEach, afterEach } from "mocha"
import "should"
import { stub, SinonStub, createSandbox, SinonSandbox } from "sinon"
import { StateManager, StateManagerOptions } from "./StateManager"
import { ClineMessage } from "../../shared/ExtensionMessage"
import { Anthropic } from "@anthropic-ai/sdk"
import CheckpointTracker from "../../integrations/checkpoints/CheckpointTracker"

describe("StateManager", () => {
	let sandbox: SinonSandbox
	let stateManager: StateManager
	let mockOptions: StateManagerOptions
	let mockProviderRef: WeakRef<any>
	let mockTaskManager: any
	let mockCheckpointTracker: any
	let mockClineMessages: ClineMessage[]
	let mockApiConversationHistory: Anthropic.MessageParam[]

	beforeEach(() => {
		sandbox = createSandbox()

		// Mock TaskManager
		mockTaskManager = {
			getSavedClineMessages: sandbox.stub().resolves([]),
			getSavedApiConversationHistory: sandbox.stub().resolves([]),
			saveApiConversationHistory: sandbox.stub().resolves(),
			saveClineMessages: sandbox.stub().resolves(),
		}

		// Mock CheckpointTracker
		mockCheckpointTracker = {
			commit: sandbox.stub().resolves("mock-commit-hash"),
		}

		// Create mock for WeakRef
		mockProviderRef = {
			deref: sandbox.stub().returns({}),
		} as any

		// Create mock options
		mockOptions = {
			taskId: "test-task-id",
			providerRef: mockProviderRef,
			taskManager: mockTaskManager,
		}

		// Create mock ClineMessages
		mockClineMessages = [
			{
				ts: 1000,
				type: "say",
				say: "text",
				text: "Hello",
				conversationHistoryIndex: 0,
			},
			{
				ts: 2000,
				type: "say",
				say: "checkpoint_created",
				text: "Checkpoint created",
				lastCheckpointHash: "checkpoint-1",
				conversationHistoryIndex: 1,
				isCheckpointCheckedOut: false,
			},
			{
				ts: 3000,
				type: "say",
				say: "completion_result",
				text: "Task completed",
				lastCheckpointHash: "checkpoint-2",
				conversationHistoryIndex: 2,
				isCheckpointCheckedOut: false,
			},
		]

		// Create mock API conversation history
		mockApiConversationHistory = [
			{ role: "user", content: "Hello" },
			{ role: "assistant", content: "Hi there" },
			{ role: "user", content: "How are you?" },
			{ role: "assistant", content: "I'm good" },
		]

		// Create StateManager instance
		stateManager = new StateManager(mockOptions)
	})

	afterEach(() => {
		sandbox.restore()
	})

	describe("initialize", () => {
		it("should initialize state from task manager", async () => {
			// Setup
			mockTaskManager.getSavedClineMessages.resolves(mockClineMessages)
			mockTaskManager.getSavedApiConversationHistory.resolves(mockApiConversationHistory)

			// Execute
			await stateManager.initialize()

			// Verify
			stateManager.clineMessages.should.deepEqual(mockClineMessages)
			stateManager.apiConversationHistory.should.deepEqual(mockApiConversationHistory)
			mockTaskManager.getSavedClineMessages.calledOnce.should.be.true()
			mockTaskManager.getSavedApiConversationHistory.calledOnce.should.be.true()
		})
	})

	describe("addToApiConversationHistory", () => {
		it("should add a message to the API conversation history", async () => {
			// Setup
			const message: Anthropic.MessageParam = { role: "user", content: "New message" }

			// Execute
			await stateManager.addToApiConversationHistory(message)

			// Verify
			stateManager.apiConversationHistory.should.containEql(message)
			mockTaskManager.saveApiConversationHistory.calledWith(stateManager.apiConversationHistory).should.be.true()
		})
	})

	describe("overwriteApiConversationHistory", () => {
		it("should overwrite the API conversation history", async () => {
			// Setup
			const newHistory: Anthropic.MessageParam[] = [
				{ role: "user", content: "New conversation" },
				{ role: "assistant", content: "New response" },
			]

			// Execute
			await stateManager.overwriteApiConversationHistory(newHistory)

			// Verify
			stateManager.apiConversationHistory.should.deepEqual(newHistory)
			mockTaskManager.saveApiConversationHistory.calledWith(newHistory).should.be.true()
		})
	})

	describe("addToClineMessages", () => {
		it("should add a message to the Cline messages with conversation history index", async () => {
			// Setup
			stateManager.apiConversationHistory = mockApiConversationHistory
			const message: ClineMessage = {
				ts: 4000,
				type: "say",
				say: "text",
				text: "New message",
			}

			// Execute
			await stateManager.addToClineMessages(message)

			// Verify
			stateManager.clineMessages.should.containEql(message)
			should.exist(message.conversationHistoryIndex)
			message.conversationHistoryIndex!.should.equal(mockApiConversationHistory.length - 1)
			mockTaskManager.saveClineMessages.calledOnce.should.be.true()
		})

		it("should add a message with checkpoint tracker", async () => {
			// Setup
			stateManager.apiConversationHistory = mockApiConversationHistory
			const message: ClineMessage = {
				ts: 4000,
				type: "say",
				say: "text",
				text: "New message",
			}

			// Execute
			await stateManager.addToClineMessages(message, mockCheckpointTracker)

			// Verify
			stateManager.clineMessages.should.containEql(message)
			mockTaskManager.saveClineMessages
				.calledWith(
					stateManager.clineMessages,
					stateManager.apiConversationHistory,
					mockOptions.taskId,
					undefined,
					mockCheckpointTracker,
				)
				.should.be.true()
		})
	})

	describe("overwriteClineMessages", () => {
		it("should overwrite the Cline messages", async () => {
			// Setup
			const newMessages: ClineMessage[] = [
				{
					ts: 5000,
					type: "say",
					say: "text",
					text: "New message set",
				},
			]

			// Execute
			await stateManager.overwriteClineMessages(newMessages)

			// Verify
			stateManager.clineMessages.should.deepEqual(newMessages)
			mockTaskManager.saveClineMessages.calledOnce.should.be.true()
		})
	})

	describe("handleWebviewAskResponse", () => {
		it("should store ask response data", async () => {
			// Execute
			await stateManager.handleWebviewAskResponse("yesButtonClicked", "User feedback", ["image1.png"])

			// Verify
			const response = stateManager.getAskResponse()
			should.exist(response)
			response!.response.should.equal("yesButtonClicked")
			should.exist(response!.text)
			response!.text!.should.equal("User feedback")
			should.exist(response!.images)
			response!.images!.should.deepEqual(["image1.png"])
		})

		it("should clear ask response data after retrieval", async () => {
			// Setup
			await stateManager.handleWebviewAskResponse("yesButtonClicked")

			// Execute
			stateManager.getAskResponse()

			// Verify
			should.not.exist(stateManager.getAskResponse())
		})
	})

	describe("updateApiReqMessage", () => {
		it("should update API request message with token and cost information", () => {
			// Setup
			stateManager.clineMessages = [
				{
					ts: 1000,
					type: "say",
					say: "api_req_started",
					text: JSON.stringify({ tokensIn: 0, tokensOut: 0, cacheWrites: 0, cacheReads: 0 }),
				},
			]

			// Execute
			stateManager.updateApiReqMessage(0, 100, 200, 50, 25, 0.05)

			// Verify
			should.exist(stateManager.clineMessages[0].text)
			const updatedInfo = JSON.parse(stateManager.clineMessages[0].text!)
			updatedInfo.tokensIn.should.equal(100)
			updatedInfo.tokensOut.should.equal(200)
			updatedInfo.cacheWrites.should.equal(50)
			updatedInfo.cacheReads.should.equal(25)
			updatedInfo.cost.should.equal(0.05)
		})

		it("should handle invalid message index", () => {
			// Setup
			stateManager.clineMessages = []

			// Execute
			stateManager.updateApiReqMessage(0, 100, 200, 50, 25, 0.05)

			// Verify - no error should be thrown
		})

		it("should handle invalid JSON in message text", () => {
			// Setup
			stateManager.clineMessages = [
				{
					ts: 1000,
					type: "say",
					say: "api_req_started",
					text: "invalid json",
				},
			]

			// Execute
			stateManager.updateApiReqMessage(0, 100, 200, 50, 25, 0.05)

			// Verify - no error should be thrown
			should.exist(stateManager.clineMessages[0].text)
			stateManager.clineMessages[0].text!.should.equal("invalid json")
		})
	})

	describe("findLastCheckpointMessage", () => {
		it("should find the last checkpoint message", () => {
			// Setup
			stateManager.clineMessages = mockClineMessages

			// Execute
			const message = stateManager.findLastCheckpointMessage()

			// Verify
			should.exist(message)
			message!.should.equal(mockClineMessages[1])
		})

		it("should return undefined if no checkpoint message exists", () => {
			// Setup
			stateManager.clineMessages = [
				{
					ts: 1000,
					type: "say",
					say: "text",
					text: "Hello",
				},
			]

			// Execute
			const message = stateManager.findLastCheckpointMessage()

			// Verify
			should.not.exist(message)
		})
	})

	describe("updateCheckpointMessages", () => {
		it("should update checkpoint messages with new hash", () => {
			// Setup
			stateManager.clineMessages = mockClineMessages

			// Execute
			stateManager.updateCheckpointMessages("new-commit-hash")

			// Verify
			should.exist(stateManager.clineMessages[1].lastCheckpointHash)
			stateManager.clineMessages[1].lastCheckpointHash!.should.equal("new-commit-hash")
			should.exist(stateManager.clineMessages[1].isCheckpointCheckedOut)
			stateManager.clineMessages[1].isCheckpointCheckedOut!.should.be.false()
		})

		it("should reset isCheckpointCheckedOut flag for all checkpoint messages", () => {
			// Setup
			stateManager.clineMessages = [
				...mockClineMessages,
				{
					ts: 4000,
					type: "say",
					say: "checkpoint_created",
					text: "Another checkpoint",
					isCheckpointCheckedOut: true,
				},
			]

			// Execute
			stateManager.updateCheckpointMessages()

			// Verify
			should.exist(stateManager.clineMessages[1].isCheckpointCheckedOut)
			stateManager.clineMessages[1].isCheckpointCheckedOut!.should.be.false()
			should.exist(stateManager.clineMessages[3].isCheckpointCheckedOut)
			stateManager.clineMessages[3].isCheckpointCheckedOut!.should.be.false()
		})
	})

	describe("updateCompletionResultCheckpoint", () => {
		it("should update the last completion result message with checkpoint hash", () => {
			// Setup
			stateManager.clineMessages = mockClineMessages

			// Execute
			stateManager.updateCompletionResultCheckpoint("new-completion-hash")

			// Verify
			should.exist(stateManager.clineMessages[2].lastCheckpointHash)
			stateManager.clineMessages[2].lastCheckpointHash!.should.equal("new-completion-hash")
		})

		it("should handle case when no completion result message exists", () => {
			// Setup
			stateManager.clineMessages = [
				{
					ts: 1000,
					type: "say",
					say: "text",
					text: "Hello",
				},
			]

			// Execute
			stateManager.updateCompletionResultCheckpoint("new-completion-hash")

			// Verify - no error should be thrown
		})
	})

	describe("lastMessageTs", () => {
		it("should get and set last message timestamp", () => {
			// Execute
			stateManager.setLastMessageTs(5000)

			// Verify
			should.exist(stateManager.getLastMessageTs())
			stateManager.getLastMessageTs()!.should.equal(5000)
		})
	})
})
