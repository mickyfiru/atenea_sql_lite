import { colors } from '../constants/theme';
import { AlertCategory } from '../types/domain';

export function getAlertCategoryTone(category: AlertCategory) {
  switch (category) {
    case 'Seguridad':
      return {
        color: colors.danger,
        backgroundColor: colors.dangerSoft,
        icon: 'shield-checkmark-outline' as const,
      };
    case 'Tr\u00e1nsito':
      return {
        color: colors.warning,
        backgroundColor: colors.warningSoft,
        icon: 'car-outline' as const,
      };
    case 'Comunidad':
      return {
        color: colors.primary,
        backgroundColor: colors.primarySoft,
        icon: 'people-outline' as const,
      };
    case 'Servicios':
      return {
        color: colors.teal,
        backgroundColor: colors.tealSoft,
        icon: 'construct-outline' as const,
      };
  }
}
