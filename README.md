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

### `xcodebuild-destination`

Tells the action to use `xcodebuild` (instead of `swift build`) and passes the value as `-destination` to `xcodebuild`.
This parameter can be useful if a package is e.g. iOS only.
Note that currently, swifty-docs-action creates docs for the unique set of targets of all the defined products in the SwiftPM package.
Thus, there are a set of requirements that go along with the `xcodebuild-destination` parameter:

- All targets that are referenced by a product *must* have a corresponding scheme. This can either happen by Xcode's automatic scheme generation, or manually (in which case the `.swiftpm` must be commited to the repository).
- The `xcodebuild-destination` is applied as `-destination` to **all** builds. Selectively controlling this might come in a future update. 

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
