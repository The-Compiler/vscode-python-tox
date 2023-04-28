import * as vscode from 'vscode';
import * as path from 'path';

export function findProjectDir() {
	const docUri = vscode.window.activeTextEditor?.document.uri;
	if (!docUri) {
		throw new Error("No active editor found.");
	}

	const workspace = vscode.workspace.getWorkspaceFolder(docUri);
	if (workspace) {
		const folder = workspace.uri.fsPath;
		console.log(`tox workspace folder: ${folder}`);
		return folder;
	}

	const docPath = docUri.fsPath;
	const docDir = path.dirname(docPath);
	console.log(`tox doc path: ${docPath} -> ${docDir}`);
	return docDir;
}

/**
 * Get a new terminal or use an existing one with the same name.
 * @param projDir The directory of the project.
 * @param name The name of the terminal
 * @returns The terminal to run commands on.
 */
export function getTerminal(projDir : string = findProjectDir(), name : string = "tox") : vscode.Terminal {
	for (const terminal of vscode.window.terminals) {
		if (terminal.name === name){
			return terminal;
		}
	}
	return vscode.window.createTerminal({"cwd": projDir, "name": name});
}

/**
 * Get the top-most parent label (+ description) for terminal name
 * @param test The test to start from.
 * @returns The label and description of the root test item.
 */
export function getRootParentLabelDesc(test: vscode.TestItem) : string {
	let root = test;

	while (root.parent !== undefined){
		root = root.parent;
	}

	return root.label + " " + root.description; // FIXME: return as tuple?
}
