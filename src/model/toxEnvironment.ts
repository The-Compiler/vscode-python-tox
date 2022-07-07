import { Uri } from 'vscode';

/**
 * Definition of a tox environment
 */
export interface ToxEnvironment {
    /**
     * Name of the tox environment
     */
    name: string,
    /**
     * Uri of the tox.ini that contains the environment definition
     */
    doc: Uri
};