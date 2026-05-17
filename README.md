# Expo plugin for Revopush OTA

To integrate Revopush into your Expo project, you need to modify the native part of the application. This is done using Expo Configuration Plugins.

This plugin will automatically generate all the necessary changes to integrate Revopush OTA.

[Full setup guide](https://docs.revopush.org/intro/expo) for Revopush with Expo.

## Setup Revopush SDK

Revopush SDK doesn't work with Expo Go because it requires native code changes.

| Expo SDK  | Revopush SDK | Revopush Expo plugin |
|-----------|--------------|----------------------|
| 52+       | 1.3.0        | 1.0.0                |
| 55+       | 1.6.0        | 1.1.0                |

#### Install Revopush SDK

```bash
npx expo install @revopush/react-native-code-push
```

#### Install Revopush Expo plugin

```bash
npx expo install @revopush/expo-code-push-plugin
```

Extend Plugin section in your Expo config with:

```typescript
module.exports = ({ config }: { config: ExpoConfig }) => ({
    ...config,
    plugins: [
        ["@revopush/expo-code-push-plugin", {   
            ios: {
                CodePushDeploymentKey: 'YOUR_DEPLOYMENT_KEY',   
                CodePushServerUrl: 'https://api.revopush.org'   
            },
            android: { 
                CodePushDeploymentKey: 'YOUR_DEPLOYMENT_KEY', 
                CodePushServerUrl: 'https://api.revopush.org' 
            } 
        }] 
    ],
});
```

Optionally, you can pass `CodePushPublicKey` with a key generated for [release signing](https://docs.revopush.org/cli/code-signing).

Run prebuild command to generate native ios and android folders

```bash
npx expo prebuild --clean
```

If you faced with ios target version error, add [expo-build-properties](https://docs.expo.dev/versions/latest/sdk/build-properties/) plugin and set ios `deploymentTarget` to 15.5
