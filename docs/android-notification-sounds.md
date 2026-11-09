# Android notification sounds

ATENEA no usa `expo-av` para reproducir sonidos locales porque ese modulo provoco crashes nativos en Android con Expo SDK 56.

Los sonidos de alerta quedan a cargo de `expo-notifications`:

- cada categoria usa un canal Android distinto
- los archivos de sonido deben estar declarados en `app.json` dentro del plugin `expo-notifications`
- las preferencias por categoria siguen guardadas en AsyncStorage
- `soundType` sigue guardandose en Firestore para futuras notificaciones remotas

En Android 8 o superior, el sonido depende del canal de notificacion. Si el usuario silencia un canal desde ajustes del sistema, la app no puede forzar sonido desde JavaScript.

Cuando se crea una alerta en foreground, ATENEA programa una notificacion local para reproducir el sonido del canal correspondiente. Si Android o el usuario bloquean el canal, la alerta sigue creandose sin romper la app.
