import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, radius } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { RootScreenProps } from '../navigation/types';
import { getGroupById } from '../services/groups';
import { sendGroupMessage, subscribeGroupMessages } from '../services/messages';
import { CommunityGroup, Message } from '../types/domain';
import { formatRelativeTime } from '../utils/dates';

export function ChatScreen({ navigation, route }: RootScreenProps<'Chat'>) {
  const { user } = useAuth();
  const [group, setGroup] = useState<CommunityGroup | undefined>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    getGroupById(route.params.groupId)
      .then((nextGroup) => {
        if (mounted) {
          setGroup(nextGroup);
        }
      })
      .catch((groupError) => {
        if (mounted) {
          setError(groupError instanceof Error ? groupError.message : 'No pudimos cargar el grupo.');
        }
      });

    const unsubscribe = subscribeGroupMessages(
      route.params.groupId,
      (nextMessages) => {
        setMessages(nextMessages);
        setLoading(false);
      },
      (messagesError) => {
        setError(messagesError.message);
        setLoading(false);
      },
    );

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [route.params.groupId]);

  const sendMessage = async () => {
    if (!user || sending || !input.trim()) {
      return;
    }

    setSending(true);
    setError('');

    try {
      await sendGroupMessage(route.params.groupId, user.uid, input);
      setInput('');
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'No pudimos enviar el mensaje.');
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={26} color={colors.primary} />
          </Pressable>
          <View style={styles.headerText}>
            <Text style={styles.title} numberOfLines={1}>
              {group?.name ?? 'Grupo'}
            </Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              Codigo: {route.params.groupId}
            </Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.helperText}>Cargando mensajes...</Text>
          </View>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <ScrollView contentContainerStyle={styles.messages} showsVerticalScrollIndicator={false}>
          {!loading && !messages.length ? (
            <Text style={styles.empty}>Aun no hay mensajes. Escribe el primero.</Text>
          ) : null}

          {messages.map((message) => {
            const own = message.userId === user?.uid;

            return (
              <View
                key={message.id}
                style={[styles.messageRow, own ? styles.ownMessageRow : styles.otherMessageRow]}
              >
                <View style={[styles.bubble, own ? styles.ownBubble : styles.otherBubble]}>
                  <Text style={[styles.messageText, own && styles.ownMessageText]}>{message.text}</Text>
                  <Text style={[styles.time, own && styles.ownTime]}>
                    {formatRelativeTime(message.createdAt)}
                  </Text>
                </View>
              </View>
            );
          })}
        </ScrollView>

        <View style={styles.inputBar}>
          <TextInput
            editable={!sending}
            onChangeText={setInput}
            placeholder="Escribe un mensaje..."
            placeholderTextColor={colors.muted}
            style={styles.input}
            value={input}
          />
          <Pressable
            disabled={sending || !input.trim()}
            onPress={sendMessage}
            style={({ pressed }) => [
              styles.sendButton,
              (pressed || sending || !input.trim()) && styles.sendButtonMuted,
            ]}
          >
            <Ionicons name="paper-plane-outline" size={22} color={colors.background} />
          </Pressable>
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
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 12,
    paddingBottom: 16,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  backButton: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  headerText: {
    flex: 1,
  },
  title: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: '900',
  },
  subtitle: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },
  loading: {
    alignItems: 'center',
    gap: 8,
    padding: 24,
  },
  helperText: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '700',
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '700',
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  messages: {
    flexGrow: 1,
    gap: 12,
    padding: 20,
  },
  empty: {
    alignSelf: 'center',
    color: colors.muted,
    fontSize: 15,
    fontWeight: '700',
    marginTop: 32,
  },
  messageRow: {
    flexDirection: 'row',
  },
  ownMessageRow: {
    justifyContent: 'flex-end',
  },
  otherMessageRow: {
    justifyContent: 'flex-start',
  },
  bubble: {
    borderRadius: radius.lg,
    maxWidth: '78%',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  ownBubble: {
    backgroundColor: colors.primary,
  },
  otherBubble: {
    backgroundColor: colors.soft,
  },
  messageText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
  },
  ownMessageText: {
    color: colors.background,
  },
  time: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 6,
  },
  ownTime: {
    color: '#DDE8FF',
  },
  inputBar: {
    alignItems: 'center',
    borderTopColor: colors.line,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 14,
  },
  input: {
    backgroundColor: colors.soft,
    borderColor: colors.line,
    borderRadius: radius.lg,
    borderWidth: 1,
    color: colors.ink,
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    minHeight: 52,
    paddingHorizontal: 16,
  },
  sendButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 26,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  sendButtonMuted: {
    opacity: 0.62,
  },
});
