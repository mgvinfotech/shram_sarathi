import React, { useState, useEffect, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View, ScrollView, StyleSheet, Alert, RefreshControl, TouchableOpacity,
} from 'react-native';
import { Text, Button, Surface, Divider, ActivityIndicator } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/api';
import { useLanguage } from '../../i18n/LanguageContext';

interface JobStatus {
  job_id: number;
  status: string;
  driver_type: string;
  vehicle_type?: string;
  description?: string;
  address: string;
  driver_count: number;
  booked_spots: number;
  providers?: { id: number; name: string; phone: string; agreed_wage?: number; }[];
  negotiations?: { provider_id: number; provider_name: string; last_offer: number; last_sender: string; }[];
  provider_name?: string;
  provider_phone?: string;
  provider_photo?: string;
  accepted_at?: string;
  created_at: string;
}

interface Props { route: any; navigation: any; }

export default function DriverRequestStatusScreen({ route, navigation }: Props) {
  const { lang, t } = useLanguage();
  const jobId: number = route?.params?.job_id;

  const [job, setJob] = useState<JobStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const fetchStatus = useCallback(async () => {
    if (!jobId) return;
    try {
      const res = await api.get(`/api/driver/status/${jobId}`);
      setJob(res.data);
    } catch (err) {
      // silent on poll errors
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

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
              await api.post('/api/driver/cancel', { job_id: jobId });
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
        case 'searching':   return '🔍 Driverer dhundha ja raha hai...';
        case 'accepted':    return '✅ Driverer Mil Gaya!';
        case 'cancelled':   return '❌ Request Cancel Ho Gayi';
        case 'no_provider': return '😔 Koi Driverer Nahi Mila';
        default:            return status;
      }
    }
    switch (status) {
      case 'pending':
      case 'searching':   return '🔍 Searching for driverer...';
      case 'accepted':    return '✅ Driverer Found!';
      case 'cancelled':   return '❌ Request Cancelled';
      case 'no_provider': return '😔 No Driverer Available';
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
            {lang === 'hi' ? '👷 Kaam Request Status' : '👷 Job Request Status'}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(job.status) }]}>
            <Text style={styles.statusText}>{getStatusLabel(job.status)}</Text>
          </View>
        </Surface>

        {/* Pending — animated waiting indicator */}
        {(job.status === 'pending' || job.status === 'searching') && (
          <Surface style={styles.pendingCard}>
            <ActivityIndicator size="large" color="#FF8C00" />
            <Text style={styles.pendingTitle}>
              {lang === 'hi' ? '30 सेकंड तक ड्राइवरों की खोज जारी है...' : 'Finding a driver near you...'}
            </Text>
            <Text style={styles.pendingSubtitle}>
              {lang === 'hi'
                ? 'कृपया इंतजार करें। 30 सेकंड में जवाब न मिलने पर खोज स्वतः बंद हो जाएगी।'
                : 'Please wait. Search auto-closes after 30 seconds if unanswered.'}
            </Text>
          </Surface>
        )}

        {job.status === 'no_provider' && (
          <Surface style={[styles.pendingCard, { backgroundColor: '#FFEBEE', borderColor: '#FFCDD2', borderWidth: 1 }]}>
            <Ionicons name="alert-circle" size={44} color="#D32F2F" />
            <Text style={[styles.pendingTitle, { color: '#D32F2F' }]}>
              {lang === 'hi' ? '😔 इस समय कोई ड्राइवर उपलब्ध नहीं मिला' : '😔 No Driver Available Right Now'}
            </Text>
            <Text style={[styles.pendingSubtitle, { color: '#666' }]}>
              {lang === 'hi'
                ? '30 सेकंड में किसी ड्राइवर ने स्वीकार नहीं किया। कृपया थोड़ी देर बाद दोबारा कोशिश करें।'
                : 'No driver accepted within 30 seconds. Please try again after some time.'}
            </Text>
          </Surface>
        )}

        {/* Negotiation Offers Card */}
        {job.negotiations && job.negotiations.length > 0 && (
          <Surface style={{ borderRadius: 16, padding: 16, marginBottom: 14, backgroundColor: '#FFF3E0', borderColor: '#FFE0B2', borderWidth: 1, elevation: 3 }}>
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#E65100' }}>
              💬 {lang === 'hi' ? 'ड्राइवर का नया रेट ऑफर आया है!' : 'New Driver Wage Offer!'}
            </Text>
            <Text style={{ fontSize: 12, color: '#666', marginTop: 2, marginBottom: 10 }}>
              {lang === 'hi' ? 'ड्राइवर ने नया दाम भेजा है। बात करने या स्वीकार करने के लिए नीचे क्लिक करें:' : 'The driver sent a new wage offer. Tap below to chat or accept:'}
            </Text>
            {job.negotiations.map((n) => (
              <View key={n.provider_id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, backgroundColor: '#fff', borderRadius: 10, marginVertical: 4, borderWidth: 1, borderColor: '#FFE0B2' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: 'bold', fontSize: 15, color: '#333' }}>{n.provider_name}</Text>
                  <Text style={{ fontSize: 14, color: '#E65100', fontWeight: '800', marginTop: 2 }}>
                    {lang === 'hi' ? 'नया रेट:' : 'Offer:'} ₹{n.last_offer ?? '—'}
                  </Text>
                </View>
                <Button
                  mode="contained"
                  buttonColor="#E65100"
                  textColor="#fff"
                  compact
                  onPress={() => navigation.navigate('NegotiationChatScreen', { job_id: job.job_id, provider_id: n.provider_id, module: 'driver' })}
                >
                  {lang === 'hi' ? 'चैट / स्वीकार करें' : 'Chat & Accept'}
                </Button>
              </View>
            ))}
          </Surface>
        )}

        {/* Live Tracking Progress Bar */}
        <Surface style={styles.detailCard}>
           <Text style={styles.sectionTitle}>
             {(job.status === 'pending' || job.status === 'searching')
               ? '📢 ' + (lang === 'hi' ? 'ड्राइवरों की खोज जारी है...' : 'Searching for Drivers...')
               : (lang === 'hi' ? 'लाइव स्टेटस (Live Status)' : 'Live Status')}
           </Text>
           {job.vehicle_type ? (
             <Text style={{ marginTop: 4, fontSize: 12, color: '#555' }}>
               {lang === 'hi' ? 'आपकी मांग:' : 'Demand:'} {job.driver_count ?? 1} ड्राइवर ({job.vehicle_type})
             </Text>
           ) : null}
           <Text style={{ marginTop: 8, fontWeight: '700', fontSize: 14, color: '#1B5E20' }}>
             📊 {lang === 'hi' ? 'प्रोग्रेस:' : 'Progress:'} {job.booked_spots ?? 0} / {job.driver_count ?? 1} Drivers Accepted
           </Text>
           <View style={{ height: 10, backgroundColor: '#ddd', borderRadius: 5, marginTop: 8, overflow: 'hidden' }}>
             <View style={{ height: 10, backgroundColor: '#2E7D32', borderRadius: 5, width: `${Math.min(100, ((job.booked_spots ?? 0) / (job.driver_count ?? 1)) * 100)}%` }} />
           </View>
        </Surface>

        {/* List of Accepted Driverers */}
        {job.providers && job.providers.length > 0 ? (
          <Surface style={styles.acceptedCard}>
            <Text style={styles.sectionTitle}>
              {lang === 'hi' ? '✅ बुक किए गए मज़दूर' : '✅ Booked Driverers'}
            </Text>
            <Divider style={{ marginVertical: 8 }} />
            {job.providers.map(p => (
              <View key={p.id} style={{ flexDirection: 'row', justifyContent: 'space-between', marginVertical: 6, padding: 10, backgroundColor: '#f0fff4', borderRadius: 10, borderWidth: 1, borderColor: '#C8E6C9' }}>
                 <View style={{ flex: 1, justifyContent: 'center' }}>
                   <Text style={{ fontWeight: 'bold', fontSize: 15, color: '#1B5E20' }}>✅ {p.name}</Text>
                   {p.agreed_wage ? (
                     <Text style={{ fontSize: 12, color: '#2E7D32', fontWeight: '700', marginTop: 2 }}>₹{p.agreed_wage} {lang === 'hi' ? 'पर सहमत' : 'agreed'}</Text>
                   ) : null}
                 </View>
                 <TouchableOpacity
                   style={{ backgroundColor: '#2E7D32', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, justifyContent: 'center', flexDirection: 'row', alignItems: 'center', gap: 4 }}
                   onPress={() => Alert.alert('📞', `${lang === 'hi' ? 'Call kar rahe hain' : 'Calling'}: ${p.phone}`)}
                 >
                    <Text style={{ fontSize: 16 }}>📞</Text>
                    <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 13 }}>{lang === 'hi' ? 'कॉल करें' : 'Call'}</Text>
                 </TouchableOpacity>
              </View>
            ))}
            {/* Pending spots waiting */}
            {Array.from({ length: Math.max(0, (job.driver_count ?? 1) - (job.providers?.length ?? 0)) }).map((_, i) => (
              <View key={`pending_${i}`} style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 6, padding: 10, backgroundColor: '#FFF8E1', borderRadius: 10, borderWidth: 1, borderColor: '#FFE082', gap: 8 }}>
                <Text style={{ fontSize: 14 }}>⏳</Text>
                <Text style={{ color: '#F57F17', fontWeight: '600', fontSize: 13 }}>इंतजार किया जा रहा है...</Text>
              </View>
            ))}
          </Surface>
        ) : (
          job.status === 'accepted' && (
            <Surface style={styles.acceptedCard}>
              <Text style={styles.sectionTitle}>
                {lang === 'hi' ? '✅ Driverer Ki Jaankari' : '✅ Driverer Details'}
              </Text>
              <Divider style={{ marginVertical: 8 }} />
              <Text style={styles.infoLabel}>{lang === 'hi' ? 'Naam:' : 'Name:'}</Text>
              <Text style={styles.infoValue}>{job.provider_name ?? '—'}</Text>
              {job.provider_phone && (
                <>
                  <Text style={styles.infoLabel}>{lang === 'hi' ? 'Phone:' : 'Phone:'}</Text>
                  <Text style={styles.infoValue}>{job.provider_phone}</Text>
                </>
              )}
            </Surface>
          )
        )}

        {/* Job Details */}
        <Surface style={styles.detailCard}>
          <Text style={styles.sectionTitle}>
            {lang === 'hi' ? '📋 Kaam Ki Jaankari' : '📋 Job Details'}
          </Text>
          <Divider style={{ marginVertical: 8 }} />
          <Text style={styles.infoLabel}>{lang === 'hi' ? 'Kaam Ka Type:' : 'Driver Type:'}</Text>
          <Text style={styles.infoValue}>{job.driver_type}</Text>
          {job.description && (
            <>
              <Text style={styles.infoLabel}>{lang === 'hi' ? 'Description:' : 'Description:'}</Text>
              <Text style={styles.infoValue}>{job.description}</Text>
            </>
          )}
          <Text style={styles.infoLabel}>{lang === 'hi' ? 'Pata:' : 'Address:'}</Text>
          <Text style={styles.infoValue}>{job.address}</Text>
        </Surface>

        {/* Action Buttons */}
        <View style={styles.buttonRow}>
          {(job.status === 'pending' || job.status === 'searching') && (
            <Button
              mode="outlined"
              buttonColor="#fff"
              textColor="#C62828"
              style={styles.cancelBtn}
              loading={cancelling}
              onPress={handleCancel}
            >
              {lang === 'hi' ? ((job.booked_spots ?? 0) > 0 ? 'बाकी बचे स्पॉट कैंसिल करें' : 'Request Cancel Karein') : ((job.booked_spots ?? 0) > 0 ? 'Cancel Remaining Spots' : 'Cancel Request')}
            </Button>
          )}

          {(job.status === 'cancelled' || job.status === 'no_provider' || job.status === 'accepted') && (
            <Button
              mode="contained"
              buttonColor="#2E7D32"
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
