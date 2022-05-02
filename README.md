# Swift Package Documentation Generator

[![Tests](https://github.com/sersoft-gmbh/swifty-docs-action/actions/workflows/tests.yml/badge.svg)](https://github.com/sersoft-gmbh/swifty-docs-action/actions/workflows/tests.yml)

This action generates documentation for a Swift package using `docc`.

**Important:** The package must use the [Swift-DocC Plugin](https://github.com/apple/swift-docc-plugin).

## Inputs

### `package-path`

The path to the package.<br/>
Required. Defaults to `${{github.workspace}}`.

### `package-version`

The version to use for this package.

### `enable-inherited-docs`

Whether to enable inherited docs. Defaults to `false`.

### `disable-indexing`

Disables indexing for `docc`. Defaults to `false`.

### `transform-for-static-hosting`

Enables the static hosting transformation. Defaults to `false`.

### `hosting-base-path`

The hosting base path to use.

### `targets`

A list of targets separated by newline. If not given, all targets are built.<br/>
This is ignored if `use-xcodebuild` is `true`!

### `use-xcodebuild`

Tells the action to use `xcodebuild` (instead of `swift package`).
Use `xcodebuild-scheme` and `xcodebuild-destination` to further customize the `xcodebuild` invocation.<br/>
Defaults to `false`.<br/>
_Note:_ This parameter is only evaluated when running on macOS.

### `xcodebuild-scheme`

The scheme to use for the `xcodebuild` invocation. Only used if `use-xcodebuild` is `true`.<br/>
_Note:_ This parameter is only evaluated when running on macOS.

### `xcodebuild-destination`

The destination to use for the `xcodebuild` invocation. Only used if `use-xcodebuild` is `true`.<br/>
_Note:_ This parameter is only evaluated when running on macOS.

### `output`

The path to the output directory.

## Example Usage

Use the following snippet in a Swift package repository to generate documentation for all products of your Swift package:
```yaml
uses: sersoft-gmbh/swifty-docs-action@v2
with:
  output: docs
```
