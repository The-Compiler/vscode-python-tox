import * as vscode from 'vscode';
import { getToxEnvs } from './run';

async function safeGetToxEnvs(projDir: string) {
	try {
		return await getToxEnvs(projDir);
	} catch (error) {
		vscode.window.showErrorMessage((error as Error).message);
		return;
	}
}

export async function askForToxEnv(projDir : string) {
	const envs = await safeGetToxEnvs(projDir);
	if (!envs) {
		return;
	}
	return vscode.window.showQuickPick(envs, {placeHolder: "tox environment"});
}

export async function askForToxEnvs(projDir : string) {
	const envs = await safeGetToxEnvs(projDir);
	if (!envs) {
		return;
	}
	return vscode.window.showQuickPick(envs, {placeHolder: "tox environments", canPickMany: true});
}

export async function askForToxArgs() {
	return vscode.window.showInputBox({
		title: 'Additional tox arguments',
		prompt: 'run via shell',
		placeHolder: 'e.g. [-vv] or [-- --passed-as-posargs]',
		value: ""
	});
}
