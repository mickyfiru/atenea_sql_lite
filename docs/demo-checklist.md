# Checklist demo ATENEA

## Antes de presentar

- Configurar modo seguro: `EXPO_PUBLIC_ATENEA_AI_COMMAND_PROVIDER=mock`.
- Iniciar Metro: `npx expo start --dev-client --tunnel --clear`.
- Confirmar que la app abre en Android.
- Confirmar que el mapa carga.
- Confirmar que Atenea IA muestra `IA: Mock Demo`.

## Flujo sugerido

1. Abrir app.
2. Mostrar mapa.
3. Crear alerta normal desde la interfaz.
4. Mostrar marcador de la alerta.
5. Abrir Atenea IA.
6. Usar comando de voz: `me robaron`.
7. Crear alerta desde IA.
8. Mostrar Historial IA con estado detectado/ejecutado/fallido.
9. Usar Quick Actions.
10. Mostrar Contactos SOS.
11. Mostrar Estado IA y explicar fallback Mock/Ollama.

## Comandos utiles

- `me robaron`
- `hay taco`
- `corte de luz`
- `necesito ambulancia`
- `llama a bomberos`
- `abre grupos`
- `muestrame el mapa`

## Si quieres probar Ollama

1. Revisar IP del Wi-Fi con `ipconfig`.
2. Actualizar `EXPO_PUBLIC_OLLAMA_BASE_URL=http://NUEVA_IP:11434/api/chat`.
3. Ejecutar Ollama en la PC:

```powershell
$env:OLLAMA_HOST="0.0.0.0:11434"
ollama serve
```

4. Reiniciar Metro: `npx expo start --dev-client --tunnel --clear`.
5. En Atenea IA abrir `Estado IA` y tocar `Probar Ollama`.

Si falla, volver a modo seguro con `EXPO_PUBLIC_ATENEA_AI_COMMAND_PROVIDER=mock`.
