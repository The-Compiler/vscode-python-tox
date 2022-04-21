import * as vscode from 'vscode';

export class EnvironmentVariablesService implements vscode.HoverProvider {

  public environmentVariables = new Map<string, string>();

  public provideHover(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): vscode.ProviderResult<vscode.Hover> {

    this.updateAllEnvironmentVariables(document);
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
  public updateAllEnvironmentVariables(document: vscode.TextDocument): boolean {

    this.environmentVariables.clear();

    const resultPassEnv = this.updateEnvironmentVariables(document, "passenv");
    const resultSetEnv = this.updateEnvironmentVariables(document, "setenv");

    return resultPassEnv || resultSetEnv;
  }

  public updateEnvironmentVariables(document: vscode.TextDocument, source: string): boolean {
    if ((source !== "passenv") && (source !== "setenv")) {
      throw new RangeError("Argument 'envVarMethod' can only be set to 'passenv' or 'setenv'. ");
    }

    const regex = new RegExp(`(^(?<key>${source})(?: |)*=(?: |)*(?<value>[^#;\\\r\n]*(?:\\.[^#;\\\r\n]*)*))`, "gm");

    const documentText: string = document.getText();

    let match = regex.exec(documentText);

    if (match && match.groups) {

      let envVarName = match.groups.value;
      let envVarValue: string;

      if (source === "passenv") {

        envVarValue = this.resolvePassEnvValue(envVarName);

      } else {  // setenv

        const resolvedSetEnv = this.resolveSetEnvValue(envVarName);

        envVarName = resolvedSetEnv.name;
        envVarValue = resolvedSetEnv.value;

      }

      this.environmentVariables.set(envVarName, envVarValue);

      // Indicate environment variables have been found.
      return true;

    } else {

      // Indicate NO environment variables have been found.
      return false;

    }
  }

  public resolvePassEnvValue(passEnvVarName: string): string {
    const envVarValue = process.env[passEnvVarName] ?? "n/a";

    return envVarValue;
  }

  public resolveSetEnvValue(setEnvVar: string) {
    const regex = /(^( +|)(?<key>[^\[\]\r\n=#;]+)(?: |)*=( |)*(?<value>[^#;\\\r\n]*(?:\\.[^#;\\\r\n]*)*))/gm;

    let match = regex.exec(setEnvVar);

    let envVarName: string;
    let envVarValue: string;

    if (match && match.groups) {

      envVarName = match.groups.key.trim();
      envVarValue = match.groups.value.trim();

    } else {

      envVarName = setEnvVar;
      envVarValue = "n/a";

    }


    return {name: envVarName, value: envVarValue};
  }

  public generateHoverMessage(document: vscode.TextDocument, position: vscode.Position): vscode.MarkdownString[] | null {

    const keyValuePair = this.getKeyValue(document, position);

    if (keyValuePair) {

      const hoverMessage = new vscode.MarkdownString(`${keyValuePair.key}: '${keyValuePair.value}'`);

      console.log(`hover message: ${hoverMessage.value}`);

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
