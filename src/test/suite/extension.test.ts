import { doesNotMatch, strict as assert } from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import * as extension from '../../extension';
import * as path from 'path';
import * as fs from 'fs';
import { mock, verify, instance, when } from 'ts-mockito';
import * as utils from './utils';
import { ToxEnvironmentService } from '../../service/toxEnvironmentService';
import { ConfigNewEnvironment } from '../../model/toxConfiguration';


function getExampleFileUri(name: string, file: string) {
	const dir = utils.getExampleDir(name);
	const filePath = path.join(dir, file);
	assert.ok(fs.existsSync(filePath));
	return vscode.Uri.file(filePath);
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
		fs.mkdirSync(tmpdir, {recursive: true});
		fs.rmSync(marker, {force: true});

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

	test('create new tox environment', async () => {
		const dir = utils.getExampleDir("createenv");
		const toxIni = path.join(dir, "tox.ini");
		const newEnvName = "my-new-env";
		const vscodeConfigFile = path.join(dir, "settings.json");

		// mock user input	
		vscode.window.showInputBox = (_options, _token) => {
			let mockedInput: string | undefined = undefined;
	
			if (_options?.prompt === "Enter tox.ini path")
			{
				mockedInput = toxIni; 
			} else if (_options?.prompt === "Enter new tox environment name") {
				mockedInput = newEnvName;
			}
	
			return Promise.resolve(mockedInput);
		};

		// mock vs configuration
		const configuration : ConfigNewEnvironment = {
			templateFilePath: vscodeConfigFile
		};
		const mockedWorkspaceConfig = mock<vscode.WorkspaceConfiguration>();
		when(mockedWorkspaceConfig.get<ConfigNewEnvironment>("environment.template.new")).thenReturn(configuration);
		vscode.workspace.getConfiguration = (_section, _scope) => instance(mockedWorkspaceConfig);

		const toxEnvService = new ToxEnvironmentService("python-tox");
		const newEnv = await toxEnvService.createNewEnvironment(toxIni);

		assert.equal(newEnv?.name, newEnvName);
	});
});
