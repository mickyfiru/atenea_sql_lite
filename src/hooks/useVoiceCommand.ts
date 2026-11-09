import { useEffect, useRef, useState } from 'react';

import {
  addSpeechRecognitionListener,
  isSpeechRecognitionAvailable,
  requestSpeechPermissions,
  startListening,
  stopListening,
} from '../services/voice/listening';

type SpeechResultEvent = {
  results?: Array<{
    transcript?: string;
    confidence?: number;
  }>;
  isFinal?: boolean;
};

type SpeechErrorEvent = {
  error?: string;
  message?: string;
};

type UseVoiceCommandOptions = {
  onFinalTranscript?: (text: string) => Promise<void> | void;
};

function getTranscript(event: unknown) {
  const resultEvent = event as SpeechResultEvent;
  return resultEvent.results?.[0]?.transcript?.trim() ?? '';
}

function getVoiceErrorMessage(event: unknown) {
  const errorEvent = event as SpeechErrorEvent;

  if (errorEvent.error === 'no-speech' || errorEvent.error === 'no-match') {
    return 'No escuche ningun comando.';
  }

  if (errorEvent.error === 'not-allowed') {
    return 'ATENEA necesita permiso de microfono para escuchar comandos.';
  }

  return errorEvent.message ?? 'No pudimos reconocer el comando de voz.';
}

export function useVoiceCommand(options: UseVoiceCommandOptions = {}) {
  const [listening, setListening] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const lastTranscriptRef = useRef('');
  const onFinalTranscriptRef = useRef(options.onFinalTranscript);

  useEffect(() => {
    onFinalTranscriptRef.current = options.onFinalTranscript;
  }, [options.onFinalTranscript]);

  useEffect(() => {
    const removeResultListener = addSpeechRecognitionListener('result', (event) => {
      const nextTranscript = getTranscript(event);

      if (nextTranscript) {
        lastTranscriptRef.current = nextTranscript;
        setTranscript(nextTranscript);
      }
    });
    const removeErrorListener = addSpeechRecognitionListener('error', (event) => {
      const nextError = getVoiceErrorMessage(event);
      console.warn('[voice] speech recognition error', event);
      setError(nextError);
      setListening(false);
      setProcessing(false);
    });
    const removeStartListener = addSpeechRecognitionListener('start', () => {
      setListening(true);
      setProcessing(false);
      setError(null);
    });
    const removeNoMatchListener = addSpeechRecognitionListener('nomatch', () => {
      setError('No escuche ningun comando.');
      setListening(false);
      setProcessing(false);
    });
    const removeEndListener = addSpeechRecognitionListener('end', () => {
      setListening(false);

      const finalTranscript = lastTranscriptRef.current.trim();

      if (!finalTranscript) {
        setProcessing(false);
        setError('No escuche ningun comando.');
        return;
      }

      setProcessing(true);
      void Promise.resolve(onFinalTranscriptRef.current?.(finalTranscript)).finally(() => {
        setProcessing(false);
      });
    });

    return () => {
      removeResultListener();
      removeErrorListener();
      removeStartListener();
      removeNoMatchListener();
      removeEndListener();
    };
  }, []);

  async function start() {
    setError(null);
    setTranscript('');
    lastTranscriptRef.current = '';

    if (!isSpeechRecognitionAvailable()) {
      setError('Reconocimiento de voz no disponible en esta build. Reinstala la app con npx expo run:android.');
      return;
    }

    const permission = await requestSpeechPermissions();

    if (!permission.granted) {
      setError(permission.error ?? 'ATENEA necesita permiso de microfono para escuchar comandos.');
      return;
    }

    try {
      await startListening();
    } catch (startError) {
      const message = startError instanceof Error
        ? startError.message
        : 'No pudimos iniciar el reconocimiento de voz.';
      console.warn('[voice] start failed', startError);
      setError(message);
      setListening(false);
      setProcessing(false);
    }
  }

  async function stop() {
    setProcessing(true);
    await stopListening();
  }

  function reset() {
    setError(null);
    setTranscript('');
    setProcessing(false);
    lastTranscriptRef.current = '';
  }

  return {
    listening,
    processing,
    transcript,
    error,
    start,
    stop,
    reset,
  };
}
