import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export class EnvironmentVariablesService implements vscode.HoverProvider {

  public toxEnvironmentVariables = new Map<string, Map<string, string>>();

  public provideHover(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): vscode.ProviderResult<vscode.Hover> {

    this.analyzeDocument(document);
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
  public analyzeDocument(document: vscode.TextDocument): boolean {

    this.toxEnvironmentVariables.clear();

    const documentText: string = document.getText();

    const sections = EnvironmentVariablesService.getDocumentSections(documentText);

    let overallResult = false;

    for (let sectionName of sections.keys()) {
      const sectionBody = sections.get(sectionName) as string;
      const result = this.analyzeSection(sectionBody, sectionName, document);
      overallResult = overallResult || result;
    }

    return overallResult;
  }

  public static getDocumentSections(documentBody: string): Map<string, string> {

    const regex = /\[(?<sectionName>[^#;\r\n]+)\](?<sectionBody>.*?)(?=\[|$)/gs;

    let resultSections = new Map<string, string>();

    let match: RegExpExecArray | null;

    while ((match = regex.exec(documentBody)) !== null) {

      // This is necessary to avoid infinite loops with zero-width matches
      if (match.index === regex.lastIndex) {
        regex.lastIndex++;
      }

      if (match && match.groups) {

        // const sectionName = match.groups.section;
        const sectionName = match.groups.sectionName;
        const sectionBody = match.groups.sectionBody;

        resultSections.set(sectionName, sectionBody);

      }
    }

    return resultSections;
  }

  public analyzeSection(sectionBody: string, sectionName: string, document: vscode.TextDocument): boolean {

    const regex = /(?<key>passenv|setenv)(?: |)*=(?: |)*(?<value>[^#;\\\r\n]*(?:\\.[^#;\\\r\n]*)*)\n/gs;

    let result = false;

    let match: RegExpExecArray | null;

    while ((match = regex.exec(sectionBody)) !== null) {

      // This is necessary to avoid infinite loops with zero-width matches
      if (match.index === regex.lastIndex) {
        regex.lastIndex++;
      }

      if (match && match.groups) {

        // const sectionName = match.groups.section;
        const envVarKey = match.groups.key;
        const envVarValue = match.groups.value;

        switch (envVarKey) {
          case "passenv":
            
            this.resolvePassEnvValue(sectionName, envVarValue);

            break;

          case "setenv":

            const fileReferencePrefix = 'file|';

            if (envVarValue.startsWith(fileReferencePrefix)) {
  
              this.resolveSetEnvFileReference(sectionName, document, envVarValue.substring(fileReferencePrefix.length));
  
            } else {  // direct value assignment
  
              this.resolveSetEnvDirectValue(sectionName, envVarValue);
  
            }
  
            break;
        }

        // Indicate environment variables have been found.
        result = result || true;

      }
    }

    return result;
  }

  public resolvePassEnvValue(sectionName: string, passEnvVarName: string) {
    const envVarValue = process.env[passEnvVarName] ?? "n/a";

    this.setToxEnvironmentVariableValue(sectionName, passEnvVarName, envVarValue);
  }

  /**
   * Analyzes the part after setenv to extract var names and var values.
   * @param setEnvValue The part following setenv in a tox.ini file.
   */
  public resolveSetEnvDirectValue(sectionName: string, setEnvValue: string) {

    const regex = /(^( +|)(?<key>[^\[\]\r\n=#;]+)(?: |)*=( |)*(?<value>[^#;\\\r\n]*(?:\\.[^#;\\\r\n]*)*))/gm;

    let match = regex.exec(setEnvValue);

    let envVarName: string;
    let envVarValue: string;

    if (match && match.groups) {

      envVarName = match.groups.key.trim();
      envVarValue = match.groups.value.trim();

      this.setToxEnvironmentVariableValue(sectionName, envVarName, envVarValue);

    }

  }

  public resolveSetEnvFileReference(sectionName: string, document: vscode.TextDocument, filePath: string) {

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

        this.setToxEnvironmentVariableValue(sectionName, match.groups.key, match.groups.value ?? "");

      }
    }

  }

  public generateHoverMessage(document: vscode.TextDocument, position: vscode.Position): vscode.MarkdownString[] | null {

    const envVarData = this.getEnvVarDataForPosition(document, position);

    if (envVarData) {

      const hoverMessage = new vscode.MarkdownString(`[${envVarData.sectionName}] ${envVarData.varName}: '${envVarData.varValue}'`);

      console.log(`hover message: ${hoverMessage.value}`);

      return [hoverMessage];

    } else {

      return null;

    }
  }

  public getEnvVarDataForPosition(document: vscode.TextDocument, position: vscode.Position) {
    const range = document.getWordRangeAtPosition(position);
    const wordAtPosition = document.getText(range);

    console.log(`Word '${wordAtPosition}' at position (${position.line}, ${position.character}) with range from (${range?.start.line}, ${range?.start.character}) to (${range?.end.line}, ${range?.end.character})`);

    const sectionName = this.determineSection(document, position);
    const value = this.getToxEnvironmentVariableValue(sectionName, wordAtPosition);

    if (value) {

      return { sectionName: sectionName, varName: wordAtPosition, varValue: value };

    } else {

      return null;

    }
  }

  public getToxEnvironmentVariableValue(sectionName: string, varName: string): string | null {

    const value = this.toxEnvironmentVariables.get(sectionName)?.get(varName);

    return value ?? null;
  }

  public setToxEnvironmentVariableValue(sectionName: string, varName: string, varValue: string) {

    const section = this.toxEnvironmentVariables.get(sectionName);

    if (section) {

      section.set(varName, varValue);

    } else {

      const varNameValueMap = new Map<string, string>();
      varNameValueMap.set(varName, varValue);

      this.toxEnvironmentVariables.set(sectionName, varNameValueMap);

    }

  }

  public determineSection(document: vscode.TextDocument, position: vscode.Position): string {

    const positionStart = new vscode.Position(0, 0);
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
