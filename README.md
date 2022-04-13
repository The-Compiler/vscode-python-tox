# python-tox extension for Visual Studio Code

<a href="https://tox.readthedocs.io">
    <img src="https://raw.githubusercontent.com/tox-dev/tox/master/docs/_static/img/tox.png"
         alt="tox logo"
         height="100px"
         align="right",
         style="padding-left: 30px">
    <img src="https://media.githubusercontent.com/media/microsoft/vscode-docs/main/images/logo-stable.png"
         alt="VS Code logo"
         height="100px"
         align="right">
</a>


[![VS Marketplace Version](https://vsmarketplacebadge.apphb.com/version/the-compiler.python-tox.svg)](https://marketplace.visualstudio.com/items?itemName=the-compiler.python-tox)
[![VS Marketplace Installs](https://vsmarketplacebadge.apphb.com/installs/the-compiler.python-tox.svg)](https://marketplace.visualstudio.com/items?itemName=the-compiler.python-tox)
[![VS Marketplace Ratings](https://vsmarketplacebadge.apphb.com/rating/the-compiler.python-tox.svg)](https://marketplace.visualstudio.com/items?itemName=the-compiler.python-tox)

[![Open VSX Version](https://img.shields.io/open-vsx/v/the-compiler/python-tox?color=blue)](https://open-vsx.org/extension/the-compiler/python-tox)
[![Open VSX Downloads](https://img.shields.io/open-vsx/dt/the-compiler/python-tox?color=blue)](https://open-vsx.org/extension/the-compiler/python-tox)
[![Open VSX Ratings](https://img.shields.io/open-vsx/rating/the-compiler/python-tox?color=blue)](https://open-vsx.org/extension/the-compiler/python-tox)

[![CI](https://img.shields.io/github/workflow/status/The-Compiler/vscode-python-tox/CI)](https://github.com/The-Compiler/vscode-python-tox/actions/workflows/ci.yml)
[![Sponsor](https://img.shields.io/static/v1?label=Sponsor&message=%E2%9D%A4&logo=GitHub&color=pink)](https://github.com/sponsors/The-Compiler/)

This extension integrates the [tox](https://tox.readthedocs.io/) task automation tool with Visual Studio Code.

![Screenshot](img/quickpick.png)

## Here be dragons

**Note:** The extension was mainly written to scratch my own itch, and this is
the first time I'm writing something "real" using TypeScript and NodeJS.

Contributions, suggestions and improvements of all kinds are very welcome,
but use at your own risk.

## Installing

Install the extension via the [Visual Studio
Marketplace](https://marketplace.visualstudio.com/items?itemName=the-compiler.python-tox)
or the [Open VSX
Registry](https://open-vsx.org/extension/the-compiler/python-tox). Also, make
sure that [tox](https://github.com/tox-dev/tox) is installed.

Finally, run one of the [commands](#extension-commands) via the command palette
or bind them to a shortcut. No default shortcuts are provided.

For [VSpaceCode](https://vspacecode.github.io/), consider a configuration such as:

```jsonc
    "vspacecode.bindingOverrides": [
        {
            "keys": ["m", "languageId:python", "c", "t"],
            "name": "+Run tox",
            "icon": "play",
            "type": "command",
            "command": "python-tox.select"
        },
        {
            "keys": ["m", "languageId:python", "c", "T"],
            "name": "+Run tox (multiple)",
            "icon": "run-all",
            "type": "command",
            "command": "python-tox.selectMultiple"
        },
    ]
```

To get a development build of the latest commit, you can:

- Go to the [GitHub Actions tab](https://github.com/The-Compiler/vscode-python-tox/actions/workflows/ci.yml),
  view the newest passing run and download an automated build from the "Artifacts" section.
- Or clone the repository and run `npm run package`

Then install the resulting `.vsix` file using the command palette and selecting
"Extensions: Install from VSIX...".

## Extension Commands

- `python-tox.select`: Show a menu allowing to pick a tox environment.
- `python-tox.selectMultiple`: Show a menu allowing to pick multiple tox environments.
- `python-tox.createEnv`: A guided process to add a new tox environment to an existing tox.ini.

## Configuration

### python-tox.environment.template.new

This configuration section contains the relevant fields for creating new tox environments.

| Fields | Description | Sample value |
| - | - | - |
| filePath | File path to the template file. The content of this file is copied when creating a new tox env. Support for token replacement. The following tokens are supported: `TOX_ENV_NAME` | "/usr/template.tox.new"

#### Sample template file

```ini
[testenv:[${TOX_ENV_NAME}]
commands = {envpython} -c "print('one']"
```

## Release Notes

See [CHANGELOG.md](CHANGELOG.md).

## Releasing checklist

- Double-check the CI
- `npm version <major|minor|patch>`
- `git push origin`
- `git push origin vX.Y.Z`
- Lean back and let the CI do the rest
