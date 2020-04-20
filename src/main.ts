import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as io from '@actions/io';
import {mkdtemp, writeFile} from "fs";
import * as util from "util";
import path from "path";

interface ISwiftPackageNamedObject {
    name: string
}

interface ISwiftPackageProduct extends ISwiftPackageNamedObject {}

interface ISwiftPackage extends ISwiftPackageNamedObject {
    products: [ISwiftPackageProduct]
}

async function runCmd(cmd: string, args?: string[], failOnStdErr: boolean = true): Promise<string> {
    let stdOut = '';
    await exec.exec(cmd, args, {
        failOnStdErr: failOnStdErr,
        listeners: {
            stdline: (data: string) => stdOut += data
        }
    });
    return stdOut;
}

const _cwd = process.cwd();
function cleanup() { process.chdir(_cwd); }

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
    core.endGroup();

    await core.group('Installing Dependencies', async () =>
        await Promise.all([
            runCmd('brew', ['install', 'sourcekitten']),
            runCmd('gem', ['install', 'jazzy', '--no-document']),
        ])
    );

    const oldCwd = process.cwd();
    process.chdir(sourceDir);
    const packageJSON = await core.group('Parse package', async () => {
        // Resolving is necessary to prevent `swift package dump-package` from having resolving output.
        await runCmd('swift', ['package', 'resolve']);
        return JSON.parse(await runCmd('swift', ['package', 'dump-package'])) as ISwiftPackage;
    });

    const moduleDocs = await core.group('Generating JSON docs', async () => {
        let docs: string[] = []
        for (const product of packageJSON.products) {
            // We need to synchronously generate docs or SPM will shoot itself.
            const moduleDoc = await runCmd('sourcekitten', ['doc', '--spm-module', product.name]);
            docs.push(moduleDoc);
        }
        return docs
    });
    process.chdir(oldCwd);

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
            additionalJazzyArgs.concat(['--module-version', moduleVersion]);
        }
        if (outputFolder) {
            additionalJazzyArgs.concat(['--output', outputFolder]);
        }
        await runCmd('jazzy', ['--sourcekitten-sourcefile', docsJSONPath].concat(additionalJazzyArgs));
    });

    await core.group('Cleaning up', async () => await io.rmRF(tempDir));
}

try {
    main().catch(error => core.setFailed(error.message)).finally(cleanup);
} catch (error) {
    core.setFailed(error.message);
    cleanup();
}
