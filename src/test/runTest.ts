import * as path from 'path';
import * as fs_promises from 'fs/promises';

import { runTests } from '@vscode/test-electron';

async function main() {
	try {
		// The folder containing the Extension Manifest package.json
		// Passed to `--extensionDevelopmentPath`
		const extensionDevelopmentPath = path.resolve(__dirname, '../../');

		// The path to test runner
		// Passed to --extensionTestsPath
		const extensionTestsPath = path.resolve(__dirname, './suite/index');

		const exampleRoot = path.resolve(extensionDevelopmentPath, './src/test/examples');
		const exampleBasenames = await fs_promises.readdir(exampleRoot);
		const examplePaths = exampleBasenames.map((dir) => path.resolve(exampleRoot, dir));

		// Download VS Code, unzip it and run the integration test
		await runTests({
			extensionDevelopmentPath,
			extensionTestsPath,
			// open a multi-folder workspace with all test example dirs
			launchArgs: ['--disable-extensions'].concat(examplePaths)
		});
	} catch (err) {
		console.error('Failed to run tests');
		process.exit(1);
	}
}

main();
