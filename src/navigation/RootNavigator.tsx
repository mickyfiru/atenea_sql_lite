import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useAuth } from '../context/AuthContext';
import { AlertsScreen } from '../screens/AlertsScreen';
import { AteneaScreen } from '../screens/AteneaScreen';
import { ChatScreen } from '../screens/ChatScreen';
import { GroupsScreen } from '../screens/GroupsScreen';
import { LazyMapScreen } from '../screens/LazyMapScreen';
import { LocationSettingsScreen } from '../screens/LocationSettingsScreen';
import { OtpVerificationScreen } from '../screens/OtpVerificationScreen';
import { PhoneAuthScreen } from '../screens/PhoneAuthScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { SoundSettingsScreen } from '../screens/SoundSettingsScreen';
import { SummaryScreen } from '../screens/SummaryScreen';
import { WelcomeScreen } from '../screens/WelcomeScreen';
import { AppTabBar } from './AppTabBar';
import { MainTabParamList, RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function MainTabs() {
  return (
    <Tab.Navigator
      initialRouteName="Atenea"
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <AppTabBar {...props} />}
    >
      <Tab.Screen name="Groups" component={GroupsScreen} />
      <Tab.Screen name="Atenea" component={AteneaScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  const { user } = useAuth();
  console.log('[ATENEA startup] RootNavigator rendered. Authenticated:', Boolean(user));

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          contentStyle: { backgroundColor: '#FFFFFF' },
          headerShown: false,
        }}
      >
        {user ? (
          <>
            <Stack.Screen name="MainTabs" component={MainTabs} />
            <Stack.Screen name="Chat" component={ChatScreen} />
            <Stack.Screen name="Alerts" component={AlertsScreen} />
            <Stack.Screen name="SoundSettings" component={SoundSettingsScreen} />
            <Stack.Screen name="Summary" component={SummaryScreen} />
            <Stack.Screen name="LocationSettings" component={LocationSettingsScreen} />
            <Stack.Screen name="Map" component={LazyMapScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="PhoneAuth" component={PhoneAuthScreen} />
            <Stack.Screen name="OtpVerification" component={OtpVerificationScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
