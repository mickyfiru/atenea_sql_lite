# Guion de demostración y evidencias

1. Mostrar el APK local y el emulador con ATENEA abierta y Metro detenido. Si se demuestra desde un perfil limpio, entrar por el modo prueba.
2. En **Groups**, abrir el formulario con el icono de alerta. Elegir un grupo del que la cuenta sea miembro, por ejemplo **Bomberos** si aparece en la sesión. Guardar una alerta con un título de prueba único y una descripción.
3. Entrar en **Perfil → Revisar alertas**. Abrir la fila y comprobar los valores guardados.
4. Pulsar **Editar**, cambiar título y descripción y guardar. Mostrar el detalle actualizado.
5. Cerrar el proceso con `adb shell am force-stop --user <ID> com.atenea.app` y reabrir la app. Volver al listado y comprobar que los cambios persisten.
6. Pulsar **Eliminar** y confirmar. Mostrar el mensaje de éxito y el listado actualizado. Reabrir la app y comprobar que la alerta de prueba sigue ausente.

## Capturas para la entrega

- Compilación Gradle con `BUILD SUCCESSFUL`, variante `release` y ruta del APK.
- APK con `assets/index.android.bundle`, bibliotecas para ambas ABI y hash SHA-256 registrado.
- Bienvenida o acceso de prueba desde un perfil limpio, con Metro detenido.
- Formulario de alta, detalle, edición, persistencia después del reinicio y confirmación de borrado.
- Fragmentos del esquema en `AteneaDatabaseHelper.java`, operaciones en `AteneaAlertDao.java`, puente en `AteneaBridgeModule.java` y selector en `alerts.ts`.

Usar solo registros de demostración en las capturas y ocultar identificadores de sesión, datos de otras personas y configuración local. Registrar el emulador y la ABI efectivamente probados.
