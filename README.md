<a href="https://tox.readthedocs.io">
    <img src="https://raw.githubusercontent.com/tox-dev/tox/master/docs/_static/img/tox.png"
         alt="tox logo"
         height="150px"
         align="right">
    <img src="https://media.githubusercontent.com/media/microsoft/vscode-docs/main/images/logo-stable.png"
         alt="VS Code logo"
         height="150px"
         align="right">
</a>

# python-tox extension for Visual Studio Code

This extension integrates the [tox](https://tox.readthedocs.io/) task automation tool with Visual Studio Code.

![Screenshot](.github/img/quickpick.png)

## Here be dragons

**Note:** The extension was mainly written to scratch my own itch, and this is
the first time I'm writing something "real" using TypeScript and NodeJS.

Contributions, suggestions and improvements of all kinds are very welcome,
but use at your own risk.

## Installing

**This package isn't published to the VS Code Marketplace yet**, due to
issues with registering an Azure Organization. This should be fixed soon-ish.

In the meantime, you can:

- Go to the [GitHub Actions tab](https://github.com/The-Compiler/vscode-python-tox/actions/workflows/ci.yml),
  view the newest passing run and download an automated build from the "Artifacts" section.
- Or clone the repository and run `npm run package`

Then install the resulting `.vsix` file using the command palette and selecting
"Extensions: Install from VSIX...".

## Extension Commands

* `python-tox.select`: Show a menu allowing to pick a tox environment.
* `python-tox.selectMultiple`: Show a menu allowing to pick multiple tox environments.

## Release Notes

See [CHANGELOG.md](CHANGELOG.md).
