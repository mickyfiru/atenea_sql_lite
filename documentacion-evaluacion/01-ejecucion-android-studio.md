# Ejecutar ATENEA en Android Studio

ATENEA usa React Native y TypeScript para la interfaz. El CRUD local de alertas usa SQLite mediante código Java en el proyecto Android existente.

1. Abrir la carpeta `android/` en Android Studio. Seleccionar JDK 17 para Gradle y comprobar Android SDK 36, Build Tools 36.0.0 y NDK 27.1.12297006. El wrapper usa Gradle 9.3.1.
2. Comprobar que Node y las dependencias del proyecto estén disponibles. En una copia nueva, aprovisionar localmente el almacén de depuración que referencia `android/app/debug.keystore`. Mantener la clave fuera de Git.
3. Usar el APK verificado en `android/app/build/outputs/ATENEA-evaluacion-sqlite.apk` o regenerarlo desde la terminal de Android Studio, ubicada en `android/`.

```powershell
$env:EXPO_PUBLIC_ATENEA_ALERT_PROVIDER = 'sqlite'
$env:EXPO_PUBLIC_ENABLE_DEV_LOGIN = 'true'
$env:EXPO_OFFLINE = '1'
$env:NODE_ENV = 'production'
.\gradlew.bat :app:createBundleReleaseJsAndAssets --rerun :app:assembleRelease '-PreactNativeArchitectures=arm64-v8a,x86_64'
if ($LASTEXITCODE -eq 0) {
    Copy-Item -LiteralPath app/build/outputs/apk/release/app-release.apk -Destination app/build/outputs/ATENEA-evaluacion-sqlite.apk
}
```

4. Comprobar el destino con `adb devices -l` e instalar el APK en un emulador de evaluación o en un dispositivo autorizado. Si ya hay una instalación con datos, verificar el identificador de paquete, la firma y el riesgo antes de actualizar. Para aislar datos en un emulador que ya tenga ese mismo APK, crear otro usuario Android e instalar allí el paquete existente.
5. Abrir ATENEA con Metro detenido. En la bienvenida, elegir **Ingresar con celular → Entrar en modo prueba**. Este acceso usa Firebase Anonymous Auth y necesita internet.

La variante `release` incorpora JavaScript y recursos y usa la firma local de depuración del proyecto. `assembleDebug` depende de Metro en la configuración actual. Para una compilación normal, volver a generar el bundle con ambas variables `EXPO_PUBLIC_...` anteriores sin definir. Firebase queda seleccionado por defecto.
