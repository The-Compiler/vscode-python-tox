import { strict as assert } from 'assert';
import * as fs from 'fs';
import * as path from 'path';

export function getExampleDir(name: string) {
	const dir = path.join(__dirname, '..', '..', '..', 'src', 'test', 'examples', name);
	assert.ok(fs.existsSync(dir));
	return dir;
}

export function getExampleToxIniPath(sampleName: string): string {
	// Build path to tox.ini file.
	const exampleDir = getExampleDir(sampleName);
	const toxIniPath = path.join(exampleDir, 'tox.ini');

	return toxIniPath;
}
