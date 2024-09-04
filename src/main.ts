import * as core from '@actions/core';
import { getExecOutput } from '@actions/exec';
import path from 'path';

interface ILengthProviding {
    length: number;
}

interface IDocCSourceRepositoryService {
    type: 'github' | 'gitlab' | 'bitbucket' | string;
    baseUrl: string;
}

interface IDocCSourceRepositoryOptions {
    checkoutPath: string | null;
    service: IDocCSourceRepositoryService | null;
}

interface IDocCOptions {
    enableIndexBuilding: boolean;
    transformForStaticHosting: boolean;
    enableInheritedDocs: boolean;
    sourceRepository: IDocCSourceRepositoryOptions | null;
    bundleVersion: string | null;
    hostingBasePath: string | null;
    outputPath: string | null;
    otherArgs: string[];
}

async function runCmd(cmd: string, args?: string[], cwd?: string): Promise<string> {
    const output = await getExecOutput(cmd, args, {
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

function docCFlags(options: IDocCOptions, useSPMPlugin: boolean): string[] {
    let args: string[] = [];
    if (!options.enableIndexBuilding && useSPMPlugin) args.push('--disable-indexing');
    else if (options.enableIndexBuilding && !useSPMPlugin) args.push('--index');
    if (options.transformForStaticHosting) args.push('--transform-for-static-hosting');
    if (options.enableInheritedDocs) args.push('--enable-inherited-docs');
    if (options.sourceRepository?.checkoutPath) args.push('--checkout-path', options.sourceRepository.checkoutPath);
    if (options.sourceRepository?.service) {
        args.push('--source-service', options.sourceRepository.service.type);
        args.push('--source-service-base-url', options.sourceRepository.service.baseUrl);
    }
    if (options.bundleVersion) args.push('--bundle-version', options.bundleVersion);
    if (options.hostingBasePath) args.push('--hosting-base-path', options.hostingBasePath);
    if (options.outputPath) args.push('--output-path', options.outputPath);
    args.push(...options.otherArgs);
    return args;
}

async function generateDocsUsingSPM(
    packagePath: string,
    targets: string[],
    options: IDocCOptions
): Promise<string> {
    let args = ['package'];
    if (options.outputPath) args.push('--allow-writing-to-directory', options.outputPath);
    args.push('generate-documentation');
    if (targets.length > 0) args.push(...targets.flatMap(t => ['--target', t]));
    args.push(...docCFlags(options, true));
    return await runCmd('swift', args, packagePath);
}

async function generateDocsUsingXcode(
    packagePath: string,
    options: IDocCOptions,
    scheme: string | null,
    destination: string | null,
    otherArgs: string[]
): Promise<string> {
    let args = ['docbuild'];
    if (scheme) args.push('-scheme', scheme);
    if (destination) args.push('-destination', destination);
    const safeFlags = docCFlags(options, false).map(t => t.includes(' ') ? `"${t}"` : t).join(' ');
    args.push(`OTHER_DOCC_FLAGS=${safeFlags}`);
    args.push(...otherArgs);
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
    const enableIndexBuilding = core.getBooleanInput('enable-index-building', { required: true });
    const enableInheritedDocs = core.getBooleanInput('enable-inherited-docs', { required: true });
    const checkoutPath = core.getInput('checkout-path');
    const repoService = core.getInput('repository-service');
    const repoBaseUrl = core.getInput('repository-base-url');
    const transformForStaticHosting = core.getBooleanInput('transform-for-static-hosting', { required: true });
    const hostingBasePath = core.getInput('hosting-base-path');
    const outputDir = core.getInput('output');
    const otherDoccArgs = core.getMultilineInput('other-docc-arguments');
    const useXcodebuild = process.platform === 'darwin' && core.getBooleanInput('use-xcodebuild');
    let targets: string[];
    let xcodebuildScheme: string | null;
    let xcodebuildDestination: string | null;
    let otherXcodebuildArgs: string[];
    if (useXcodebuild) {
        targets = [];
        xcodebuildScheme = core.getInput('xcodebuild-scheme', { required: true });
        xcodebuildDestination = core.getInput('xcodebuild-destination', { required: true });
        otherXcodebuildArgs = core.getMultilineInput('other-xcodebuild-arguments');
    } else {
        targets = core.getMultilineInput('targets');
        xcodebuildScheme = null;
        xcodebuildDestination = null;
        otherXcodebuildArgs = [];
    }
    core.endGroup();

    await core.group('Generating documentation', async () => {
        const options: IDocCOptions = {
            enableIndexBuilding: enableIndexBuilding,
            transformForStaticHosting: transformForStaticHosting,
            enableInheritedDocs: enableInheritedDocs,
            sourceRepository: checkoutPath || repoService || repoBaseUrl ? {
                checkoutPath: nonEmpty(checkoutPath),
                service: repoService && repoBaseUrl ? {
                    type: repoService,
                    baseUrl: repoBaseUrl,
                } : null,
            } : null,
            bundleVersion: nonEmpty(packageVersion),
            hostingBasePath: nonEmpty(hostingBasePath),
            outputPath: mapNonNull(nonEmpty(outputDir), path.resolve),
            otherArgs: otherDoccArgs,
        };
        if (useXcodebuild) {
            await generateDocsUsingXcode(
                packagePath,
                options,
                xcodebuildScheme,
                xcodebuildDestination,
                otherXcodebuildArgs
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
