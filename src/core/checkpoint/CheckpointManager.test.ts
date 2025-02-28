import { describe, it, beforeEach, afterEach } from "mocha"
import "should"
import { stub, SinonStub, createSandbox, SinonSandbox } from "sinon"
import { CheckpointManager, CheckpointManagerOptions } from "./CheckpointManager"
import * as vscode from "vscode"
import { ClineMessage } from "../../shared/ExtensionMessage"

describe("CheckpointManager", () => {
	let sandbox: SinonSandbox
	let checkpointManager: CheckpointManager
	let mockOptions: CheckpointManagerOptions
	let mockProviderRef: WeakRef<any>
	let mockCheckpointTracker: any
	let mockVscodeWindow: any
	let mockVscodeCommands: any
	let mockClineMessages: ClineMessage[]

	beforeEach(() => {
		sandbox = createSandbox()

		// Mock VSCode window
		mockVscodeWindow = {
			showErrorMessage: sandbox.stub(),
			showInformationMessage: sandbox.stub(),
		}
		sandbox.stub(vscode, "window").get(() => mockVscodeWindow)

		// Mock VSCode commands
		mockVscodeCommands = {
			executeCommand: sandbox.stub().resolves(),
		}
		sandbox.stub(vscode, "commands").get(() => mockVscodeCommands)

		// Mock CheckpointTracker
		mockCheckpointTracker = {
			commit: sandbox.stub().resolves("mock-commit-hash"),
			resetHead: sandbox.stub().resolves(),
			getDiffSet: sandbox.stub().resolves([
				{
					relativePath: "test.txt",
					absolutePath: "/mock/cwd/test.txt",
					before: "old content",
					after: "new content",
				},
			]),
		}

		// Mock static create method on CheckpointTracker
		const CheckpointTrackerMock = {
			create: sandbox.stub().resolves(mockCheckpointTracker),
		}
		sandbox.stub(require("../../integrations/checkpoints/CheckpointTracker"), "default").get(() => CheckpointTrackerMock)

		// Create mock for WeakRef
		mockProviderRef = {
			deref: sandbox.stub().returns({
				postStateToWebview: sandbox.stub().resolves(),
				postMessageToWebview: sandbox.stub().resolves(),
			}),
		} as any

		// Create mock options
		mockOptions = {
			taskId: "test-task-id",
			providerRef: mockProviderRef,
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

		// Create CheckpointManager instance
		checkpointManager = new CheckpointManager(mockOptions)
	})

	afterEach(() => {
		sandbox.restore()
	})

	describe("initialize", () => {
		it("should initialize the checkpoint tracker", async () => {
			// Execute
			await checkpointManager.initialize()

			// Verify
			const CheckpointTracker = require("../../integrations/checkpoints/CheckpointTracker").default
			CheckpointTracker.create.calledWith("test-task-id").should.be.true()
			checkpointManager.getCheckpointTracker()!.should.equal(mockCheckpointTracker)
			should.not.exist(checkpointManager.getErrorMessage())
		})

		it("should handle initialization errors", async () => {
			// Setup
			const error = new Error("Initialization error")
			const CheckpointTracker = require("../../integrations/checkpoints/CheckpointTracker").default
			CheckpointTracker.create.rejects(error)

			// Execute
			await checkpointManager.initialize()

			// Verify
			should.not.exist(checkpointManager.getCheckpointTracker())
			checkpointManager.getErrorMessage()!.should.equal("Initialization error")
			mockVscodeWindow.showErrorMessage.calledWith("Initialization error").should.be.true()
			mockProviderRef.deref().postStateToWebview.calledOnce.should.be.true()
		})
	})

	describe("saveCheckpoint", () => {
		it("should save a checkpoint and return the commit hash", async () => {
			// Setup
			await checkpointManager.initialize()

			// Execute
			const commitHash = await checkpointManager.saveCheckpoint(false, mockClineMessages)

			// Verify
			should.exist(commitHash)
			commitHash!.should.equal("mock-commit-hash")
			mockCheckpointTracker.commit.calledOnce.should.be.true()
		})

		it("should return undefined if checkpoint tracker is not initialized", async () => {
			// Execute
			const commitHash = await checkpointManager.saveCheckpoint(false, mockClineMessages)

			// Verify
			should.not.exist(commitHash)
		})
	})

	describe("restoreCheckpoint", () => {
		let mockOnOverwriteApiConversationHistory: SinonStub
		let mockOnOverwriteClineMessages: SinonStub
		let mockOnSay: SinonStub
		let mockApiConversationHistory: any[]

		beforeEach(() => {
			mockOnOverwriteApiConversationHistory = sandbox.stub().resolves()
			mockOnOverwriteClineMessages = sandbox.stub().resolves()
			mockOnSay = sandbox.stub().resolves()
			mockApiConversationHistory = [
				{ role: "user", content: "Hello" },
				{ role: "assistant", content: "Hi there" },
				{ role: "user", content: "How are you?" },
				{ role: "assistant", content: "I'm good" },
			]
		})

		it("should restore task messages only", async () => {
			// Setup
			await checkpointManager.initialize()

			// Execute
			await checkpointManager.restoreCheckpoint(
				2000, // messageTs
				"task", // restoreType
				mockClineMessages,
				mockApiConversationHistory,
				mockOnOverwriteApiConversationHistory,
				mockOnOverwriteClineMessages,
				mockOnSay,
			)

			// Verify
			mockOnOverwriteApiConversationHistory.calledOnce.should.be.true()
			mockOnOverwriteClineMessages.calledOnce.should.be.true()
			mockOnSay.calledOnce.should.be.true()
			mockVscodeWindow.showInformationMessage
				.calledWith("Task messages have been restored to the checkpoint")
				.should.be.true()
			mockProviderRef.deref().postMessageToWebview.calledWith({ type: "relinquishControl" }).should.be.true()
		})

		it("should restore workspace files only", async () => {
			// Setup
			await checkpointManager.initialize()

			// Execute
			await checkpointManager.restoreCheckpoint(
				2000, // messageTs
				"workspace", // restoreType
				mockClineMessages,
				mockApiConversationHistory,
				mockOnOverwriteApiConversationHistory,
				mockOnOverwriteClineMessages,
				mockOnSay,
			)

			// Verify
			mockCheckpointTracker.resetHead.calledWith("checkpoint-1").should.be.true()
			mockVscodeWindow.showInformationMessage
				.calledWith("Workspace files have been restored to the checkpoint")
				.should.be.true()
			mockProviderRef.deref().postMessageToWebview.calledWith({ type: "relinquishControl" }).should.be.true()
		})

		it("should restore both task messages and workspace files", async () => {
			// Setup
			await checkpointManager.initialize()

			// Execute
			await checkpointManager.restoreCheckpoint(
				2000, // messageTs
				"taskAndWorkspace", // restoreType
				mockClineMessages,
				mockApiConversationHistory,
				mockOnOverwriteApiConversationHistory,
				mockOnOverwriteClineMessages,
				mockOnSay,
			)

			// Verify
			mockCheckpointTracker.resetHead.calledWith("checkpoint-1").should.be.true()
			mockOnOverwriteApiConversationHistory.calledOnce.should.be.true()
			mockOnOverwriteClineMessages.calledOnce.should.be.true()
			mockOnSay.calledOnce.should.be.true()
			mockVscodeWindow.showInformationMessage
				.calledWith("Task and workspace have been restored to the checkpoint")
				.should.be.true()
			mockProviderRef.deref().postMessageToWebview.calledWith({ type: "relinquishControl" }).should.be.true()
		})

		it("should handle errors when restoring workspace files", async () => {
			// Setup
			await checkpointManager.initialize()
			mockCheckpointTracker.resetHead.rejects(new Error("Reset error"))

			// Execute
			await checkpointManager.restoreCheckpoint(
				2000, // messageTs
				"workspace", // restoreType
				mockClineMessages,
				mockApiConversationHistory,
				mockOnOverwriteApiConversationHistory,
				mockOnOverwriteClineMessages,
				mockOnSay,
			)

			// Verify
			mockVscodeWindow.showErrorMessage.calledWith("Failed to restore checkpoint: Reset error").should.be.true()
			mockProviderRef.deref().postMessageToWebview.calledWith({ type: "relinquishControl" }).should.be.true()
		})
	})

	describe("presentMultifileDiff", () => {
		it("should present diff between current state and specified checkpoint", async () => {
			// Setup
			await checkpointManager.initialize()

			// Execute
			await checkpointManager.presentMultifileDiff(
				2000, // messageTs
				false, // seeNewChangesSinceLastTaskCompletion
				mockClineMessages,
			)

			// Verify
			mockCheckpointTracker.getDiffSet.calledWith("checkpoint-1").should.be.true()
			mockVscodeCommands.executeCommand.calledOnce.should.be.true()
			mockProviderRef.deref().postMessageToWebview.calledWith({ type: "relinquishControl" }).should.be.true()
		})

		it("should present diff between last task completion and specified checkpoint", async () => {
			// Setup
			await checkpointManager.initialize()

			// Execute
			await checkpointManager.presentMultifileDiff(
				3000, // messageTs
				true, // seeNewChangesSinceLastTaskCompletion
				mockClineMessages,
			)

			// Verify
			mockCheckpointTracker.getDiffSet.calledWith("checkpoint-1", "checkpoint-2").should.be.true()
			mockVscodeCommands.executeCommand.calledOnce.should.be.true()
			mockProviderRef.deref().postMessageToWebview.calledWith({ type: "relinquishControl" }).should.be.true()
		})

		it("should handle case when no changes are found", async () => {
			// Setup
			await checkpointManager.initialize()
			mockCheckpointTracker.getDiffSet.resolves([])

			// Execute
			await checkpointManager.presentMultifileDiff(
				2000, // messageTs
				false, // seeNewChangesSinceLastTaskCompletion
				mockClineMessages,
			)

			// Verify
			mockVscodeWindow.showInformationMessage.calledWith("No changes found").should.be.true()
			mockProviderRef.deref().postMessageToWebview.calledWith({ type: "relinquishControl" }).should.be.true()
		})

		it("should handle errors when getting diff set", async () => {
			// Setup
			await checkpointManager.initialize()
			mockCheckpointTracker.getDiffSet.rejects(new Error("Diff error"))

			// Execute
			await checkpointManager.presentMultifileDiff(
				2000, // messageTs
				false, // seeNewChangesSinceLastTaskCompletion
				mockClineMessages,
			)

			// Verify
			mockVscodeWindow.showErrorMessage.calledWith("Failed to retrieve diff set: Diff error").should.be.true()
			mockProviderRef.deref().postMessageToWebview.calledWith({ type: "relinquishControl" }).should.be.true()
		})
	})

	describe("doesLatestTaskCompletionHaveNewChanges", () => {
		it("should return true when changes are found", async () => {
			// Setup
			await checkpointManager.initialize()

			// Execute
			const result = await checkpointManager.doesLatestTaskCompletionHaveNewChanges(mockClineMessages)

			// Verify
			result.should.be.true()
			mockCheckpointTracker.getDiffSet.calledWith(undefined, "checkpoint-2").should.be.true()
		})

		it("should return false when no changes are found", async () => {
			// Setup
			await checkpointManager.initialize()
			mockCheckpointTracker.getDiffSet.resolves([])

			// Execute
			const result = await checkpointManager.doesLatestTaskCompletionHaveNewChanges(mockClineMessages)

			// Verify
			result.should.be.false()
		})

		it("should return false when checkpoint tracker is not initialized", async () => {
			// Execute
			const result = await checkpointManager.doesLatestTaskCompletionHaveNewChanges(mockClineMessages)

			// Verify
			result.should.be.false()
		})

		it("should return false when errors occur", async () => {
			// Setup
			await checkpointManager.initialize()
			mockCheckpointTracker.getDiffSet.rejects(new Error("Diff error"))

			// Execute
			const result = await checkpointManager.doesLatestTaskCompletionHaveNewChanges(mockClineMessages)

			// Verify
			result.should.be.false()
		})
	})
})
