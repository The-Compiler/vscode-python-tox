import * as vscode from 'vscode';

export class EnvironmentVariablesService implements vscode.HoverProvider {

  public environmentVariables = new Map<string, string>();

  public provideHover(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): vscode.ProviderResult<vscode.Hover> {
    this.updateEnvironmentVariables(document);
    return {
      contents: this.generateHoverMessage(document, position)
    };
  }

  /**
   * 
   * @param document The document to search for environments variables.
   * @returns true if environment variables have been found; false otherwise.
   */
  public updateEnvironmentVariables(document: vscode.TextDocument): boolean {
    // Regular expression and code based on https://regex101.com/r/Yn6dAs/1.
    const regex = /(^(?<key>passenv)(?: |)*=(?: |)*(?<value>[^#;\\\r\n]*(?:\\.[^#;\\\r\n]*)*))/gm;

    const documentText: string = document.getText();

    let match = regex.exec(documentText);

    this.environmentVariables.clear();

    if (match && match.groups) {
      this.environmentVariables.set(match.groups.key, match.groups.value);

      // Indicate environment variables have been found.
      return true;
    } else {
      // Indicate NO environment variables have been found.
      return false;
    }
  }

  private generateHoverMessage(document: vscode.TextDocument, position: vscode.Position): vscode.MarkdownString[] {
    const hoverMessage = new vscode.MarkdownString(`Hover Content in '${document.fileName}' at line ${position.line} char ${position.character}`);

    return [hoverMessage];
  }

}

