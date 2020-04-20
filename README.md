# SwiftPM Jazzy Docs

![Master Deploy](https://github.com/sersoft-gmbh/swifty-docs-action/workflows/Master%20Deploy/badge.svg)

This action generates and combines jazzy docs for all products of a Swift package.

Note that this action needs to run on macOS. All other platforms will fail!

## Inputs

### `source`

The path to the Swift package.<br/>
Default: `${{github.workspace}}`.

### `module-version`

The version to use when generating the docs.

### `output`

The path to the output folder.

### `clean`

Whether a previous output should be removed before generating docs.<br/>
Default: `false`

## Example Usage

Use the following snippet in a Swift package repository to generate jazzy docs for all products of your Swift package:
```yaml
uses: sersoft-gmbh/swifty-docs-action@v1
with:
  # Optional. Defaults to ${{github.workspace}}.
  source: ${{github.workspace}}
  # Optional. E.g. run this action on tags and use the tag name.
  module-version: 1.2.3
  # Optional.
  output: docs
  # Optional. Defaults to true.
  clean: true
```
