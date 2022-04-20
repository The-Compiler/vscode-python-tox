import { ExtensionContext, Uri } from 'vscode';

import { Commands } from './constants';
import { VsCodeWindow } from './abstraction/window';
import { VsCodeWorkspace } from './abstraction/workspace';
import { VsCodeEnv } from './abstraction/environment';
import { VsCodeCommands } from './abstraction/commands';
import { RunToxService } from './service/runToxService';
import { UtilityService } from './service/utilityService';

// abstraction layer
let commands: VsCodeCommands;

// services
let runToxService: RunToxService;
let utilityService: UtilityService;

/**
 * Initialize the extension abstraction layer and the 
 * relevant services
 */
function initialize() {
	commands = new VsCodeCommands();

	runToxService = new RunToxService(new VsCodeWindow(), new VsCodeWorkspace());
	utilityService = new UtilityService(new VsCodeEnv());
}

/**
 * Function is called on extension activation
 * @param context 
 */
export function activate(context: ExtensionContext) {

	initialize();

	context.subscriptions.push(
		commands.registerCommand(Commands.select, () => runToxService.runSingle()),
		commands.registerCommand(Commands.selectMultiple, () => runToxService.runMultiple()),
		commands.registerCommand(Commands.openDocs, () => utilityService.openExternalUrl("https://tox.wiki"))
	);
}

/**
 * Function is called on extension deactivation
 */
export function deactivate() {}

