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
	let terminalCommand = `tox -e ${envArg} ${toxArguments}`;
	terminal.sendText(terminalCommand);
}

function getTerminal(projDir : string = findProjectDir(), name : string = "tox") : vscode.Terminal {
	return vscode.window.createTerminal({"cwd": projDir, "name": name});
}

async function askForToxEnv(projDir : string) {
	const envs = await safeGetToxEnvs(projDir);
	if (!envs) {
		return;
	}
	return vscode.window.showQuickPick(envs, {placeHolder: "tox environment"});
}

async function askForToxEnvs(projDir : string) {
	const envs = await safeGetToxEnvs(projDir);
	if (!envs) {
		return;
	}
	return vscode.window.showQuickPick(envs, {placeHolder: "tox environments", canPickMany: true});
}

async function askForToxArgs() {
	return vscode.window.showInputBox({ prompt: 'Input additional flags in plain text, e.g. [-vv] [-- {posargs}]', value: ""});
}

async function selectCommand() {
	const projDir = findProjectDir();
	const selected = await askForToxEnv(projDir);
	if (!selected) {
		return;
	}

	runTox([selected], "", getTerminal(projDir));
}

async function selectWithArgsCommand() {
	const projDir = findProjectDir();
	const selected = await askForToxEnv(projDir);
	if (!selected) {
		return;
	}

	const toxArguments = await askForToxArgs();
	// Only cancel on escape (undefined), allow empty string to proceed.
	if (toxArguments === undefined) {
		return;
	}

	runTox([selected], toxArguments, getTerminal(projDir));
}

async function selectMultipleCommand() {
	const projDir = findProjectDir();
	const selected = await askForToxEnvs(projDir);
	if (!selected) {
		return;
	}

	runTox(selected, "", getTerminal(projDir));
}

async function selectMultipleWithArgsCommand() {
	const projDir = findProjectDir();
	const selected = await askForToxEnvs(projDir);
	if (!selected) {
		return;
	}

	const toxArguments = await askForToxArgs();
	// Only cancel on escape (undefined), allow empty string to proceed.
	if (toxArguments === undefined) {
		return;
	}

	runTox(selected, toxArguments, getTerminal(projDir));
}

async function openDocumentationCommand() {
	vscode.env.openExternal(vscode.Uri.parse("https://tox.wiki"));
}

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.commands.registerCommand('python-tox.select', selectCommand),
		vscode.commands.registerCommand('python-tox.selectWithArgs', selectWithArgsCommand),
		vscode.commands.registerCommand('python-tox.selectMultiple', selectMultipleCommand),
		vscode.commands.registerCommand('python-tox.selectMultipleWithArgs', selectMultipleWithArgsCommand),
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
