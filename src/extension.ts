// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as child_process from 'child_process';
import * as util from 'util';

const exec = util.promisify(child_process.exec)

async function getToxEnvs() {
	const doc = vscode.window.activeTextEditor?.document.uri;
	if (!doc) {
		throw "No active window...";
	}
	const workspace = vscode.workspace.getWorkspaceFolder(doc);
	if (!workspace) {
		// FIXME use doc path?
		throw "Workspace not found...";
	}
	const projdir = workspace.uri.fsPath;

	const { stdout } = await exec('tox -l', {cwd: projdir});
	return stdout.split("\n");
}

function runTox(envs: string[]) {
	const term = vscode.window.createTerminal("tox");
	const envArg = envs.join(",")
	term.show(true);  // preserve focus
	term.sendText(`tox -e ${envArg}`);
}

export function activate(context: vscode.ExtensionContext) {
	let disposable = vscode.commands.registerCommand('python-tox.select', async () => {
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
	});

	context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}
