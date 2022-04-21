// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import * as extension from '../../extension';
import * as path from 'path';
import * as fs from 'fs';
import { EnvironmentVariablesService } from '../../environment_variables_service';
import { mock, verify, instance, when } from 'ts-mockito';
import { strict as assert } from 'assert';

function getExampleDir(name: string) {
	const dir = path.join(__dirname, '..', '..', '..', 'src', 'test', 'examples', name);
	assert.ok(fs.existsSync(dir));
	return dir;
}

function getExampleToxIniPath(sampleName: string): string {
	// Build path to tox.ini file.
	const exampleDir = getExampleDir(sampleName);
	const toxIniPath = path.join(exampleDir, 'tox.ini');

	return toxIniPath;
}

function getSampleToxContent(sampleName: string): string {
	const toxIniPath = getExampleToxIniPath(sampleName);

	// Read tox.ini file.
	const toxIniContent = fs.readFileSync(toxIniPath, 'utf8');

	return toxIniContent;
}

async function waitForTerminal() {
	return new Promise<vscode.Terminal>(resolve => {
		let disposable = vscode.window.onDidOpenTerminal(terminal => {
			disposable.dispose();
			resolve(terminal);
		});
	});
}

async function waitForMarker(dir: string) {
	return new Promise<void>(resolve => {
		fs.watch(dir, (eventType: string, filename: string) => {
			if (eventType === "rename" && filename === "tox-did-run") {
				resolve();
			}
		});
	});
}

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	test('getting tox environments', async () => {
		const dir = getExampleDir("simple");
		const envs = await extension._private.getToxEnvs(dir);
		assert.deepEqual(envs, ["one", "two"]);
	});

	test('make sure we have all tox environments', async () => {
		const dir = getExampleDir("allenvs");
		const envs = await extension._private.getToxEnvs(dir);
		assert.deepEqual(envs, ["one", "two", "three"]);
	});

	test('running tox', async () => {
		const dir = getExampleDir("end2end");

		const tmpdir = path.join(dir, ".tox", "tmp");
		const marker = path.join(tmpdir, "tox-did-run");
		fs.mkdirSync(tmpdir, { recursive: true });
		fs.rmSync(marker, { force: true });

		await extension._private.runTox(["test"], dir);
		const terminal = await waitForTerminal();
		assert.equal(terminal.name, "tox");

		await waitForMarker(tmpdir);
		assert.ok(fs.existsSync(marker));
	});

	test('get NO hover message on NO env var position', async () => {
		// Arrange

		// A text document containing a sample tox.ini file.
		const toxIniPath = getExampleToxIniPath("envvars");
		const textDocument = await vscode.workspace.openTextDocument(toxIniPath);

		// A position which DOES NOT reference a variable set by passenv or setenv.
		// Properties line and character in Position are zero-based, VS Code UI is one-based.
		const position = new vscode.Position(1, 4);

		// Act

		const environmentVariablesService = new EnvironmentVariablesService();
		let resultUpdate = environmentVariablesService.updateAllEnvironmentVariables(textDocument);
		let hoverMessage = environmentVariablesService.generateHoverMessage(textDocument, position);

		// Assert

		assert.equal(resultUpdate, true, 'Environment variables in the sample tox.ini file should have been found.');
		assert.equal(hoverMessage, null, 'For the given position NO hover message should have been returned.');
	});

	test('get hover message on passenv var position', async () => {
		// Arrange
		// A text document containing a sample tox.ini file.
		const toxIniPath = getExampleToxIniPath("envvars");
		const textDocument = await vscode.workspace.openTextDocument(toxIniPath);

		// A position which DOES reference a variable set by passenv or setenv.
		// Properties line and character in Position are zero-based, VS Code UI is one-based.
		const position = new vscode.Position(11, 13);

		// Act

		const environmentVariablesService = new EnvironmentVariablesService();
		let resultUpdate = environmentVariablesService.updateAllEnvironmentVariables(textDocument);
		let hoverMessage = environmentVariablesService.generateHoverMessage(textDocument, position);

		// Assert

		assert.equal(resultUpdate, true, 'Environment variables in the sample tox.ini file should have been found.');
		assert.notEqual(hoverMessage, null);

		const testPassEnvName = "PWD";
		const testPassEnvValue = process.env[testPassEnvName];
		const expectedHoverMessage = `${testPassEnvName}: '${testPassEnvValue}'`;

		assert.equal(hoverMessage && hoverMessage[0].value, expectedHoverMessage, `For the given position the expected hover message is: '${expectedHoverMessage}'.`);
	});

	test('get hover message on setenv var position', async () => {
		// Arrange
		// A text document containing a sample tox.ini file.
		const toxIniPath = getExampleToxIniPath("envvars");
		const textDocument = await vscode.workspace.openTextDocument(toxIniPath);

		// A position which DOES reference a variable set by passenv or setenv.
		// Properties line and character in Position are zero-based, VS Code UI is one-based.
		const position = new vscode.Position(12, 20);

		// Act

		const environmentVariablesService = new EnvironmentVariablesService();
		let resultUpdate = environmentVariablesService.updateAllEnvironmentVariables(textDocument);
		let hoverMessage = environmentVariablesService.generateHoverMessage(textDocument, position);

		// Assert

		assert.equal(resultUpdate, true, 'Environment variables in the sample tox.ini file should have been found.');
		assert.notEqual(hoverMessage, null);

		const expectedHoverMessage = "LOCALUI_OUTPUT_PATH: './tests/.output'";
		assert.equal(hoverMessage && hoverMessage[0].value, expectedHoverMessage, `For the given position the expected hover message is: '${expectedHoverMessage}'.`);
	});


});
