import * as vscode from 'vscode';

export class EnvironmentVariablesService {

  public static createHoverProvider(): vscode.HoverProvider {
    return {
      provideHover(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): vscode.ProviderResult<vscode.Hover> {
        EnvironmentVariablesService.collectEnvironmentVariables(document);
        return {
          contents: [`Hover Content in '${document.fileName}' at line ${position.line} char ${position.character}`]
        };
      }
    };
  }

  public static collectEnvironmentVariables(document: vscode.TextDocument): Map<string, string> {
    // Regular expression and code based on https://regex101.com/r/Yn6dAs/1.
    const regex = /(^(?<key>passenv)(?: |)*=(?: |)*(?<value>[^#;\\\r\n]*(?:\\.[^#;\\\r\n]*)*))/gm;

    let environmentVariables = new Map<string, string>();

    const documentText: string = document.getText();

    let match = regex.exec(documentText);

    if (match && match.groups) {
        environmentVariables.set(match.groups.key, match.groups.value);
    }

    return environmentVariables;
  }

}