// swift-tools-version:6.1
// The swift-tools-version declares the minimum version of Swift required to build this package.

import PackageDescription

let package = Package(
    name: "TestProject",
    products: [
        // Products define the executables and libraries produced by a package, and make them visible to other packages.
        .library(
            name: "TestProject1",
            targets: ["TestProject1"]),
        .library(
            name: "TestProject2",
            targets: ["TestProject2"]),
        .library(
            name: "TestProjectCombined",
            targets: ["TestProject1", "TestProject2"]),
    ],
    dependencies: [
        .package(url: "https://github.com/apple/swift-docc-plugin", from: "1.0.0"),
    ],
    targets: [
        // Targets are the basic building blocks of a package. A target can define a module or a test suite.
        // Targets can depend on other targets in this package, and on products in packages which this package depends on.
        .target(name: "TestProject1"),
        .target(name: "TestProject2"),
    ]
)
