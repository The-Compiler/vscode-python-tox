import * as vscode from 'vscode';
import * as child_process from 'child_process';
import * as util from 'util';

const exec = util.promisify(child_process.exec)

function findProjectDir() {
	const doc = vscode.window.activeTextEditor?.document.uri;
	if (!doc) {
		throw "No active window...";
	}
	const workspace = vscode.workspace.getWorkspaceFolder(doc);
	if (!workspace) {
		// FIXME use doc path?
		throw "Workspace not found...";
	}
	return workspace.uri.fsPath;
}

async function getToxEnvs() {
	const projdir = findProjectDir();
	const { stdout } = await exec('tox -a', {cwd: projdir});
	return stdout.trim().split("\n");
}

function runTox(envs: string[]) {
	const term = vscode.window.createTerminal("tox");
	const envArg = envs.join(",")
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
	let envs;
	try {
		envs = await getToxEnvs();
	} catch (error) {
		vscode.window.showErrorMessage(error.message);
		return;
	}
	const selectedEnvs = await vscode.window.showQuickPick(envs, {placeHolder: "tox environment", canPickMany: true});
	if (selectedEnvs) {
		runTox(selectedEnvs);
	}
}

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.commands.registerCommand('python-tox.select', selectCommand)
	);
}

export function deactivate() {}
