import * as vscode from 'vscode';

export class EnvironmentVariablesService {

  public static createHoverProvider(): vscode.HoverProvider {
    return {
      provideHover(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): vscode.ProviderResult<vscode.Hover> {
        return {
          contents: [`Hover Content in '${document.fileName}' at line ${position.line} char ${position.character}`]
        };
      }
    };
  }

}