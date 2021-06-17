import { strict as assert } from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import * as extension from '../../extension';
import * as path from 'path';
import * as fs from 'fs';

function getExampleDirUri(name: string) {
    const dir = path.join(__dirname, '..', '..', '..', 'src', 'test', 'examples', name);
    assert.ok(fs.existsSync(dir));
	return vscode.Uri.file(dir);
}

function getExampleFileUri(name: string, file: string) {
    const uri = getExampleDirUri(name);
    const filePath = path.join(uri.fsPath, file);
    assert.ok(fs.existsSync(filePath));
	return vscode.Uri.file(filePath);
}

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	test('getting tox environments', async () => {
		const uri = getExampleDirUri("simple");
		const envs = await extension._private.getToxEnvs(uri.fsPath);
		assert.equal(envs, ["one", "two"]);
	});

	test('make sure we have all tox environments', async () => {
		const uri = getExampleDirUri("allenvs");
		const envs = await extension._private.getToxEnvs(uri.fsPath);
		assert.equal(envs, ["one", "two", "three"]);
	});
});
