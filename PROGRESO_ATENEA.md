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

## Paso 4A · SQLite nativo para alertas

- `AteneaDatabaseHelper.java` abre bajo demanda `atenea-alerts.db`, versión 1. La tabla `alerts` usa `id` como clave primaria de texto y conserva `groupId`, `userId`, `createdBy`, `category`, `title`, `description`, `soundType`, `latitude`, `longitude`, `city`, `district`, `mediaUrl`, `mediaType` y `createdAt`. Las coordenadas son reales opcionales y la fecha se guarda como entero en milisegundos Unix. Hay índices para listar por fecha y por grupo y fecha.
- `AteneaAlertDao.java` crea, lista, filtra por grupo, consulta por ID, actualiza y elimina. Usa parámetros, cierra los cursores con try-with-resources y conserva el ID y la fecha original al actualizar. Cada escritura es una sentencia atómica. `SQLiteOpenHelper` administra la transacción de creación del esquema.
- `AteneaBridgeModule.java` ejecuta el acceso a disco en un executor de un hilo, comunica errores mediante promesas y cierra el helper al invalidarse. `specs/NativeAteneaBridge.ts` y `src/services/nativeBridge.ts` exponen las operaciones y convierten las fechas de y a `Date`.
- `index.ts` habilita `src/services/sqliteAlertDiagnostic.ts` únicamente en Android de desarrollo, mediante variables de Metro. El servicio de alertas y las pantallas continúan usando Firebase.

### Verificación local

Pasaron `tsc --noEmit` y `:app:assembleDebug -PreactNativeArchitectures=x86_64`. El APK se instaló en el emulador API 37. El puente devolvió `ATENEA_JAVA_OK`. La fase `seed` creó un registro, comprobó la lectura por ID, el listado general y el filtro por grupo, y actualizó el título y la ubicación. Tras un cierre completo y un arranque en otro proceso, la fase `verify` comprobó que los cambios persistían, eliminó únicamente el registro de prueba y verificó su ausencia. Logcat mostró `SEED_OK` y `PERSISTENCE_AND_DELETE_OK`. Se mantuvo la advertencia de Firebase Messaging al registrar notificaciones push.

Para repetir la prueba, iniciar Metro con `EXPO_PUBLIC_ATENEA_SQLITE_DIAGNOSTIC=seed` y `EXPO_PUBLIC_ATENEA_SQLITE_RUN_ID` igual a un GUID nuevo de 32 caracteres hexadecimales en minúscula. Tras observar `SEED_OK`, cerrar la aplicación con `adb shell am force-stop com.atenea.app`. Reiniciar Metro con la fase `verify` y el mismo identificador, y abrir ATENEA para comprobar persistencia y borrar el registro de prueba. Con la variable de fase ausente, el diagnóstico queda desactivado.

## Paso 4B · SQLite conectado al flujo original de alertas

- `src/services/alertProvider.ts` define el contrato de escritura y suscripción. `src/services/alerts.ts` conserva las firmas públicas y selecciona Firebase por defecto. SQLite se activa solo en Android con `EXPO_PUBLIC_ATENEA_ALERT_PROVIDER=sqlite`. El selector se aplica también a los consumidores compartidos de alertas del mapa, resumen, asistente y sonidos.
- `src/services/sqliteAlertProvider.ts` usa el puente Java para insertar y consultar por grupos. Emite una lectura inicial ordenada por fecha y refresca las suscripciones del grupo después de guardar. La cancelación invalida las lecturas en curso. Las pantallas siguen recibiendo fechas como objetos `Date`.
- La sesión, la ubicación del perfil y las membresías siguen dependiendo de Firebase. SQLite comprueba la membresía de escritura con el servidor y solo muestra alertas de grupos cuya membresía confirma el servidor. Los adjuntos siguen usando Firebase Storage cuando se selecciona un archivo. Los registros SQLite son locales al dispositivo y quedan separados de las alertas de Firestore.

### Verificación local

Pasaron `tsc --noEmit` y `:app:assembleDebug -PreactNativeArchitectures=x86_64`. En el emulador Android API 37 se creó `ATENEA-SQLite-4B-72F1` desde el formulario original del grupo `prueba`. La alerta apareció en Perfil → Revisar alertas, su título se comprobó en `atenea-alerts.db` y siguió visible después de cerrar completamente ATENEA y abrirla en otro proceso. El registro de demostración quedó en el emulador.

Al reiniciar Metro sin el selector, la misma pantalla volvió a mostrar alertas de Firestore y Logcat registró sus snapshots. La alerta local no apareció en ese modo. No se borraron datos de Firebase. Persistió la advertencia de Firebase Messaging al registrar notificaciones push, ajena a la persistencia de alertas. No se probaron individualmente mapa, resumen, asistente y sonidos.

Para activar SQLite en una terminal de PowerShell y arrancar Metro localmente:

```powershell
$env:EXPO_PUBLIC_ATENEA_ALERT_PROVIDER = 'sqlite'
node .\node_modules\expo\bin\cli start --lan --port 8081
```

Para volver al modo predeterminado, reiniciar Metro con `$env:EXPO_PUBLIC_ATENEA_ALERT_PROVIDER = $null` y volver a abrir la aplicación.

## Paso 5 · CRUD visual de alertas en SQLite

- En Perfil → Revisar alertas → detalle, las alertas propias muestran **Editar** y **Eliminar** cuando SQLite está activo. La edición reutiliza el formulario y permite cambiar título, descripción y categoría. Conserva el ID, la fecha, el grupo, la ubicación y los adjuntos. El borrado solicita confirmación y muestra el resultado.
- El servicio exige la sesión Firebase correspondiente, comprueba el autor de la fila y revalida la membresía del grupo. Java aplica un predicado de propietario en las sentencias de actualización y borrado, usando `createdBy` y recurriendo a `userId` cuando falta. El UID se obtiene de la sesión en la capa de servicio y se pasa al módulo. Java verifica ese UID contra SQLite. Cada escritura exitosa refresca los suscriptores del grupo.
- Firebase sigue siendo el proveedor predeterminado. Su detalle no muestra estas acciones y sus reglas de escritura se conservan.

### Verificación local

Pasaron `tsc --noEmit` y la compilación Gradle de depuración para `x86_64`. Antes de incorporar los controles, el diagnóstico Java en el emulador API 37 rechazó una actualización y un borrado con el UID sintético de otro autor. Confirmó que el registro seguía intacto, probó la operación con el propietario y limpió el registro de diagnóstico.

En la interfaz se creó `ATENEA-CRUD5-7D21`, se abrió desde el listado, y se editaron título y descripción. Se comprobó el detalle actualizado y se consultó una copia local de la base en modo de solo lectura. Los cambios sobrevivieron a un cierre completo y al arranque de un proceso nuevo. Tras confirmar **Eliminar**, se mostró el mensaje de éxito y se verificó la ausencia del registro tanto en la interfaz como mediante consulta SQLite. El registro del paso 4B permaneció visible en modo local. No se usó una segunda cuenta Firebase en la prueba de propiedad.

Al iniciar sin el selector SQLite, el emulador recibió snapshots de Firestore y el detalle de una alerta de Firebase apareció sin las nuevas acciones. Persistió la advertencia de registro de notificaciones push de Firebase Messaging. No se usaron compilaciones en la nube.

## Paso 6 · Validaciones y estabilidad

- El DAO Java valida al crear y editar. Exige título no vacío, limita el título a 120 y la descripción a 2000 unidades UTF-16 y solo admite las cuatro categorías de ATENEA. La descripción vacía sigue siendo válida. Se conservan los formularios y las reglas de Firebase.
- Pasaron `tsc --noEmit` y `:app:assembleDebug -PreactNativeArchitectures=x86_64`. El diagnóstico Android API 37 rechazó títulos vacíos y en blanco, textos excesivos, categorías inválidas y un ID duplicado. Comprobó que el alta inválida no dejó una fila, que una edición y un borrado ajenos fueron rechazados y que el filtro de otro grupo devolvió cero filas. El registro de diagnóstico persistió tras reiniciar y se eliminó en la segunda fase.
- En los formularios originales se comprobó el mensaje de título obligatorio en creación y el límite de título al crear y editar. Ambos formularios permanecieron abiertos tras el error. Se corrigió la entrada, se creó y editó una alerta de prueba, se observó su detalle actualizado y se verificó la persistencia tras reiniciar. El borrado confirmado quitó la alerta del listado y una consulta SQLite confirmó su ausencia.
- Al activar el modo avión, Android se quedó sin red predeterminada. El editor se desmontó al perder la confirmación de membresía y el intento de guardado sin conexión no llegó a ejecutarse desde la interfaz. La consulta local conservó el último valor guardado y, al recuperar la red, el editor volvió a mostrar ese valor. Un borrador sin guardar se pierde en ese escenario. Para demostrar el flujo completo se necesita conexión a Firebase y, con el APK de depuración, acceso a Metro.
- Sin el selector, la aplicación volvió a utilizar Firestore. La advertencia de Firebase Messaging corresponde al registro de notificaciones push remotas. Falta la configuración Android de FCM, y el registro de token se captura por separado del CRUD. La demostración de alertas funcionó pese a la advertencia. No se modificó la configuración de Firebase.
- Quedaron sin ejecutar la prueba con una segunda cuenta real, la revocación de membresía en el servidor y la recepción de push remotas. Tampoco se validó un arranque en frío sin Metro ni una compilación para teléfono ARM.

## Paso 7 · APK local de evaluación sin Metro

Se usó la variante `release` existente de `android/`, con JDK 17, Gradle 9.3.1 y Android SDK 36. Gradle ejecutó `createBundleReleaseJsAndAssets` con Expo `export:embed`. Esta variante ya usa la clave local de depuración del proyecto. La configuración de firma quedó intacta. La compilación se ejecutó con el wrapper Gradle desde PowerShell.

### Reproducir el APK de evaluación

Desde `android/` en una terminal de PowerShell, incluida la terminal de Android Studio:

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

`--rerun` vuelve a generar el bundle para incorporar las variables. El acceso anónimo existente se habilita solo para la evaluación. Para una compilación normal, usar el mismo comando Gradle con `EXPO_PUBLIC_ATENEA_ALERT_PROVIDER` y `EXPO_PUBLIC_ENABLE_DEV_LOGIN` sin definir.

### Evidencia

- **APK de evaluación:** `android/app/build/outputs/ATENEA-evaluacion-sqlite.apk`, 100138326 bytes, SHA-256 `AA2359505B7FA3B142EDA454B48D7C38BDFDBFDE0A700EFB8C7ED44D343A3380`. Contiene `assets/index.android.bundle`, recursos empaquetados y las bibliotecas del puente Java y Hermes para `arm64-v8a` y `x86_64`.
- **Arranque:** se comprobó la firma coincidente con la instalación anterior del emulador API 37 y se usó `adb install -r` para conservar los datos. El APK cargó la interfaz desde un proceso nuevo con Metro detenido y el puerto 8081 libre. La ABI utilizada por el emulador fue `x86_64`. ARM64 se comprobó en el contenido del APK. ADB no detectó un teléfono físico.
- **CRUD:** se creó `ATENEA-APK7-6F3C`, se consultó desde Perfil → Revisar alertas y se editaron el título y la descripción. Los cambios reaparecieron tras detener y reiniciar la app. El borrado confirmado quitó la alerta del listado. Una consulta de solo lectura en SQLite, mediante una reinstalación temporal del APK de depuración con la misma firma, devolvió cero filas para la prueba y confirmó que la alerta anterior del paso 4B seguía presente.
- **Firebase:** se compiló e instaló también el APK normal `android/app/build/outputs/apk/release/app-release.apk` sin selector. Mostró alertas de Firestore, registró snapshots y mantuvo las alertas locales fuera del listado. Al terminar se reinstaló el APK de evaluación. Gradle limpió su carpeta `release/` durante la segunda compilación y se recuperó la copia exacta del emulador, verificada por SHA-256, en la ruta indicada arriba.
- **Límites de la demostración:** la sesión del emulador ya existía. El acceso anónimo en una instalación nueva y la ejecución en ARM64 físico quedaron sin probar. El CRUD requiere internet para la sesión y la confirmación de membresías de Firebase. Persiste la advertencia de registro de push remotas de Firebase Messaging. Gradle emitió advertencias de dependencias obsoletas y rutas largas en CMake, y las compilaciones finalizaron correctamente.

No se modificó código ni configuración de compilación. Los APK quedan fuera de Git. No se usó EAS Build ni firma de producción.

## Paso 8 · Validación final en un perfil limpio

- Se verificaron la firma y el SHA-256 del APK de evaluación. El APK ya instalado en el emulador coincidía con el archivo local. Se habilitó ese mismo paquete con `adb shell pm install-existing --user 10 com.atenea.app` en el usuario Android nuevo `ATENEA-Evaluacion`, con datos privados separados del perfil principal. No se desinstaló ATENEA ni se borraron los datos del usuario principal.
- Con Metro detenido, el perfil nuevo mostró la bienvenida. **Ingresar con celular → Entrar en modo prueba** inició una sesión nueva con Firebase Anonymous Auth. La cuenta accedió a los grupos predeterminados y creó una alerta en Bomberos. Android solicitó permiso para notificaciones durante los arranques iniciales y se rechazó en el perfil de prueba.
- Desde el formulario y el detalle originales se creó `ATENEA-FINAL8-54C9`, se consultó y se editaron título y descripción. Tras detener el proceso, ambos cambios reaparecieron sin Metro. Se confirmó el borrado, y otro arranque mostró el listado vacío. La ausencia se comprobó mediante el listado respaldado por SQLite. La inspección SQL directa se realizó en el paso 7, ya que el APK `release` del paso 8 mantiene su base privada.
- Pasaron `tsc --noEmit` y la compilación local `release` para `arm64-v8a,x86_64`. La compilación reprodujo exactamente el SHA-256 del APK probado. Se confirmó en el selector que Firebase sigue siendo el valor predeterminado, verificado también con el APK normal en el paso 7. Quedó abierto el perfil aislado para la demostración.
- Se añadieron la guía de Android Studio, el guion con lista de evidencias y la explicación técnica con preguntas y limitaciones en [documentacion-evaluacion/](documentacion-evaluacion/). La demostración requiere internet para la autenticación y la confirmación de membresías. El APK se ejecutó en el emulador `x86_64`. Queda pendiente probar un teléfono ARM64, OTP nativo y push remotas.
