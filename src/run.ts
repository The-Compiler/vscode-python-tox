import * as vscode from 'vscode';
import * as child_process from 'child_process';
import * as util from 'util';
import * as os from 'os';
import { getTerminal } from './utils';

const exec = util.promisify(child_process.exec);

export async function getToxEnvs(projDir: string) {
	const { stdout } = await exec('tox -a', { cwd: projDir });
	return stdout.trim().split(os.EOL);
}

export function runTox(envs: string[], toxArguments: string, terminal: vscode.Terminal = getTerminal() ) {
	const envArg = envs.join(",");
	terminal.show(true);  // preserve focus

	// FIXME: In theory, there's a command injection here, if an environment name
	// contains shell metacharacters. However:
	// - Escaping the argument in a shell-agnostic way is hard:
	//   https://github.com/microsoft/vscode/blob/1.57.0/src/vs/workbench/contrib/debug/node/terminals.ts#L84-L211
	// - The environment names are coming from the tox config via "tox -l", so
	//   if someone could configure a malicious environment, they could as well
	//   just tell tox to run malicious commands.
	// - We don't run on untrusted workspaces.
	// - The user actively picks the environment name to be run.
	// - Real tox environment names are very unlikely to accidentally contain
	//   such characters - in fact, using spaces in env names seems to not work
	//   properly at all.
	let terminalCommand = `tox -e ${envArg} ${toxArguments}`;
	terminal.sendText(terminalCommand);
}
