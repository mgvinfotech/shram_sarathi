import React, { useState, useEffect, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View, ScrollView, StyleSheet, Alert, RefreshControl, TouchableOpacity, Linking,
} from 'react-native';
import { Text, Button, Surface, Divider, ActivityIndicator } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/api';
import { useLanguage } from '../../i18n/LanguageContext';

interface JobStatus {
  job_id: number;
  status: string;
  labour_type: string;
  work_type?: string;
  wage?: number;
  description?: string;
  address: string;
  labour_count: number;
  booked_spots: number;
  providers?: { id: number; name: string; phone: string; }[];
  negotiations?: { provider_id: number; provider_name: string; last_offer: number; last_sender: string; }[];
  provider_name?: string;
  provider_phone?: string;
  provider_photo?: string;
  accepted_at?: string;
  created_at: string;
}

interface Props { route: any; navigation: any; }

export default function LabourRequestStatusScreen({ route, navigation }: Props) {
  const { lang, t } = useLanguage();
  const jobId: number = route?.params?.job_id;

  const [job, setJob] = useState<JobStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const fetchStatus = useCallback(async () => {
    if (!jobId) return;
    try {
      const res = await api.get(`/api/labour/status/${jobId}`);
      setJob(res.data);
    } catch (err) {
      // silent on poll errors
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  // Poll every 5 seconds while pending
  useEffect(() => {
    fetchStatus();
    const interval = setInterval(() => {
      if (job?.status === 'pending' || job?.status === 'searching') {
        fetchStatus();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchStatus, job?.status]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchStatus();
    setRefreshing(false);
  };

  const handleCancel = async () => {
    Alert.alert(
      lang === 'hi' ? 'Request Cancel Karein?' : 'Cancel Request?',
      lang === 'hi' ? 'Kya aap is kaam ki request cancel karna chahte hain?' : 'Are you sure you want to cancel this job request?',
      [
        { text: lang === 'hi' ? 'Nahi' : 'No', style: 'cancel' },
        {
          text: lang === 'hi' ? 'Haan, Cancel Karein' : 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            setCancelling(true);
            try {
              await api.post('/api/labour/cancel', { job_id: jobId });
              await fetchStatus();
            } catch (err: any) {
              Alert.alert('❌', err.response?.data?.detail || 'Cancel nahi hua.');
            } finally {
              setCancelling(false);
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
      case 'searching':  return '#FF8C00';
      case 'accepted':   return '#2E7D32';
      case 'cancelled':  return '#C62828';
      case 'no_provider': return '#555';
      default:           return '#555';
    }
  };

  const getStatusLabel = (status: string) => {
    if (lang === 'hi') {
      switch (status) {
        case 'pending':
        case 'searching':   return '🔍 Labourer dhundha ja raha hai...';
        case 'accepted':    return '✅ Labourer Mil Gaya!';
        case 'cancelled':   return '❌ Request Cancel Ho Gayi';
        case 'no_provider': return '😔 Koi Labourer Nahi Mila';
        default:            return status;
      }
    }
    switch (status) {
      case 'pending':
      case 'searching':   return '🔍 Searching for labourer...';
      case 'accepted':    return '✅ Labourer Found!';
      case 'cancelled':   return '❌ Request Cancelled';
      case 'no_provider': return '😔 No Labourer Available';
      default:            return status;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#2E7D32" />
          <Text style={styles.loadingText}>
            {lang === 'hi' ? 'Status check kar rahe hain...' : 'Checking status...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!job) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerBox}>
          <Text style={styles.errorText}>
            {lang === 'hi' ? 'Request nahi mili.' : 'Request not found.'}
          </Text>
          <Button onPress={() => navigation.goBack()} mode="contained" style={{ marginTop: 16 }}>
            {lang === 'hi' ? 'Wapas Jao' : 'Go Back'}
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <Surface style={styles.headerCard}>
          <Text style={styles.headerTitle}>
            {job.status === 'searching' || job.status === 'pending'
              ? (lang === 'hi' ? '👷 मज़दूरों की खोज जारी है...' : 'Finding Labourers...')
              : (lang === 'hi' ? '👷 Kaam Request Status' : '👷 Job Request Status')}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(job.status) }]}>
            <Text style={styles.statusText}>{getStatusLabel(job.status)}</Text>
          </View>
        </Surface>

        {/* Live Progress Tracker (PDF Page 9) */}
        <Surface style={[styles.detailCard, { backgroundColor: '#F8FAFC', borderColor: '#CBD5E1', borderWidth: 1 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={[styles.sectionTitle, { fontSize: 16, color: '#1E293B' }]}>
              {lang === 'hi' ? '📊 लाइव प्रोग्रेस (Live Progress)' : 'Live Progress'}
            </Text>
            <View style={{ backgroundColor: '#E2E8F0', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
              <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#334155' }}>
                {lang === 'hi' ? 'मांग:' : 'Demand:'} {job.labour_count ?? 1} {lang === 'hi' ? 'मज़दूर' : 'labours'}
              </Text>
            </View>
          </View>

          <Text style={{ marginTop: 10, fontWeight: '700', fontSize: 15, color: '#15803D' }}>
            {job.booked_spots ?? 0} Labours Accepted ({job.booked_spots ?? 0}/{job.labour_count ?? 1})
          </Text>

          {/* Progress Bar */}
          <View style={{ height: 10, backgroundColor: '#E2E8F0', borderRadius: 5, marginTop: 8, overflow: 'hidden' }}>
            <View
              style={{
                height: 10,
                backgroundColor: (job.booked_spots ?? 0) >= (job.labour_count ?? 1) ? '#16A34A' : '#F59E0B',
                borderRadius: 5,
                width: `${Math.min(100, (((job.booked_spots ?? 0) / (job.labour_count ?? 1)) * 100))}%`
              }}
            />
          </View>
        </Surface>

        {/* Accepted Labours & Waiting Slots List (PDF Page 9) */}
        <Surface style={styles.acceptedCard}>
          <Text style={styles.sectionTitle}>
            {lang === 'hi' ? '👥 स्वीकृत मजदूरों की सूची:' : '👥 Accepted Labourers List:'}
          </Text>
          <Divider style={{ marginVertical: 8 }} />

          {/* Render Booked Labours */}
          {(job.providers || []).map((p, idx) => (
            <View key={p.id || idx} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 6, padding: 10, backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#DCFCE7' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: 'bold', fontSize: 15, color: '#1E293B' }}>
                  {idx + 1}. {p.name}
                </Text>
                <Text style={{ fontSize: 12, color: '#16A34A', fontWeight: '600', marginTop: 2 }}>
                  ₹{job.wage ?? 600} पर सहमत
                </Text>
              </View>
              {p.phone ? (
                <TouchableOpacity
                  style={{ backgroundColor: '#16A34A', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }}
                  onPress={() => Linking.openURL(`tel:${p.phone}`)}
                >
                  <Ionicons name="call" size={14} color="#fff" />
                  <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 12 }}>कॉल करें</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ))}

          {/* Render Waiting Spots */}
          {(() => {
            const booked = job.booked_spots ?? (job.providers?.length || 0);
            const total = job.labour_count ?? 1;
            const remaining = Math.max(0, total - booked);
            if (remaining === 0 || job.status === 'accepted' || job.status === 'cancelled') return null;

            return Array.from({ length: remaining }).map((_, i) => {
              const spotIndex = booked + i + 1;
              return (
                <View key={`waiting_${i}`} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 6, padding: 12, backgroundColor: '#FFFBEB', borderRadius: 10, borderWidth: 1, borderColor: '#FEF3C7' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <ActivityIndicator size={14} color="#D97706" />
                    <Text style={{ fontSize: 14, color: '#B45309', fontWeight: '600' }}>
                      {spotIndex}. इंतज़ार किया जा रहा है... (Spot #{spotIndex})
                    </Text>
                  </View>
                  <Text style={{ fontSize: 11, color: '#92400E', fontWeight: 'bold' }}>खोज जारी...</Text>
                </View>
              );
            });
          })()}
        </Surface>

        {/* Negotiation Offers Card (यदि कोई मज़दूर क्रॉस-ऑफ़र भेजता है) */}
        {job.negotiations && job.negotiations.length > 0 && (
          <Surface style={{ borderRadius: 16, padding: 16, marginBottom: 14, backgroundColor: '#FFF7ED', borderColor: '#FFEDD5', borderWidth: 1.5, elevation: 3 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <Ionicons name="chatbubbles" size={20} color="#EA580C" />
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#C2410C' }}>
                {lang === 'hi' ? 'मज़दूरों का नया रेट / क्रॉस-ऑफ़र!' : 'Labourer Cross-Offer Received!'}
              </Text>
            </View>
            <Text style={{ fontSize: 12, color: '#7C2D12', marginBottom: 10, lineHeight: 16 }}>
              {lang === 'hi'
                ? 'मज़दूर ने अलग दिहाड़ी प्रस्तावित की है। चैट करने या सहमत होने के लिए नीचे क्लिक करें:'
                : 'A worker proposed a different wage. Tap below to chat and negotiate:'}
            </Text>
            {job.negotiations.map((n) => (
              <View key={n.provider_id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, backgroundColor: '#fff', borderRadius: 10, marginVertical: 4, borderWidth: 1, borderColor: '#FED7AA' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: 'bold', fontSize: 15, color: '#1E293B' }}>{n.provider_name}</Text>
                  <Text style={{ fontSize: 14, color: '#EA580C', fontWeight: '800', marginTop: 2 }}>
                    {lang === 'hi' ? 'नया रेट:' : 'Offer:'} ₹{n.last_offer ?? '—'}
                  </Text>
                </View>
                <Button
                  mode="contained"
                  buttonColor="#EA580C"
                  textColor="#fff"
                  compact
                  onPress={() => navigation.navigate('NegotiationChatScreen', { job_id: job.job_id, provider_id: n.provider_id, module: 'labour' })}
                >
                  {lang === 'hi' ? 'चैट / स्वीकार करें' : 'Chat & Accept'}
                </Button>
              </View>
            ))}
          </Surface>
        )}

        {/* Pending Search Note */}
        {(job.status === 'pending' || job.status === 'searching') && (
          <Surface style={styles.pendingCard}>
            <ActivityIndicator size="large" color="#F59E0B" />
            <Text style={styles.pendingTitle}>
              {lang === 'hi' ? 'आस-पास के मजदूरों की खोज जारी है...' : 'Finding workers near you...'}
            </Text>
            <Text style={styles.pendingSubtitle}>
              {lang === 'hi'
                ? 'जैसे ही कोई मजदूर स्वीकार करेगा, आपको यहाँ तुरंत सूचना मिल जाएगी।'
                : 'You will be notified here as soon as workers accept.'}
            </Text>
          </Surface>
        )}

        {job.status === 'no_provider' && (
          <Surface style={[styles.pendingCard, { backgroundColor: '#FFEBEE', borderColor: '#FFCDD2', borderWidth: 1 }]}>
            <Text style={{ fontSize: 44 }}>😔</Text>
            <Text style={[styles.pendingTitle, { color: '#D32F2F' }]}>
              {lang === 'hi' ? 'इस समय कोई मजदूर उपलब्ध नहीं मिला' : 'No Labourer Available Right Now'}
            </Text>
            <Text style={[styles.pendingSubtitle, { color: '#666' }]}>
              {lang === 'hi'
                ? 'कृपया थोड़ी देर बाद दोबारा कोशिश करें।'
                : 'Please try again after some time.'}
            </Text>
          </Surface>
        )}

        {/* Job Details Card */}
        <Surface style={styles.detailCard}>
          <Text style={styles.sectionTitle}>
            {lang === 'hi' ? '📋 काम की जानकारी (Job Details)' : '📋 Job Details'}
          </Text>
          <Divider style={{ marginVertical: 8 }} />
          <Text style={styles.infoLabel}>{lang === 'hi' ? 'मज़दूर का प्रकार:' : 'Labour Type:'}</Text>
          <Text style={styles.infoValue}>{job.labour_type}</Text>
          {job.work_type && (
            <>
              <Text style={styles.infoLabel}>{lang === 'hi' ? 'कार्य विवरण:' : 'Work Description:'}</Text>
              <Text style={styles.infoValue}>{job.work_type}</Text>
            </>
          )}
          <Text style={styles.infoLabel}>{lang === 'hi' ? 'स्थान (Address):' : 'Address:'}</Text>
          <Text style={styles.infoValue}>{job.address}</Text>
        </Surface>

        {/* ── Action Buttons & Partial Cancellation (Directive #7 - PDF Page 9) ── */}
        <View style={styles.buttonRow}>
          {/* Partial Cancellation Option */}
          {(job.status === 'pending' || job.status === 'searching') && (job.booked_spots ?? 0) > 0 && (
            <TouchableOpacity
              style={{
                backgroundColor: '#1E293B',
                paddingVertical: 14,
                paddingHorizontal: 16,
                borderRadius: 12,
                alignItems: 'center',
                justifyContent: 'center',
                marginVertical: 6,
              }}
              onPress={handleCancel}
              disabled={cancelling}
            >
              {cancelling ? (
                <ActivityIndicator color="#fff" size={20} />
              ) : (
                <>
                  <Text style={{ color: '#F8FAFC', fontWeight: 'bold', fontSize: 14, textAlign: 'center' }}>
                    {lang === 'hi'
                      ? `🛑 बाकी बचे ${Math.max(0, (job.labour_count ?? 1) - (job.booked_spots ?? 0))} स्पॉट कैंसिल करें और ${job.booked_spots} मज़दूरों के साथ काम शुरू करें`
                      : `🛑 Cancel remaining spots and start with ${job.booked_spots} booked labours`}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* Full Cancel Option when 0 spots booked */}
          {(job.status === 'pending' || job.status === 'searching') && (job.booked_spots ?? 0) === 0 && (
            <Button
              mode="outlined"
              buttonColor="#fff"
              textColor="#C62828"
              style={styles.cancelBtn}
              loading={cancelling}
              onPress={handleCancel}
            >
              {lang === 'hi' ? '✕ पूरी रिक्वेस्ट कैंसिल करें' : '✕ Cancel Request'}
            </Button>
          )}

          {(job.status === 'cancelled' || job.status === 'no_provider' || job.status === 'accepted') && (
            <Button
              mode="contained"
              buttonColor="#16A34A"
              style={styles.backBtn}
              onPress={() => navigation.goBack()}
            >
              {lang === 'hi' ? 'Wapas Jao' : 'Go Back'}
            </Button>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  scroll:    { padding: 16, paddingBottom: 40 },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  loadingText: { marginTop: 16, color: '#555', fontSize: 14 },
  errorText:   { color: '#C62828', fontSize: 16, textAlign: 'center' },

  headerCard: {
    borderRadius: 16, padding: 20, marginBottom: 14,
    elevation: 3, alignItems: 'center', backgroundColor: '#fff',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A', marginBottom: 10 },
  statusBadge: { borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6 },
  statusText:  { color: '#fff', fontWeight: '700', fontSize: 13 },

  pendingCard: {
    borderRadius: 16, padding: 24, marginBottom: 14, elevation: 2,
    backgroundColor: '#FFF8F0', alignItems: 'center',
  },
  pendingTitle:    { fontSize: 16, fontWeight: '700', color: '#E65100', marginTop: 12, textAlign: 'center' },
  pendingSubtitle: { fontSize: 13, color: '#555', marginTop: 6, textAlign: 'center', lineHeight: 20 },

  acceptedCard: {
    borderRadius: 16, padding: 16, marginBottom: 14, elevation: 2,
    backgroundColor: '#F0FFF4',
  },
  detailCard: {
    borderRadius: 16, padding: 16, marginBottom: 14, elevation: 2, backgroundColor: '#fff',
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  infoLabel:    { fontSize: 12, color: '#888', marginTop: 8 },
  infoValue:    { fontSize: 15, color: '#1A1A1A', fontWeight: '500' },

  buttonRow: { gap: 10, marginTop: 4 },
  cancelBtn: { borderColor: '#C62828', borderRadius: 10 },
  backBtn:   { borderRadius: 10 },
});
