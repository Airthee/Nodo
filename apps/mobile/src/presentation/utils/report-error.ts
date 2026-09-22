import { Alert } from 'react-native';
import { t } from '../../i18n';

export function reportError(error: unknown): void {
  console.warn(error);
  Alert.alert(t('errors.title'), t('errors.storage'));
}
