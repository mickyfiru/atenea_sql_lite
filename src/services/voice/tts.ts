import * as Speech from 'expo-speech';

export async function speak(text: string) {
  const message = text.trim();

  if (!message) {
    return;
  }

  try {
    const voices = await Speech.getAvailableVoicesAsync();
    const spanishVoice = voices.find((voice) => voice.language.toLowerCase() === 'es-cl') ??
      voices.find((voice) => voice.language.toLowerCase().startsWith('es'));

    await Speech.stop();
    Speech.speak(message, {
      language: spanishVoice?.language ?? 'es-CL',
      voice: spanishVoice?.identifier,
      rate: 0.96,
      pitch: 1,
    });
  } catch (error) {
    console.warn('[voice] tts fallback', error);
    Speech.speak(message, {
      language: 'es-CL',
    });
  }
}

export function stopSpeaking() {
  return Speech.stop();
}
