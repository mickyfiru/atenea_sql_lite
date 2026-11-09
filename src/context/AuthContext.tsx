import type { User } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { colors } from '../constants/theme';
import { auth, isFirebaseConfigured } from '../services/firebase';
import { ensureUserDocument } from '../services/users';

type AuthContextValue = {
  user: User | null;
  initializing: boolean;
  firebaseReady: boolean;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(auth?.currentUser ?? null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      setInitializing(false);
      return undefined;
    }

    return onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);

      if (nextUser) {
        try {
          await ensureUserDocument(nextUser);
        } catch {
          // Navigation should not block if Firestore is temporarily unavailable.
        }
      }

      setInitializing(false);
    });
  }, []);

  const value = useMemo(
    () => ({
      user,
      initializing,
      firebaseReady: isFirebaseConfigured && Boolean(auth),
    }),
    [initializing, user],
  );

  if (initializing) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={styles.loadingText}>Preparando ATENEA...</Text>
      </View>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error('useAuth debe usarse dentro de AuthProvider.');
  }

  return value;
}

const styles = StyleSheet.create({
  loading: {
    alignItems: 'center',
    backgroundColor: colors.background,
    flex: 1,
    gap: 14,
    justifyContent: 'center',
  },
  loadingText: {
    color: colors.muted,
    fontSize: 16,
    fontWeight: '700',
  },
});
