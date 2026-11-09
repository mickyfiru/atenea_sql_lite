import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { colors, radius } from '../constants/theme';
import { ALERT_CATEGORIES } from '../services/alerts';
import { AlertCategory } from '../types/domain';
import { getAlertCategoryTone } from '../utils/alerts';

export type CategoryFilterValue = 'Todas' | AlertCategory;

type CategoryFilterProps = {
  value: CategoryFilterValue;
  onChange: (value: CategoryFilterValue) => void;
};

export function CategoryFilter({ value, onChange }: CategoryFilterProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.filters}
    >
      {(['Todas', ...ALERT_CATEGORIES] as CategoryFilterValue[]).map((category) => {
        const active = value === category;
        const tone = category === 'Todas' ? undefined : getAlertCategoryTone(category);

        return (
          <Pressable
            key={category}
            onPress={() => onChange(category)}
            style={[
              styles.filterPill,
              active && {
                backgroundColor: tone?.color ?? colors.primary,
              },
              !active && {
                backgroundColor: tone?.backgroundColor ?? colors.primarySoft,
              },
            ]}
          >
            <Text
              style={[
                styles.filterText,
                { color: active ? colors.background : tone?.color ?? colors.primary },
              ]}
            >
              {category}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  filters: {
    flexGrow: 0,
    marginBottom: 16,
  },
  filterPill: {
    borderRadius: radius.pill,
    marginRight: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '900',
  },
});
