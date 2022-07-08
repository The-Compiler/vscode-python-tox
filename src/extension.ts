import * as vscode from 'vscode';

import { EnvironmentVariablesService } from './environment_variables_service';
import { ToxTaskProvider } from './toxTaskProvider';
import { findProjectDir } from './utils';
import * as commands from './commands';
import * as testController from './testController';

let toxTaskProvider: vscode.Disposable | undefined;

export function activate(context: vscode.ExtensionContext) {
	const controller = testController.create();
	context.subscriptions.push(controller);

	const workspaceTox = findProjectDir();
	if (workspaceTox) {
		toxTaskProvider = vscode.tasks.registerTaskProvider(ToxTaskProvider.toxType, new ToxTaskProvider(workspaceTox));
	}

	const environmentVariablesService = new EnvironmentVariablesService();
	const hoverProvider = vscode.languages.registerHoverProvider(['ini'], environmentVariablesService);
	context.subscriptions.push(hoverProvider);

	context.subscriptions.push(
		vscode.commands.registerCommand('python-tox.select', commands.select),
		vscode.commands.registerCommand('python-tox.selectWithArgs', commands.selectWithArgs),
		vscode.commands.registerCommand('python-tox.selectMultiple', commands.selectMultiple),
		vscode.commands.registerCommand('python-tox.selectMultipleWithArgs', commands.selectMultipleWithArgs),
		vscode.commands.registerCommand('python-tox.openDocs', commands.openDocumentation),
	);

}

export function deactivate() {

	if (toxTaskProvider) {
		toxTaskProvider.dispose();
	}

}
