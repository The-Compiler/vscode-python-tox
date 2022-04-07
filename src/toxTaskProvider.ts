import * as path from 'path';
import * as fs from 'fs';
import * as cp from 'child_process';
import * as vscode from 'vscode';
import { error } from 'console';

export class ToxTaskProvider implements vscode.TaskProvider {
    static ToxType = 'tox';
    static ToxIni = 'tox.ini';
    private toxPromise: Thenable<vscode.Task[]> | undefined = undefined;

    constructor(workspaceRoot: string) {
        const pattern = path.join(workspaceRoot, ToxTaskProvider.ToxIni);
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
            return new vscode.Task(definition, _task.scope ?? vscode.TaskScope.Workspace, definition.testenv, ToxTaskProvider.ToxType, new vscode.ShellExecution(`tox -e ${definition.testenv}`));
        }
        return undefined;
    }
}

function exists(file: string): Promise<boolean> {
    return new Promise<boolean>((resolve, _reject) => {
        fs.exists(file, (value) => {
            resolve(value);
        });
    });
}

function exec(command: string, options: cp.ExecOptions): Promise<{ stdout: string; stderr: string }> {
    return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
        cp.exec(command, options, (error, stdout, stderr) => {
            if (error) {
                reject({ error, stdout, stderr });
            }
            resolve({ stdout, stderr });
        });
    });
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

const buildNames: string[] = ['build', 'compile', 'watch'];
function isBuildTask(name: string): boolean {
    for (const buildName of buildNames) {
        if (name.indexOf(buildName) !== -1) {
            return true;
        }
    }
    return false;
}

const testNames: string[] = ['test'];
function isTestTask(name: string): boolean {
    for (const testName of testNames) {
        if (name.indexOf(testName) !== -1) {
            return true;
        }
    }
    return false;
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
        const toxFile = path.join(folderString, ToxTaskProvider.ToxIni);
        if (!await exists(toxFile)) {
            continue;
        }

        const commandLine = 'tox -a';
        try {
            const { stdout, stderr } = await exec(commandLine, { cwd: folderString });
            if (stderr && stderr.length > 0) {
                getOutputChannel().appendLine(stderr);
                getOutputChannel().show(true);
            }
            if (stdout) {
                const lines = stdout.split(/\r{0,1}\n/);
                for (const line of lines) {
                    if (line.length === 0) {
                        continue;
                    }
                    const toxTestenv = line
                    const kind: ToxTaskDefinition = {
                        type: ToxTaskProvider.ToxType,
                        testenv: toxTestenv
                    }

                    const task = new vscode.Task(kind, workspaceFolder, toxTestenv, ToxTaskProvider.ToxType, new vscode.ShellExecution(`tox -e ${toxTestenv}`));
                    result.push(task);
                    const lowerCaseLine = line.toLowerCase();
                    if (isBuildTask(lowerCaseLine)) {
                        task.group = vscode.TaskGroup.Build;
                    } else if (isTestTask(lowerCaseLine)) {
                        task.group = vscode.TaskGroup.Test;
                    }
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