import * as path from "path"
import { ClineIgnoreController } from "../ignore/ClineIgnoreController"

/**
 * Represents a node in the file tree
 */
interface FileNode {
	name: string
	type: "file" | "directory"
	children?: FileNode[]
}

/**
 * Converts a flat list of file paths to a hierarchical tree structure
 *
 * @param files Array of file paths
 * @returns Root node of the file tree
 */
export function createFileTree(files: string[]): FileNode {
	const root: FileNode = { name: "", type: "directory", children: [] }

	for (const filePath of files) {
		const parts = filePath.split(/[/\\]/).filter(Boolean)
		let currentNode = root

		// Build the tree structure
		for (let i = 0; i < parts.length; i++) {
			const part = parts[i]
			const isFile = i === parts.length - 1
			const nodeType = isFile ? "file" : "directory"

			// Find existing node or create a new one
			let node = currentNode.children?.find((child) => child.name === part && child.type === nodeType)

			if (!node) {
				node = { name: part, type: nodeType }
				if (nodeType === "directory") {
					node.children = []
				}
				currentNode.children?.push(node)
			}

			if (!isFile) {
				currentNode = node
			}
		}
	}

	return root
}

/**
 * Formats a file tree as a string with indentation
 *
 * @param node Root node of the file tree
 * @param depth Current depth for indentation
 * @param maxDepth Maximum depth to display
 * @param maxFilesPerDir Maximum number of files to display per directory
 * @returns Formatted string representation of the file tree
 */
export function formatFileTree(node: FileNode, depth: number = 0, maxDepth: number = 4, maxFilesPerDir: number = 5): string {
	if (depth > maxDepth) {
		return `${" ".repeat(depth * 2)}... (depth limit reached)\n`
	}

	let result = ""

	if (node.type === "directory" && node.children) {
		// Sort directories first, then files
		const sortedChildren = [...node.children].sort((a, b) => {
			if (a.type === b.type) {
				return a.name.localeCompare(b.name)
			}
			return a.type === "directory" ? -1 : 1
		})

		// Count files and directories
		const dirs = sortedChildren.filter((child) => child.type === "directory")
		const files = sortedChildren.filter((child) => child.type === "file")

		// Process directories
		for (const child of dirs) {
			if (child.type === "directory") {
				result += `${" ".repeat(depth * 2)}📁 ${child.name}/\n`
				result += formatFileTree(child, depth + 1, maxDepth, maxFilesPerDir)
			}
		}

		// Process files (with limit)
		const displayedFiles = files.slice(0, maxFilesPerDir)
		const hiddenFiles = files.length - displayedFiles.length

		for (const child of displayedFiles) {
			result += `${" ".repeat(depth * 2)}📄 ${child.name}\n`
		}

		if (hiddenFiles > 0) {
			result += `${" ".repeat(depth * 2)}... (${hiddenFiles} more files)\n`
		}
	}

	return result
}

/**
 * Generates a hierarchical representation of files in a directory
 *
 * @param cwd Current working directory
 * @param files Array of file paths
 * @param clineIgnoreController ClineIgnoreController instance
 * @param maxDepth Maximum depth to display
 * @param maxFilesPerDir Maximum number of files to display per directory
 * @returns Formatted hierarchical representation of files
 */
export function getHierarchicalFileStructure(
	cwd: string,
	files: string[],
	clineIgnoreController: ClineIgnoreController,
	maxDepth: number = 4,
	maxFilesPerDir: number = 5,
): string {
	// Convert absolute paths to relative paths
	const relativePaths = files.map((file) => path.relative(cwd, file))

	// Filter paths through clineIgnoreController
	const allowedPaths = clineIgnoreController.filterPaths(relativePaths)

	// Create and format the file tree
	const fileTree = createFileTree(allowedPaths.map((p) => p.toPosix()))
	return formatFileTree(fileTree, 0, maxDepth, maxFilesPerDir)
}
