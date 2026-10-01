import React, { useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Provider as ReduxProvider, useSelector, useDispatch } from 'react-redux';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { store, RootState, AppDispatch } from './store';
import { LanguageProvider, useLanguage } from './i18n/LanguageContext';
import { loadStoredToken } from './store/slices/authSlice';
import * as Notifications from 'expo-notifications';
import {
  setupPushNotifications,
  getNavTargetFromNotification,
} from './services/notifications';
import { isProviderRole, isAgentRole } from './utils/roleUtils';

// Auth Screens
import LoginScreen from './screens/auth/LoginScreen';
import OTPScreen from './screens/auth/OTPScreen';
import RoleSelectorScreen from './screens/auth/RoleSelectorScreen';
import RoleSelectionScreen from './screens/auth/RoleSelectionScreen';
import SignupScreen from './screens/auth/SignupScreen';
import DynamicProfileScreen from './screens/auth/DynamicProfileScreen';
import LocationSetupScreen from './screens/auth/LocationSetupScreen';
import KYCDocumentsScreen from './screens/auth/KYCDocumentsScreen';
import ConsentAndCompletionScreen from './screens/auth/ConsentAndCompletionScreen';
import ForgotPasswordScreen from './screens/auth/ForgotPasswordScreen';
import ResetPasswordScreen from './screens/auth/ResetPasswordScreen';

// Customer Screens
import HomeScreen from './screens/customer/HomeScreen';
import ProviderListScreen from './screens/customer/ProviderListScreen';
import ProviderDetailScreen from './screens/customer/ProviderDetailScreen';
import CallScreen from './screens/customer/CallScreen';

// Provider Screens
import ProviderSetupScreen from './screens/provider/ProviderSetupScreen';
import ProviderDashboardScreen from './screens/provider/ProviderDashboardScreen';
import ContractorKycScreen from './screens/provider/ContractorKycScreen';
import ContractorDealScreen from './screens/provider/ContractorDealScreen';
import VehicleOwnerSetupScreen from './screens/provider/VehicleOwnerSetupScreen';
import VehicleDriverDashScreen from './screens/provider/VehicleDriverDashScreen';

// Contractor (Customer side)
import ContractorBookingScreen from './screens/customer/ContractorBookingScreen';

// ठेकेदार बुकिंग एवं डिजिटल ठेका प्रस्ताव (Contract Proposal Engine)
import ContractProposalCreateScreen from './screens/customer/ContractProposalCreateScreen';
import MyContractProposalsScreen from './screens/customer/MyContractProposalsScreen';
import ContractorProposalInboxScreen from './screens/provider/ContractorProposalInboxScreen';
import ContractProposalDetailScreen from './screens/common/ContractProposalDetailScreen';
import DigitalContractScreen from './screens/common/DigitalContractScreen';
import TransportBookingScreen from './screens/customer/TransportBookingScreen';
import CustomerBookingsScreen from './screens/customer/CustomerBookingsScreen';
import LabourRequestStatusScreen from './screens/customer/LabourRequestStatusScreen';
import LabourRequestScreen from './screens/customer/LabourRequestScreen';
import DriverBookingScreen from './screens/customer/DriverBookingScreen';
import DriverRequestStatusScreen from './screens/customer/DriverRequestStatusScreen';
import KarigarBookingScreen from './screens/customer/KarigarBookingScreen';
import KarigarLiveStatusScreen from './screens/customer/KarigarLiveStatusScreen';
import KarigarRequestStatusScreen from './screens/customer/KarigarRequestStatusScreen';

// Labour (Provider side)
import LabourProviderRequestScreen from './screens/provider/LabourProviderRequestScreen';
import DriverProviderRequestScreen from './screens/provider/DriverProviderRequestScreen';
import KarigarProviderRequestScreen from './screens/provider/KarigarProviderRequestScreen';

// Agent Screens
import AgentDashboardScreen from './screens/agent/AgentDashboardScreen';
import AgentAddLaborScreen from './screens/agent/AgentAddLaborScreen';
import AgentNetworkScreen from './screens/agent/AgentNetworkScreen';
import AgentEarningsScreen from './screens/agent/AgentEarningsScreen';

// Common
import ProfileScreen from './screens/common/ProfileScreen';
import EditProfileScreen from './screens/common/EditProfileScreen';
import NotificationsScreen from './screens/common/NotificationsScreen';
import BookingsTabScreen from './screens/common/BookingsTabScreen';
import NegotiationChatScreen from './screens/common/NegotiationChatScreen';
import WalletScreen from './screens/common/WalletScreen';
import SOSTicketScreen from './screens/common/SOSTicketScreen';
import TermsAndRefundScreen from './screens/common/TermsAndRefundScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function CustomerTabs() {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#FF6B00',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: { paddingBottom: Math.max(insets.bottom, 6), height: 56 + insets.bottom },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen as any}
        options={{
          tabBarLabel: t('home'),
          tabBarIcon: ({ color }: { color: string }) => (
            <Text style={{ fontSize: 20, color }}>🏠</Text>
          ),
        }}
      />
      <Tab.Screen
        name="BookingsTab"
        component={BookingsTabScreen as any}
        options={{
          tabBarLabel: t('bookings') || 'Bookings',
          tabBarIcon: ({ color }: { color: string }) => (
            <Ionicons name="calendar-outline" size={20} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ChatTab"
        component={NegotiationChatScreen as any}
        options={{
          tabBarLabel: 'लाइव चैट',
          tabBarIcon: ({ color }: { color: string }) => (
            <Ionicons name="chatbubbles-outline" size={20} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen as any}
        options={{
          tabBarLabel: t('profile'),
          tabBarIcon: ({ color }: { color: string }) => (
            <Ionicons name="person-outline" size={20} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

function ProviderTabs() {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#1B5E20',
        tabBarInactiveTintColor: '#666',
        tabBarStyle: { paddingBottom: Math.max(insets.bottom, 6), height: 56 + insets.bottom },
      }}
    >
      <Tab.Screen
        name="DashboardTab"
        component={ProviderDashboardScreen as any}
        options={{
          tabBarLabel: 'होम',
          tabBarIcon: ({ color }: { color: string }) => (
            <Ionicons name="home-outline" size={20} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="BookingsTab"
        component={BookingsTabScreen as any}
        options={{
          tabBarLabel: 'मेरी बुकिंग',
          tabBarIcon: ({ color }: { color: string }) => (
            <Ionicons name="calendar-outline" size={20} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ChatTab"
        component={NegotiationChatScreen as any}
        options={{
          tabBarLabel: 'चैट',
          tabBarIcon: ({ color }: { color: string }) => (
            <Ionicons name="chatbubbles-outline" size={20} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen as any}
        options={{
          tabBarLabel: 'प्रोफाइल',
          tabBarIcon: ({ color }: { color: string }) => (
            <Ionicons name="person-outline" size={20} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

function AgentTabs() {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#F26333',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: { paddingBottom: Math.max(insets.bottom, 6), height: 56 + insets.bottom },
      }}
    >
      <Tab.Screen
        name="DashboardTab"
        component={AgentDashboardScreen as any}
        options={{
          tabBarLabel: 'डैशबोर्ड',
          tabBarIcon: ({ color }: { color: string }) => (
            <Text style={{ fontSize: 20, color }}>📊</Text>
          ),
        }}
      />
      <Tab.Screen
        name="AddLaborTab"
        component={AgentAddLaborScreen as any}
        options={{
          tabBarLabel: '+ जोड़ें',
          tabBarIcon: ({ color }: { color: string }) => (
            <Text style={{ fontSize: 20, color }}>➕</Text>
          ),
        }}
      />
      <Tab.Screen
        name="NetworkTab"
        component={AgentNetworkScreen as any}
        options={{
          tabBarLabel: 'नेटवर्क',
          tabBarIcon: ({ color }: { color: string }) => (
            <Text style={{ fontSize: 20, color }}>👥</Text>
          ),
        }}
      />
      <Tab.Screen
        name="EarningsTab"
        component={AgentEarningsScreen as any}
        options={{
          tabBarLabel: 'कमाई',
          tabBarIcon: ({ color }: { color: string }) => (
            <Text style={{ fontSize: 20, color }}>💰</Text>
          ),
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen as any}
        options={{
          tabBarLabel: t('profile'),
          tabBarIcon: ({ color }: { color: string }) => (
            <Text style={{ fontSize: 20, color }}>👤</Text>
          ),
        }}
      />
    </Tab.Navigator>
  );
}

function RootNavigator() {
  const { token, role, hasProfile, isBootstrapping, userId } = useSelector((s: RootState) => s.auth);
  const dispatch = useDispatch<AppDispatch>();
  const navigationRef = useRef<any>(null);
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const notificationResponseRef = useRef<Notifications.EventSubscription | null>(null);
  const hasNavigatedRef = useRef(false);
  const lastUserIdRef = useRef<number | null>(null);
  const lastRoleRef = useRef<string | null>(null);

  // ─── Step 1: Load token from SecureStore at startup ──────────────────────────
  useEffect(() => {
    dispatch(loadStoredToken());
  }, []);

  // ─── Step 2: Once bootstrapping is done, navigate to correct screen ──────────
  useEffect(() => {
    if (isBootstrapping) return;
    if (!navigationRef.current) return;

    // Reset navigation flag if user changed, logged in, or switched role
    if (token && (userId !== lastUserIdRef.current || role !== lastRoleRef.current)) {
      hasNavigatedRef.current = false;
      lastUserIdRef.current = userId;
      lastRoleRef.current = role;
    }

    if (hasNavigatedRef.current) return;
    hasNavigatedRef.current = true;

    if (!token) {
      navigationRef.current.reset({ index: 0, routes: [{ name: 'Login' }] });
    } else if (isProviderRole(role)) {
      navigationRef.current.reset({ index: 0, routes: [{ name: 'ProviderApp' }] });
    } else if (isAgentRole(role)) {
      navigationRef.current.reset({ index: 0, routes: [{ name: 'AgentApp' }] });
    } else {
      navigationRef.current.reset({ index: 0, routes: [{ name: 'CustomerApp' }] });
    }
  }, [isBootstrapping, token, role, hasProfile, userId]);

  // ─── Step 3: On logout, reset hasNavigatedRef and go to Login ────────────────
  useEffect(() => {
    if (isBootstrapping) return;
    if (!token) {
      hasNavigatedRef.current = false;
      lastUserIdRef.current = null;
      navigationRef.current?.reset({ index: 0, routes: [{ name: 'Login' }] });
    }
  }, [token]);

  // ─── FCM Setup: After user logs in, register for push notifications ──────────
  useEffect(() => {
    if (token) {
      setupPushNotifications().catch(console.log);
    }
  }, [token]);

  // ─── Notification Listeners ──────────────────────────────────────────────────
  useEffect(() => {
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('[FCM] Notification received in foreground:', notification.request.content.title);
      }
    );

    notificationResponseRef.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as Record<string, any>;
        const navTarget = getNavTargetFromNotification(data);

        if (navTarget && navigationRef.current) {
          setTimeout(() => {
            navigationRef.current?.navigate(navTarget.screen, navTarget.params);
          }, 500);
        }
      }
    );

    return () => {
      notificationListener.current?.remove();
      notificationResponseRef.current?.remove();
    };
  }, []);

  // ─── Splash Screen while bootstrapping ───────────────────────────────────────
  if (isBootstrapping) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FF6B00', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: 48, marginBottom: 16 }}>🛺</Text>
        <Text style={{ fontSize: 28, fontWeight: '900', color: '#fff', letterSpacing: 2 }}>SARTHI</Text>
        <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 8 }}>Loading...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Login" component={LoginScreen as any} />
        {/* ── Sign-Up Wizard (6 Steps) ── */}
        <Stack.Screen name="RoleSelection" component={RoleSelectionScreen as any} />
        <Stack.Screen name="Signup" component={SignupScreen as any} />
        <Stack.Screen name="OTPVerify" component={OTPScreen as any} />
        <Stack.Screen name="OTP" component={OTPScreen as any} />
        <Stack.Screen name="VerifySignup" component={OTPScreen as any} />
        <Stack.Screen name="DynamicProfileScreen" component={DynamicProfileScreen as any} />
        <Stack.Screen name="LocationSetupScreen" component={LocationSetupScreen as any} />
        <Stack.Screen name="KYCDocumentsScreen" component={KYCDocumentsScreen as any} />
        <Stack.Screen name="ConsentAndCompletionScreen" component={ConsentAndCompletionScreen as any} />
        {/* ── Other Auth ── */}
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen as any} />
        <Stack.Screen name="ResetPassword" component={ResetPasswordScreen as any} />
        <Stack.Screen name="RoleSelector" component={RoleSelectorScreen as any} />
        <Stack.Screen name="ProviderSetup" component={ProviderSetupScreen as any} />
        <Stack.Screen name="CustomerApp" component={CustomerTabs} />
        <Stack.Screen name="MainApp" component={CustomerTabs} />
        <Stack.Screen name="ProviderList" component={ProviderListScreen as any} />
        <Stack.Screen name="ProviderDetail" component={ProviderDetailScreen as any} />
        <Stack.Screen
          name="Call"
          component={CallScreen as any}
          options={{ presentation: 'modal' }}
        />
        <Stack.Screen name="ProviderApp" component={ProviderTabs} />
        <Stack.Screen name="ProviderDashboard" component={ProviderDashboardScreen as any} />
        <Stack.Screen name="ProviderDashboardScreen" component={ProviderDashboardScreen as any} />
        <Stack.Screen name="AgentApp" component={AgentTabs} />
        {/* Agent standalone screens (navigable from Dashboard quick actions) */}
        <Stack.Screen name="AgentNetworkScreen" component={AgentNetworkScreen as any} />
        <Stack.Screen name="AgentEarningsScreen" component={AgentEarningsScreen as any} />
        <Stack.Screen name="AgentAddLaborScreen" component={AgentAddLaborScreen as any} />
        {/* Wallet Screen */}
        <Stack.Screen name="WalletScreen" component={WalletScreen as any} />

        <Stack.Screen name="EditProfile" component={EditProfileScreen as any} />
        {/* Notification History */}
        <Stack.Screen name="Notifications" component={NotificationsScreen as any} />
        {/* Contractor Module */}
        <Stack.Screen name="ContractorKyc" component={ContractorKycScreen as any} />
        <Stack.Screen name="ContractorDeal" component={ContractorDealScreen as any} />
        <Stack.Screen name="ContractorBooking" component={ContractorBookingScreen as any} />
        {/* ठेकेदार बुकिंग एवं डिजिटल ठेका प्रस्ताव (Contract Proposal Engine) */}
        <Stack.Screen name="ContractProposalCreate" component={ContractProposalCreateScreen as any} />
        <Stack.Screen name="MyContractProposals" component={MyContractProposalsScreen as any} />
        <Stack.Screen name="ContractorProposalInbox" component={ContractorProposalInboxScreen as any} />
        <Stack.Screen name="ContractProposalDetail" component={ContractProposalDetailScreen as any} />
        {/* Screen 3 deep-link alias — same screen, comparison table V1 ↔ VN */}
        <Stack.Screen name="ContractVersionCompare" component={ContractProposalDetailScreen as any} />
        {/* Notification alias (broadcast par thekedar ko bheja jata hai) */}
        <Stack.Screen name="ContractorProposalDetail" component={ContractProposalDetailScreen as any} />
        <Stack.Screen name="DigitalContract" component={DigitalContractScreen as any} />
        {/* Transport / Parivahan Seva Module */}
        <Stack.Screen name="VehicleOwnerSetup" component={VehicleOwnerSetupScreen as any} />
        <Stack.Screen name="VehicleDriverDash" component={VehicleDriverDashScreen as any} />
        <Stack.Screen name="TransportBooking" component={TransportBookingScreen as any} />
        <Stack.Screen name="CustomerBookings" component={CustomerBookingsScreen as any} />
        {/* Labour (Mazdoor) Module */}
        <Stack.Screen name="LabourRequest" component={LabourRequestScreen as any} />
        <Stack.Screen name="LabourRequestStatus" component={LabourRequestStatusScreen as any} />
        <Stack.Screen name="LabourProviderRequest" component={LabourProviderRequestScreen as any} />

        {/* Driver Module */}
        <Stack.Screen name="DriverBooking" component={DriverBookingScreen as any} />
        <Stack.Screen name="DriverRequestStatus" component={DriverRequestStatusScreen as any} />
        <Stack.Screen name="DriverProviderRequest" component={DriverProviderRequestScreen as any} />
        
        {/* Karigar Module */}
        <Stack.Screen name="KarigarBooking" component={KarigarBookingScreen as any} />
        <Stack.Screen name="KarigarLiveStatus" component={KarigarLiveStatusScreen as any} />
        <Stack.Screen name="KarigarRequestStatus" component={KarigarRequestStatusScreen as any} />
        <Stack.Screen name="KarigarProviderRequest" component={KarigarProviderRequestScreen as any} />
        
        <Stack.Screen name="NegotiationChat" component={NegotiationChatScreen as any} />
        <Stack.Screen name="NegotiationChatScreen" component={NegotiationChatScreen as any} />
        <Stack.Screen name="SOSTicket" component={SOSTicketScreen as any} />
        <Stack.Screen name="SOSTicketScreen" component={SOSTicketScreen as any} />
        <Stack.Screen name="TermsAndRefund" component={TermsAndRefundScreen as any} />
        <Stack.Screen name="TermsAndConditions" component={TermsAndRefundScreen as any} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}



import RazorpayInAppModal from './components/RazorpayInAppModal';
import { PaperProvider, MD3LightTheme } from 'react-native-paper';

function AppWithProviders() {
  return (
    <LanguageProvider>
      <RootNavigator />
      <RazorpayInAppModal />
    </LanguageProvider>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ReduxProvider store={store}>
        <PaperProvider theme={MD3LightTheme}>
          <AppWithProviders />
        </PaperProvider>
      </ReduxProvider>
    </SafeAreaProvider>
  );
}
