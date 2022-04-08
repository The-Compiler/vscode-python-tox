import * as vscode from 'vscode';
import * as child_process from 'child_process';
import * as util from 'util';
import * as path from 'path';
import * as os from 'os';

const exec = util.promisify(child_process.exec);

function findProjectDir() {
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

async function getToxEnvs(projDir: string) {
	console.log(projDir);
	const { stdout } = await exec('tox -a', {cwd: projDir});
	return stdout.trim().split(os.EOL);
}

async function safeGetToxEnvs(projDir: string) {
	try {
		return await getToxEnvs(projDir);
	} catch (error) {
		vscode.window.showErrorMessage((error as Error).message);
		return;
	}
}

function runTox(envs: string[], toxArguments: string, terminal: vscode.Terminal = getTerminal() ) {
	const envArg = envs.join(",");
	terminal.show(true);  // preserve focus

	// FIXME In theory, there's a command injection here, if an environment name
	// contains shell metacharacters. However:
	// - Escaping the argument in a shell-agnostic way is hard:
	//   https://github.com/microsoft/vscode/blob/1.57.0/src/vs/workbench/contrib/debug/node/terminals.ts#L84-L211
	// - The environment names are coming from the tox config via "tox -l", so
	//   if someone could configure a malicious environment, they could as well
	//   just tell tox to run malicious commands.
	// - We don't run on untrusted workspaces.
	// - The user actively picks the environment name to be run.
	// - Real tox environment names are very unlikely to accidentally contain
	//   such characters - in fact, using spaces in env names seems to not work
	//   properly at all.
	let terminalCommand = `tox ${toxArguments} -e ${envArg}`;
	terminal.sendText(terminalCommand);
}

function getTerminal(projDir : string = findProjectDir(), name : string = "tox") : vscode.Terminal {
	return vscode.window.createTerminal({"cwd": projDir, "name": name});
}

async function selectCommand() {
	const projDir = findProjectDir();
	const envs = await safeGetToxEnvs(projDir);
	if (!envs) {
		return;
	}
	const selected = await vscode.window.showQuickPick(envs, {placeHolder: "tox environment"});
	if (!selected) {
		return;
	}

	const toxArguments = await vscode.window.showInputBox({ prompt: 'Input additional flags in plain text, e.g. -vv', value: ""});
	
	// Only cancel on escape (undefined), allow empty string to proceed.
	if (toxArguments === undefined) {
		return;
	}

	runTox([selected], toxArguments, getTerminal(projDir));
}

async function selectMultipleCommand() {
	const projDir = findProjectDir();
	const envs = await safeGetToxEnvs(projDir);
	if (!envs) {
		return;
	}
	const selected = await vscode.window.showQuickPick(envs, {placeHolder: "tox environments", canPickMany: true});
	if (!selected) {
		return;
	}
	runTox(selected, "", getTerminal(projDir));
}

async function openDocumentationCommand() {
	vscode.env.openExternal(vscode.Uri.parse("https://tox.wiki"));
}

export function activate(context: vscode.ExtensionContext) {
	const controller = vscode.tests.createTestController('toxTestController', 'Tox Testing');
	context.subscriptions.push(controller);

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

	const runProfile = controller.createRunProfile(
		'Run',
		vscode.TestRunProfileKind.Run,
		(request, token) => {
			runHandler(false, request, token);
		}
	);
	
	// When text documents are open, parse tests in them.
	vscode.workspace.onDidOpenTextDocument(parseTestsInDocument);
	
	// We could also listen to document changes to re-parse unsaved changes:
	vscode.workspace.onDidSaveTextDocument(document => parseTestsInDocument(document));

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
	
		const file = controller.createTestItem(uri.toString(), uri.path.split('/').pop()!, uri);
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
		if (e.uri.scheme === 'file' && e.uri.path.endsWith(filename)) {
			const file = getOrCreateFile(e.uri);
			const content = e.getText();

			// Empty existing children
			file.children.forEach(element => {
				file.children.delete(element.id);
			});

			const listOfChildren = await parseTestsInFileContents(file, content);
			listOfChildren.forEach((testItem) => {
				file.children.add(testItem);
			});
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

		const testRegex = /(\[testenv):(.*)\]/gm;  // made with https://regex101.com
		let lines = contents.split('\n');

		for (let lineNo = 0; lineNo < lines.length; lineNo++) {
			let line = lines[lineNo];
    		let regexResult = testRegex.exec(line);

			// Excluding tox permutations for now
			if (regexResult && !regexResult[2].includes('{')) {
				let range = new vscode.Range(new vscode.Position(lineNo, 0), new vscode.Position(lineNo, regexResult[0].length));
				
				const newTestItem = controller.createTestItem(regexResult[2], regexResult[2], file.uri);
				newTestItem.range = range;

				listOfChildren.push(newTestItem);
			}
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

	context.subscriptions.push(
		vscode.commands.registerCommand('python-tox.select', selectCommand),
		vscode.commands.registerCommand('python-tox.selectMultiple', selectMultipleCommand),
		vscode.commands.registerCommand('python-tox.openDocs', openDocumentationCommand)
	);
}

export function deactivate() {}

// For testing, before we move this to a utils.ts
export const _private = {
	getToxEnvs,
	runTox,
	getTerminal
};
