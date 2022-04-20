import { commands, Disposable } from "vscode";

/**
 * This class is an abstraction layer for the vscode specific Commands commands
 * used in this extension
 */
export class VsCodeCommands {
    public registerCommand(command: string, callback: (...args: any[]) => any, thisArg?: any): Disposable {
        return commands.registerCommand(command, callback, thisArg);
    }
}