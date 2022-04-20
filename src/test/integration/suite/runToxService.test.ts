import { strict as assert } from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import { RunToxService } from '../../../service/runToxService';
import * as path from 'path';
import * as fs from 'fs';
import { VsCodeWindow } from '../../../abstraction/window';
import { VsCodeWorkspace } from '../../../abstraction/workspace';

function getExampleDir(name: string) {
	const dir = path.join(__dirname, '..', '..', '..', '..', 'src', 'test', 'integration', 'examples', name);
	assert.ok(fs.existsSync(dir));
	return dir;
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
    const window = new VsCodeWindow();
    const workspace = new VsCodeWorkspace();

	test('getting tox environments', async () => {
		const dir = getExampleDir("simple");
        const service = new RunToxService(window, workspace);

		const envs = await service.getToxEnvs(dir);
		assert.deepEqual(envs, ["one", "two"]);
	});

    test('make sure we have all tox environments', async () => {
		const dir = getExampleDir("allenvs");
        const service = new RunToxService(window, workspace);

		const envs = await service.getToxEnvs(dir);
		assert.deepEqual(envs, ["one", "two", "three"]);
	});

    test('running tox', async () => {
		const dir = getExampleDir("end2end");
        const service = new RunToxService(window, workspace);

		const tmpdir = path.join(dir, ".tox", "tmp");
		const marker = path.join(tmpdir, "tox-did-run");
		fs.mkdirSync(tmpdir, {recursive: true});
		fs.rmSync(marker, {force: true});

		service.runTox(["test"], dir);
		const terminal = await waitForTerminal();
		assert.equal(terminal.name, "tox");

		await waitForMarker(tmpdir);
		assert.ok(fs.existsSync(marker));
	});
});