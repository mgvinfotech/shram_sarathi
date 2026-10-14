import React, { useState, useEffect, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  RefreshControl,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { Text, Surface, ActivityIndicator } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { api, getErrorMessage } from '../../services/api';
import { useLanguage } from '../../i18n/LanguageContext';

// ─── Theme Colors (As Per PDF) ────────────────────────────────────────────────
const G = {
  primary: '#2E7D32',
  primaryLight: '#E8F5E9',
  primaryDark: '#1B5E20',
  accent: '#FF8F00',
  bg: '#F5F5F5',
  white: '#FFFFFF',
  text: '#1A1A1A',
  sub: '#666666',
  border: '#E0E0E0',
};

interface Provider {
  id: number;
  name: string;
  phone: string;
  agreed_wage?: number;
}

interface Negotiation {
  provider_id: number;
  provider_name: string;
  last_offer: number | null;
  last_sender: string | null;
}

interface JobStatus {
  job_id: number;
  status: string;
  karigar_type: string;
  work_type?: string;
  description?: string;
  job_mode: string;
  wage?: number;
  time_shift?: string;
  duration?: string;
  media_url?: string;
  start_date?: string;
  start_time?: string;
  address: string;
  karigar_count: number;
  booked_spots: number;
  providers: Provider[];
  negotiations: Negotiation[];
  provider_name?: string;
  provider_phone?: string;
  accepted_at?: string;
  created_at?: string;
}

interface Props {
  route: any;
  navigation: any;
}

export default function KarigarRequestStatusScreen({ route, navigation }: Props) {
  const { lang } = useLanguage();
  const job_id = route?.params?.job_id;
  const hi = lang === 'hi';

  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const fetchStatus = useCallback(async () => {
    if (!job_id) {
      setLoading(false);
      return;
    }
    try {
      const res = await api.get(`/api/karigar/status/${job_id}`);
      setJobStatus(res.data);
    } catch (err) {
      console.error('[KarigarStatus] Error fetching status:', err);
      const msg = getErrorMessage(err);
      Alert.alert('❌', msg);
    } finally {
      setLoading(false);
    }
  }, [job_id]);

  useEffect(() => {
    if (!job_id) return;
    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, [fetchStatus, job_id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchStatus();
    setRefreshing(false);
  };

  const handleCancel = () => {
    Alert.alert(
      hi ? '⚠️ रिक्वेस्ट रद्द करें?' : '⚠️ Cancel Request?',
      hi
        ? 'क्या आप सच में यह रिक्वेस्ट रद्द करना चाहते हैं?'
        : 'Are you sure you want to cancel this request?',
      [
        { text: hi ? 'नहीं' : 'No', style: 'cancel' },
        {
          text: hi ? 'हाँ, रद्द करें' : 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            setCancelling(true);
            try {
              await api.post('/api/karigar/cancel', { job_id });
              Alert.alert('✅', hi ? 'Request cancel हो गई।' : 'Request cancelled successfully.');
              navigation.goBack();
            } catch (err: any) {
              Alert.alert('❌', getErrorMessage(err));
            } finally {
              setCancelling(false);
            }
          },
        },
      ]
    );
  };

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const handleAcceptOffer = async (providerId: number) => {
    Alert.alert(
      hi ? '✅ Offer स्वीकार करें?' : '✅ Accept Offer?',
      hi
        ? 'क्या आप इस provider का offer स्वीकार करना चाहते हैं?'
        : 'Do you want to accept this provider\'s offer?',
      [
        { text: hi ? 'नहीं' : 'No', style: 'cancel' },
        {
          text: hi ? 'हाँ, स्वीकार करें' : 'Yes, Accept',
          onPress: async () => {
            try {
              await api.post('/api/karigar/customer/accept', { job_id, provider_id: providerId });
              Alert.alert('✅', hi ? 'Offer accept हो गया!' : 'Offer accepted!');
              await fetchStatus();
            } catch (err: any) {
              Alert.alert('❌', getErrorMessage(err));
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={G.primary} />
          <Text style={{ marginTop: 12, color: G.sub }}>
            {hi ? 'स्थिति लोड हो रही है...' : 'Loading status...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!jobStatus) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerBox}>
          <Ionicons name="alert-circle-outline" size={48} color="#DC2626" />
          <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#333', marginTop: 12 }}>
            {hi ? 'Request नहीं मिली' : 'Request Not Found'}
          </Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>{hi ? 'वापस जाएं' : 'Go Back'}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const statusInfo = {
    searching: {
      icon: '🔍',
      title: hi ? 'खोज रहे हैं...' : 'Searching...',
      color: '#2196F3',
      desc: hi
        ? 'आपकी request पास के कारीगरों को भेजी जा रही है।'
        : 'Your request is being sent to nearby karigars.',
    },
    pending: {
      icon: '⏳',
      title: hi ? 'प्रतीक्षा में...' : 'Pending...',
      color: '#FF9800',
      desc: hi
        ? 'कारीगरों के जवाब का इंतजार है।'
        : 'Waiting for karigars to respond.',
    },
    negotiating: {
      icon: '💬',
      title: hi ? 'बातचीत हो रही है' : 'Negotiating',
      color: '#9C27B0',
      desc: hi
        ? 'कारीगर आपके साथ rate पर बातचीत कर रहे हैं।'
        : 'Karigars are negotiating rates with you.',
    },
    accepted: {
      icon: '✅',
      title: hi ? 'कारीगर मिल गए!' : 'Karigars Found!',
      color: '#4CAF50',
      desc: hi
        ? 'कारीगर आपकी request स्वीकार कर चुके हैं।'
        : 'Karigars have accepted your request.',
    },
    rejected: {
      icon: '❌',
      title: hi ? 'अस्वीकार किया गया' : 'Rejected',
      color: '#F44336',
      desc: hi
        ? 'कारीगरों ने आपकी request अस्वीकार कर दी।'
        : 'Karigars rejected your request.',
    },
    cancelled: {
      icon: '🚫',
      title: hi ? 'रद्द कर दिया गया' : 'Cancelled',
      color: '#607D8B',
      desc: hi ? 'आपने यह request रद्द कर दी है।' : 'You have cancelled this request.',
    },
    completed: {
      icon: '🎉',
      title: hi ? 'पूर्ण हो गया' : 'Completed',
      color: '#4CAF50',
      desc: hi ? 'काम पूरा हो चुका है।' : 'Work has been completed.',
    },
    no_provider: {
      icon: '😞',
      title: hi ? 'कोई नहीं मिला' : 'No Provider Found',
      color: '#9E9E9E',
      desc: hi
        ? 'इस समय कोई कारीगर उपलब्ध नहीं है। कृपया बाद में try करें।'
        : 'No karigars available at the moment. Please try again later.',
    },
  };

  const currentStatus = statusInfo[jobStatus.status as keyof typeof statusInfo] || statusInfo.searching;
  const bookedSpots = jobStatus.booked_spots ?? 0;
  const totalSpots = jobStatus.karigar_count ?? 1;
  const leftSpots = Math.max(0, totalSpots - bookedSpots);

  return (
    <SafeAreaView style={styles.container}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
          <Ionicons name="arrow-back" size={24} color={G.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.headerTitle}>
            {hi ? 'रिक्वेस्ट का स्टेटस' : 'Request Status'}
          </Text>
          <Text style={styles.headerSub}>
            {hi ? `(बुकिंग #${jobStatus.job_id})` : `(Booking #${jobStatus.job_id})`}
          </Text>
        </View>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* ── Status Card ── */}
        <Surface style={[styles.statusCard, { borderColor: currentStatus.color }]}>
          <View style={[styles.statusIconCircle, { backgroundColor: currentStatus.color }]}>
            <Text style={styles.statusIcon}>{currentStatus.icon}</Text>
          </View>
          <Text style={[styles.statusTitle, { color: currentStatus.color }]}>
            {currentStatus.title}
          </Text>
          <Text style={styles.statusDesc}>{currentStatus.desc}</Text>
        </Surface>

        {/* ── Live Spot Tracker (Multi-Karigar) ── */}
        {totalSpots > 1 && (
          <Surface style={styles.spotTrackerCard}>
            <View style={styles.spotTrackerHeader}>
              <Ionicons name="people" size={20} color={G.primary} style={{ marginRight: 8 }} />
              <Text style={styles.spotTrackerTitle}>
                {hi ? 'Live Spot Tracker' : 'Live Spot Tracker'}
              </Text>
            </View>
            <Text style={styles.spotTrackerDesc}>
              {hi
                ? `कुल ${totalSpots} कारीगरों की ज़रूरत है (${leftSpots} जगह बाकी है)`
                : `Total ${totalSpots} karigars needed (${leftSpots} spots remaining)`}
            </Text>
            <View style={styles.progressBarTrack}>
              <View style={[styles.progressBarFill, { width: `${Math.min(100, (bookedSpots / totalSpots) * 100)}%` }]} />
            </View>
            <Text style={styles.spotRatio}>
              {bookedSpots}/{totalSpots} {hi ? 'स्वीकार किया गया' : 'Accepted'}
            </Text>
          </Surface>
        )}

        {/* ── Job Details Card ── */}
        <Surface style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>
            {hi ? '📋 काम का विवरण' : '📋 Job Details'}
          </Text>

          <View style={styles.detailRow}>
            <Ionicons name="construct-outline" size={16} color={G.sub} />
            <Text style={styles.detailLabel}>{hi ? 'कारीगर का प्रकार:' : 'Karigar Type:'}</Text>
            <Text style={styles.detailValue}>{jobStatus.karigar_type || 'N/A'}</Text>
          </View>

          {jobStatus.work_type && (
            <View style={styles.detailRow}>
              <Ionicons name="briefcase-outline" size={16} color={G.sub} />
              <Text style={styles.detailLabel}>{hi ? 'काम का प्रकार:' : 'Work Type:'}</Text>
              <Text style={styles.detailValue}>{jobStatus.work_type}</Text>
            </View>
          )}

          {jobStatus.description && (
            <View style={styles.detailRow}>
              <Ionicons name="document-text-outline" size={16} color={G.sub} />
              <Text style={styles.detailLabel}>{hi ? 'विवरण:' : 'Description:'}</Text>
              <Text style={styles.detailValue}>{jobStatus.description}</Text>
            </View>
          )}

          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={16} color={G.sub} />
            <Text style={styles.detailLabel}>{hi ? 'शुरू होने का समय:' : 'Start Time:'}</Text>
            <Text style={styles.detailValue}>
              {jobStatus.start_date || 'N/A'}, {jobStatus.start_time === 'today' ? (hi ? 'आज' : 'Today') : (hi ? 'कल' : 'Tomorrow')}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={16} color={G.sub} />
            <Text style={styles.detailLabel}>{hi ? 'अवधि:' : 'Duration:'}</Text>
            <Text style={styles.detailValue}>{jobStatus.duration || 'N/A'}</Text>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="cash-outline" size={16} color={G.sub} />
            <Text style={styles.detailLabel}>{hi ? 'मज़दूरी:' : 'Wage:'}</Text>
            <Text style={styles.detailValue}>₹{jobStatus.wage ?? 'N/A'} {hi ? 'प्रति दिन' : 'per day'}</Text>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={16} color={G.sub} />
            <Text style={styles.detailLabel}>{hi ? 'पता:' : 'Address:'}</Text>
            <Text style={styles.detailValue}>{jobStatus.address}</Text>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="people-outline" size={16} color={G.sub} />
            <Text style={styles.detailLabel}>{hi ? 'कारीगर संख्या:' : 'Karigar Count:'}</Text>
            <Text style={styles.detailValue}>{jobStatus.karigar_count}</Text>
          </View>
        </Surface>

        {/* ── Accepted Karigars List ── */}
        {jobStatus.providers && jobStatus.providers.length > 0 && (
          <Surface style={styles.providersCard}>
            <Text style={styles.sectionTitle}>
              {hi ? '✅ स्वीकार किए गए कारीगर' : '✅ Accepted Karigars'}
            </Text>
            {jobStatus.providers.map((provider, idx) => (
              <View key={idx} style={styles.providerItem}>
                <View style={styles.providerIconCircle}>
                  <Ionicons name="person" size={20} color={G.white} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.providerName}>{provider.name}</Text>
                  <Text style={styles.providerPhone}>📞 {provider.phone}</Text>
                  {provider.agreed_wage && (
                    <Text style={styles.providerWage}>
                      {hi ? 'सहमति दर:' : 'Agreed Rate:'} ₹{provider.agreed_wage}
                    </Text>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.callBtn}
                  onPress={() => handleCall(provider.phone)}
                >
                  <Ionicons name="call" size={20} color={G.white} />
                </TouchableOpacity>
              </View>
            ))}
          </Surface>
        )}

        {/* ── Active Negotiations ── */}
        {jobStatus.negotiations && jobStatus.negotiations.length > 0 && (
          <Surface style={styles.negotiationsCard}>
            <Text style={styles.sectionTitle}>
              {hi ? '💬 बातचीत चल रही है' : '💬 Active Negotiations'}
            </Text>
            {jobStatus.negotiations.map((neg, idx) => (
              <View key={idx} style={styles.negotiationItem}>
                <View style={styles.negotiationHeader}>
                  <Ionicons name="chatbubbles" size={18} color={G.accent} style={{ marginRight: 8 }} />
                  <Text style={styles.negotiationName}>{neg.provider_name}</Text>
                </View>
                {neg.last_offer && (
                  <Text style={styles.negotiationOffer}>
                    {hi ? 'प्रस्तावित दर:' : 'Offered Rate:'} ₹{neg.last_offer}
                  </Text>
                )}
                <View style={styles.negotiationActions}>
                  <TouchableOpacity
                    style={styles.chatBtn}
                    onPress={() =>
                      navigation.navigate('NegotiationChatScreen', {
                        job_id: jobStatus.job_id,
                        provider_id: neg.provider_id,
                        module: 'karigar',
                      })
                    }
                  >
                    <Ionicons name="chatbubbles-outline" size={16} color={G.white} />
                    <Text style={styles.chatBtnText}>{hi ? 'बातचीत करें' : 'Chat'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.acceptOfferBtn}
                    onPress={() => handleAcceptOffer(neg.provider_id)}
                  >
                    <Ionicons name="checkmark-circle-outline" size={16} color={G.white} />
                    <Text style={styles.acceptOfferBtnText}>{hi ? 'स्वीकार करें' : 'Accept'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </Surface>
        )}

        {/* ── Cancel Button (Only for searching/pending status) ── */}
        {(jobStatus.status === 'searching' || jobStatus.status === 'pending') && (
          <TouchableOpacity
            style={[styles.cancelBtn, cancelling && { opacity: 0.5 }]}
            onPress={handleCancel}
            disabled={cancelling}
          >
            {cancelling ? (
              <ActivityIndicator color={G.white} size={20} />
            ) : (
              <>
                <Ionicons name="close-circle" size={20} color={G.white} />
                <Text style={styles.cancelBtnText}>
                  {hi ? 'रिक्वेस्ट रद्द करें' : 'Cancel Request'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: G.bg },
  centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  scroll: { paddingBottom: 32 },

  // Header
  header: {
    backgroundColor: G.white,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: G.border,
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: G.text },
  headerSub: { fontSize: 11, color: G.sub, marginTop: 2 },

  // Status Card
  statusCard: {
    margin: 14,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    backgroundColor: G.white,
    elevation: 2,
    borderWidth: 2,
  },
  statusIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusIcon: { fontSize: 32 },
  statusTitle: { fontSize: 20, fontWeight: '800', marginBottom: 6 },
  statusDesc: { fontSize: 13, color: G.sub, textAlign: 'center', lineHeight: 18 },

  // Spot Tracker
  spotTrackerCard: {
    marginHorizontal: 14,
    marginBottom: 14,
    padding: 14,
    borderRadius: 12,
    backgroundColor: G.white,
    elevation: 1,
  },
  spotTrackerHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  spotTrackerTitle: { fontSize: 15, fontWeight: '700', color: G.text },
  spotTrackerDesc: { fontSize: 12, color: G.sub, marginBottom: 10 },
  progressBarTrack: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: { height: '100%', backgroundColor: G.primary, borderRadius: 4 },
  spotRatio: { fontSize: 13, fontWeight: '700', color: G.primary, textAlign: 'right' },

  // Details Card
  detailsCard: {
    marginHorizontal: 14,
    marginBottom: 14,
    padding: 14,
    borderRadius: 12,
    backgroundColor: G.white,
    elevation: 1,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: G.text, marginBottom: 12 },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  detailLabel: { fontSize: 13, color: G.sub, marginLeft: 8, marginRight: 8, minWidth: 120 },
  detailValue: { fontSize: 13, fontWeight: '600', color: G.text, flex: 1 },

  // Providers Card
  providersCard: {
    marginHorizontal: 14,
    marginBottom: 14,
    padding: 14,
    borderRadius: 12,
    backgroundColor: G.primaryLight,
    borderWidth: 1,
    borderColor: G.primary,
  },
  providerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: G.white,
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
  },
  providerIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: G.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  providerName: { fontSize: 15, fontWeight: '700', color: G.text },
  providerPhone: { fontSize: 12, color: G.sub, marginTop: 2 },
  providerWage: { fontSize: 12, color: G.accent, marginTop: 2, fontWeight: '600' },
  callBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: G.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Negotiations Card
  negotiationsCard: {
    marginHorizontal: 14,
    marginBottom: 14,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#FFF3E0',
    borderWidth: 1,
    borderColor: G.accent,
  },
  negotiationItem: {
    backgroundColor: G.white,
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
  },
  negotiationHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  negotiationName: { fontSize: 14, fontWeight: '700', color: G.text },
  negotiationOffer: { fontSize: 13, color: G.accent, fontWeight: '600', marginBottom: 10 },
  negotiationActions: { flexDirection: 'row', gap: 8 },
  chatBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: G.accent,
    padding: 10,
    borderRadius: 8,
    gap: 6,
  },
  chatBtnText: { color: G.white, fontSize: 13, fontWeight: '700' },
  acceptOfferBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: G.primary,
    padding: 10,
    borderRadius: 8,
    gap: 6,
  },
  acceptOfferBtnText: { color: G.white, fontSize: 13, fontWeight: '700' },

  // Cancel Button
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    marginHorizontal: 14,
    marginTop: 10,
    padding: 14,
    borderRadius: 12,
    gap: 8,
  },
  cancelBtnText: { color: G.white, fontSize: 15, fontWeight: '700' },

  // Back Button
  backBtn: {
    marginTop: 16,
    backgroundColor: G.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backBtnText: { color: G.white, fontSize: 14, fontWeight: '700' },
});
