import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

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

    const regex = new RegExp(`(?:\\[(?<section>[^#;\\r\\n]+)\\])[\\r\\n]+.*?(?<key>${source})(?: |)*=(?: |)*(?<value>[^#;\\\\\\r\\n]*(?:\\\\.[^#;\\\\\\r\\n]*)*)\\n`, 'gs');

    const documentText: string = document.getText();

    let result = false;

    // let match = regex.exec(documentText);
    let match: RegExpExecArray | null;

    while ((match = regex.exec(documentText)) !== null) {

      // This is necessary to avoid infinite loops with zero-width matches
      if (match.index === regex.lastIndex) {
        regex.lastIndex++;
      }

      if (match && match.groups) {

        const envVarValue = match.groups.value;

        if (source === "passenv") {

          this.updatePassEnvValue(envVarValue);

        } else {  // setenv

          const fileReferencePrefix = 'file|';

          if (envVarValue.startsWith(fileReferencePrefix)) {

            this.updateSetEnvFileReference(document, envVarValue.substring(fileReferencePrefix.length));

          } else {  // direct value assignment

            this.updateSetEnvDirectValue(envVarValue);

          }

        }

        // Indicate environment variables have been found.
        result = result || true;

      }
    }

    return result;
  }

  public updatePassEnvValue(passEnvVarName: string) {
    const envVarValue = process.env[passEnvVarName] ?? "n/a";

    this.environmentVariables.set(passEnvVarName, envVarValue);
  }

  /**
   * Analyzes the part after setenv to extract var names and var values.
   * @param setEnvValue The part following setenv in a tox.ini file.
   */
  public updateSetEnvDirectValue(setEnvValue: string) {

    const regex = /(^( +|)(?<key>[^\[\]\r\n=#;]+)(?: |)*=( |)*(?<value>[^#;\\\r\n]*(?:\\.[^#;\\\r\n]*)*))/gm;

    let match = regex.exec(setEnvValue);

    let envVarName: string;
    let envVarValue: string;

    if (match && match.groups) {

      envVarName = match.groups.key.trim();
      envVarValue = match.groups.value.trim();

      this.environmentVariables.set(envVarName, envVarValue);

    }

  }

  public updateSetEnvFileReference(document: vscode.TextDocument, filePath: string) {

    // Read .env file.
    const directoryToxFile = path.dirname(document.fileName);
    const envFileFullPath = path.resolve(directoryToxFile, filePath);
    const envFileContent = fs.readFileSync(envFileFullPath, 'utf8');

    const regex = /(?<key>^[A-Z0-9_]+)(?:\=)(?<value>.*$)/gm;

    let match;

    while ((match = regex.exec(envFileContent)) !== null) {

      // This is necessary to avoid infinite loops with zero-width matches.
      if (match.index === regex.lastIndex) {
        regex.lastIndex++;
      }

      if (match && match.groups) {

        this.environmentVariables.set(match.groups.key, match.groups.value ?? "");

      }
    }

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

  public determineSection(document: vscode.TextDocument, position: vscode.Position): string {

    const positionStart = new vscode.Position(0,0);
    const positionEnd = new vscode.Position(position.line + 1, 0);
    const range = new vscode.Range(positionStart, positionEnd);
    const documentText: string = document.getText(range);

    const regex = /(?:^(?: +|)\[(?<section>[^#;\r\n]+)\])/mg;

    let lastSectionName = "";

    let match: RegExpExecArray | null;

    while ((match = regex.exec(documentText)) !== null) {

      // This is necessary to avoid infinite loops with zero-width matches
      if (match.index === regex.lastIndex) {
        regex.lastIndex++;
      }

      if (match && match.groups) {

        lastSectionName = match.groups.section;

      }
    }

    return lastSectionName;

  }

}
