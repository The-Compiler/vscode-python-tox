import * as os from 'os';
import * as path from 'path';
import * as util from 'util';
import * as child_process from 'child_process';

import { VsCodeWindow } from "../abstraction/window";
import { VsCodeWorkspace } from "../abstraction/workspace";

/**
 * This service enables clients to run tox commands
 */
export class RunToxService {

    static readonly exec = util.promisify(child_process.exec);

    private readonly window : VsCodeWindow;
    private readonly workspace: VsCodeWorkspace;

    /**
     * Constructor
     * @param window Abstraction of vscode.window
     * @param workspace Abstraction of vscode.workspace
     */
    constructor(window: VsCodeWindow, workspace: VsCodeWorkspace) {
        if (!window) {
            throw new TypeError("Window is invalid");
        }
        if (!workspace) {
            throw new TypeError("Workspace is invalid");
        }

        this.window = window;
        this.workspace = workspace;
    }

    /**
     * Run a single tox env
     * @returns 
     */
    public async runSingle() {
        const projDir = this.findProjectDir();
        const envs = await this.safeGetToxEnvs(projDir);
        if (!envs) {
            return;
        }
        const selected = (await this.window.showQuickPick(envs, {placeHolder: "tox environment"})) as string;
        if (!selected) {
            return;
        }
        this.runTox([selected], projDir);
    }

    /**
     * Run multiple tox envs
     * @returns 
     */
    public async runMultiple() {
        const projDir = this.findProjectDir();
        const envs = await this.safeGetToxEnvs(projDir);
        if (!envs) {
            return;
        }
        const selected = (await this.window.showQuickPick(envs, {placeHolder: "tox environments", canPickMany: true})) as string[];
        if (!selected) {
            return;
        }
        this.runTox(selected, projDir);
    }

    private findProjectDir() {
        const docUri = this.window.activeTextEditor?.document.uri;
        if (!docUri) {
            throw new Error("No active editor found.");
        }
    
        const localWorkspace = this.workspace.getWorkspaceFolder(docUri);
        if (localWorkspace) {
            const folder = localWorkspace.uri.fsPath;
            console.log(`tox workspace folder: ${folder}`);
            return folder;
        }
    
        const docPath = docUri.fsPath;
        const docDir = path.dirname(docPath);
        console.log(`tox doc path: ${docPath} -> ${docDir}`);
        return docDir;
    }

    private async safeGetToxEnvs(projDir: string) {
        try {
            return await this.getToxEnvs(projDir);
        } catch (error) {
            this.window.showErrorMessage((error as Error).message);
            return;
        }
    }
    
    public async getToxEnvs(projDir: string) {
        const { stdout } = await RunToxService.exec('tox -a', {cwd: projDir});
        return stdout.trim().split(os.EOL);
    }

    public runTox(envs: string[], projDir: string) {
        const term = this.window.createTerminal({"cwd": projDir, "name": "tox"});
        const envArg = envs.join(",");
        term.show(true);  // preserve focus
    
        // FIXME In theory, there's a command injection here, if an environment name
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
        term.sendText(`tox -e ${envArg}`);
    }
}