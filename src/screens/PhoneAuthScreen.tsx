import { useEffect, useRef, useState } from 'react';
import { RecaptchaVerifier } from 'firebase/auth';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '../components/PrimaryButton';
import { colors, radius } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { RootScreenProps } from '../navigation/types';
import {
  getAuthErrorMessage,
  isDevLoginEnabled,
  logAuthError,
  normalizePhoneNumber,
  startDevSignIn,
  startPhoneSignIn,
  verifyFirebaseProject,
} from '../services/auth';
import { auth } from '../services/firebase';

const WEB_RECAPTCHA_CONTAINER_ID = 'phone-auth-recaptcha';

export function PhoneAuthScreen({ navigation }: RootScreenProps<'PhoneAuth'>) {
  const { firebaseReady } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState('+56 9 ');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const webRecaptchaVerifier = useRef<RecaptchaVerifier | undefined>(undefined);

  useEffect(() => {
    if (Platform.OS === 'web' && auth) {
      verifyFirebaseProject(auth);
      console.info('[ATENEA Firebase] Web auth hostname:', window.location.hostname);
      console.info('[ATENEA Firebase] Use localhost for web OTP tests:', window.location.hostname === 'localhost');
    }

    return () => {
      resetWebRecaptchaVerifier();
    };
  }, []);

  const resetWebRecaptchaVerifier = () => {
    if (Platform.OS !== 'web') {
      return;
    }

    webRecaptchaVerifier.current?.clear();
    webRecaptchaVerifier.current = undefined;

    const container = document.getElementById(WEB_RECAPTCHA_CONTAINER_ID);
    if (container) {
      container.innerHTML = '';
    }
  };

  const createWebRecaptchaVerifier = async () => {
    if (Platform.OS !== 'web' || !auth) {
      return undefined;
    }

    resetWebRecaptchaVerifier();

    const verifier = new RecaptchaVerifier(auth, WEB_RECAPTCHA_CONTAINER_ID, {
      size: 'invisible',
    });

    await verifier.render();
    webRecaptchaVerifier.current = verifier;

    return verifier;
  };

  const enterDevMode = async () => {
    if (loading) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      await startDevSignIn();
    } catch (devError) {
      logAuthError(devError);
      setError(getAuthErrorMessage(devError));
    } finally {
      setLoading(false);
    }
  };

  const submit = async () => {
    if (loading) {
      return;
    }

    if (Platform.OS !== 'web') {
      setError(
        isDevLoginEnabled
          ? 'Phone Auth nativo esta desactivado temporalmente en esta APK. Usa "Entrar en modo prueba".'
          : 'Phone Auth nativo requiere una libreria compatible. Habilita EXPO_PUBLIC_ENABLE_DEV_LOGIN=true para probar la app.',
      );
      return;
    }

    const normalizedPhone = normalizePhoneNumber(phoneNumber);

    if (!normalizedPhone.startsWith('+') || normalizedPhone.length < 8) {
      setError('Ingresa el numero en formato internacional, por ejemplo +56912345678.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const webVerifier =
        Platform.OS === 'web' ? await createWebRecaptchaVerifier() : undefined;
      const confirmationId = await startPhoneSignIn(normalizedPhone, webVerifier);
      navigation.navigate('OtpVerification', {
        phoneNumber: normalizedPhone,
        confirmationId,
      });
    } catch (submitError) {
      logAuthError(submitError);
      resetWebRecaptchaVerifier();
      setError(getAuthErrorMessage(submitError));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.content}
      >
        <View>
          <Text style={styles.title}>Ingresa tu celular</Text>
          <Text style={styles.subtitle}>
            ATENEA usara Firebase Auth para verificar tu numero con un codigo OTP.
          </Text>
        </View>

        <View style={styles.form}>
          {Platform.OS === 'web' ? (
            <View nativeID={WEB_RECAPTCHA_CONTAINER_ID} style={styles.recaptcha} />
          ) : null}
          <Text style={styles.label}>Numero telefonico</Text>
          <TextInput
            editable={!loading}
            keyboardType="phone-pad"
            onChangeText={setPhoneNumber}
            placeholder="+56912345678"
            placeholderTextColor={colors.muted}
            style={styles.input}
            value={phoneNumber}
          />
          {!firebaseReady ? (
            <Text style={styles.error}>
              Completa las variables Firebase antes de solicitar codigos OTP.
            </Text>
          ) : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {Platform.OS !== 'web' && isDevLoginEnabled ? (
            <Text style={styles.helperText}>
              El modo prueba usa Firebase Anonymous Auth solo para validar la APK.
            </Text>
          ) : null}
        </View>

        <View style={styles.actions}>
          <PrimaryButton
            disabled={loading || !firebaseReady}
            label={loading ? 'Enviando...' : 'Enviar codigo'}
            onPress={submit}
          />
          {isDevLoginEnabled ? (
            <PrimaryButton
              disabled={loading || !firebaseReady}
              label={loading ? 'Entrando...' : 'Entrar en modo prueba'}
              onPress={enterDevMode}
              variant="light"
            />
          ) : null}
          <PrimaryButton
            disabled={loading}
            label="Volver"
            onPress={() => navigation.goBack()}
            variant="light"
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    backgroundColor: colors.background,
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 24,
  },
  title: {
    color: colors.ink,
    fontSize: 34,
    fontWeight: '900',
    marginTop: 28,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 17,
    fontWeight: '600',
    lineHeight: 25,
    marginTop: 10,
  },
  form: {
    gap: 10,
  },
  label: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  input: {
    backgroundColor: colors.soft,
    borderColor: colors.line,
    borderRadius: radius.lg,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 22,
    fontWeight: '800',
    minHeight: 64,
    paddingHorizontal: 18,
  },
  error: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '700',
  },
  helperText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },
  recaptcha: {
    height: 1,
    opacity: 0,
    width: 1,
  },
  actions: {
    gap: 12,
  },
});
