import * as vscode from 'vscode';

export class EnvironmentVariablesService implements vscode.HoverProvider {

  public environmentVariables = new Map<string, string>();

  public provideHover(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): vscode.ProviderResult<vscode.Hover> {

    this.updateEnvironmentVariables(document);
    const hoverMessage = this.generateHoverMessage(document, position);

    if (hoverMessage) {

      return {
        contents: hoverMessage
      };

    } else {

      return null;

    }
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

      const envVarName = match.groups.value;
      const envVarValue = process.env[envVarName] ?? "";

      this.environmentVariables.set(envVarName, envVarValue);

      // Indicate environment variables have been found.
      return true;

    } else {

      // Indicate NO environment variables have been found.
      return false;
      
    }
  }

  public generateHoverMessage(document: vscode.TextDocument, position: vscode.Position): vscode.MarkdownString[] | null {

    const keyValuePair = this.getKeyValue(document, position);

    if (keyValuePair) {

      const hoverMessage = new vscode.MarkdownString(`${keyValuePair.key}: '${keyValuePair.value}'`);

      return [hoverMessage];

    } else {

      return null;

    }
  }

  public getKeyValue(document: vscode.TextDocument, position: vscode.Position) {
    const range = document.getWordRangeAtPosition(position);
    const wordAtPosition = document.getText(range);

    console.log(`Word '${wordAtPosition}' at position (${position.line}, ${position.character}) with range from (${range?.start.line}, ${range?.start.character}) to (${range?.end.line}, ${range?.end.character})`);

    const value = this.environmentVariables.get(wordAtPosition);

    if (value) {

      return { key: wordAtPosition, value: value };

    } else {

      return null;

    }
  }

}

