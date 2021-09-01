import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as tools from '@actions/tool-cache';
import * as io from '@actions/io';
import { Octokit } from '@octokit/rest';
import { promises as fs } from 'fs';
import path from 'path';

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
    const output = await exec.getExecOutput(cmd, args, {
        cwd: cwd,
        failOnStdErr: failOnStdErr,
        silent: !core.isDebug()
    });
    return output.stdout;
}

async function downloadSourceKitten(): Promise<void> {
    const gh = new Octokit();
    const { data: release } = await gh.rest.repos.getLatestRelease({
        owner: 'jpsim',
        repo: 'SourceKitten'
    });
    if (!release.zipball_url) {
        throw new Error('Missing zipball_url on latest SourceKitten release!');
    }
    const zipDst = await tools.downloadTool(release.zipball_url);
    core.debug(`Downloaded zip to ${zipDst}...`);
    const unzipDst = await tools.extractZip(zipDst);
    core.debug(`Extracted zip to ${unzipDst}...`);
    const contents = await fs.readdir(unzipDst);
    core.debug(`Contents of extraction destination: ${contents}`);
    const folder = contents.find(c => c.toLowerCase().startsWith('jpsim-sourcekitten')) ?? contents[0];
    await runCmd('sudo', ['make', 'prefix_install'], false, path.join(unzipDst, folder));
}

async function installDependencies(): Promise<void> {
    if (process.platform === 'darwin') {
        await Promise.all([
            runCmd('brew', ['install', 'sourcekitten'], false),
            runCmd('gem', ['install', 'jazzy', '--no-document'], false),
        ]);
    } else {
        await Promise.all([
            downloadSourceKitten(),
            runCmd('sudo', ['gem', 'install', 'jazzy', '--no-document'], false),
        ]);
    }
}

async function main() {
    switch (process.platform) {
        case 'darwin': break;
        case 'linux': break;
        default: throw new Error('This action only supports macOS and Linux!');
    }

    core.startGroup('Validating input');
    const sourceDir = core.getInput('source', { required: true });
    const moduleVersion = core.getInput('module-version');
    const outputFolder = core.getInput('output');
    const cleanBuild = core.getBooleanInput('clean', { required: true }) ;
    let xcodebuildDestination: string | null;
    if (process.platform === 'darwin') {
        xcodebuildDestination = core.getInput('xcodebuild-destination');
    } else {
        xcodebuildDestination = null;
    }
    core.endGroup();

    await core.group('Installing Dependencies', async () => await installDependencies());

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

    const tempDir = await fs.mkdtemp('swift-docs-action');
    const docsJSONPath = path.join(tempDir, 'combinedDocs.json');
    await core.group('Combining docs', async () => {
        const combinedDocs = moduleDocs.reduce((docs, doc) => docs.concat(JSON.parse(doc) as any[]), [] as any[]);
        await fs.writeFile(docsJSONPath, JSON.stringify(combinedDocs));
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
    main().catch(error => core.setFailed(error.message));
} catch (error: any) {
    core.setFailed(error.message);
}
