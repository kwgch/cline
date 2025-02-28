import React, { useState, useEffect, useRef } from "react"
import styled from "styled-components"
import { VSCodeBadge, VSCodeDivider } from "@vscode/webview-ui-toolkit/react"
import { ClineMessage } from "../../../../src/shared/ExtensionMessage"
import { CODE_BLOCK_BG_COLOR } from "../common/CodeBlock"

// Types for action visualization
export interface ActionStep {
	id: string
	type: "reasoning" | "tool_use" | "file_operation" | "command" | "browser" | "completion"
	description: string
	status: "pending" | "in_progress" | "completed" | "error"
	timestamp: number
	details?: string
	icon?: string
}

interface AIActionVisualizerProps {
	messages: ClineMessage[]
	isExpanded: boolean
	onToggleExpand: () => void
}

const AIActionVisualizer: React.FC<AIActionVisualizerProps> = ({ messages, isExpanded, onToggleExpand }) => {
	const [steps, setSteps] = useState<ActionStep[]>([])
	const [activeStepIndex, setActiveStepIndex] = useState<number>(-1)
	const timelineRef = useRef<HTMLDivElement>(null)

	// Extract action steps from messages
	useEffect(() => {
		const extractedSteps: ActionStep[] = []
		let currentStep: ActionStep | null = null

		messages.forEach((message, index) => {
			// Process reasoning messages
			if (message.say === "reasoning") {
				if (!currentStep || currentStep.type !== "reasoning") {
					currentStep = {
						id: `reasoning-${message.ts}`,
						type: "reasoning",
						description: "Analyzing and planning next steps",
						status: message.partial ? "in_progress" : "completed",
						timestamp: message.ts,
						icon: "lightbulb",
					}
					extractedSteps.push(currentStep)
				} else if (message.partial === false) {
					// Update existing reasoning step to completed
					currentStep.status = "completed"
				}
			}

			// Process tool use messages
			else if (message.say === "tool" || message.ask === "tool") {
				try {
					if (message.text) {
						const toolData = JSON.parse(message.text)

						// File operations
						if (
							toolData.tool === "editedExistingFile" ||
							toolData.tool === "newFileCreated" ||
							toolData.tool === "readFile" ||
							toolData.tool === "listFilesTopLevel" ||
							toolData.tool === "listFilesRecursive" ||
							toolData.tool === "searchFiles" ||
							toolData.tool === "listCodeDefinitionNames"
						) {
							extractedSteps.push({
								id: `file-${message.ts}`,
								type: "file_operation",
								description: getFileOperationDescription(toolData.tool, toolData.path),
								status: message.partial ? "in_progress" : message.ask ? "pending" : "completed",
								timestamp: message.ts,
								details: toolData.path,
								icon: getFileOperationIcon(toolData.tool),
							})
						}
					}
				} catch (e) {
					// Handle JSON parse error
					console.error("Error parsing tool message:", e)
				}
			}

			// Process command messages
			else if (message.say === "command" || message.ask === "command") {
				extractedSteps.push({
					id: `command-${message.ts}`,
					type: "command",
					description: "Executing command",
					status: message.partial ? "in_progress" : message.ask ? "pending" : "completed",
					timestamp: message.ts,
					details: message.text,
					icon: "terminal",
				})
			}

			// Process browser actions
			else if (
				message.say === "browser_action" ||
				message.say === "browser_action_launch" ||
				message.ask === "browser_action_launch"
			) {
				try {
					let description = "Browser action"
					let icon = "browser"

					if (message.say === "browser_action_launch" || message.ask === "browser_action_launch") {
						description = `Launching browser at ${message.text}`
					} else if (message.text) {
						const browserAction = JSON.parse(message.text)
						description = getBrowserActionDescription(
							browserAction.action,
							browserAction.coordinate,
							browserAction.text,
						)
						icon = getBrowserActionIcon(browserAction.action)
					}

					extractedSteps.push({
						id: `browser-${message.ts}`,
						type: "browser",
						description,
						status: message.partial ? "in_progress" : message.ask ? "pending" : "completed",
						timestamp: message.ts,
						details: message.text,
						icon,
					})
				} catch (e) {
					console.error("Error parsing browser action:", e)
				}
			}

			// Process completion messages
			else if (message.say === "completion_result" || message.ask === "completion_result") {
				extractedSteps.push({
					id: `completion-${message.ts}`,
					type: "completion",
					description: "Task completed",
					status: "completed",
					timestamp: message.ts,
					icon: "check",
				})
			}

			// Process error messages
			else if (message.say === "error") {
				extractedSteps.push({
					id: `error-${message.ts}`,
					type: "tool_use",
					description: "Error encountered",
					status: "error",
					timestamp: message.ts,
					details: message.text,
					icon: "error",
				})
			}
		})

		setSteps(extractedSteps)

		// Set active step to the last in-progress or pending step, or the last step if all are completed
		const inProgressIndex = extractedSteps.findIndex((step) => step.status === "in_progress")
		if (inProgressIndex >= 0) {
			setActiveStepIndex(inProgressIndex)
		} else {
			const pendingIndex = extractedSteps.findIndex((step) => step.status === "pending")
			if (pendingIndex >= 0) {
				setActiveStepIndex(pendingIndex)
			} else {
				setActiveStepIndex(extractedSteps.length - 1)
			}
		}
	}, [messages])

	// Scroll to active step when it changes
	useEffect(() => {
		if (activeStepIndex >= 0 && timelineRef.current) {
			const activeElement = timelineRef.current.querySelector(`[data-step-index="${activeStepIndex}"]`)
			if (activeElement) {
				activeElement.scrollIntoView({ behavior: "smooth", block: "nearest" })
			}
		}
	}, [activeStepIndex])

	if (steps.length === 0) {
		return null
	}

	return (
		<VisualizerContainer>
			<VisualizerHeader onClick={onToggleExpand}>
				<span className={`codicon codicon-chevron-${isExpanded ? "down" : "right"}`}></span>
				<span>AI Action Timeline</span>
				<VSCodeBadge>{steps.length}</VSCodeBadge>
			</VisualizerHeader>

			{isExpanded && (
				<TimelineContainer ref={timelineRef}>
					{steps.map((step, index) => (
						<TimelineStep
							key={step.id}
							data-step-index={index}
							isActive={index === activeStepIndex}
							status={step.status}>
							<StepIcon className={`codicon codicon-${step.icon}`} status={step.status} />
							<StepContent>
								<StepDescription>{step.description}</StepDescription>
								{step.details && <StepDetails>{step.details}</StepDetails>}
								<StepStatus status={step.status}>
									{step.status === "in_progress" && (
										<span className="codicon codicon-loading codicon-modifier-spin"></span>
									)}
									{step.status === "completed" && <span className="codicon codicon-check"></span>}
									{step.status === "error" && <span className="codicon codicon-error"></span>}
									{step.status === "pending" && <span className="codicon codicon-circle-outline"></span>}
									<span>{getStatusText(step.status)}</span>
								</StepStatus>
							</StepContent>
						</TimelineStep>
					))}
				</TimelineContainer>
			)}
		</VisualizerContainer>
	)
}

// Helper functions
const getFileOperationDescription = (tool: string, path?: string): string => {
	switch (tool) {
		case "editedExistingFile":
			return `Editing file: ${path}`
		case "newFileCreated":
			return `Creating file: ${path}`
		case "readFile":
			return `Reading file: ${path}`
		case "listFilesTopLevel":
			return `Listing files in: ${path}`
		case "listFilesRecursive":
			return `Recursively listing files in: ${path}`
		case "searchFiles":
			return `Searching files in: ${path}`
		case "listCodeDefinitionNames":
			return `Analyzing code in: ${path}`
		default:
			return `File operation: ${path}`
	}
}

const getFileOperationIcon = (tool: string): string => {
	switch (tool) {
		case "editedExistingFile":
			return "edit"
		case "newFileCreated":
			return "new-file"
		case "readFile":
			return "file-code"
		case "listFilesTopLevel":
		case "listFilesRecursive":
			return "folder-opened"
		case "searchFiles":
			return "search"
		case "listCodeDefinitionNames":
			return "symbol-class"
		default:
			return "file"
	}
}

const getBrowserActionDescription = (action?: string, coordinate?: string, text?: string): string => {
	switch (action) {
		case "launch":
			return `Launching browser at ${text}`
		case "click":
			return `Clicking at position (${coordinate?.replace(",", ", ")})`
		case "type":
			return `Typing text: "${text}"`
		case "scroll_down":
			return "Scrolling down"
		case "scroll_up":
			return "Scrolling up"
		case "close":
			return "Closing browser"
		default:
			return "Browser action"
	}
}

const getBrowserActionIcon = (action?: string): string => {
	switch (action) {
		case "launch":
			return "browser"
		case "click":
			return "mouse"
		case "type":
			return "keyboard"
		case "scroll_down":
			return "arrow-down"
		case "scroll_up":
			return "arrow-up"
		case "close":
			return "close"
		default:
			return "browser"
	}
}

const getStatusText = (status: string): string => {
	switch (status) {
		case "in_progress":
			return "In progress"
		case "completed":
			return "Completed"
		case "error":
			return "Error"
		case "pending":
			return "Pending"
		default:
			return status
	}
}

// Styled components
const VisualizerContainer = styled.div`
	margin: 10px 0;
	border: 1px solid var(--vscode-editorGroup-border);
	border-radius: 3px;
	background-color: ${CODE_BLOCK_BG_COLOR};
	overflow: hidden;
`

const VisualizerHeader = styled.div`
	display: flex;
	align-items: center;
	padding: 8px 10px;
	cursor: pointer;
	user-select: none;

	&:hover {
		background-color: var(--vscode-list-hoverBackground);
	}

	& > span:first-child {
		margin-right: 8px;
	}

	& > span:nth-child(2) {
		flex-grow: 1;
		font-weight: 500;
	}
`

const TimelineContainer = styled.div`
	padding: 10px;
	max-height: 300px;
	overflow-y: auto;
	display: flex;
	flex-direction: column;
	gap: 8px;
`

interface TimelineStepProps {
	isActive: boolean
	status: string
}

const TimelineStep = styled.div<TimelineStepProps>`
	display: flex;
	padding: 8px;
	border-radius: 3px;
	background-color: ${(props) => (props.isActive ? "var(--vscode-list-activeSelectionBackground)" : "transparent")};
	color: ${(props) => (props.isActive ? "var(--vscode-list-activeSelectionForeground)" : "inherit")};

	&:hover {
		background-color: ${(props) =>
			props.isActive ? "var(--vscode-list-activeSelectionBackground)" : "var(--vscode-list-hoverBackground)"};
	}
`

interface StepIconProps {
	status: string
}

const StepIcon = styled.span<StepIconProps>`
	font-size: 16px;
	margin-right: 10px;
	color: ${(props) => {
		switch (props.status) {
			case "completed":
				return "var(--vscode-charts-green)"
			case "error":
				return "var(--vscode-errorForeground)"
			case "in_progress":
				return "var(--vscode-progressBar-background)"
			default:
				return "var(--vscode-foreground)"
		}
	}};
`

const StepContent = styled.div`
	flex-grow: 1;
	display: flex;
	flex-direction: column;
	gap: 2px;
`

const StepDescription = styled.div`
	font-weight: 500;
`

const StepDetails = styled.div`
	font-size: 12px;
	opacity: 0.8;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	max-width: 100%;
`

interface StepStatusProps {
	status: string
}

const StepStatus = styled.div<StepStatusProps>`
	display: flex;
	align-items: center;
	gap: 4px;
	font-size: 11px;
	margin-top: 2px;
	color: ${(props) => {
		switch (props.status) {
			case "completed":
				return "var(--vscode-charts-green)"
			case "error":
				return "var(--vscode-errorForeground)"
			case "in_progress":
				return "var(--vscode-progressBar-background)"
			default:
				return "var(--vscode-descriptionForeground)"
		}
	}};

	& .codicon {
		font-size: 12px;
	}
`

export default AIActionVisualizer
