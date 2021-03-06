import * as path from 'path';
import * as fs_promises from 'fs/promises';
import * as fs from 'fs';
import * as child_process from 'child_process';
import * as vscode from 'vscode';
import * as util from 'util';


const exec = util.promisify(child_process.exec);

export class ToxTaskProvider implements vscode.TaskProvider {
    static readonly toxType = 'tox';
    static readonly toxIni = 'tox.ini';
    private toxPromise: Thenable<vscode.Task[]> | undefined = undefined;

    constructor(workspaceRoot: string) {
        const pattern = path.join(workspaceRoot, ToxTaskProvider.toxIni);
        const fileWatcher = vscode.workspace.createFileSystemWatcher(pattern);
        fileWatcher.onDidChange(() => this.toxPromise = undefined);
        fileWatcher.onDidCreate(() => this.toxPromise = undefined);
        fileWatcher.onDidDelete(() => this.toxPromise = undefined);
    }

    public provideTasks(): Thenable<vscode.Task[]> | undefined {
        if (!this.toxPromise) {
            this.toxPromise = getToxTestenvs();
        }
        return this.toxPromise;
    }

    public resolveTask(_task: vscode.Task): vscode.Task | undefined {
        const testenv = _task.definition.testenv;
        if (testenv) {
            const definition: ToxTaskDefinition = <any>_task.definition;
            return new vscode.Task(
                definition,
                _task.scope ?? vscode.TaskScope.Workspace,
                definition.testenv,
                ToxTaskProvider.toxType,
                new vscode.ShellExecution(`tox -e ${definition.testenv}`)
            );
        }
        return undefined;
    }
}

let _channel: vscode.OutputChannel;
function getOutputChannel(): vscode.OutputChannel {
    if (!_channel) {
        _channel = vscode.window.createOutputChannel('Tox Auto Detection');
    }
    return _channel;
}

interface ToxTaskDefinition extends vscode.TaskDefinition {
    /**
     * The environment name
     */
    testenv: string;
}

const buildTaskNames: string[] = ['build', 'compile', 'watch'];
const testTaskNames: string[] = ['test'];
function inferTaskGroup(taskName: string): vscode.TaskGroup | undefined {
    if (buildTaskNames.includes(taskName)) {
        return vscode.TaskGroup.Build;
    } else if (testTaskNames.includes(taskName)) {
        return vscode.TaskGroup.Test;
    } else {
        return undefined;
    }
}

async function getToxTestenvs(): Promise<vscode.Task[]> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    const result: vscode.Task[] = [];

    if (!workspaceFolders || workspaceFolders.length === 0) {
        return result;
    }
    for (const workspaceFolder of workspaceFolders) {
        const folderString = workspaceFolder.uri.fsPath;
        if (!folderString) {
            continue;
        }
        const toxFile = path.join(folderString, ToxTaskProvider.toxIni);
        try {
            await fs_promises.access(toxFile, fs.constants.R_OK);
        } catch {
            continue;
        }

        const commandLine = 'tox -a';
        try {
            const { stdout, stderr } = await exec(commandLine, { cwd: folderString });
            if (stderr && stderr.length > 0) {
                const channel = getOutputChannel();
                channel.appendLine(stderr);
                channel.show(true);
            }
            if (stdout) {
                const lines = stdout.split(/\r?\n/);
                for (const line of lines) {
                    if (line.length === 0) {
                        continue;
                    }
                    const toxTestenv = line;
                    const kind: ToxTaskDefinition = {
                        type: ToxTaskProvider.toxType,
                        testenv: toxTestenv
                    };

                    const task = new vscode.Task(
                        kind,
                        workspaceFolder,
                        toxTestenv,
                        ToxTaskProvider.toxType,
                        new vscode.ShellExecution(`tox -e ${toxTestenv}`)
                    );
                    task.group = inferTaskGroup(line.toLowerCase());
                    result.push(task);
                }
            }
        } catch (err: any) {
            const channel = getOutputChannel();
            if (err.stderr) {
                channel.appendLine(err.stderr);
            }
            if (err.stdout) {
                channel.appendLine(err.stdout);
            }
            channel.appendLine('Auto detecting tox testenvs failed.');
            channel.show(true);
        }
    }
    return result;
}
