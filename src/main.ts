import * as core from '@actions/core';
import * as exec from '@actions/exec';
import path from "path";

interface ILengthProviding {
    length: number;
}

interface IDocCOptions {
    disableIndexing: boolean;
    transformForStaticHosting: boolean;
    enableInheritedDocs: boolean;
    bundleVersion: string | null;
    hostingBasePath: string | null;
    outputPath: string | null;
}

async function runCmd(cmd: string, args?: string[], cwd?: string): Promise<string> {
    const output = await exec.getExecOutput(cmd, args, {
        cwd: cwd,
        silent: !core.isDebug(),
    });
    return output.stdout;
}

function nonEmpty<T extends ILengthProviding>(t: T): T | null {
    return t.length > 0 ? t : null;
}

function mapNonNull<T, U>(t: T | null, fn: (t: T) => U): U | null {
    return t ? fn(t) : null;
}

function docCFlags(options: IDocCOptions): string[] {
    let args = [];
    if (options.disableIndexing) args.push('--disable-indexing');
    if (options.transformForStaticHosting) args.push('--transform-for-static-hosting');
    if (options.enableInheritedDocs) args.push('--enable-inherited-docs');
    if (options.bundleVersion) args.push('--bundle-version', options.bundleVersion);
    if (options.hostingBasePath) args.push('--hosting-base-path', options.hostingBasePath);
    if (options.outputPath) args.push('--output-path', options.outputPath);
    return args;
}

async function generateDocsUsingSPM(packagePath: string, targets: string[], options: IDocCOptions): Promise<string> {
    let args = ['package'];
    if (options.outputPath) args.push('--allow-writing-to-directory', options.outputPath);
    args.push('generate-documentation');
    if (targets.length > 0) {
        args.push(...targets.flatMap(t => ['--target', t]));
    }
    args.push(...docCFlags(options));
    return await runCmd('swift', args, packagePath);
}

async function generateDocsUsingXcode(
    packagePath: string,
    options: IDocCOptions,
    doccSupportsOutputPath: boolean,
    scheme: string | null,
    destination: string | null
): Promise<string> {
    let args = ['docbuild'];
    if (scheme) args.push('-scheme', scheme);
    if (destination) args.push('-destination', destination);
    if (!doccSupportsOutputPath && options.outputPath) {
        args.push(`DOCC_OUTPUT_DIR="${options.outputPath}"`)
        options.outputPath = null;
    }
    // TODO: Do we need to do this?
    // const safeFlags = docCFlags(options).map(t => t.includes(' ') ? `'${t}'` : t).join(' ');
    args.push(`OTHER_DOCC_FLAGS="${docCFlags(options).join(' ')}"`);
    return await runCmd('xcodebuild', args, packagePath);
}

async function main() {
    switch (process.platform) {
        case 'darwin': break;
        case 'linux': break;
        default: throw new Error('This action currently only supports macOS and Linux!');
    }

    core.startGroup('Validating input');
    const packagePath = core.getInput('package-path', { required: true });
    const packageVersion = core.getInput('package-version');
    const disableIndexing = core.getBooleanInput('disable-indexing', { required: true });
    const enableInheritedDocs = core.getBooleanInput('enable-inherited-docs', { required: true });
    const transformForStaticHosting = core.getBooleanInput('transform-for-static-hosting', { required: true });
    const hostingBasePath = core.getInput('hosting-base-path');
    const outputDir = core.getInput('output');
    const useXcodebuild = process.platform === 'darwin' && core.getBooleanInput('use-xcodebuild');
    let targets: string[];
    let xcodebuildScheme: string | null;
    let xcodebuildDestination: string | null;
    if (useXcodebuild) {
        targets = [];
        xcodebuildScheme = core.getInput('xcodebuild-scheme', { required: true });
        xcodebuildDestination = core.getInput('xcodebuild-destination', { required: true });
    } else {
        targets = core.getMultilineInput('targets');
        xcodebuildScheme = null;
        xcodebuildDestination = null;
    }
    core.endGroup();

    const supportsOutputPath = !useXcodebuild || await core.group('Determining docc setup', async () => {
        const output = await runCmd('xcrun', ['docc', 'convert', '--help']);
        return output.includes('--output-path');
    })

    await core.group('Generating documentation', async () => {
        const options: IDocCOptions = {
            disableIndexing: disableIndexing,
            transformForStaticHosting: transformForStaticHosting,
            enableInheritedDocs: enableInheritedDocs,
            bundleVersion: nonEmpty(packageVersion),
            hostingBasePath: nonEmpty(hostingBasePath),
            outputPath: mapNonNull(nonEmpty(outputDir), path.resolve),
        };
        if (useXcodebuild) {
            await generateDocsUsingXcode(
                packagePath,
                options,
                supportsOutputPath,
                xcodebuildScheme,
                xcodebuildDestination
            );
        } else {
            await generateDocsUsingSPM(packagePath, targets, options);
        }
    });
}

try {
    main().catch(error => core.setFailed(error.message));
} catch (error: any) {
    core.setFailed(error.message);
}
