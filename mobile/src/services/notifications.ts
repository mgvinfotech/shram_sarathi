import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { api } from './api';

// ─── Configure how notifications are displayed when app is in foreground ───────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ─── Request permission and get FCM token ─────────────────────────────────────

export async function registerForPushNotifications(): Promise<string | null> {
  // Emulator/simulator pe notifications kaam nahi karte — real device chahiye
  if (!Device.isDevice) {
    console.log('[FCM] Push notifications only work on physical devices.');
    return null;
  }

  // Permission check
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('[FCM] Push notification permission denied.');
    return null;
  }

  // Android ke liye notification channel banana zaroori hai
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Sarthi Notifications',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF6B00',
      sound: 'default',
      enableVibrate: true,
    });

    await Notifications.setNotificationChannelAsync('rides', {
      name: 'Ride Requests',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 200, 500],
      lightColor: '#38A169',
      sound: 'default',
      enableVibrate: true,
    });
  }

  try {
    // Backend FCM API use kar raha hai (fcm.googleapis.com), isliye humein raw Device Token (FCM token) chahiye, Expo Token nahi.
    const tokenData = await Notifications.getDevicePushTokenAsync();
    const token = tokenData.data;
    console.log('[FCM] Device push token obtained:', token.substring(0, 30) + '...');
    return token;
  } catch (error) {
    console.log('[FCM] Could not get push token:', error);
    return null;
  }
}

// ─── Save token to backend ─────────────────────────────────────────────────────

export async function saveFcmTokenToBackend(token: string): Promise<void> {
  try {
    await api.put('/api/user/fcm-token', { fcm_token: token });
    console.log('[FCM] Token saved to backend successfully.');
  } catch (error: any) {
    console.log('[FCM] Failed to save token to backend:', error?.message);
  }
}

// ─── Setup: Call this once at app startup (after login) ──────────────────────

export async function setupPushNotifications(): Promise<void> {
  const token = await registerForPushNotifications();
  if (token) {
    await saveFcmTokenToBackend(token);
  }
}

// ─── Parse notification data to determine navigation target ───────────────────

export interface NotificationNavTarget {
  screen: string;
  params?: Record<string, any>;
}

export function getNavTargetFromNotification(
  data: Record<string, any>
): NotificationNavTarget | null {
  const screen = data?.screen as string;
  const bookingId = data?.booking_id ? Number(data.booking_id) : undefined;
  const jobId     = data?.job_id     ? Number(data.job_id)     : undefined;
  const proposalId = data?.proposal_id ? Number(data.proposal_id) : undefined;

  switch (screen) {
    case 'NegotiationChat':
    case 'NegotiationChatScreen':
      return { screen: 'NegotiationChatScreen', params: { job_id: jobId || bookingId, module: data?.module || 'transport' } };
    case 'TransportBooking':
      return { screen: 'TransportBooking', params: { booking_id: bookingId || jobId } };
    case 'VehicleDriverDash':
      return { screen: 'VehicleDriverDash', params: { bookingId: bookingId || jobId } };
    case 'CustomerBookings':
      return { screen: 'CustomerBookings', params: { bookingId: bookingId || jobId } };
    case 'ContractorDeal':
      return { screen: 'ContractorDeal', params: { bookingId } };
    // ─── ठेकेदार बुकिंग एवं डिजिटल ठेका प्रस्ताव (Contract Proposal Engine) ──────
    case 'ContractorProposalDetail':
      return { screen: 'ContractProposalDetail', params: { proposalId } };
    case 'ContractVersionCompare':
      return { screen: 'ContractProposalDetail', params: { proposalId } };
    case 'DigitalContract':
      return { screen: 'DigitalContract', params: { proposalId } };
    case 'ContractorProposalInbox':
      return { screen: 'ContractorProposalInbox', params: {} };
    case 'MyContractProposals':
      return { screen: 'MyContractProposals', params: {} };
    case 'ContractProposalCreate':
      return { screen: 'ContractProposalCreate', params: {} };
    // ─── Labour Module ──────────────────────────────────────────────────────
    case 'LabourProviderRequest':
      return { screen: 'LabourProviderRequest', params: { job_id: jobId } };
    case 'LabourRequestStatus':
      return { screen: 'LabourRequestStatus', params: { job_id: jobId } };
    // ─── Driver Module ──────────────────────────────────────────────────────
    case 'DriverProviderRequest':
      return { screen: 'DriverProviderRequest', params: { job_id: jobId } };
    case 'DriverRequestStatus':
      return { screen: 'DriverRequestStatus', params: { job_id: jobId } };
    // ─── Karigar Module ─────────────────────────────────────────────────────
    case 'KarigarProviderRequest':
      return { screen: 'KarigarProviderRequest', params: { job_id: jobId } };
    case 'KarigarRequestStatus':
      return { screen: 'KarigarRequestStatus', params: { job_id: jobId } };
    case 'ProviderDashboard':
      return { screen: 'ProviderApp', params: { screen: 'DashboardTab' } };
    default:
      if (jobId || bookingId) {
        return { screen: 'NegotiationChatScreen', params: { job_id: jobId || bookingId, module: data?.module || 'transport' } };
      }
      return null;
  }
}
