import { describe, it, beforeEach, afterEach } from "mocha"
import "should"
import { stub, SinonStub, createSandbox, SinonSandbox } from "sinon"
import { ApiManager, ApiManagerOptions } from "./ApiManager"
import { ApiConfiguration, ModelInfo } from "../../shared/api"
import { ContextOptimizationSettings, DEFAULT_CONTEXT_OPTIMIZATION_SETTINGS } from "../../shared/ContextOptimizationSettings"
import * as path from "path"
import * as fs from "fs/promises"
import { Anthropic } from "@anthropic-ai/sdk"

describe("ApiManager", () => {
	let sandbox: SinonSandbox
	let apiManager: ApiManager
	let mockApiHandler: any
	let mockOptions: ApiManagerOptions
	let mockProviderRef: WeakRef<any>
	let mockMcpHub: any
	let mockApiConfiguration: ApiConfiguration
	let mockFileExistsAtPath: SinonStub
	let mockReadFile: SinonStub
	let mockBuildApiHandler: SinonStub
	let mockOptimizeContext: SinonStub

	beforeEach(() => {
		sandbox = createSandbox()

		// Mock file system functions
		mockFileExistsAtPath = sandbox.stub().resolves(false)
		mockReadFile = sandbox.stub(fs, "readFile").resolves("")

		// Mock MCP hub
		mockMcpHub = {
			isConnecting: false,
			getConnectedServers: stub().returns([]),
		}

		// Create mock for WeakRef
		mockProviderRef = {
			deref: stub().returns({
				mcpHub: mockMcpHub,
			}),
		} as any

		// Mock API configuration
		mockApiConfiguration = {
			apiProvider: "anthropic",
			apiModelId: "test-model",
		}

		// Mock API handler
		mockApiHandler = {
			getModel: stub().returns({
				id: "test-model",
				info: {
					contextWindow: 128000,
					supportsComputerUse: true,
				} as ModelInfo,
			}),
			createMessage: stub().returns({
				[Symbol.asyncIterator]: async function* () {
					yield { type: "text", text: "Hello, world!" }
				},
			}),
		}

		// Mock buildApiHandler
		mockBuildApiHandler = sandbox.stub().returns(mockApiHandler)
		sandbox.stub(require("../../api"), "buildApiHandler").get(() => mockBuildApiHandler)

		// Mock optimizeContext
		mockOptimizeContext = sandbox.stub().returns({
			messages: [],
			systemPrompt: "Optimized system prompt",
			environmentDetails: "Optimized environment details",
		})
		sandbox.stub(require("./context-optimization"), "optimizeContext").get(() => mockOptimizeContext)

		// Create mock options
		mockOptions = {
			cwd: "/mock/cwd",
			providerRef: mockProviderRef,
			browserSettings: {
				chromeExecutablePath: null,
				viewport: { width: 900, height: 600 },
				headless: true,
			},
			contextOptimizationSettings: DEFAULT_CONTEXT_OPTIMIZATION_SETTINGS,
		}

		// Create ApiManager instance
		apiManager = new ApiManager(mockApiConfiguration, mockOptions)

		// Replace file system functions
		Object.defineProperty(require("../../utils/fs"), "fileExistsAtPath", {
			value: mockFileExistsAtPath,
		})
	})

	afterEach(() => {
		sandbox.restore()
	})

	describe("getModel", () => {
		it("should return the model from the API handler", () => {
			// Execute
			const model = apiManager.getModel()

			// Verify
			model.id.should.equal("test-model")
			model.info.contextWindow?.should.equal(128000)
			mockApiHandler.getModel.calledOnce.should.be.true()
		})
	})

	describe("formatErrorWithStatusCode", () => {
		it("should format error with status code when not in message", () => {
			// Setup
			const error = {
				status: 429,
				message: "Too many requests",
			}

			// Execute
			const formattedError = apiManager.formatErrorWithStatusCode(error)

			// Verify
			formattedError.should.equal("429 - Too many requests")
		})

		it("should not prepend status code when already in message", () => {
			// Setup
			const error = {
				status: 429,
				message: "429 - Too many requests",
			}

			// Execute
			const formattedError = apiManager.formatErrorWithStatusCode(error)

			// Verify
			formattedError.should.equal("429 - Too many requests")
		})

		it("should handle errors without status code", () => {
			// Setup
			const error = {
				message: "Unknown error",
			}

			// Execute
			const formattedError = apiManager.formatErrorWithStatusCode(error)

			// Verify
			formattedError.should.equal("Unknown error")
		})

		it("should handle errors with response status", () => {
			// Setup
			const error = {
				response: {
					status: 404,
				},
				message: "Not found",
			}

			// Execute
			const formattedError = apiManager.formatErrorWithStatusCode(error)

			// Verify
			formattedError.should.equal("404 - Not found")
		})
	})

	describe("attemptApiRequest", () => {
		it("should wait for MCP servers to connect", async () => {
			// Setup
			const apiConversationHistory: Anthropic.MessageParam[] = [{ role: "user", content: "Hello" }]
			mockMcpHub.isConnecting = true

			// Create a timeout to set isConnecting to false after a delay
			setTimeout(() => {
				mockMcpHub.isConnecting = false
			}, 100)

			// Execute
			const stream = apiManager.attemptApiRequest(apiConversationHistory, undefined, -1, undefined)
			const iterator = stream[Symbol.asyncIterator]()
			const result = await iterator.next()

			// Verify
			result.value.should.deepEqual({ type: "text", text: "Hello, world!" })
			mockOptimizeContext.calledOnce.should.be.true()
			mockApiHandler.createMessage.calledOnce.should.be.true()
		})

		it("should throw an error if MCP hub is not available", async () => {
			// Setup
			const apiConversationHistory: Anthropic.MessageParam[] = [{ role: "user", content: "Hello" }]
			mockProviderRef.deref = stub().returns({})

			// Execute & Verify
			try {
				const stream = apiManager.attemptApiRequest(apiConversationHistory, undefined, -1, undefined)
				const iterator = stream[Symbol.asyncIterator]()
				await iterator.next()
				// If we get here, the test should fail because no error was thrown
				throw new Error("Expected an error to be thrown, but no error was thrown")
			} catch (error: any) {
				error.message.should.equal("MCP hub not available")
			}
		})

		it("should apply context optimization", async () => {
			// Setup
			const apiConversationHistory: Anthropic.MessageParam[] = [{ role: "user", content: "Hello" }]
			const environmentDetails = "Environment details"

			// Execute
			const stream = apiManager.attemptApiRequest(apiConversationHistory, undefined, -1, undefined, environmentDetails)
			const iterator = stream[Symbol.asyncIterator]()
			await iterator.next()

			// Verify
			mockOptimizeContext.calledOnce.should.be.true()
			mockOptimizeContext.firstCall.args[0].should.deepEqual(apiConversationHistory)
			mockOptimizeContext.firstCall.args[2].should.equal(environmentDetails)
			mockOptimizeContext.firstCall.args[3].should.equal(DEFAULT_CONTEXT_OPTIMIZATION_SETTINGS)
			mockOptimizeContext.firstCall.args[4].should.be.true() // isFirstRequest
		})

		it("should handle .clinerules file if it exists", async () => {
			// Setup
			const apiConversationHistory: Anthropic.MessageParam[] = [{ role: "user", content: "Hello" }]
			mockFileExistsAtPath.resolves(true)
			mockReadFile.resolves("Custom rules content")

			// Execute
			const stream = apiManager.attemptApiRequest(apiConversationHistory, undefined, -1, undefined)
			const iterator = stream[Symbol.asyncIterator]()
			await iterator.next()

			// Verify
			mockFileExistsAtPath.calledOnce.should.be.true()
			mockReadFile.calledOnce.should.be.true()
			mockApiHandler.createMessage.calledOnce.should.be.true()
		})

		it("should increment API request count", async () => {
			// Setup
			const apiConversationHistory: Anthropic.MessageParam[] = [{ role: "user", content: "Hello" }]

			// Execute first request
			let stream = apiManager.attemptApiRequest(apiConversationHistory, undefined, -1, undefined)
			let iterator = stream[Symbol.asyncIterator]()
			await iterator.next()

			// Verify first request is marked as first
			mockOptimizeContext.firstCall.args[4].should.be.true() // isFirstRequest

			// Execute second request
			stream = apiManager.attemptApiRequest(apiConversationHistory, undefined, -1, undefined)
			iterator = stream[Symbol.asyncIterator]()
			await iterator.next()

			// Verify second request is not marked as first
			mockOptimizeContext.secondCall.args[4].should.be.false() // isFirstRequest
		})

		it("should reset API request count", async () => {
			// Setup - make a request to increment the count
			const apiConversationHistory: Anthropic.MessageParam[] = [{ role: "user", content: "Hello" }]
			// First request to increment the count
			const stream = apiManager.attemptApiRequest(apiConversationHistory, undefined, -1, undefined)
			const iterator = stream[Symbol.asyncIterator]()
			await iterator.next() // Await to ensure the request is processed

			// Execute
			apiManager.resetApiRequestCount()

			// Verify - make another request and check if it's marked as first
			// Reset the count
			apiManager.resetApiRequestCount()

			// Second request after reset
			const stream2 = apiManager.attemptApiRequest(apiConversationHistory, undefined, -1, undefined)
			const iterator2 = stream2[Symbol.asyncIterator]()
			await iterator2.next()

			// Verify the second request is marked as first after reset
			mockOptimizeContext.secondCall.args[4].should.be.true() // isFirstRequest
		})
	})

	describe("calculateContextWindowLimits", () => {
		it("should calculate limits for deepseek models (64k)", () => {
			// Execute
			const { maxAllowedSize } = apiManager.calculateContextWindowLimits(64000)

			// Verify
			maxAllowedSize.should.equal(64000 - 27000)
		})

		it("should calculate limits for most models (128k)", () => {
			// Execute
			const { maxAllowedSize } = apiManager.calculateContextWindowLimits(128000)

			// Verify
			maxAllowedSize.should.equal(128000 - 30000)
		})

		it("should calculate limits for claude models (200k)", () => {
			// Execute
			const { maxAllowedSize } = apiManager.calculateContextWindowLimits(200000)

			// Verify
			maxAllowedSize.should.equal(200000 - 40000)
		})

		it("should calculate limits for other models", () => {
			// Execute
			const { maxAllowedSize } = apiManager.calculateContextWindowLimits(32000)

			// Verify
			maxAllowedSize.should.equal(32000 * 0.8)
		})
	})

	describe("shouldTruncateConversation", () => {
		it("should return false when tokens are below limit", () => {
			// Execute
			const { shouldTruncate, keep } = apiManager.shouldTruncateConversation(50000, 128000)

			// Verify
			shouldTruncate.should.be.false()
			keep.should.equal("half")
		})

		it("should return true with 'half' when tokens exceed limit but half would fit", () => {
			// Execute
			const { shouldTruncate, keep } = apiManager.shouldTruncateConversation(100000, 128000)

			// Verify
			shouldTruncate.should.be.true()
			keep.should.equal("half")
		})

		it("should return true with 'quarter' when tokens exceed limit and half would not fit", () => {
			// Execute
			const { shouldTruncate, keep } = apiManager.shouldTruncateConversation(200000, 128000)

			// Verify
			shouldTruncate.should.be.true()
			keep.should.equal("quarter")
		})
	})

	describe("updateContextOptimizationSettings", () => {
		it("should update context optimization settings", async () => {
			// Setup
			const newSettings: ContextOptimizationSettings = {
				...DEFAULT_CONTEXT_OPTIMIZATION_SETTINGS,
				useHierarchicalFileStructure: false,
			}

			// Execute
			apiManager.updateContextOptimizationSettings(newSettings)

			// Verify - make a request and check if new settings are used
			const apiConversationHistory: Anthropic.MessageParam[] = [{ role: "user", content: "Hello" }]
			const stream = apiManager.attemptApiRequest(apiConversationHistory, undefined, -1, undefined)
			const iterator = stream[Symbol.asyncIterator]()
			await iterator.next()

			// Verify the settings were used
			mockOptimizeContext.firstCall.args[3].should.deepEqual(newSettings)
		})
	})
})
