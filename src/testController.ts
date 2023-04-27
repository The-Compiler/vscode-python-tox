import * as vscode from 'vscode';
import * as path from 'path';
import * as util from 'util';
import { runTox } from './run';

export function create() {
	const controller = vscode.tests.createTestController('toxTestController', 'Tox Testing');

	controller.resolveHandler = async (test) => {
		if (!test) {
			await discoverAllFilesInWorkspace();
		}
		else {
			await parseTestsInFileContents(test);
		}
	};

	async function runHandler(
		shouldDebug: boolean,
		request: vscode.TestRunRequest,
		token: vscode.CancellationToken)
	{
		const run = controller.createTestRun(request);
		const queue: vscode.TestItem[] = [];

		if (request.include) {
			request.include.forEach(test => queue.push(test));
		}

		while (queue.length > 0 && !token.isCancellationRequested) {
			const test = queue.pop()!;

			// Skip tests the user asked to exclude
			if (request.exclude?.includes(test)) {
				continue;
			}

			const start = Date.now();
			try {
				const cwd = vscode.workspace.getWorkspaceFolder(test.uri!)!.uri.path;
				runTox([test.label], cwd);
				run.passed(test, Date.now() - start);
			}
			catch (e: any) {
				run.failed(test, new vscode.TestMessage(e.message), Date.now() - start);
			}
		}

		// Make sure to end the run after all tests have been executed:
		run.end();
	}

	controller.createRunProfile(
		'Run',
		vscode.TestRunProfileKind.Run,
		(request, token) => {
			runHandler(false, request, token);
		}
	);

	// Check all existing documents
	for (const document of vscode.workspace.textDocuments) {
		parseTestsInDocument(document);
	}

	// Check for tox.ini files when a new document is opened or saved.
	vscode.workspace.onDidOpenTextDocument(parseTestsInDocument);
	vscode.workspace.onDidSaveTextDocument(parseTestsInDocument);

	/**
	 * In this function, we'll get the file TestItem if we've already found it,
	 * otherwise we'll create it with `canResolveChildren = true` to indicate it
	 * can be passed to the `controller.resolveHandler` to gets its children.
	 * @param uri	The uri of the file to get or create
	 * @returns vscode.TestItem
	 */
	function getOrCreateFile(uri: vscode.Uri): vscode.TestItem
	{
		const existing = controller.items.get(uri.toString());
		if (existing) {
			return existing;
		}

		let splittedPath = uri.path.split('/');
		const file = controller.createTestItem(uri.toString(), splittedPath.pop()!, uri);
		file.description = "(" + splittedPath.pop()! + ")";
		controller.items.add(file);

		file.canResolveChildren = true;
		return file;
	}

	/**
	 * Parses for tests in the document.
	 * @param e	The provided document
	 * @param filename	The name of the file to look for. Default = tox.ini
	 */
	async function parseTestsInDocument(e: vscode.TextDocument, filename: string = 'tox.ini') {
		if (e.uri.scheme === 'file' && path.basename(e.uri.fsPath) === filename) {
			const file = getOrCreateFile(e.uri);
			const content = e.getText();

			const listOfChildren = await parseTestsInFileContents(file, content);
			file.children.replace(listOfChildren);
		}
	}

	/**
	 * Parses the file to fill in the test.children from the contents
	 * @param file The file to parse
	 * @param contents The contents of the file
	 */
	async function parseTestsInFileContents(file: vscode.TestItem, contents?: string): Promise<vscode.TestItem[]> {
		if (contents === undefined) {
			const rawContent = await vscode.workspace.fs.readFile(file.uri!);
			contents = new util.TextDecoder().decode(rawContent);
		}

		let listOfChildren: vscode.TestItem[] = [];

		const testRegex = /^(\[testenv):(.*)\]/gm;  // made with https://regex101.com
		let lines = contents.split('\n');

		for (let lineNo = 0; lineNo < lines.length; lineNo++) {
			let line = lines[lineNo];
			let regexResult = testRegex.exec(line);
			if (!regexResult) {
				continue;
			}

			let envName = regexResult[2];
			if (envName.includes('{')) {
				// Excluding tox permutations for now
				continue;
			}

			const newTestItem = controller.createTestItem(envName, envName, file.uri);
			newTestItem.range = new vscode.Range(
				new vscode.Position(lineNo, 0),
				new vscode.Position(lineNo, regexResult[0].length)
			);

			listOfChildren.push(newTestItem);
		}

		return listOfChildren;
	}

	async function discoverAllFilesInWorkspace() {
		if (!vscode.workspace.workspaceFolders) {
			return []; // handle the case of no open folders
		}

		return Promise.all(
			vscode.workspace.workspaceFolders.map(async workspaceFolder => {
				const pattern = new vscode.RelativePattern(workspaceFolder, 'tox.ini');
				const watcher = vscode.workspace.createFileSystemWatcher(pattern);

				// When files are created, make sure there's a corresponding "file" node in the tree
				watcher.onDidCreate(uri => getOrCreateFile(uri));
				// When files change, re-parse them. Note that you could optimize this so
				// that you only re-parse children that have been resolved in the past.
				watcher.onDidChange(uri => parseTestsInFileContents(getOrCreateFile(uri)));
				// And, finally, delete TestItems for removed files. This is simple, since
				// we use the URI as the TestItem's ID.
				watcher.onDidDelete(uri => controller.items.delete(uri.toString()));

				for (const file of await vscode.workspace.findFiles(pattern)) {
					getOrCreateFile(file);
				}

				return watcher;
			})
		);
	}

	return controller;
}
