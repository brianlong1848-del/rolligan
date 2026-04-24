import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const tap = async (fn) => {
  if (Platform.OS === 'web') return;
  try { await fn(); } catch {}
};

export const hTap = () => tap(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
export const hPress = () => tap(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
export const hBank = () => tap(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
export const hWarn = () => tap(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
export const hError = () => tap(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
