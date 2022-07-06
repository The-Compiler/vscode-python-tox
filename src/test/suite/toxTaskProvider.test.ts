import { doesNotMatch, strict as assert } from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import * as tasks from '../../toxTaskProvider';
import * as utils from './utils';

async function waitForWorkspaceFolderChange() {
	return new Promise<void>(resolve => {
		let disposable = vscode.workspace.onDidChangeWorkspaceFolders(() => {
			disposable.dispose();
			resolve();
		});
	});
}

suite('ToxTaskProvider Test Suite', () => {

	vscode.window.showInformationMessage('Start all tests.');

	test('getting tox tasks', async() => {
		const dir = utils.getExampleDir("allenvs");

		//const allEnvsWorkspaceFolder = {
		//	uri: vscode.Uri.file(dir),
		//	name: "AllEnvs",
		//	index: 0,
		//};

		//vscode.workspace.updateWorkspaceFolders(0, 1, allEnvsWorkspaceFolder);
		//if (!vscode.workspace.workspaceFolders) {
		//	await waitForWorkspaceFolderChange();
		//}

		const toxTaskProvider = new tasks.ToxTaskProvider(dir);
		const toxTasks = await toxTaskProvider.provideTasks();
		assert.equal(toxTasks?.length, 3);
		assert.equal(toxTasks[0].name, "one");
		assert.equal(toxTasks[1].name, "two");
		assert.equal(toxTasks[2].name, "three");
	});		
});
