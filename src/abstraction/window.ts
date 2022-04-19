import { window, Terminal, TerminalOptions, QuickPickOptions, CancellationToken, TextEditor } from "vscode";

/**
 * This class is an abstraction layer for the vscode specific Window commands
 * used in this extension
 */
export class VsCodeWindow {

    public createTerminal(options: TerminalOptions): Terminal {
        return window.createTerminal(options);
    }

    public showErrorMessage<T extends string>(message: string, ...items: T[]): Thenable<T | undefined> {
        return window.showErrorMessage<T>(message, ...items);
    }

    public showQuickPick(items: readonly string[] | Thenable<readonly string[]>, options?: QuickPickOptions, token?: CancellationToken): Thenable<string | string[] | undefined> {
        return window.showQuickPick(items, options);
    }

    public get activeTextEditor(): TextEditor | undefined {
        return window.activeTextEditor;
    }
}