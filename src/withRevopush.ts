import {
    type ConfigPlugin,
    AndroidConfig,
    withInfoPlist,
    withAppDelegate,
    withStringsXml,
    withAppBuildGradle,
    withMainApplication,
} from '@expo/config-plugins';
import {addImports} from '@expo/config-plugins/build/android/codeMod';
import {mergeContents} from '@expo/config-plugins/build/utils/generateCode';

type RevopushConfig = {
    ios?: {
        CodePushDeploymentKey: string;
        CodePushPublicKey?: string;
        CodePushServerUrl?: string;
    };
    android?: {
        CodePushDeploymentKey: string;
        CodePushPublicKey?: string;
        CodePushServerUrl?: string;
    };
}

const withIosPlugin: ConfigPlugin<RevopushConfig> = (config, {ios}) => {
    if (!ios) {
        return config;
    }

    config = withInfoPlist(config, (config) => {
        if (!ios.CodePushDeploymentKey) {
            throw new Error('Missing iOS CodePushDeploymentKey');
        }

        config.modResults.CodePushDeploymentKey = ios.CodePushDeploymentKey;

        if (ios.CodePushServerUrl) {
            config.modResults.CodePushServerURL = ios.CodePushServerUrl;
        }

        if (ios.CodePushPublicKey) {
            config.modResults.CodePushPublicKey = ios.CodePushPublicKey;
        }

        return config;
    });

    config = withAppDelegate(config, (config) => {
        const {modResults} = config;
        const {language} = modResults;

        switch (language) {
            case 'swift': {
                config.modResults.contents = mergeContents({
                    src: modResults.contents,
                    comment: '//',
                    tag: 'revopush-updates-header',
                    offset: 1,
                    anchor: /import React/,
                    newSrc: 'import CodePush',
                }).contents;

                config.modResults.contents = config.modResults.contents.replace(
                    /return Bundle\.main\.url\(forResource: "main", withExtension: "jsbundle"\)/,
                    `return CodePush.bundleURL()`,
                );
                break;
            }
            case 'objc':
            case 'objcpp': {
                config.modResults.contents = mergeContents({
                    src: modResults.contents,
                    comment: '//',
                    tag: 'revopush-updates-header',
                    offset: 1,
                    anchor: /#import "AppDelegate\.h"/,
                    newSrc: '#import <CodePush/CodePush.h>',
                }).contents;

                config.modResults.contents = config.modResults.contents.replace(
                    /return \[\[NSBundle mainBundle\] URLForResource:@"main" withExtension:@"jsbundle"\];/,
                    'return [CodePush bundleURL];'
                );
                break;
            }
            default: {
                throw new Error(`Revopush plugin doesn't support language: ${language}`);
            }
        }

        return config;
    });

    return config;
};

const withAndroidPlugin: ConfigPlugin<RevopushConfig> = (config, {android}) => {
    if (!android) {
        return config;
    }

    config = withStringsXml(config, config => {
        if (!android.CodePushDeploymentKey) {
            throw new Error('Missing Android CodePushDeploymentKey');
        }

        AndroidConfig.Strings.setStringItem(
            [
                {
                    $: {
                        name: 'CodePushDeploymentKey',
                        translatable: 'false',
                    },
                    _: android.CodePushDeploymentKey,
                },
            ],
            config.modResults,
        );

        if (android.CodePushServerUrl) {
            AndroidConfig.Strings.setStringItem(
                [
                    {
                        $: {
                            name: 'CodePushServerUrl',
                            translatable: 'false',
                        },
                        _: android.CodePushServerUrl,
                    },
                ],
                config.modResults,
            );
        }

        if (android.CodePushPublicKey) {
            AndroidConfig.Strings.setStringItem(
                [
                    {
                        $: {
                            name: 'CodePushPublicKey',
                            translatable: 'false',
                        },
                        _: android.CodePushPublicKey,
                    },
                ],
                config.modResults,
            );
        }

        return config;
    });

    config = withAppBuildGradle(config, (config) => {
        if (config.modResults.language !== 'groovy') {
            throw new Error(`Cannot modify build.gradle if it's not groovy`);
        }

        if (!config.modResults.contents.includes('@revopush/gradle')) {
            config.modResults.contents =
                config.modResults.contents +
                '\n' +
                '// @revopush/gradle' +
                '\n' +
                'apply from: "../../node_modules/@revopush/react-native-code-push/android/codepush.gradle"' +
                '\n';
        }

        return config;
    });

    config = withMainApplication(config, (config) => {
        const {modResults} = config;
        const {language} = modResults;

        config.modResults.contents = addImports(
            modResults.contents,
            ['com.microsoft.codepush.react.CodePush'],
            language === 'java',
        );

        if (language === 'kt') {
            if (modResults.contents.includes('getDefaultReactHost(')) {
                config.modResults.contents = modResults.contents.replace(/^        }$/m, '        },');
                config.modResults.contents = mergeContents({
                    src: config.modResults.contents,
                    comment: '//',
                    tag: '@revopush/main-application-kt-react-host',
                    offset: 1,
                    anchor: /^        },$/,
                    newSrc: `      jsBundleFilePath = CodePush.getJSBundleFile(),`,
                }).contents;

                return config;
            }

            config.modResults.contents = mergeContents({
                src: modResults.contents,
                comment: '//',
                tag: '@revopush/main-application-kt',
                offset: 1,
                anchor: /override fun getUseDeveloperSupport\(\): Boolean = BuildConfig\.DEBUG/,
                newSrc: `          override fun getJSBundleFile(): String {
              return CodePush.getJSBundleFile()
          }`,
            }).contents;

            config.modResults.contents = mergeContents({
                src: modResults.contents,
                comment: '//',
                tag: '@revopush/main-application-kt-oncreate',
                offset: 1,
                anchor: /super\.onCreate\(\)/,
                newSrc: `super.onCreate()

    try {
        val deploymentKey = getString(R.string.CodePushDeploymentKey)
        CodePush.getInstance(deploymentKey, this, BuildConfig.DEBUG)
    } catch (e: Exception) {}`,
            }).contents;

            return config;
        }

        throw new Error(`Cannot modify MainApplication because the language "${language}" is not supported`);
    });

    return config;
}

const withRevopushPlugin: ConfigPlugin<RevopushConfig> = (config, options = {}) => {
    config = withAndroidPlugin(config, options);
    return withIosPlugin(config, options);
};

export default withRevopushPlugin
