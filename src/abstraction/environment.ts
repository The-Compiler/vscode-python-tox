import { env, Uri } from "vscode";

/**
 * This class is an abstraction layer for the vscode specific Env commands
 * used in this extension
 */
export class VsCodeEnv {
    public openExternal(target: Uri): Thenable<boolean> {
        return env.openExternal(target);
    }
}