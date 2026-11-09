import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '../components/PrimaryButton';
import { colors, radius } from '../constants/theme';
import { RootScreenProps } from '../navigation/types';
import { getAuthErrorMessage, verifyOtpCode } from '../services/auth';

export function OtpVerificationScreen({
  navigation,
  route,
}: RootScreenProps<'OtpVerification'>) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (loading) {
      return;
    }

    setError('');
    setLoading(true);

    try {
      await verifyOtpCode(route.params.confirmationId, code);
    } catch (verifyError) {
      setError(getAuthErrorMessage(verifyError));
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
          <Text style={styles.title}>Verifica el codigo</Text>
          <Text style={styles.subtitle}>
            Enviamos un OTP a {route.params.phoneNumber}. Ingresa el codigo SMS para continuar.
          </Text>
        </View>

        <View style={styles.form}>
          <TextInput
            editable={!loading}
            keyboardType="number-pad"
            maxLength={6}
            onChangeText={setCode}
            placeholder="000000"
            placeholderTextColor={colors.muted}
            style={styles.input}
            textAlign="center"
            value={code}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>

        <View style={styles.actions}>
          <PrimaryButton
            disabled={loading || code.trim().length < 4}
            label={loading ? 'Verificando...' : 'Verificar'}
            onPress={submit}
          />
          <PrimaryButton
            disabled={loading}
            label="Cambiar numero"
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
    gap: 12,
  },
  input: {
    backgroundColor: colors.soft,
    borderColor: colors.line,
    borderRadius: radius.lg,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: 6,
    minHeight: 76,
    paddingHorizontal: 18,
  },
  error: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  actions: {
    gap: 12,
  },
});
