import { doesNotMatch, strict as assert } from 'assert';
import * as fs from 'fs';
import * as path from 'path';

export function getExampleDir(name: string) {
	const dir = path.join(__dirname, '..', '..', '..', 'src', 'test', 'examples', name);
	assert.ok(fs.existsSync(dir));
	return dir;
}