import {Config} from '@remotion/cli/config';

// Chrome sem tela com WebGL por software (SwiftShader/ANGLE): o ambiente não tem GPU.
Config.setChromiumOpenGlRenderer('swangle');
Config.setBrowserExecutable('/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell');
Config.setConcurrency(2);
