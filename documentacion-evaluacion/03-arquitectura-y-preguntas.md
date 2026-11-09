# Arquitectura y preguntas para la evaluación

## Flujo de datos

Las pantallas React Native llaman al servicio TypeScript `src/services/alerts.ts`. Con SQLite seleccionado, `sqliteAlertProvider.ts` valida sesión y membresía, llama a `nativeBridge.ts` y refresca las suscripciones del grupo tras una escritura. El TurboModule Java implementa el contrato de `specs/NativeAteneaBridge.ts` mediante Codegen. Devuelve promesas a JavaScript y ejecuta el acceso a disco en un hilo dedicado.

`AteneaDatabaseHelper` extiende `SQLiteOpenHelper` y abre bajo demanda `atenea-alerts.db`, versión 1. Crea `alerts` con clave primaria de texto, campos de autor y grupo, contenido, ubicación y adjuntos opcionales, y fecha de creación en milisegundos Unix. Los índices permiten ordenar por fecha y consultar por grupo y fecha. Android guarda la base en el directorio privado `databases/` del paquete `com.atenea.app`, separado por usuario Android.

`AteneaAlertDao` usa `insertOrThrow`, `query`, `update` y `delete`. Las selecciones usan parámetros y los cursores se cierran al terminar. Java comprueba título obligatorio, límites de título y descripción, y categorías válidas. Actualización y borrado incluyen el identificador y el UID propietario en la misma sentencia. Se usa `createdBy` y, cuando falta, `userId`. El UID autenticado lo aporta el servicio TypeScript. El filtro Java comprueba el autor almacenado.

## Preguntas frecuentes

**¿Toda la aplicación está en Java?** La interfaz, navegación y servicios de aplicación usan React Native y TypeScript. El puente de almacenamiento y el CRUD SQLite están implementados en Java. El registro del módulo en el host existente se realiza en Kotlin.

**¿Cómo se activa SQLite?** En Android, el bundle de evaluación incorpora `EXPO_PUBLIC_ATENEA_ALERT_PROVIDER=sqlite`. Una compilación normal usa Firebase por defecto.

**¿Qué diferencia hay entre ambos proveedores?** SQLite conserva las alertas en el dispositivo y permite el CRUD local. Firestore almacena y sincroniza alertas en la nube y sigue ofreciendo el flujo original de alta y lectura. Los datos de ambos proveedores se mantienen separados.

**¿Qué evita que otra persona cambie una alerta?** El servicio comprueba la sesión, la membresía y el autor. El DAO vuelve a condicionar la escritura al propietario. El control visual refleja esas reglas.

**¿Por qué se conserva la fecha al editar?** La sentencia de actualización cambia título, descripción, categoría y tipo de sonido. La clave, la fecha original, el grupo y los adjuntos conservan sus valores.

## Limitaciones conocidas

- El APK de evaluación puede abrir sin Metro. La sesión, las membresías y los adjuntos siguen dependiendo de Firebase e internet. Un borrador de edición puede perderse al desconectarse.
- El modo prueba usa Firebase anónimo. OTP nativo y push remotas quedan fuera de la demostración. La advertencia de Firebase Messaging afecta al registro del token push.
- El APK se probó en el emulador `x86_64`. ARM64 está empaquetado y queda pendiente de ejecución en un teléfono físico.
- Las alertas SQLite pertenecen al almacenamiento local del usuario Android. Desinstalar, borrar datos o cambiar de perfil afecta qué registros están disponibles.
