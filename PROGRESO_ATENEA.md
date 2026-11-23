# Progreso de ATENEA

## Evaluación Firebase · Paso 5A · Consolidación

Se repitieron TypeScript, las siete pruebas locales de servicios, ocho casos integrados, veintinueve pruebas de reglas y tres pruebas de aislamiento. Todos pasaron. Node informó diez pruebas en la ejecución local y treinta y ocho en la ejecución con emuladores, que incluye el caso padre de integración. La compilación local `:app:compileDebugJavaWithJavac -PreactNativeArchitectures=x86_64` finalizó con código 0. Los mensajes `PERMISSION_DENIED` de las pruebas son los rechazos esperados. Gradle sigue avisando de `NODE_ENV` no definido al invocarlo directamente.

La revisión de archivos pendientes confirmó únicamente servicios Firestore, su contrato y delegaciones, configuración aislada, reglas de alertas, pruebas y documentación. El APK SQLite conservó SHA-256 `AA2359505B7FA3B142EDA454B48D7C38BDFDBFDE0A700EFB8C7ED44D343A3380`. Java, DAO, Codegen, puente y datos SQLite permanecen intactos. No se incluyeron APK, logs, bases ni claves en el commit.

ADB no detectó dispositivos. Existe el AVD `Medium_Phone_API_37.0`, que puede iniciarse desde Android Studio → Device Manager o PowerShell:

```powershell
& "$env:LOCALAPPDATA/Android/Sdk/emulator/emulator.exe" -avd Medium_Phone_API_37.0
```

No hay variables de selección de proveedor ni modo de emuladores definidas en el entorno de la verificación. Por tanto, el comportamiento normal selecciona Firebase y el modo de emuladores está desactivado. Para la prueba manual se deben usar explícitamente las variables y comandos del paso 4 antes de iniciar Metro. Confirmar el log `demo-atenea-security` antes de guardar cualquier dato.

Android Emulator accede al equipo anfitrión por `10.0.2.2`. Con el modo local activado, Auth usa `10.0.2.2:9099` y Firestore `10.0.2.2:8180`. Storage apunta también al host local, pero no forma parte de la prueba sin adjuntos. El host se valida y el proyecto ficticio se mantiene separado de la inicialización normal. Las pruebas cerraron sus emuladores al terminar. El arranque manual de Android y su comprobación de conectividad quedan pendientes para la siguiente sesión.

## Evaluación Firebase · Paso 4 · Integración local

Se añadió a `firebase.ts` un modo explícito de desarrollo con `EXPO_PUBLIC_ATENEA_FIREBASE_EMULATORS=true`. Usa una instancia nombrada separada, configuración ficticia y únicamente `demo-atenea-security`. Authentication apunta al puerto 9099, Firestore al 8180 y Storage al 9199 del host local. Storage queda aislado aun si su emulador no está iniciado. El modo rechaza compilaciones release y hosts distintos de localhost, 127.0.0.1 o 10.0.2.2. Sin la variable, la inicialización normal conserva su configuración. No se cambiaron valores de credenciales.

### Resultados automatizados

- TypeScript pasó. Las siete pruebas locales anteriores y tres pruebas nuevas de aislamiento de configuración pasaron.
- Con Authentication y Firestore Emulator se ejecutaron las 29 pruebas de reglas y ocho casos integrados, además del caso padre de integración. Node informó 38 pruebas aprobadas en esa ejecución. Se usaron cuentas anónimas reales del Auth Emulator, el SDK Firestore instalado y las funciones reales de `alerts.ts` y `firestoreAlertMutations.ts`. Los servicios de consulta de grupo y perfil se adaptaron a lecturas reales del emulador. Las notificaciones y el sonido se sustituyeron por dobles locales.
- Pasaron CREATE con fecha del servidor, READ, UPDATE y DELETE. Los listeners recibieron alta, edición y borrado. Se conservaron todos los campos no editables y fechas utilizables como `Date`. Las lecturas posteriores confirmaron los cambios y el borrado. Un listener cancelado dejó de recibir eventos.
- El servicio rechazó ausencia de sesión, otra cuenta y membresía revocada. Un intento directo de otro usuario fue rechazado por las reglas. Una suscripción nueva tras revocar la membresía informó `permission-denied`.
- Los documentos inexistentes pueden producir `permission-denied` al leer, porque las reglas necesitan datos del documento para autorizarlo. El error se propaga al manejo existente y no se intenta una escritura. El emulador tampoco garantiza retirar inmediatamente datos ya emitidos por un listener antiguo al cambiar solo el documento del grupo. No se modificaron reglas para ampliar lecturas.
- Las pruebas del selector verificaron la ruta Firebase predeterminada y CREATE, suscripción, UPDATE y DELETE delegados al proveedor SQLite mediante dobles. No constituyen una ejecución de la base Java. Java, el DAO, el contrato Codegen y el puente se compararon con Git y permanecen intactos.
- Pasó `:app:compileDebugJavaWithJavac -PreactNativeArchitectures=x86_64` localmente. No se generó un APK de producción. ADB no detectó dispositivos y no se ejecutó el CRUD visual Android ni el diagnóstico SQLite nativo en esta sesión.

La primera ejecución del arnés integrado falló por objetos de otro contexto JavaScript y por asumir que la revocación notificaría inmediatamente al listener existente. Se corrigió el arnés para usar el mismo contexto del SDK y verificar una suscripción nueva. Las ejecuciones finales pasaron. No fue necesario rediseñar la interfaz ni modificar el CRUD nativo.

### Prueba manual reproducible en Android Studio

1. Usar un emulador o perfil de prueba aislado, verificar sus datos antes de instalar y conservar los perfiles con información existente.
2. En una terminal, desde la raíz del repositorio, iniciar los emuladores con Java compatible:

```powershell
$env:JAVA_HOME = 'C:/Program Files/Android/Android Studio/jbr'
$env:PATH = "$env:JAVA_HOME/bin;$env:PATH"
npm exec --yes --package=firebase-tools@15.37.0 -- firebase emulators:start --only firestore,auth --project demo-atenea-security --config firebase.emulator.json
```

3. En otra terminal, desde la raíz, iniciar Metro para un emulador Android estándar:

```powershell
$env:EXPO_PUBLIC_ATENEA_FIREBASE_EMULATORS = 'true'
$env:EXPO_PUBLIC_ATENEA_EMULATOR_HOST = '10.0.2.2'
$env:EXPO_PUBLIC_ATENEA_ALERT_PROVIDER = $null
node .\node_modules\expo\bin\cli start --lan --port 8081
```

4. Abrir `android/` en Android Studio y usar la variante `debug`. Verificar al arrancar que el log indica `demo-atenea-security` antes de crear contenido. Entrar en modo prueba para crear una sesión del Auth Emulator.
5. Usar un grupo predeterminado local creado por el flujo existente y crear una alerta sin adjuntos desde el formulario original. Abrir Perfil → Revisar alertas, editar título, descripción y categoría, y comprobar la actualización. Eliminar con confirmación y verificar el listado. Probar título vacío y excesivo para comprobar los errores visibles.
6. Con otra cuenta local, verificar que no aparezcan controles para alertas ajenas. Comprobar también los rechazos del servidor con las pruebas automatizadas. No se inició Storage Emulator, de modo que los adjuntos no forman parte de este procedimiento.
7. Para revisar SQLite, reiniciar Metro conservando el modo de emuladores y definiendo `EXPO_PUBLIC_ATENEA_ALERT_PROVIDER=sqlite`. Repetir el flujo con registros locales de prueba. Para volver al modo Firebase local, retirar solo el selector SQLite.

El emulador usa datos volátiles por defecto. La persistencia automatizada comprobada es entre lecturas dentro de la ejecución, sin reiniciar el proceso Firestore. Probar persistencia entre reinicios requiere exportar e importar un directorio local de prueba. Quedan pendientes la interfaz Android, la recepción de push, Storage local y dos ediciones autorizadas concurrentes. No se desplegaron reglas, no se escribieron datos reales y se mantuvieron todos los cambios sin commit.

## Evaluación Firebase · Paso 3 · Seguridad en emulador local

Se conservaron los cambios sin commit del paso 2. Node 26.13.0 y npm 11.20.0 estaban disponibles. La CLI Firebase faltaba. Se ejecutó `firebase-tools@15.37.0` desde la caché de npm, sin instalación global ni cambios de dependencias del proyecto. Se usó el Java 25 incluido en Android Studio para Firestore Emulator 1.22.0. El Java 17 del proyecto Android se mantuvo intacto. npm avisó de que una dependencia auxiliar de la CLI declara soporte hasta Node 24. La CLI y las pruebas finalizaron correctamente con el Node disponible.

`firebase.emulator.json` configura exclusivamente Firestore local en `127.0.0.1:8180` y carga las reglas del repositorio. Las pruebas usan el ID ficticio `demo-atenea-security`, tokens sintéticos aceptados por el emulador y datos de prueba descartados al apagarlo. El archivo `firebase.json` de la aplicación conserva su configuración.

### Pruebas ejecutadas

Pasaron `tsc --noEmit`, las 7 pruebas con dobles del SDK de `tests/firestore-alerts.test.cjs` y las 29 pruebas reales de reglas de `tests/firestore-rules.test.cjs`.

| Caso probado en Firestore Emulator | Resultado |
| --- | --- |
| Propietario autenticado y miembro del grupo | UPDATE de los tres campos y DELETE permitidos |
| Otro miembro autenticado o usuario sin sesión | UPDATE y DELETE rechazados |
| Alerta inexistente | UPDATE y DELETE rechazados |
| Histórico con solo createdBy o solo userId válido | UPDATE y DELETE permitidos, campos antiguos conservados |
| Autoría ausente, contradictoria, nula o vacía | UPDATE y DELETE rechazados |
| Cambiar grupo, cualquiera de los autores, fecha, coordenadas, ciudad, sector, adjuntos o soundType | Escritura rechazada por campos inmutables |
| Título vacío, en blanco o de 121 caracteres, descripción de 2001 y categoría inválida | Escritura rechazada sin validaciones del cliente |
| Título de 120, descripción de 2000 y descripción vacía | Escritura permitida |
| Lectura previa seguida de revocación de membresía | UPDATE y DELETE rechazados al confirmar la escritura |
| CREATE con los campos de ATENEA y transformación REQUEST_TIME equivalente a serverTimestamp() | Permitido |
| CREATE con fecha del cliente, sin fecha, título largo o vacío, o autor ajeno | Rechazado |

Las pruebas con dobles verifican además los campos explícitos enviados por el servicio y la propagación de errores de red y permisos. Estas comprobaciones del cliente se distinguen de las reglas ejecutadas en el emulador.

### Reproducir las reglas

Desde PowerShell, con la raíz de ATENEA como directorio actual:

```powershell
$env:JAVA_HOME = 'C:/Program Files/Android/Android Studio/jbr'
$env:PATH = "$env:JAVA_HOME/bin;$env:PATH"
npm exec --yes --package=firebase-tools@15.37.0 -- firebase emulators:exec --only firestore --project demo-atenea-security --config firebase.emulator.json "node --test tests/firestore-rules.test.cjs"
```

En esta sesión se ejecutó desde la carpeta temporal con rutas absolutas para que los logs generados quedaran fuera del repositorio. Una configuración inicial bajo `tests/` fue rechazada por apuntar a reglas fuera de ese directorio. Se corrigió colocando la configuración independiente en la raíz. No fue necesario cambiar las reglas ni el código de aplicación del paso 2.

### Compatibilidad y riesgos

Firebase conserva la selección predeterminada y SQLite mantiene sus cuatro operaciones. Solo se añadieron dos delegaciones al contrato TypeScript en el paso 2. No hay cambios en Java, Codegen, el puente ni la base SQLite. No se repitió el CRUD visual SQLite durante este paso.

Entre la lectura del cliente y la escritura puede cambiar el documento o la membresía. Las reglas verifican el documento y el grupo al confirmar la escritura y bloquearon la revocación probada. No existe un control de versión para dos ediciones autorizadas simultáneas, por lo que la última escritura puede reemplazar cambios de los mismos campos.

Cambiar categoría conserva `soundType`, conforme a los tres campos editables autorizados. No rompe el almacenamiento y el listener de sonidos no renotifica un ID ya visto al editar. El sonido asociado puede diferir de la categoría si esa alerta vuelve a usarse para una notificación. Alinear ambos campos requiere una decisión de alcance.

Quedan pendientes pruebas integradas del servicio y la interfaz contra emuladores, listeners completos y ejecución en Android con el nuevo proveedor. Persisten los riesgos documentados de reglas de grupos y Storage, sin modificaciones en esta etapa. No se accedió a datos reales, no se desplegaron reglas ni se crearon commits. El emulador se apagó al terminar las pruebas.

## Evaluación Firebase · Paso 2

En la rama `evaluacion-firebase-crud` se añadieron UPDATE y DELETE de Firestore y se habilitaron las acciones existentes para alertas propias. Firebase sigue siendo el proveedor predeterminado. El contrato del proveedor delega edición y borrado a los servicios SQLite existentes cuando se activa su selector.

`firestoreAlertMutations.ts` exige sesión, consulta la alerta y la membresía desde el servidor y aplica `updateDoc` con título, descripción y categoría explícitos o `deleteDoc` sobre la alerta. Los errores del SDK se propagan al manejo existente del formulario y del diálogo. El código conserva ID, autoría, grupo, fecha, ubicación, adjuntos y tipo de sonido. Los listeners `onSnapshot` existentes actualizan listados y detalles.

`firestoreAlertPolicy.ts` valida título obligatorio de hasta 120 unidades UTF-16, descripción opcional de hasta 2000 y categoría. Las entradas se recortan antes de validar límites y guardar. La política de autoría admite un único campo histórico presente o ambos campos coincidentes con el UID. Rechaza campos presentes nulos, vacíos, de otro tipo o contradictorios. La lectura mantiene los valores de autor presentes para que el control visual tampoco normalice una autoría ambigua como válida.

Se prepararon cambios exclusivamente para `alerts` en `firestore.rules`. UPDATE y DELETE exigen propiedad y membresía. UPDATE restringe `affectedKeys()` a título, descripción y categoría, preservando todos los demás campos incluso en documentos históricos. La validación del resultado comprueba los campos editables, autoría y grupo, sin exigir completar otros campos antiguos. CREATE aplica también los límites y exige la fecha del servidor.

Pasaron `node --test tests/firestore-alerts.test.cjs` y `tsc --noEmit`. Las pruebas usan dobles locales del SDK, sin acceso a Firebase real. Cubren límites, espacios, categorías inválidas, autoría histórica y contradictoria, ausencia de sesión, UID distinto, grupo no autorizado, alerta inexistente, campos de escritura explícitos y propagación de errores de red y permisos.

Quedan pendientes la compilación y ejecución de reglas en Firebase Emulator, sus pruebas de manipulación de campos inmutables y las pruebas integradas de listeners, concurrencia y CRUD visual Firestore. El entorno no tiene Firebase CLI, el emulador Firestore ni `@firebase/rules-unit-testing` disponibles. No se desplegaron reglas ni se modificaron datos reales. Hasta desplegar reglas autorizadas, las reglas anteriores pueden seguir rechazando las nuevas operaciones.

Java y la base SQLite permanecen intactos. El adaptador TypeScript SQLite solo agrega la delegación al contrato común. El tipo de sonido se conserva al cambiar categoría en Firebase, conforme al alcance de tres campos editables. Su alineación con la categoría requiere una decisión posterior. Permanecen para otra etapa los riesgos de autoinscripción en grupos y lectura de adjuntos por cualquier usuario autenticado en Storage. No se modificaron esas reglas, credenciales, pantallas ni navegación.

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
