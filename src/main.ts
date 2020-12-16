import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as io from '@actions/io';
import {mkdtemp, writeFile} from "fs";
import * as util from "util";
import path from "path";

interface ISwiftPackageNamedObject {
    name: string;
}

interface ISwiftPackageProduct extends ISwiftPackageNamedObject {
    targets: string[];
}

interface ISwiftPackageTarget extends ISwiftPackageNamedObject {}

interface ISwiftPackage extends ISwiftPackageNamedObject {
    products: [ISwiftPackageProduct];
    targets: [ISwiftPackageTarget];
}

async function runCmd(cmd: string, args?: string[], failOnStdErr: boolean = true, cwd?: string): Promise<string> {
    let stdOut = '';
    await exec.exec(cmd, args, {
        cwd: cwd,
        failOnStdErr: failOnStdErr,
        listeners: {
            stdout: (data: Buffer) => stdOut += data.toString()
        }
    });
    return stdOut;
}

async function main() {
    switch (process.platform) {
        case "darwin": break;
        default: throw new Error("This action only supports macOS!");
    }

    core.startGroup('Validating input');
    const sourceDir = core.getInput('source', { required: true });
    const moduleVersion = core.getInput('module-version');
    const outputFolder = core.getInput('output');
    const cleanBuild = core.getInput('clean', { required: true }) == 'true';
    const xcodebuildDestination = core.getInput('xcodebuild-destination');
    core.endGroup();

    await core.group('Installing Dependencies', async () =>
        await Promise.all([
            runCmd('brew', ['install', 'sourcekitten']),
            runCmd('gem', ['install', 'jazzy', '--no-document']),
        ])
    );

    const packageJSON = await core.group('Parse package', async () => {
        // Resolving is necessary to prevent `swift package dump-package` from having resolving output.
        await runCmd('swift', ['package', 'resolve'], true, sourceDir);
        return JSON.parse(await runCmd('swift', ['package', 'dump-package'], true, sourceDir)) as ISwiftPackage;
    });

    const moduleDocs = await core.group('Generating JSON docs', async () => {
        let docs: string[] = [];
        const uniqueTargets = new Set(packageJSON.products.flatMap(p => p.targets));
        for (const targetName of uniqueTargets) {
            // We need to synchronously generate docs or SPM will shoot itself.
            let targetArgs = ['doc', '--module-name', targetName];
            if (xcodebuildDestination) {
                targetArgs.push('--', '-scheme', targetName, '-destination', xcodebuildDestination);
            } else {
                targetArgs.push('--spm');
            }
            const moduleDoc = await runCmd('sourcekitten', targetArgs, false, sourceDir);
            docs.push(moduleDoc);
        }
        return docs;
    });

    const tempDir = await util.promisify(mkdtemp)('swift-docs-action');
    const docsJSONPath = path.join(tempDir, 'combinedDocs.json');
    await core.group('Combining docs', async () => {
        const combinedDocs = moduleDocs.reduce((docs, doc) => docs.concat(JSON.parse(doc) as any[]), [] as any[]);
        await util.promisify(writeFile)(docsJSONPath, JSON.stringify(combinedDocs));
    });

    if (cleanBuild && outputFolder) {
        await core.group('Cleaning previous output', async () => await io.rmRF(outputFolder));
    }

    await core.group('Generating Jazzy docs', async () => {
        let additionalJazzyArgs: string[] = [];
        if (moduleVersion) {
            additionalJazzyArgs.push('--module-version', moduleVersion);
        }
        if (outputFolder) {
            additionalJazzyArgs.push('--output', outputFolder);
        }
        await runCmd('jazzy', ['--sourcekitten-sourcefile', docsJSONPath].concat(additionalJazzyArgs), false);
    });

    await core.group('Cleaning up', async () => await io.rmRF(tempDir));
}

try {
    main().catch(error => core.setFailed(error.message))
} catch (error) {
    core.setFailed(error.message);
}
