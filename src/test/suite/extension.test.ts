// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import * as extension from '../../extension';
import * as path from 'path';
import * as fs from 'fs';
import { mock, verify, instance, when } from 'ts-mockito';
import { strict as assert } from 'assert';
import * as testutils from './testutils';
import * as utils from '../../utils';
import * as run from '../../run';

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
		const dir = testutils.getExampleDir("simple");
		const envs = await run.getToxEnvs(dir);
		assert.deepEqual(envs, ["one", "two"]);
	});

	test('make sure we have all tox environments', async () => {
		const dir = testutils.getExampleDir("allenvs");
		const envs = await run.getToxEnvs(dir);
		assert.deepEqual(envs, ["one", "two", "three"]);
	});

	test('running tox', async () => {
		const dir = testutils.getExampleDir("end2end");

		const tmpdir = path.join(dir, ".tox", "tmp");
		const marker = path.join(tmpdir, "tox-did-run");
		fs.mkdirSync(tmpdir, { recursive: true });
		fs.rmSync(marker, { force: true });

		await run.runTox(["test"], "", utils.getTerminal(dir));
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
		
		run.runTox(envs, toxArguments, instance(mockedTerminal));

		verify(mockedTerminal.show(true)).called();
		verify(mockedTerminal.sendText(terminalCommand)).called();
	});

});
