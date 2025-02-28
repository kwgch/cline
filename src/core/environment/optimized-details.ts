import * as path from "path"
import * as vscode from "vscode"
import { ClineIgnoreController } from "../ignore/ClineIgnoreController"
import { listFiles } from "../../services/glob/list-files"
import { formatResponse } from "../prompts/responses"
import { arePathsEqual } from "../../utils/path"
import * as os from "os"
import { getHierarchicalFileStructure } from "./hierarchical-file-structure"

/**
 * Options for controlling the verbosity of environment details
 */
export interface EnvironmentDetailsOptions {
	/**
	 * Whether to include file details (recursive file listing)
	 */
	includeFileDetails: boolean

	/**
	 * Maximum number of files to include in file details
	 */
	maxFiles?: number

	/**
	 * Maximum number of terminal lines to include per terminal
	 */
	maxTerminalLines?: number

	/**
	 * Whether to include inactive terminals
	 */
	includeInactiveTerminals?: boolean

	/**
	 * Whether to include diagnostics (errors and warnings)
	 */
	includeDiagnostics?: boolean

	/**
	 * Whether to use hierarchical file structure
	 */
	useHierarchicalFileStructure?: boolean

	/**
	 * Maximum depth for hierarchical file structure
	 */
	maxFileStructureDepth?: number

	/**
	 * Maximum files per directory for hierarchical file structure
	 */
	maxFilesPerDirectory?: number
}

/**
 * Default options for environment details
 */
export const DEFAULT_ENVIRONMENT_OPTIONS: EnvironmentDetailsOptions = {
	includeFileDetails: false,
	maxFiles: 100,
	maxTerminalLines: 50,
	includeInactiveTerminals: false,
	includeDiagnostics: true,
	useHierarchicalFileStructure: true,
	maxFileStructureDepth: 4,
	maxFilesPerDirectory: 5,
}

/**
 * Gets the visible files in VSCode editors
 *
 * @param cwd Current working directory
 * @param clineIgnoreController ClineIgnoreController instance
 * @returns Formatted string of visible files
 */
export async function getVisibleFiles(cwd: string, clineIgnoreController: ClineIgnoreController): Promise<string> {
	const visibleFilePaths = vscode.window.visibleTextEditors
		?.map((editor) => editor.document?.uri?.fsPath)
		.filter(Boolean)
		.map((absolutePath) => path.relative(cwd, absolutePath))

	// Filter paths through clineIgnoreController
	const allowedVisibleFiles = clineIgnoreController
		.filterPaths(visibleFilePaths)
		.map((p) => p.toPosix())
		.join("\n")

	if (allowedVisibleFiles) {
		return allowedVisibleFiles
	} else {
		return "(No visible files)"
	}
}

/**
 * Gets the open tabs in VSCode
 *
 * @param cwd Current working directory
 * @param clineIgnoreController ClineIgnoreController instance
 * @returns Formatted string of open tabs
 */
export async function getOpenTabs(cwd: string, clineIgnoreController: ClineIgnoreController): Promise<string> {
	const openTabPaths = vscode.window.tabGroups.all
		.flatMap((group) => group.tabs)
		.map((tab) => (tab.input as vscode.TabInputText)?.uri?.fsPath)
		.filter(Boolean)
		.map((absolutePath) => path.relative(cwd, absolutePath))

	// Filter paths through clineIgnoreController
	const allowedOpenTabs = clineIgnoreController
		.filterPaths(openTabPaths)
		.map((p) => p.toPosix())
		.join("\n")

	if (allowedOpenTabs) {
		return allowedOpenTabs
	} else {
		return "(No open tabs)"
	}
}

/**
 * Gets the file details for the current working directory
 *
 * @param cwd Current working directory
 * @param clineIgnoreController ClineIgnoreController instance
 * @param options Options for file details
 * @returns Formatted string of file details
 */
export async function getFileDetails(
	cwd: string,
	clineIgnoreController: ClineIgnoreController,
	options: {
		maxFiles?: number
		useHierarchicalFileStructure?: boolean
		maxFileStructureDepth?: number
		maxFilesPerDirectory?: number
	} = {},
): Promise<string> {
	const { maxFiles = 100, useHierarchicalFileStructure = true, maxFileStructureDepth = 4, maxFilesPerDirectory = 5 } = options

	const isDesktop = arePathsEqual(cwd, path.join(os.homedir(), "Desktop"))
	if (isDesktop) {
		// don't want to immediately access desktop since it would show permission popup
		return "(Desktop files not shown automatically. Use list_files to explore if needed.)"
	} else {
		const [files, didHitLimit] = await listFiles(cwd, true, maxFiles)

		if (useHierarchicalFileStructure) {
			let result = getHierarchicalFileStructure(
				cwd,
				files,
				clineIgnoreController,
				maxFileStructureDepth,
				maxFilesPerDirectory,
			)

			if (didHitLimit) {
				result += `\n(Showing ${files.length} files. File limit reached. There may be more files not shown.)`
			}

			return result
		} else {
			return formatResponse.formatFilesList(cwd, files, didHitLimit, clineIgnoreController)
		}
	}
}

/**
 * Gets the current time information with timezone
 *
 * @returns Formatted string of current time
 */
export function getCurrentTimeInfo(): string {
	const now = new Date()
	const formatter = new Intl.DateTimeFormat(undefined, {
		year: "numeric",
		month: "numeric",
		day: "numeric",
		hour: "numeric",
		minute: "numeric",
		second: "numeric",
		hour12: true,
	})
	const timeZone = formatter.resolvedOptions().timeZone
	const timeZoneOffset = -now.getTimezoneOffset() / 60 // Convert to hours and invert sign to match conventional notation
	const timeZoneOffsetStr = `${timeZoneOffset >= 0 ? "+" : ""}${timeZoneOffset}:00`
	return `${formatter.format(now)} (${timeZone}, UTC${timeZoneOffsetStr})`
}

/**
 * Gets the terminal details
 *
 * @param terminalManager TerminalManager instance
 * @param didEditFile Whether a file was edited
 * @param options Options for terminal details
 * @returns Formatted string of terminal details
 */
export async function getTerminalDetails(
	terminalManager: any,
	didEditFile: boolean,
	options: {
		maxTerminalLines?: number
		includeInactiveTerminals?: boolean
	} = {},
): Promise<string> {
	const { maxTerminalLines = 50, includeInactiveTerminals = false } = options

	const busyTerminals = terminalManager.getTerminals(true)
	const inactiveTerminals = terminalManager.getTerminals(false)

	let terminalDetails = ""

	if (busyTerminals.length > 0) {
		terminalDetails += "\n\n# Actively Running Terminals"
		for (const busyTerminal of busyTerminals) {
			terminalDetails += `\n## Original command: \`${busyTerminal.lastCommand}\``
			let newOutput = terminalManager.getUnretrievedOutput(busyTerminal.id)

			// Truncate output if it's too long
			if (newOutput) {
				const lines = newOutput.split("\n")
				if (lines.length > maxTerminalLines) {
					newOutput = [
						...lines.slice(0, maxTerminalLines / 2),
						`\n[... ${lines.length - maxTerminalLines} lines omitted for brevity ...]\n`,
						...lines.slice(lines.length - maxTerminalLines / 2),
					].join("\n")
				}
				terminalDetails += `\n### New Output\n${newOutput}`
			}
		}
	}

	// only show inactive terminals if there's output to show and we're configured to include them
	if (inactiveTerminals.length > 0 && includeInactiveTerminals) {
		const inactiveTerminalOutputs = new Map<number, string>()
		for (const inactiveTerminal of inactiveTerminals) {
			const newOutput = terminalManager.getUnretrievedOutput(inactiveTerminal.id)
			if (newOutput) {
				inactiveTerminalOutputs.set(inactiveTerminal.id, newOutput)
			}
		}
		if (inactiveTerminalOutputs.size > 0) {
			terminalDetails += "\n\n# Inactive Terminals"
			for (const [terminalId, newOutput] of inactiveTerminalOutputs) {
				const inactiveTerminal = inactiveTerminals.find((t: any) => t.id === terminalId)
				if (inactiveTerminal) {
					terminalDetails += `\n## ${inactiveTerminal.lastCommand}`

					// Truncate output if it's too long
					let truncatedOutput = newOutput
					const lines = newOutput.split("\n")
					if (lines.length > maxTerminalLines) {
						truncatedOutput = [
							...lines.slice(0, maxTerminalLines / 2),
							`\n[... ${lines.length - maxTerminalLines} lines omitted for brevity ...]\n`,
							...lines.slice(lines.length - maxTerminalLines / 2),
						].join("\n")
					}

					terminalDetails += `\n### New Output\n${truncatedOutput}`
				}
			}
		}
	}

	return terminalDetails
}

/**
 * Gets the mode information (ACT or PLAN)
 *
 * @param mode The current mode
 * @returns Formatted string of mode information
 */
export function getModeInfo(mode: string): string {
	let modeInfo = ""

	if (mode === "plan") {
		modeInfo += "PLAN MODE"
		modeInfo +=
			"\nIn this mode you should focus on information gathering, asking questions, and architecting a solution. Once you have a plan, use the plan_mode_response tool to engage in a conversational back and forth with the user. Do not use the plan_mode_response tool until you've gathered all the information you need e.g. with read_file or ask_followup_question."
		modeInfo +=
			'\n(Remember: If it seems the user wants you to use tools only available in Act Mode, you should ask the user to "toggle to Act mode" (use those words) - they will have to manually do this themselves with the Plan/Act toggle button below. You do not have the ability to switch to Act Mode yourself, and must wait for the user to do it themselves once they are satisfied with the plan.)'
	} else {
		modeInfo += "ACT MODE"
	}

	return modeInfo
}

/**
 * Generates optimized environment details with controlled verbosity
 *
 * @param cwd Current working directory
 * @param clineIgnoreController ClineIgnoreController instance
 * @param terminalManager TerminalManager instance
 * @param didEditFile Whether a file was edited
 * @param chatSettings Chat settings
 * @param options Options for controlling verbosity
 * @returns Formatted environment details
 */
export async function getOptimizedEnvironmentDetails(
	cwd: string,
	clineIgnoreController: ClineIgnoreController,
	terminalManager: any,
	didEditFile: boolean,
	chatSettings: any,
	options: EnvironmentDetailsOptions = DEFAULT_ENVIRONMENT_OPTIONS,
): Promise<string> {
	let details = ""

	// Add visible files
	details += "\n\n# VSCode Visible Files"
	details += "\n" + (await getVisibleFiles(cwd, clineIgnoreController))

	// Add open tabs
	details += "\n\n# VSCode Open Tabs"
	details += "\n" + (await getOpenTabs(cwd, clineIgnoreController))

	// Add terminal details
	const terminalDetails = await getTerminalDetails(terminalManager, didEditFile, {
		maxTerminalLines: options.maxTerminalLines,
		includeInactiveTerminals: options.includeInactiveTerminals,
	})

	if (terminalDetails) {
		details += terminalDetails
	}

	// Add current time information
	details += "\n\n# Current Time"
	details += "\n" + getCurrentTimeInfo()

	// Add file details if requested
	if (options.includeFileDetails) {
		details += `\n\n# Current Working Directory (${cwd.toPosix()}) Files\n`
		details += await getFileDetails(cwd, clineIgnoreController, {
			maxFiles: options.maxFiles,
			useHierarchicalFileStructure: options.useHierarchicalFileStructure,
			maxFileStructureDepth: options.maxFileStructureDepth,
			maxFilesPerDirectory: options.maxFilesPerDirectory,
		})
	}

	// Add mode information
	details += "\n\n# Current Mode"
	details += "\n" + getModeInfo(chatSettings.mode)

	return `<environment_details>\n${details.trim()}\n</environment_details>`
}
