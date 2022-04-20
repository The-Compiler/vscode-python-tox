import { UtilityService } from '../../service/utilityService';
import { instance, mock, verify } from 'ts-mockito';
import { VsCodeEnv } from '../../abstraction/environment';

describe('UtilityService tests', () => { 
    it('checking correct Url is opened', () => { 
        const mockedEnv = mock<VsCodeEnv>();
        const expectedUri = "https://tox.wiki";
        const service = new UtilityService(instance(mockedEnv));

        service.openExternalUrl(expectedUri);

        verify(mockedEnv.openExternal(expectedUri)).once();
    });
});