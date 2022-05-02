import * as core from '@actions/core';
import * as exec from '@actions/exec';

interface IDocCOptions {
    targets: string[];
    disableIndexing: boolean;
    transformForStaticHosting: boolean;
    hostingBasePath: string | null;
    outputPath: string | null;
}

async function runCmd(cmd: string, args?: string[]): Promise<string> {
    const output = await exec.getExecOutput(cmd, args, {
        silent: !core.isDebug(),
    });
    return output.stdout;
}

function docCFlags(options: IDocCOptions): string[] {
    let args = [];
    if (options.targets.length > 0) {
        args.push(...options.targets.flatMap(t => ['--target', t]));
    }
    if (options.disableIndexing) args.push('--disable-indexing');
    if (options.transformForStaticHosting) args.push('--transform-for-static-hosting');
    if (options.hostingBasePath) args.push('--hosting-base-path', options.hostingBasePath);
    if (options.outputPath) args.push('--output-path', options.outputPath);
    return args;
}

async function generateDocsUsingSPM(options: IDocCOptions): Promise<string> {
    let args = ['package'];
    if (options.outputPath) args.push('--allow-writing-to-directory', options.outputPath);
    args.push('generate-documentation');
    args.push(...docCFlags(options));
    return await runCmd('swift', args);
}

async function generateDocsUsingXcode(
    options: IDocCOptions,
    scheme: string | null,
    destination: string | null
): Promise<string> {
    let args = ['docbuild'];
    if (scheme) args.push('-scheme', scheme);
    if (destination) args.push('-destination', destination);
    // TODO: Do we need to do this?
    // const safeFlags = docCFlags(options).map(t => t.includes(' ') ? `'${t}'` : t).join(' ');
    args.push(`OTHER_DOCC_FLAGS="${docCFlags(options).join(' ')}"`);
    return await runCmd('xcodebuild', args);
}

async function main() {
    switch (process.platform) {
        case 'darwin': break;
        case 'linux': break;
        default: throw new Error('This action currently only supports macOS and Linux!');
    }

    core.startGroup('Validating input');
    const targets = core.getMultilineInput('targets');
    const disableIndexing = core.getBooleanInput('disable-indexing');
    const transformForStaticHosting = core.getBooleanInput('transform-for-static-hosting');
    const hostingBasePath = core.getInput('hosting-base-path');
    const outputDir = core.getInput('output');
    const useXcodebuild = process.platform === 'darwin' && core.getBooleanInput('use-xcodebuild');
    let xcodebuildScheme: string | null;
    let xcodebuildDestination: string | null;
    if (useXcodebuild) {
        xcodebuildScheme = core.getInput('xcodebuild-scheme');
        xcodebuildDestination = core.getInput('xcodebuild-destination');
    } else {
        xcodebuildScheme = null;
        xcodebuildDestination = null;
    }
    core.endGroup();

    await core.group('Generating documentation', async () => {
        const options: IDocCOptions = {
            targets: targets,
            disableIndexing: disableIndexing,
            transformForStaticHosting: transformForStaticHosting,
            hostingBasePath: hostingBasePath.length > 0 ? hostingBasePath : null,
            outputPath: outputDir.length > 0 ? outputDir : null,
        };
        if (useXcodebuild) {
            await generateDocsUsingXcode(options, xcodebuildScheme, xcodebuildDestination);
        } else {
            await generateDocsUsingSPM(options);
        }
    });
}

try {
    main().catch(error => core.setFailed(error.message));
} catch (error: any) {
    core.setFailed(error.message);
}
