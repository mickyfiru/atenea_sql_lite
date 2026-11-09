import { Component, type ErrorInfo, type PropsWithChildren } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius } from '../constants/theme';

type ErrorBoundaryState = {
  error?: Error;
};

export class ErrorBoundary extends Component<PropsWithChildren, ErrorBoundaryState> {
  state: ErrorBoundaryState = {};

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.log('[ATENEA startup] ErrorBoundary captured:', error.message);
    console.log('[ATENEA startup] Component stack:', errorInfo.componentStack);
  }

  reset = () => {
    this.setState({ error: undefined });
  };

  render() {
    if (this.state.error) {
      return (
        <View style={styles.safe}>
          <View style={styles.card}>
            <Text style={styles.title}>ATENEA encontro un problema</Text>
            <Text style={styles.message}>
              La app no se cerro, pero algo fallo al iniciar. Intenta abrirla otra vez.
            </Text>
            <Text style={styles.detail} numberOfLines={4}>
              {this.state.error.message}
            </Text>
            <Pressable onPress={this.reset} style={styles.button}>
              <Text style={styles.buttonText}>Reintentar</Text>
            </Pressable>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  safe: {
    alignItems: 'center',
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: colors.soft,
    borderColor: colors.line,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: 12,
    padding: 22,
    width: '100%',
  },
  title: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: '900',
  },
  message: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
  },
  detail: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  button: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    minHeight: 48,
    justifyContent: 'center',
    marginTop: 4,
  },
  buttonText: {
    color: colors.background,
    fontSize: 15,
    fontWeight: '900',
  },
});
