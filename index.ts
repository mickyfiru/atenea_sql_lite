import { registerRootComponent } from 'expo';
import { Platform } from 'react-native';

import App from './App';
import { getJavaBridgeDiagnostic } from './src/services/nativeBridge';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);

if (
  __DEV__ &&
  Platform.OS === 'android' &&
  process.env.EXPO_PUBLIC_ATENEA_JAVA_DIAGNOSTIC === 'true'
) {
  try {
    const result = getJavaBridgeDiagnostic();
    console.log('[ATENEA Java] Respuesta nativa:', result);
  } catch (error) {
    console.warn('[ATENEA Java] Diagnóstico fallido:', error);
  }
}
