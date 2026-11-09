import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Welcome: undefined;
  PhoneAuth: undefined;
  OtpVerification: { phoneNumber: string; confirmationId: string };
  MainTabs: NavigatorScreenParams<MainTabParamList>;
  Chat: { groupId: string };
  Alerts: { initialCategory?: string } | undefined;
  SoundSettings: undefined;
  Summary: undefined;
  LocationSettings: undefined;
  Map: undefined;
};

export type MainTabParamList = {
  Groups: undefined;
  Atenea: undefined;
  Profile: undefined;
};

export type RootScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;

export type MainTabScreenProps<T extends keyof MainTabParamList> =
  BottomTabScreenProps<MainTabParamList, T>;
