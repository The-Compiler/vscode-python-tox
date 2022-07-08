import * as utils from './utils';
import { runTox } from './run';
import * as ui from './ui';
import * as vscode from 'vscode';

export async function select() {
	const projDir = utils.findProjectDir();
	const selected = await ui.askForToxEnv(projDir);
	if (!selected) {
		return;
	}

	runTox([selected], "", utils.getTerminal(projDir));
}

export async function selectWithArgs() {
	const projDir = utils.findProjectDir();
	const selected = await ui.askForToxEnv(projDir);
	if (!selected) {
		return;
	}

	const toxArguments = await ui.askForToxArgs();
	// Only cancel on escape (undefined), allow empty string to proceed.
	if (toxArguments === undefined) {
		return;
	}

	runTox([selected], toxArguments, utils.getTerminal(projDir));
}

export async function selectMultiple() {
	const projDir = utils.findProjectDir();
	const selected = await ui.askForToxEnvs(projDir);
	if (!selected) {
		return;
	}

	runTox(selected, "", utils.getTerminal(projDir));
}

export async function selectMultipleWithArgs() {
	const projDir = utils.findProjectDir();
	const selected = await ui.askForToxEnvs(projDir);
	if (!selected) {
		return;
	}

	const toxArguments = await ui.askForToxArgs();
	// Only cancel on escape (undefined), allow empty string to proceed.
	if (toxArguments === undefined) {
		return;
	}

	runTox(selected, toxArguments, utils.getTerminal(projDir));
}

export async function openDocumentation() {
	vscode.env.openExternal(vscode.Uri.parse("https://tox.wiki"));
}
