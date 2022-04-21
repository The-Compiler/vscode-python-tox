import { RunToxService } from '../../service/runToxService';
import { anything, instance, mock, verify, when } from 'ts-mockito';
import { VsCodeWindow } from '../../abstraction/window';
import { VsCodeWorkspace } from '../../abstraction/workspace';
import { Terminal, TerminalOptions } from 'vscode';
import assert = require('assert');

describe('RunToxService tests', () => { 
    it('Successfully run tox command', async () => { 
        const projDir = "dir";
        const toxEnvs = ["foo", "bar"];

        const mockWindow = mock<VsCodeWindow>();
        const mockWorkspace = mock<VsCodeWorkspace>();
        const mockTerminal = mock<Terminal>();
        when(mockWindow.createTerminal(anything())).thenCall((options: TerminalOptions) => {
            assert.equal(options.cwd, projDir);
            assert.equal(options.name, "tox");

            return instance(mockTerminal);
        });

        const service = new RunToxService(instance(mockWindow), instance(mockWorkspace));
        await service.runTox(toxEnvs, projDir);

        verify(mockTerminal.show(true)).once();
        verify(mockTerminal.sendText(`tox -e ${toxEnvs}`)).once();
    });
});