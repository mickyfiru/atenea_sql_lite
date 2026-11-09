type SpeechRecognitionModule = {
  requestPermissionsAsync: () => Promise<{ granted: boolean; status: string }>;
  isRecognitionAvailable: () => boolean;
  start: (options: {
    lang?: string;
    interimResults?: boolean;
    maxAlternatives?: number;
    continuous?: boolean;
    requiresOnDeviceRecognition?: boolean;
    contextualStrings?: string[];
  }) => void;
  stop: () => void;
  abort?: () => void;
  getSupportedLocales?: (options: {
    androidRecognitionServicePackage?: string;
  }) => Promise<{
    locales: string[];
    installedLocales: string[];
  }>;
  addListener?: (
    eventName: string,
    listener: (event: unknown) => void,
  ) => { remove: () => void };
};

type SpeechRecognitionPackage = {
  ExpoSpeechRecognitionModule: SpeechRecognitionModule;
};

export type VoiceListeningResult = {
  text: string;
  isMock: false;
};

export type SpeechRecognitionListener =
  | 'result'
  | 'error'
  | 'start'
  | 'end'
  | 'nomatch';

const unavailableMessage =
  'Reconocimiento de voz no disponible en esta build. Reinstala la app con npx expo run:android.';
let speechRecognitionModule: SpeechRecognitionModule | undefined;
let speechRecognitionModuleLoaded = false;

function loadSpeechRecognitionModule() {
  if (speechRecognitionModuleLoaded) {
    return speechRecognitionModule;
  }

  speechRecognitionModuleLoaded = true;

  try {
    const speechRecognition = require('expo-speech-recognition') as SpeechRecognitionPackage;
    speechRecognitionModule = speechRecognition.ExpoSpeechRecognitionModule;
    return speechRecognitionModule;
  } catch (error) {
    console.warn('[voice] speech recognition native module unavailable', error);
    return undefined;
  }
}

async function resolveSpeechLanguage(speechRecognition: SpeechRecognitionModule) {
  if (!speechRecognition.getSupportedLocales) {
    return 'es-CL';
  }

  try {
    const { locales } = await speechRecognition.getSupportedLocales({});
    const normalizedLocales = locales.map((locale) => locale.toLowerCase());
    const chileIndex = normalizedLocales.indexOf('es-cl');
    const spainIndex = normalizedLocales.indexOf('es-es');
    const spanishIndex = normalizedLocales.findIndex((locale) => locale === 'es' || locale.startsWith('es-'));

    if (chileIndex >= 0) {
      return locales[chileIndex];
    }

    if (spainIndex >= 0) {
      return locales[spainIndex];
    }

    if (spanishIndex >= 0) {
      return locales[spanishIndex];
    }
  } catch (error) {
    console.warn('[voice] speech locale lookup failed', error);
  }

  return 'es-CL';
}

export function isSpeechRecognitionAvailable() {
  const speechRecognition = loadSpeechRecognitionModule();

  if (!speechRecognition) {
    return false;
  }

  try {
    return speechRecognition.isRecognitionAvailable();
  } catch (error) {
    console.warn('[voice] speech recognition availability check failed', error);
    return false;
  }
}

export async function requestSpeechPermissions() {
  const speechRecognition = loadSpeechRecognitionModule();

  if (!speechRecognition) {
    return {
      granted: false,
      error: unavailableMessage,
    };
  }

  try {
    const permission = await speechRecognition.requestPermissionsAsync();

    if (!permission.granted) {
      return {
        granted: false,
        error: 'ATENEA necesita permiso de microfono para escuchar comandos.',
      };
    }

    return {
      granted: true,
    };
  } catch (error) {
    console.warn('[voice] speech permission request failed', error);

    return {
      granted: false,
      error: 'No pudimos solicitar permiso de microfono.',
    };
  }
}

export function addSpeechRecognitionListener(
  eventName: SpeechRecognitionListener,
  listener: (event: unknown) => void,
) {
  const speechRecognition = loadSpeechRecognitionModule();

  if (!speechRecognition?.addListener) {
    return () => undefined;
  }

  const subscription = speechRecognition.addListener(eventName, listener);

  return () => subscription.remove();
}

export async function startListening() {
  const speechRecognition = loadSpeechRecognitionModule();

  if (!speechRecognition) {
    throw new Error(unavailableMessage);
  }

  const permission = await requestSpeechPermissions();

  if (!permission.granted) {
    throw new Error(permission.error ?? 'Permiso de microfono no disponible.');
  }

  if (!isSpeechRecognitionAvailable()) {
    throw new Error(unavailableMessage);
  }

  try {
    const language = await resolveSpeechLanguage(speechRecognition);

    speechRecognition.start({
      lang: language,
      interimResults: true,
      maxAlternatives: 1,
      continuous: false,
      requiresOnDeviceRecognition: false,
      contextualStrings: [
        'hay un robo',
        'hay una pelea',
        'hay taco',
        'corte de luz',
        'fuga de gas',
        'llama a bomberos',
        'necesito ambulancia',
        'abre grupos',
        'muestrame el mapa',
      ],
    });
  } catch (error) {
    console.warn('[voice] speech recognition start failed', error);
    throw new Error('No pudimos iniciar el reconocimiento de voz.');
  }
}

export async function stopListening() {
  const speechRecognition = loadSpeechRecognitionModule();

  if (!speechRecognition) {
    return;
  }

  try {
    speechRecognition.stop();
  } catch (error) {
    console.warn('[voice] speech recognition stop failed', error);
  }
}
