import { VsCodeEnv } from "../abstraction/environment";

/**
 * This service enables clients to run utility commands
 */
export class UtilityService {

    private readonly environment: VsCodeEnv; 

    /**
     * Constructor
     * @param environment Abstraction of vscode.env 
     */
    constructor(environment: VsCodeEnv) {
        if (!environment) {
            throw new TypeError("Environment is invalid");
        }
            
        this.environment = environment;
    }

    /**
     * Open an external URL in default browser
     * @param url Uri to open
     */
    public openExternalUrl(url: string) {
        if (!url) {
            throw new TypeError("Url is invalid");
        }

        this.environment.openExternal(url);
    }
}