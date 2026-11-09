# Progreso de ATENEA

## Paso 2 · Preparación

- `main` conserva el proyecto original en el commit `4d6882b`, con las exclusiones necesarias para versionarlo de forma segura.
- `evaluacion-java-sqlite` contiene el proyecto Gradle independiente `evaluacion-android/`. Su identificador `com.atenea.evaluacion` permite instalarlo junto a `com.atenea.app`.
- El módulo `app` reserva `src/main/java/com/atenea/evaluacion/` para Java y `src/main/res/` para recursos. El manifiesto declara la aplicación, todavía sin actividad de inicio.
- La base nativa reutiliza el wrapper Gradle 9.3.1, JDK 17, SDK 36 para compilación y destino, API mínima 24 y Build Tools 36.0.0. Usa AGP 9.1.1 de forma independiente, según la [tabla de compatibilidad oficial](https://developer.android.com/build/releases/agp-9-1-0-release-notes).
- Las compilaciones serán locales. La primera sincronización de la base nativa puede requerir descargar AGP desde Google Maven. La sincronización y la compilación quedan pendientes de verificar.

## Compilación local en Windows

Abrir `evaluacion-android/` en Android Studio y seleccionar JDK 17 para Gradle. Desde la raíz de ATENEA, con el SDK configurado en Android Studio o disponible mediante `ANDROID_HOME`:

```powershell
.\evaluacion-android\gradlew.bat -p .\evaluacion-android :app:assembleDebug
```

Para compilar el proyecto original, que usa las dependencias locales de Expo y React Native:

```powershell
.\android\gradlew.bat -p .\android :app:assembleDebug
```

En otro equipo, configurar el SDK y las dependencias del original antes de compilar. Su Gradle referencia `android/app/debug.keystore`, que se conserva en este equipo y queda fuera de Git. En una copia nueva habrá que aprovisionar localmente un almacén de depuración compatible con la configuración existente. La firma de la aplicación nativa usa el almacén de depuración local estándar de Android.

## Pendiente de autorización para el paso 3

1. Verificar la sincronización y la compilación local de la base nativa.
2. Implementar las pantallas Java de lista, formulario y detalle de alertas, reutilizando el diseño y los recursos de ATENEA.
3. Definir el esquema SQLite y conectar creación, consulta, edición y eliminación. Verificar persistencia tras reiniciar la aplicación.
