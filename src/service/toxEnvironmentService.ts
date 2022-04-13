import * as vscode from 'vscode';
import { ConfigNewEnvironment } from '../model/toxConfiguration';
import * as fs from 'fs';
import * as _ from "lodash";
import { ToxEnvironment } from '../model/toxEnvironment';

/**
 * The ToxEnvironmentService enables clients to 
 * work with tox environments
 */
export class ToxEnvironmentService {

    /**
     * VSCode command id to create a new tox environment
     */
    public static commandNewEnvironment = "python-tox.createEnv";

    /**
     * Token delimitor for updating config templates. Default expression is ${..}
     */
    private readonly _tokenDelimiter: RegExp = /\${([\s\S]+?)}/g;

    private readonly _extensionName: string;

    /**
     * Constructor
     * @param extensionName Extensions name
     */
    public constructor(
        extensionName: string) {
        if (!extensionName) {
            throw new TypeError("ExtensionName is invalid");
        }
        
        this._extensionName = extensionName;
    }

    /**
     * Create a new tox environment
     * @param toxIniPath Add tox environment to this tox config file
     * @param templateConfigSection config section id that contains the env templates
     * @returns 
     */
    public async createNewEnvironment(toxIniPath: string, templateConfigSection: string = "environment.template.new"): Promise<ToxEnvironment | undefined> {   
        const inputBoxTitle = `${this._extensionName}: Create Tox Environment`;

        // get the tox.ini path
        const toxInitPathConfirmed = await vscode.window.showInputBox({ 
            title: inputBoxTitle, 
            prompt: "Enter tox.ini path", 
            value: toxIniPath, validateInput: (input) => (!input || !fs.existsSync(input)) ? "File does not exist" :""
        });
        if (!toxInitPathConfirmed) {
            // user cancelled operation
            return undefined;
        }
        
        // get the name of the new tox environment
        const newEnvName = await vscode.window.showInputBox({ 
            title: inputBoxTitle, 
            prompt: "Enter new tox environment name", 
            value: "my-new-tox-env",
            validateInput: (input) => (input === undefined || input.length === 0) ? "Invalid environment name" : "" 
        });
        if (!newEnvName) {
            // user cancelled operation
            return undefined;
        }

        // retrieve the configured template for a new tox env
        const templateConfig = vscode.workspace
                                    .getConfiguration(this._extensionName)
                                    ?.get<ConfigNewEnvironment>(templateConfigSection);

        // create the new env string
        let toxEnvironmentConfig = `[${newEnvName}]`;									
        if (templateConfig && templateConfig.templateFilePath) {
            // read the content & do string interpolation
            toxEnvironmentConfig = this.prepareEnvironmentConfig(templateConfig.templateFilePath, newEnvName);
        }

        // add new env to tox.ini
        var updatedDoc = await this.addToxEnvironment(toxInitPathConfirmed, toxEnvironmentConfig);
        if (!updatedDoc) {
            return undefined;
        }

        await vscode.window.showTextDocument(updatedDoc, { preview: false });
        return {
            name: newEnvName,
            doc: updatedDoc.uri
        };
    }

    private async addToxEnvironment(toxIniPath: string, template: string): Promise<vscode.TextDocument | undefined> {
        const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(toxIniPath));
        const edit = new vscode.WorkspaceEdit();
        edit.insert(doc.uri, new vscode.Position(doc.lineCount + 1, 0), template);
        
        return (await vscode.workspace.applyEdit(edit)) ? doc : undefined;
    }

    private prepareEnvironmentConfig(templatePath: string, toxEnvName: string): string {
        /* eslint-disable @typescript-eslint/naming-convention */
        const variableMap = {
            TOX_ENV_NAME: toxEnvName
        };
        /* eslint-enable @typescript-eslint/naming-convention */
        
        _.templateSettings.interpolate = this._tokenDelimiter;
        
        const templateContent = vscode.workspace.fs.readFile(vscode.Uri.file(templatePath));
        const compiled = _.template(templateContent.toString());
        return compiled(variableMap);
    }
}