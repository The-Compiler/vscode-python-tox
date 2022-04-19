import * as vscode from 'vscode';
import * as child_process from 'child_process';
import * as util from 'util';
import * as path from 'path';
import * as os from 'os';
import { VsCodeWindow } from './abstraction/window';

const exec = util.promisify(child_process.exec);
const window = new VsCodeWindow();

function findProjectDir() {
	const docUri = window.activeTextEditor?.document.uri;
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
	const { stdout } = await exec('tox -a', {cwd: projDir});
	return stdout.trim().split(os.EOL);
}

async function safeGetToxEnvs(projDir: string) {
	try {
		return await getToxEnvs(projDir);
	} catch (error) {
		window.showErrorMessage((error as Error).message);
		return;
	}
}

function runTox(envs: string[], projDir: string) {
	const term = window.createTerminal({"cwd": projDir, "name": "tox"});
	const envArg = envs.join(",");
	term.show(true);  // preserve focus

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
	term.sendText(`tox -e ${envArg}`);
}

async function selectCommand() {
	const projDir = findProjectDir();
	const envs = await safeGetToxEnvs(projDir);
	if (!envs) {
		return;
	}
	const selected = (await window.showQuickPick(envs, {placeHolder: "tox environment"})) as string;
	if (!selected) {
		return;
	}
	runTox([selected], projDir);
}

async function selectMultipleCommand() {
	const projDir = findProjectDir();
	const envs = await safeGetToxEnvs(projDir);
	if (!envs) {
		return;
	}
	const selected = (await window.showQuickPick(envs, {placeHolder: "tox environments", canPickMany: true})) as string[];
	if (!selected) {
		return;
	}
	runTox(selected, projDir);
}

async function openDocumentationCommand() {
	vscode.env.openExternal(vscode.Uri.parse("https://tox.wiki"));
}

export function activate(context: vscode.ExtensionContext) {
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
};
