// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import * as extension from '../../extension';
import * as path from 'path';
import * as fs from 'fs';
import { EnvironmentVariablesService } from '../../environment_variables_service';
import { mock, verify, instance, when } from 'ts-mockito';
import { strict as assert } from 'assert';
import * as utils from './utils';

function getExampleToxIniPath(sampleName: string): string {
	// Build path to tox.ini file.
	const exampleDir = utils.getExampleDir(sampleName);
	const toxIniPath = path.join(exampleDir, 'tox.ini');

	return toxIniPath;
}

function getSampleToxContent(sampleName: string): string {
	const toxIniPath = getExampleToxIniPath(sampleName);

	// Read tox.ini file.
	const toxIniContent = fs.readFileSync(toxIniPath, 'utf8');

	return toxIniContent;
}

function constructExpectedHoverMessage(sectionName: string, varName: string, varValue: string) {
	const expectedHoverMessage = `[${sectionName}] ${varName}: '${varValue}'`;

	return expectedHoverMessage;
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
		const dir = utils.getExampleDir("simple");
		const envs = await extension._private.getToxEnvs(dir);
		assert.deepEqual(envs, ["one", "two"]);
	});

	test('make sure we have all tox environments', async () => {
		const dir = utils.getExampleDir("allenvs");
		const envs = await extension._private.getToxEnvs(dir);
		assert.deepEqual(envs, ["one", "two", "three"]);
	});

	test('running tox', async () => {
		const dir = utils.getExampleDir("end2end");

		const tmpdir = path.join(dir, ".tox", "tmp");
		const marker = path.join(tmpdir, "tox-did-run");
		fs.mkdirSync(tmpdir, { recursive: true });
		fs.rmSync(marker, { force: true });

		await extension._private.runTox(["test"], "", extension._private.getTerminal(dir));
		const terminal = await waitForTerminal();
		assert.equal(terminal.name, "tox");

		await waitForMarker(tmpdir);
		assert.ok(fs.existsSync(marker));
	});

	test('running tox with arguments', () => {
		let mockedTerminal : vscode.Terminal = mock<vscode.Terminal>();

		const envs = ["test"];
		const toxArguments = "-v";

		const envArg = envs.join(",");
		const terminalCommand = `tox -e ${envArg} ${toxArguments}`;
		
		extension._private.runTox(envs, toxArguments, instance(mockedTerminal));

		verify(mockedTerminal.show(true)).called();
		verify(mockedTerminal.sendText(terminalCommand)).called();
	});

	test('get NO hover message on NO env var position', async () => {
		// Arrange

		// A text document containing a sample tox.ini file.
		const toxIniPath = getExampleToxIniPath("envvars");
		const textDocument = await vscode.workspace.openTextDocument(toxIniPath);

		// A position which DOES NOT reference a variable set by passenv or setenv.
		// Properties line and character in Position are zero-based, VS Code UI is one-based.
		const position = new vscode.Position(1, 4);	// point to a position without a variable name

		// Act

		const environmentVariablesService = new EnvironmentVariablesService();
		const resultUpdate = environmentVariablesService.analyzeDocument(textDocument);
		const hoverMessage = environmentVariablesService.generateHoverMessage(textDocument, position);

		// Assert

		assert.equal(resultUpdate, true, 'Environment variables in the sample tox.ini file should have been found.');
		assert.equal(hoverMessage, null, 'For the given position NO hover message should have been returned.');
	});

	test('get hover message on passenv var position', async () => {
		// Arrange
		// A text document containing a sample tox.ini file.
		const toxIniPath = getExampleToxIniPath("envvars");
		const textDocument = await vscode.workspace.openTextDocument(toxIniPath);

		// A position which DOES reference a variable set by passenv.
		// Properties line and character in Position are zero-based, VS Code UI is one-based.
		const position1 = new vscode.Position(18, 13); // point to variable PWD in section testenv:single_values_01
		const position2 = new vscode.Position(57, 15); // point to variable USER in section testenv:multiple_values_01

		// Act

		const environmentVariablesService = new EnvironmentVariablesService();
		const resultUpdate = environmentVariablesService.analyzeDocument(textDocument);

		const hoverMessage1 = environmentVariablesService.generateHoverMessage(textDocument, position1);
		const hoverMessage2 = environmentVariablesService.generateHoverMessage(textDocument, position2);

		// Assert

		assert.equal(resultUpdate, true, 'Environment variables in the sample tox.ini file should have been found.');
		assert.notEqual(hoverMessage1, null);
		assert.notEqual(hoverMessage2, null);

		const testPassEnvName1 = "PWD";
		const testPassEnvValue1 = process.env[testPassEnvName1] ?? "n/a";
		const expectedHoverMessage1 = constructExpectedHoverMessage("testenv:single_values_01", testPassEnvName1, testPassEnvValue1);

		assert.equal(hoverMessage1 && hoverMessage1[0].value, expectedHoverMessage1, `For the given position the expected hover message is: '${expectedHoverMessage1}'.`);

		const testPassEnvName2 = "USER";
		const testPassEnvValue2 = process.env[testPassEnvName2] ?? "n/a";
		const expectedHoverMessage2 = constructExpectedHoverMessage("testenv:multiple_values_01", testPassEnvName2, testPassEnvValue2);

	});

	test('get hover message on setenv var position', async () => {
		// Arrange
		// A text document containing a sample tox.ini file.
		const toxIniPath = getExampleToxIniPath("envvars");
		const textDocument = await vscode.workspace.openTextDocument(toxIniPath);

		// A position which DOES reference a variable set by setenv.
		// Properties line and character in Position are zero-based, VS Code UI is one-based.
		const position1 = new vscode.Position(19, 20);	// point to variable LOCALUI_OUTPUT_PATH in section testenv:single_values_01
		const position2 = new vscode.Position(30, 20);	// point to variable LOCALUI_OUTPUT_PATH in section testenv:single_values_02
		const position3 = new vscode.Position(58, 20);	// point to variable REGISTRY_USER in section testenv:multiple_values_01

		// Act

		const environmentVariablesService = new EnvironmentVariablesService();
		const resultUpdate = environmentVariablesService.analyzeDocument(textDocument);

		const hoverMessage1 = environmentVariablesService.generateHoverMessage(textDocument, position1);
		const hoverMessage2 = environmentVariablesService.generateHoverMessage(textDocument, position2);
		const hoverMessage3 = environmentVariablesService.generateHoverMessage(textDocument, position3);

		// Assert

		assert.equal(resultUpdate, true, 'Environment variables in the sample tox.ini file should have been found.');
		assert.notEqual(hoverMessage1, null);
		assert.notEqual(hoverMessage2, null);
		assert.notEqual(hoverMessage3, null);

		const expectedHoverMessage1 = constructExpectedHoverMessage("testenv:single_values_01", "LOCALUI_OUTPUT_PATH", "./tests/.output_01");
		assert.equal(hoverMessage1 && hoverMessage1[0].value, expectedHoverMessage1, `For the given position the expected hover message is: '${expectedHoverMessage1}'.`);

		const expectedHoverMessage2 = constructExpectedHoverMessage("testenv:single_values_02", "LOCALUI_OUTPUT_PATH", "./tests/.output_02");
		assert.equal(hoverMessage2 && hoverMessage2[0].value, expectedHoverMessage2, `For the given position the expected hover message is: '${expectedHoverMessage2}'.`);

		const expectedHoverMessage3 = constructExpectedHoverMessage("testenv:multiple_values_01", "REGISTRY_USER", "value_registry_user");
		assert.equal(hoverMessage3 && hoverMessage3[0].value, expectedHoverMessage3, `For the given position the expected hover message is: '${expectedHoverMessage3}'.`);

	});

	test('get hover message on setenv file reference var position', async () => {
		// Arrange
		// A text document containing a sample tox.ini file.
		const toxIniPath = getExampleToxIniPath("envvars");
		const textDocument = await vscode.workspace.openTextDocument(toxIniPath);

		// A position which DOES reference a variable set by setenv.
		// Properties line and character in Position are zero-based, VS Code UI is one-based.
		const position1 = new vscode.Position(40, 20);	// point to variable FILE_ENV_VAR_02 in section testenv:file_reference
		const position2 = new vscode.Position(61, 20);	// point to variable FILE_ENV_VAR_03 in section testenv:multiple_values_01

		// Act

		const environmentVariablesService = new EnvironmentVariablesService();
		const resultUpdate = environmentVariablesService.analyzeDocument(textDocument);

		const hoverMessage1 = environmentVariablesService.generateHoverMessage(textDocument, position1);
		const hoverMessage2 = environmentVariablesService.generateHoverMessage(textDocument, position2);

		// Assert

		assert.equal(resultUpdate, true, 'Environment variables in the sample tox.ini file should have been found.');
		assert.notEqual(hoverMessage1, null);
		assert.notEqual(hoverMessage2, null);

		const expectedHoverMessage1 = constructExpectedHoverMessage("testenv:file_reference", "FILE_ENV_VAR_02", "value_02");
		assert.equal(hoverMessage1 && hoverMessage1[0].value, expectedHoverMessage1, `For the given position the expected hover message is: '${expectedHoverMessage1}'.`);

		const expectedHoverMessage2 = constructExpectedHoverMessage("testenv:multiple_values_01", "FILE_ENV_VAR_03", "value_03");
		assert.equal(hoverMessage2 && hoverMessage2[0].value, expectedHoverMessage2, `For the given position the expected hover message is: '${expectedHoverMessage2}'.`);

	});


	test('determine section at position in tox file', async () => {
		// Arrange
		// A text document containing a sample tox.ini file.
		const toxIniPath = getExampleToxIniPath("envvars");
		const textDocument = await vscode.workspace.openTextDocument(toxIniPath);

		// Properties line and character in Position are zero-based, VS Code UI is one-based.
		const position1 = new vscode.Position(16, 10);	// point somewhere into section testenv:single_values_01
		const position2 = new vscode.Position(36, 10);	// point somewhere into section testenv:file_reference
		const position3 = new vscode.Position(12, 15);	// point into in the middle of section name testenv:single_values_01
		const position4 = new vscode.Position(60, 15);	// point into in the middle of section name testenv:multiple_values_01
		const position5 = new vscode.Position(100, 100);	// point outside of document

		// Act

		const environmentVariablesService = new EnvironmentVariablesService();
		const sectionName1 = EnvironmentVariablesService.determineSection(textDocument, position1);
		const sectionName2 = EnvironmentVariablesService.determineSection(textDocument, position2);
		const sectionName3 = EnvironmentVariablesService.determineSection(textDocument, position3);
		const sectionName4 = EnvironmentVariablesService.determineSection(textDocument, position4);
		const sectionName5 = EnvironmentVariablesService.determineSection(textDocument, position5);

		// Assert

		const expectedSectionName1 = 'testenv:single_values_01';
		const expectedSectionName2 = 'testenv:file_reference';
		const expectedSectionName3 = 'testenv:single_values_01';
		const expectedSectionName4 = 'testenv:multiple_values_01';
		const expectedSectionName5 = 'testenv:multiple_values_01';

		assert.equal(sectionName1, expectedSectionName1, `For the given position the expected section name is: '${expectedSectionName1}'.`);
		assert.equal(sectionName2, expectedSectionName2, `For the given position the expected section name is: '${expectedSectionName2}'.`);
		assert.equal(sectionName3, expectedSectionName3, `For the given position the expected section name is: '${expectedSectionName3}'.`);
		assert.equal(sectionName4, expectedSectionName4, `For the given position the expected section name is: '${expectedSectionName4}'.`);
		assert.equal(sectionName5, expectedSectionName5, `For the given position the expected section name is: '${expectedSectionName5}'.`);

	});

	test('get hover message on inherited env vars from testenv', async () => {
		// Arrange
		// A text document containing a sample tox.ini file.
		const toxIniPath = getExampleToxIniPath("envvars");
		const textDocument = await vscode.workspace.openTextDocument(toxIniPath);

		// A position which DOES reference a variable set by passenv or setenv.
		// Properties line and character in Position are zero-based, VS Code UI is one-based.
		const position1 = new vscode.Position(21, 20);	// point to variable FILE_ENV_VAR_11 in section testenv:single_values_01
		const position2 = new vscode.Position(32, 15);	// point to variable NAME in section testenv:single_values_02

		// Act

		const environmentVariablesService = new EnvironmentVariablesService();
		const resultUpdate = environmentVariablesService.analyzeDocument(textDocument);

		const hoverMessage1 = environmentVariablesService.generateHoverMessage(textDocument, position1);
		const hoverMessage2 = environmentVariablesService.generateHoverMessage(textDocument, position2);

		// Assert

		assert.equal(resultUpdate, true, 'Environment variables in the sample tox.ini file should have been found.');
		assert.notEqual(hoverMessage1, null);
		assert.notEqual(hoverMessage2, null);

		const expectedHoverMessage1 = constructExpectedHoverMessage("testenv", "FILE_ENV_VAR_11", "value_11");
		assert.equal(hoverMessage1 && hoverMessage1[0].value, expectedHoverMessage1, `For the given position the expected hover message is: '${expectedHoverMessage1}'.`);

		const testPassEnvName = "NAME";
		const testPassEnvValue = process.env[testPassEnvName] ?? "n/a";
		const expectedHoverMessage2 = constructExpectedHoverMessage("testenv", testPassEnvName, testPassEnvValue);

		assert.equal(hoverMessage2 && hoverMessage2[0].value, expectedHoverMessage2, `For the given position the expected hover message is: '${expectedHoverMessage2}'.`);
	});

});
