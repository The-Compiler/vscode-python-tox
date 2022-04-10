import * as vscode from 'vscode';
import { ConfigNewEnvironment } from '../model/toxConfiguration';
import * as fs from 'fs';
import * as _ from "lodash";

/**
 * The ToxEnvironmentService enables clients to 
 * work with tox environments
 */
export class ToxEnvironmentService {

    /**
     * VSCode command id to create a new tox environment
     */
    public static COMMAND_NEW_ENVIRONMENT = "python-tox.createEnv";

    private readonly _extensionName: string;
    private readonly _tokenDelimiter: RegExp;

    /**
     * Constructor
     * @param extensionName Extensions name
     * @param tokenDelimiter Token delimitor for updating config templates
     */
    public constructor(extensionName: string, tokenDelimiter: RegExp = /\${([\s\S]+?)}/g) {
        if (!extensionName) {
            throw new TypeError("ExtensionName is invalid")
        }
        if (!tokenDelimiter) {
            throw new TypeError("TokenDelimiter is invalid");
        }

        this._extensionName = extensionName;
        this._tokenDelimiter = tokenDelimiter;
    }

    /**
     * Create a new tox environment
     * @param toxIniPath Add tox environment to this tox config file
     * @param templateConfigSection config section id that contains the env templates
     * @returns 
     */
    public async createNewEnvironment(toxIniPath: string, templateConfigSection: string = "environment.template.new") {   
        const inputBoxTitle = `${this._extensionName}: Create Tox Environment`

        // get the tox.ini path
        const toxInitPathConfirmed = await vscode.window.showInputBox({ 
            title: inputBoxTitle, 
            prompt: "Enter tox.ini path", 
            value: toxIniPath, validateInput: (input) => (!input || !fs.existsSync(input)) ? "File does not exist" :""
        });
        if (!toxInitPathConfirmed) {
            // user cancelled operation
            return;
        }
        
        // get the name of the new tox environment
        const newEnvName = await vscode.window.showInputBox({ 
            title: inputBoxTitle, 
            prompt: "Enter new tox environment name", 
            value: "my-new-tox-env",
            validateInput: (input) => (input == undefined || input.length == 0) ? "Invalid environment name" : "" 
        });
        if (!newEnvName) {
            // user cancelled operation
            return;
        }

        // retrieve the configured template for a new tox env
        const templateConfig = vscode.workspace
                                    .getConfiguration(this._extensionName)
                                    ?.get<ConfigNewEnvironment>(templateConfigSection);

        // create the new env string
        let toxEnvironmentConfig = `[${newEnvName}]`;									
        if (templateConfig && templateConfig.filePath) {
            // read the content & do string interpolation
            toxEnvironmentConfig = this.prepareEnvironmentConfig(templateConfig.filePath, newEnvName);
        }

        // add new env to tox.ini
        var { success, doc } = await this.addToxEnvironment(toxInitPathConfirmed, toxEnvironmentConfig);
        if (success) {
            const editor = await vscode.window.showTextDocument(doc, { preview: false });
        }
    }

    private async addToxEnvironment(toxIniPath: string, template: string) {
        const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(toxIniPath));
        const edit = new vscode.WorkspaceEdit();
        edit.insert(doc.uri, new vscode.Position(doc.lineCount + 1, 0), template);
        let success = await vscode.workspace.applyEdit(edit);

        return { success, doc };
    }

    private prepareEnvironmentConfig(templatePath: fs.PathOrFileDescriptor, toxEnvName: string) {
        const variableMap = {
            TOX_ENV_NAME: toxEnvName
        };
        _.templateSettings.interpolate = this._tokenDelimiter;
        
        const templateContent = fs.readFileSync(templatePath);
        const compiled = _.template(templateContent.toString());
        return compiled(variableMap);
    }
}