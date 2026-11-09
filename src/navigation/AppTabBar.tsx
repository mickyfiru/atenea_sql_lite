import { Ionicons } from '@expo/vector-icons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, shadows } from '../constants/theme';
import { MainTabParamList } from './types';

const tabMeta: Record<
  keyof MainTabParamList,
  { label: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  Groups: { label: 'Groups', icon: 'people-outline' },
  Atenea: { label: 'Atenea', icon: 'sparkles-outline' },
  Profile: { label: 'Profile', icon: 'person-outline' },
};

export function AppTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {state.routes.map((route, index) => {
        const name = route.name as keyof MainTabParamList;
        const focused = state.index === index;
        const isAtenea = name === 'Atenea';
        const options = descriptors[route.key].options;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={focused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            key={route.key}
            onPress={onPress}
            style={[styles.item, isAtenea && styles.centerItem]}
          >
            <View
              style={[
                styles.iconWrap,
                isAtenea && styles.centerButton,
                focused && !isAtenea && styles.activeSoft,
              ]}
            >
              <Ionicons
                name={tabMeta[name].icon}
                size={isAtenea ? 32 : 28}
                color={isAtenea ? colors.background : focused ? colors.primary : colors.muted}
              />
            </View>
            <Text style={[styles.label, focused && styles.activeLabel]}>
              {tabMeta[name].label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'flex-end',
    backgroundColor: colors.background,
    borderTopColor: colors.line,
    borderTopWidth: 1,
    flexDirection: 'row',
    height: 86,
    justifyContent: 'space-around',
    paddingHorizontal: 18,
    paddingTop: 10,
  },
  item: {
    alignItems: 'center',
    flex: 1,
    gap: 4,
    justifyContent: 'center',
  },
  centerItem: {
    marginTop: -34,
  },
  iconWrap: {
    alignItems: 'center',
    borderRadius: 28,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  activeSoft: {
    backgroundColor: colors.primarySoft,
  },
  centerButton: {
    backgroundColor: colors.primary,
    borderColor: '#DDE8FF',
    borderWidth: 7,
    height: 86,
    width: 86,
    ...shadows.primary,
  },
  label: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  activeLabel: {
    color: colors.primary,
  },
});
