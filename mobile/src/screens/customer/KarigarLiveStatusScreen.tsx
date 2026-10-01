import React, { useState, useEffect, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View, ScrollView, StyleSheet, Alert, RefreshControl, TouchableOpacity,
} from 'react-native';
import { Text, Button, Surface, Divider, ActivityIndicator } from 'react-native-paper';
import { api } from '../../services/api';
import { useLanguage } from '../../i18n/LanguageContext';

interface JobStatus {
  job_id: number;
  status: string;
  labour_type: string;
  duration?: string;
  media_url?: string;
  description?: string;
  address: string;
  labour_count: number;
  booked_spots: number;
  providers?: { id: number; name: string; phone: string; }[];
  negotiations?: { provider_id: number; provider_name: string; last_offer: number | null; last_sender: string | null; }[];
  provider_name?: string;
  provider_phone?: string;
  provider_photo?: string;
  accepted_at?: string;
  created_at: string;
}

interface Props { route: any; navigation: any; }

export default function KarigarLiveStatusScreen({ route, navigation }: Props) {
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
              {lang === 'hi' ? 'Labourer dhundha ja raha hai...' : 'Finding a labourer near you...'}
            </Text>
            <Text style={styles.pendingSubtitle}>
              {lang === 'hi'
                ? 'Kripya intezaar karein. Labourer mila to aapko notification aayegi.'
                : 'Please wait. You will be notified once a labourer accepts.'}
            </Text>
          </Surface>
        )}

        {/* Live Tracking Progress Bar */}
        <Surface style={styles.detailCard}>
           <Text style={styles.sectionTitle}>
             {lang === 'hi' ? 'लाइव स्टेटस (Live Status)' : 'Live Status'}
           </Text>
           <Text style={{ marginTop: 8, fontWeight: '600' }}>
             {job.booked_spots ?? 0} / {job.labour_count ?? 1} {lang === 'hi' ? 'मज़दूर मिल गए' : 'Labourers Found'}
           </Text>
           <View style={{ height: 10, backgroundColor: '#ddd', borderRadius: 5, marginTop: 8, overflow: 'hidden' }}>
             <View style={{ height: 10, backgroundColor: '#2E7D32', borderRadius: 5, width: `${Math.min(100, ((job.booked_spots ?? 0) / (job.labour_count ?? 1)) * 100)}%` }} />
           </View>
        </Surface>

        {/* List of Accepted Labourers */}
        {job.providers && job.providers.length > 0 ? (
          <Surface style={styles.acceptedCard}>
            <Text style={styles.sectionTitle}>
              {lang === 'hi' ? '✅ बुक किए गए मज़दूर' : '✅ Booked Labourers'}
            </Text>
            <Divider style={{ marginVertical: 8 }} />
            {job.providers.map(p => (
              <View key={p.id} style={{ flexDirection: 'row', justifyContent: 'space-between', marginVertical: 8, padding: 8, backgroundColor: '#f9f9f9', borderRadius: 8, borderWidth: 1, borderColor: '#eee' }}>
                 <View style={{ justifyContent: 'center' }}>
                   <Text style={{ fontWeight: 'bold', fontSize: 16 }}>{p.name}</Text>
                   <Text style={{ color: '#555' }}>{p.phone}</Text>
                 </View>
                 <TouchableOpacity style={{ backgroundColor: '#2E7D32', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, justifyContent: 'center' }} onPress={() => Alert.alert('Calling', p.phone)}>
                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>📞 Call</Text>
                 </TouchableOpacity>
              </View>
            ))}
          </Surface>
        ) : (
          job.status === 'accepted' && (
            <Surface style={styles.acceptedCard}>
              <Text style={styles.sectionTitle}>
                {lang === 'hi' ? '✅ Labourer Ki Jaankari' : '✅ Labourer Details'}
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

        {/* List of Negotiating Labourers */}
        {job.negotiations && job.negotiations.length > 0 && (
          <Surface style={styles.acceptedCard}>
            <Text style={styles.sectionTitle}>
              {lang === 'hi' ? '💬 मोलभाव चल रहा है' : '💬 Ongoing Negotiations'}
            </Text>
            <Divider style={{ marginVertical: 8 }} />
            {job.negotiations.map(n => (
              <View key={n.provider_id} style={{ flexDirection: 'row', justifyContent: 'space-between', marginVertical: 8, padding: 8, backgroundColor: '#f9f9f9', borderRadius: 8, borderWidth: 1, borderColor: '#eee' }}>
                 <View style={{ justifyContent: 'center', flex: 1 }}>
                   <Text style={{ fontWeight: 'bold', fontSize: 16 }}>{n.provider_name}</Text>
                   <Text style={{ color: '#555', fontSize: 13 }}>
                     {n.last_offer ? `Last Offer: ₹${n.last_offer}` : 'No offer yet'}
                     {n.last_sender === 'customer' ? ' (You)' : (n.last_sender === 'provider' ? ' (Them)' : '')}
                   </Text>
                 </View>
                 <TouchableOpacity style={{ backgroundColor: '#FF8F00', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, justifyContent: 'center' }} onPress={() => navigation.navigate('NegotiationChatScreen', { job_id: job.job_id, provider_id: n.provider_id, module: 'karigar' })}>
                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>Chat</Text>
                 </TouchableOpacity>
              </View>
            ))}
          </Surface>
        )}

        {/* Job Details */}
        <Surface style={styles.detailCard}>
          <Text style={styles.sectionTitle}>
            {lang === 'hi' ? '📋 Kaam Ki Jaankari' : '📋 Job Details'}
          </Text>
          <Divider style={{ marginVertical: 8 }} />
          <Text style={styles.infoLabel}>{lang === 'hi' ? 'Kaam Ka Type:' : 'Labour Type:'}</Text>
          <Text style={styles.infoValue}>{job.labour_type}</Text>
          {job.description && (
            <>
              <Text style={styles.infoLabel}>{lang === 'hi' ? 'Description:' : 'Description:'}</Text>
              <Text style={styles.infoValue}>{job.description}</Text>
            </>
          )}
          {job.duration && (
            <>
              <Text style={styles.infoLabel}>{lang === 'hi' ? 'अवधि:' : 'Duration:'}</Text>
              <Text style={styles.infoValue}>{job.duration} {lang === 'hi' ? 'दिन' : 'Day(s)'}</Text>
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
