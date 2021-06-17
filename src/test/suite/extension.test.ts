import { strict as assert } from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import * as extension from '../../extension';
import * as path from 'path';
import * as fs from 'fs';
import * as util from 'util';

function getExampleDir(name: string) {
    const dir = path.join(__dirname, '..', '..', '..', 'src', 'test', 'examples', name);
    assert.ok(fs.existsSync(dir));
	return dir;
}

function getExampleFileUri(name: string, file: string) {
    const dir = getExampleDir(name);
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
            if (filename === "tox-did-run") {
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
        fs.mkdirSync(tmpdir, {recursive: true});
        fs.rmSync(marker, {force: true});

		await extension._private.runTox(["test"], dir);
        const terminal = await waitForTerminal();
        assert.equal(terminal.name, "tox");

        await waitForMarker(tmpdir);
        assert.ok(fs.existsSync(marker));
    });
});
