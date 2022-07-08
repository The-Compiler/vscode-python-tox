import { strict as assert } from 'assert';
import * as path from 'path';

import * as vscode from 'vscode';
import * as tasks from '../../toxTaskProvider';
import * as utils from './testutils';

suite('ToxTaskProvider Test Suite', () => {
	test('getting tox tasks', async() => {
		const dir = utils.getExampleDir("allenvs");

		// make sure we started with the expected workspace, as we can't change
		// workspaces in tests:
		// https://github.com/microsoft/vscode/issues/69335
		assert.ok(vscode.workspace.workspaceFolders);
		assert.equal(path.basename(vscode.workspace.workspaceFolders[0].uri.fsPath), "allenvs");

		const toxTaskProvider = new tasks.ToxTaskProvider(dir);
		const toxTasks = await toxTaskProvider.provideTasks();
		assert.ok(toxTasks);
		// from allenvs workspace folder
		assert.equal(toxTasks[0].name, "one");
		assert.equal(toxTasks[1].name, "two");
		assert.equal(toxTasks[2].name, "three");
	});		
});
