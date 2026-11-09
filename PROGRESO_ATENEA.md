# Progreso de ATENEA

## Estrategia de evaluación

- `main` conserva el proyecto original en el commit `4d6882b`, con las exclusiones necesarias para versionarlo de forma segura.
- La rama `evaluacion-java-sqlite` conserva el frontend original de React Native y Expo, incluidas sus pantallas, componentes y estilos.
- SQLite se integrará mediante un módulo nativo Java en el proyecto existente `android/`. Se reutilizarán las pantallas actuales sin reconstruirlas.
- Firebase seguirá disponible para la próxima evaluación.
- Las compilaciones se realizarán localmente desde Android Studio con Gradle, sin EAS Build.

## Compilación local en Windows

Abrir `android/` en Android Studio, seleccionar JDK 17 para Gradle y configurar el SDK 36. Con las dependencias locales de Expo y React Native disponibles, el comando equivalente desde la raíz de ATENEA es el siguiente.

```powershell
.\android\gradlew.bat -p .\android :app:assembleDebug
```

La configuración de Gradle referencia `android/app/debug.keystore`, que se conserva en este equipo y queda fuera de Git. En una copia nueva habrá que aprovisionar localmente un almacén de depuración compatible con la configuración existente.

## Paso 3A · Compilación base verificada

La compilación local `:app:assembleDebug` finalizó correctamente. El APK se instaló mediante ADB y cargó la pantalla principal en el emulador API 37 con Metro en modo LAN.

## Paso 3B · Puente Java verificado

- Expo 56.0.12 y React Native 0.85.3 conservan la Nueva Arquitectura y Hermes.
- `package.json` y `specs/NativeAteneaBridge.ts` definen la configuración y el contrato de Codegen.
- `AteneaBridgeModule.java` y `AteneaBridgePackage.java` implementan el TurboModule bajo `android/app/src/main/java/com/atenea/app/bridge/`. `MainApplication.kt` registra el paquete en el host de Expo.
- `src/services/nativeBridge.ts` invoca el diagnóstico. `index.ts` lo ejecuta al iniciar únicamente en una compilación Android de desarrollo con la variable de diagnóstico habilitada.
- La comprobación TypeScript con `tsc --noEmit` y la compilación local para `x86_64` pasaron. En el emulador API 37, Logcat registró `ReactNativeJS: '[ATENEA Java] Respuesta nativa:', 'ATENEA_JAVA_OK'` después de instalar y abrir el APK.
- El primer APK compiló, pero el módulo no apareció en JavaScript. La configuración incremental de CMake antecedía al proveedor JNI de Codegen. Regenerar el directorio de compilación de CMake para `x86_64` con sus parámetros existentes y volver a ejecutar Gradle incorporó el proveedor. El arranque también mostró una advertencia de registro de notificaciones push por falta de inicialización de Firebase Messaging nativo.

### Repetir el diagnóstico

Desde la raíz, compilar para el emulador `x86_64` e instalar el APK de depuración. Para un teléfono, usar la compilación general indicada arriba.

```powershell
.\android\gradlew.bat -p .\android :app:assembleDebug -PreactNativeArchitectures=x86_64
adb install -r .\android\app\build\outputs\apk\debug\app-debug.apk
```

Iniciar Metro con el diagnóstico habilitado en una terminal donde el puerto 8081 esté libre. Abrir ATENEA en el emulador y comprobar la respuesta en Metro o con `adb logcat -s ReactNativeJS`.

```powershell
$env:EXPO_PUBLIC_ATENEA_JAVA_DIAGNOSTIC = 'true'
node .\node_modules\expo\bin\cli start --lan --port 8081
```

## Pendiente de autorización

Definir el contrato de persistencia de alertas y agregar un proveedor SQLite que mantenga a Firebase como opción predeterminada. La implementación Java usará `SQLiteOpenHelper` con apertura diferida, operaciones asíncronas y trabajo de disco fuera del hilo de interfaz.
