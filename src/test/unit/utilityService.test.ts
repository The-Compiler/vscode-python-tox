import { UtilityService } from '../../service/utilityService';
import { instance, mock, verify } from 'ts-mockito';
import { VsCodeEnv } from '../../abstraction/environment';
import { throws } from 'assert';

describe('UtilityService tests', () => { 
    it('checking correct Url is opened', () => { 
        const mockedEnv = mock<VsCodeEnv>();
        const expectedUri = "https://tox.wiki";
        const service = new UtilityService(instance(mockedEnv));

        service.openExternalUrl(expectedUri);

        verify(mockedEnv.openExternal(expectedUri)).once();
    });

    it('constructor throws error if env object is invalid', () => {
        let env: VsCodeEnv;

        throws(() => new UtilityService(env), TypeError);
    });

    it('openExternalUrl throws error if url is invalid', () => {
        let url: string;

        const mockedEnv = mock<VsCodeEnv>();
        const service = new UtilityService(mockedEnv);
        throws(() => service.openExternalUrl(url), TypeError);
    });
});