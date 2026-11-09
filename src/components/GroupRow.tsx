import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../constants/theme';
import { CommunityGroup } from '../types/domain';

type GroupRowProps = {
  group: CommunityGroup;
  onPress?: () => void;
  showCall?: boolean;
};

export function GroupRow({ group, onPress, showCall }: GroupRowProps) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={[styles.icon, { backgroundColor: group.iconBackground }]}>
        <Ionicons
          name={group.icon as keyof typeof Ionicons.glyphMap}
          size={28}
          color={group.iconColor}
        />
      </View>
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>
          {group.name}
        </Text>
        <Text style={styles.message} numberOfLines={1}>
          {group.lastMessage}
        </Text>
      </View>
      <View style={styles.meta}>
        <Text style={styles.time}>{group.time}</Text>
        {group.unread ? (
          <View style={[styles.unread, group.type === 'emergency' && styles.alertUnread]}>
            <Text style={styles.unreadText}>{group.unread}</Text>
          </View>
        ) : null}
        {showCall ? (
          <View style={[styles.call, { backgroundColor: group.iconBackground }]}>
            <Ionicons name="call-outline" size={20} color={group.iconColor} />
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 92,
    paddingHorizontal: 22,
  },
  pressed: {
    backgroundColor: '#F9FBFF',
  },
  icon: {
    alignItems: 'center',
    borderRadius: 26,
    height: 54,
    justifyContent: 'center',
    width: 54,
  },
  content: {
    flex: 1,
    marginLeft: 18,
  },
  name: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
  },
  message: {
    color: '#667793',
    fontSize: 16,
    fontWeight: '500',
    marginTop: 6,
  },
  meta: {
    alignItems: 'flex-end',
    gap: 8,
    minWidth: 54,
  },
  time: {
    color: colors.muted,
    fontSize: 16,
    fontWeight: '700',
  },
  unread: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 16,
    height: 30,
    justifyContent: 'center',
    minWidth: 30,
    paddingHorizontal: 8,
  },
  alertUnread: {
    backgroundColor: colors.danger,
  },
  unreadText: {
    color: colors.background,
    fontSize: 14,
    fontWeight: '900',
  },
  call: {
    alignItems: 'center',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
});
