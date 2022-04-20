import { workspace, Uri, WorkspaceFolder } from "vscode";

/**
 * This class is an abstraction layer for the vscode specific Workspace commands
 * used in this extension
 */
export class VsCodeWorkspace {
    public getWorkspaceFolder(uri: Uri): WorkspaceFolder | undefined {
        return workspace.getWorkspaceFolder(uri);
    }
}