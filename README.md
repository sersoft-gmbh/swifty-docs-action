# Swift Package Documentation Generator

[![Tests](https://github.com/sersoft-gmbh/swifty-docs-action/actions/workflows/tests.yml/badge.svg)](https://github.com/sersoft-gmbh/swifty-docs-action/actions/workflows/tests.yml)

This action generates documentation for a Swift package using `docc`.

**Important:** The package must use the [Swift-DocC Plugin](https://github.com/apple/swift-docc-plugin) unless `xcodebuild` is used!

**Note:** As of version 2, this action uses `docc` instead of `jazzy`! Use `@v1` to use `jazzy`. 

## Inputs

See [action.yml](action.yml) for all inputs.

## Example Usage

Use the following snippet in a Swift package repository to generate documentation for all products of your Swift package:
```yaml
uses: sersoft-gmbh/swifty-docs-action@v4
with:
  output: docs
```
