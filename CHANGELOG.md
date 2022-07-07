# Change Log

All notable changes to the "python-tox" extension will be documented in this file.

## v1.0.0

- New `python-tox.runWithArgs` and `python-tox.runMultipleWithArgs` commands
  which ask for additional arguments to tox.
- Basic integration with VS Code's testing extension API, by providing a tox test runner when a `tox.ini` file is open. This allows running tox environments right from the editor.
- Integration with VS Code's task API, so that tox environments can be run as tasks.
- Hover information for environment variables (`passenv` / `setenv`) when
  editing a `tox.ini` file.
- Upgraded all dependencies.

## v0.1.0

- New `python-tox.openDocs` command to open the tox documentation in the
  default browser.
- Upgraded all dependencies.

## v0.0.3

- Updated documentation and `package.json`
- No code changes

## v0.0.2

- Updated documentation and `package.json`
- No code changes

## v0.0.1

- Initial release
