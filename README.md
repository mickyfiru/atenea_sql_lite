# ATENEA

## Guia rapida para presentar Atenea

Inicia Metro para la demo:

```bash
npx expo start --dev-client --tunnel --clear
```

Modo seguro recomendado:

```bash
EXPO_PUBLIC_ATENEA_AI_COMMAND_PROVIDER=mock
```

Modo Ollama opcional:

```bash
EXPO_PUBLIC_ATENEA_AI_COMMAND_PROVIDER=ollama
EXPO_PUBLIC_OLLAMA_BASE_URL=http://IP_DE_MI_PC:11434/api/chat
```

Si cambias de Wi-Fi, la IP local de tu PC puede cambiar. Revisa la nueva IPv4 con:

```powershell
ipconfig
```

Comandos de demostracion:

- `me robaron`
- `hay taco`
- `corte de luz`
- `necesito ambulancia`
- `llama a bomberos`
- `abre grupos`
- `muestrame el mapa`

## IA inicial

ATENEA incluye una base modular de IA en `src/services/ai/`.

- `mock`: proveedor activo por defecto. Permite probar comandos como `Hay un accidente en avenida principal` sin usar red ni llaves.
- `deepseek`: preparado para llamar a un backend propio mediante `EXPO_PUBLIC_DEEPSEEK_BACKEND_URL`.
- `ollama`: preparado para una instancia local compatible con `EXPO_PUBLIC_OLLAMA_BASE_URL`, por ejemplo `http://192.168.1.193:11434/api/chat`.

Para cambiar el proveedor de comandos:

```bash
EXPO_PUBLIC_ATENEA_AI_COMMAND_PROVIDER=mock
```

No pongas API keys reales de DeepSeek en el frontend. La integración segura debe pasar por un backend que proteja la llave, aplique cuotas y filtre datos sensibles.

## Voz

Text-to-Speech usa `expo-speech` desde `src/services/voice/tts.ts` con preferencia por `es-CL`. Speech-to-Text aun no está activo; `src/services/voice/listening.ts` deja la interfaz mock `startListening()` y `stopListening()` para conectar voz real más adelante.

## Prueba rápida

1. Abre Atenea.
2. En el panel `Atenea IA`, escribe: `Hay un accidente en avenida principal`.
3. Revisa la previsualización generada.
4. Usa `Crear alerta` para abrir el modal existente con los datos iniciales.

## Modo demostracion en universidad

Para una demo segura usa siempre el proveedor mock:

```bash
EXPO_PUBLIC_ATENEA_AI_COMMAND_PROVIDER=mock
EXPO_PUBLIC_OLLAMA_BASE_URL=http://IP_DE_MI_PC:11434/api/chat
EXPO_PUBLIC_OLLAMA_MODEL=llama3.1
EXPO_PUBLIC_DEEPSEEK_BACKEND_URL=
```

Con `EXPO_PUBLIC_ATENEA_AI_COMMAND_PROVIDER=mock`, ATENEA no intenta llamar a Ollama. Esto evita depender de una IP local o del Wi-Fi de la universidad.

Para probar Ollama en una red nueva:

1. En Windows, ejecuta:

```powershell
ipconfig
```

2. Busca la IPv4 del adaptador Wi-Fi.
3. Actualiza `.env`:

```bash
EXPO_PUBLIC_ATENEA_AI_COMMAND_PROVIDER=ollama
EXPO_PUBLIC_OLLAMA_BASE_URL=http://NUEVA_IP:11434/api/chat
EXPO_PUBLIC_OLLAMA_MODEL=llama3.1
```

4. Reinicia Metro:

```bash
npx expo start --dev-client --tunnel --clear
```

Si Ollama no responde, cambia la IP, tarda mas de 8 segundos, devuelve JSON invalido o falla la red, ATENEA muestra `IA: Ollama no disponible, usando Mock Demo` y sigue funcionando con mock.

DeepSeek queda preparado solo mediante backend seguro o Firebase Function. La API key de DeepSeek no debe ir en el frontend.

## Como probar Ollama local

1. Revisa la IP de tu PC en Windows:

```powershell
ipconfig
```

2. Busca la IPv4 del adaptador Wi-Fi. Si cambias de Wi-Fi, esta IP puede cambiar.

3. Configura `.env`:

```bash
EXPO_PUBLIC_ATENEA_AI_COMMAND_PROVIDER=ollama
EXPO_PUBLIC_OLLAMA_BASE_URL=http://NUEVA_IP:11434/api/chat
EXPO_PUBLIC_OLLAMA_MODEL=llama3.1
EXPO_PUBLIC_DEEPSEEK_BACKEND_URL=
```

4. Inicia Ollama escuchando en la red:

```powershell
$env:OLLAMA_HOST="0.0.0.0:11434"
ollama serve
```

5. En otra terminal prueba el modelo:

```powershell
ollama run llama3.1
```

6. Reinicia Metro:

```bash
npx expo start --dev-client --tunnel --clear
```

7. En la app abre Atenea IA, despliega `Estado IA` y toca `Probar Ollama`.

Resultados esperados:

- `Ollama conectado correctamente`: la app puede usar Ollama.
- `URL Ollama no configurada`: falta `EXPO_PUBLIC_OLLAMA_BASE_URL`.
- `Timeout conectando a Ollama`: IP, Wi-Fi, firewall u Ollama no disponible.
- `Ollama no disponible, usando Mock Demo`: la app sigue funcionando con mock.

Para una presentacion importante, deja:

```bash
EXPO_PUBLIC_ATENEA_AI_COMMAND_PROVIDER=mock
```

Asi la app no depende de Ollama ni de una IP local.
