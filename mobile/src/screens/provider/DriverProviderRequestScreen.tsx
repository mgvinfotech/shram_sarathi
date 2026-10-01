import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View, ScrollView, StyleSheet, Alert, RefreshControl, TouchableOpacity, Animated
} from 'react-native';
import { Text, Surface, ActivityIndicator } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { api } from '../../services/api';
import { useLanguage } from '../../i18n/LanguageContext';

interface PendingDriverJob {
  has_request: boolean;
  job_id?: number;
  driver_type?: string;  // Type of Driver (Commercial, Private, Heavy License)
  vehicle_type?: string;  // Vehicle Type (SUV, Dzire, Hatchback, 407 Truck)
  job_mode?: string;  // Daily or Permanent
  wage?: string | number;  // Proposed payment/rate
  description?: string;  // Trip/work details
  start_date?: string;
  start_time?: string;
  pickup_location?: string;  // Pickup/work location
  drop_location?: string;  // Drop location (if applicable)
  num_drivers?: number;  // Number of drivers needed
  booked_spots?: number;
  address?: string;
  nearest_place?: string;
  lat?: number;
  lng?: number;
  distance_km?: number;
  customer_name?: string;
  timeout_seconds?: number;
  remaining_seconds?: number;
  assigned_at?: string;
  created_at?: string;
}

interface Props { navigation: any; }

export default function DriverProviderRequestScreen({ navigation }: Props) {
  const { lang } = useLanguage();

  const [pending, setPending] = useState<PendingDriverJob | null>(null);
  const [countdown, setCountdown] = useState<number>(30);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'my_jobs' | 'messages' | 'history'>('pending');

  const waveAnim = useState(new Animated.Value(0.3))[0];

  useEffect(() => {
    if (isSpeaking) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(waveAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(waveAnim, { toValue: 0.3, duration: 400, useNativeDriver: true })
        ])
      ).start();
    } else {
      waveAnim.setValue(0.3);
    }
  }, [isSpeaking]);

  const speakJobDetails = (job: PendingDriverJob) => {
    const vehicleStr = job.vehicle_type ? `${job.vehicle_type} गाड़ी चाहिए` : 'गाड़ी चलानी है';
    const locationStr = job.pickup_location ? `${job.pickup_location} से` : '';
    const dropStr = job.drop_location ? `${job.drop_location} तक` : '';
    const dateStr = job.start_date && job.start_date !== new Date().toISOString().split('T')[0] ? 'कल' : 'आज';
    const timeStr = job.start_time ? `${job.start_time} बजे` : 'शाम 5:00 बजे';
    const text = `आपके लिए नया ड्राइवर काम आया है। ${job.description || 'ड्राइविंग करनी है'}। ${vehicleStr}। ${locationStr} ${dropStr} ${dateStr} ${timeStr} तक पहुँचना है। प्रस्तावित दर ${job.wage ?? 1200} रुपए है, दूरी 8 KM है।`;
    setIsSpeaking(true);
    Speech.speak(text, {
      language: 'hi-IN',
      onDone: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false)
    });
  };

  const lastSpokenJobId = useRef<number | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const pendingRes = await api.get('/api/driver/provider/pending');
      if (pendingRes.status === 200) {
        const d = pendingRes.data;
        const newJob = d.has_request ? d : null;
        setPending(prev => {
          if (newJob) {
            const isBrandNewJob = !prev || prev.job_id !== newJob.job_id;
            if (isBrandNewJob || prev.wage !== newJob.wage) {
              const secs = newJob.remaining_seconds !== undefined
                ? Math.max(0, Math.floor(newJob.remaining_seconds))
                : (newJob.timeout_seconds ?? 30);
              setCountdown(secs);

              if (isBrandNewJob && newJob.job_id && lastSpokenJobId.current !== newJob.job_id && newJob.status !== 'negotiating') {
                lastSpokenJobId.current = newJob.job_id ?? null;
                speakJobDetails(newJob);
              }
            }
          }
          return newJob;
        });
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    if (!pending?.job_id) return;

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          fetchData();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [pending?.job_id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleAccept = async () => {
    if (!pending?.job_id) return;
    setAccepting(true);
    try {
      const res = await api.post('/api/driver/provider/accept', { job_id: pending.job_id });
      Alert.alert(
        '✅ Success',
        lang === 'hi'
          ? 'Request Accept Ho Gayi! Customer ka phone number: ' + (res.data.customer_phone ?? 'N/A')
          : 'Request Accepted! Customer phone: ' + (res.data.customer_phone ?? 'N/A'),
      );
      await fetchData();
    } catch (err: any) {
      Alert.alert('❌', err.response?.data?.detail || (lang === 'hi' ? 'Request accept nahi hui.' : 'Could not accept request.'));
    } finally {
      setAccepting(false);
    }
  };

  const getRelativeTime = (timeStr?: string) => {
    if (!timeStr) return '10 सेकंड पहले';
    const diffSec = Math.max(1, Math.floor((Date.now() - new Date(timeStr).getTime()) / 1000));
    if (diffSec < 60) return `${diffSec} सेकंड पहले`;
    return `${Math.floor(diffSec / 60)} मिनट पहले`;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#1B5E20" />
          <Text style={{ marginTop: 12, color: '#555' }}>
            {lang === 'hi' ? 'Load ho raha hai...' : 'Loading...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const distanceVal = pending?.distance_km ?? 0;
  const bookedSpots = pending?.booked_spots ?? 0;
  const totalSpots = pending?.num_drivers ?? 1;
  const leftSpots = Math.max(0, totalSpots - bookedSpots);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ── Top Bar Header ── */}
      <View style={styles.topHeader}>
        <TouchableOpacity style={{ padding: 4 }} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>

        <View style={styles.brandTitleContainer}>
          <Text style={styles.brandMain}>श्रम सारथी</Text>
        </View>

        <View style={{ width: 40 }} />
      </View>

      {/* ── Sub Navigation Tabs (PDF Page 2) ── */}
      <View style={styles.navTabsContainer}>
        <Text style={styles.navHeaderTitle}>नोटिफिकेशन</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'pending' && styles.activeTabItem]}
            onPress={() => setActiveTab('pending')}
          >
            <Ionicons name="notifications" size={16} color={activeTab === 'pending' ? '#E65100' : '#666'} />
            <Text style={[styles.tabText, activeTab === 'pending' && styles.activeTabText]}>
              नया काम ({pending?.has_request ? '1' : '0'})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'my_jobs' && styles.activeTabItem]}
            onPress={() => setActiveTab('my_jobs')}
          >
            <Ionicons name="briefcase-outline" size={16} color="#666" />
            <Text style={styles.tabText}>मेरे काम (3)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'messages' && styles.activeTabItem]}
            onPress={() => setActiveTab('messages')}
          >
            <Ionicons name="chatbox-outline" size={16} color="#666" />
            <Text style={styles.tabText}>मैसेज</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'history' && styles.activeTabItem]}
            onPress={() => setActiveTab('history')}
          >
            <Ionicons name="time-outline" size={16} color="#666" />
            <Text style={styles.tabText}>इतिहास</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {pending?.has_request && pending.job_id ? (
          <Surface style={styles.jobAlertCard}>
            {/* Alert Header Row */}
            <View style={styles.alertHeaderRow}>
              <View style={styles.alertTitleGroup}>
                <View style={styles.orangeBellCircle}>
                  <Ionicons name="notifications" size={20} color="#fff" />
                </View>
                <View>
                  <Text style={styles.alertMainTitle}>नया काम उपलब्ध है!</Text>
                  <Text style={styles.alertSubTitle}>(New Job Alert)</Text>
                </View>
              </View>

              <View style={styles.timePill}>
                <Text style={styles.timePillText}>{getRelativeTime(pending.assigned_at || pending.created_at)}</Text>
              </View>
            </View>

            {/* AI Voice Waveform Banner (PDF Page 2) */}
            <View style={styles.voiceBanner}>
              <TouchableOpacity
                style={styles.speakerBtn}
                onPress={() => pending && speakJobDetails(pending)}
              >
                <Ionicons name={isSpeaking ? "volume-high" : "volume-medium"} size={22} color="#fff" />
              </TouchableOpacity>

              <View style={styles.voiceTextGroup}>
                <Text style={styles.voiceTitle}>AI बोलेगी:</Text>
                <Text style={styles.voiceBody}>
                  "आपके लिए नया ड्राइवर काम आया है। {pending.description || 'इलेक्ट्रीशियन ऑफिस से गोमती नगर तक जाना है'}। {pending.vehicle_type || 'SUV'} गाड़ी चाहिए, आज शाम 5:00 बजे तक पहुँचना है। प्रस्तावित दर ₹{pending.wage ?? 1200} है, दूरी 8 KM है..."
                </Text>
                <Text style={styles.voiceNote}>(यह ऑडियो आपके लिए ऑटो-प्ले हो रहा है)</Text>
              </View>

              <View style={styles.waveVisualizer}>
                <Animated.View style={[styles.waveBar, { transform: [{ scaleY: waveAnim }] }]} />
                <Animated.View style={[styles.waveBar, { height: 18, transform: [{ scaleY: waveAnim }] }]} />
                <Animated.View style={[styles.waveBar, { height: 26, transform: [{ scaleY: waveAnim }] }]} />
                <Animated.View style={[styles.waveBar, { height: 14, transform: [{ scaleY: waveAnim }] }]} />
                <Text style={styles.waveTimer}>00:{countdown < 10 ? `0${countdown}` : countdown}</Text>
              </View>
            </View>

            {/* Key-Value Details Grid (Page 2 Mockup) */}
            <View style={styles.detailsGrid}>
              {/* Trip Type Row */}
              <View style={styles.gridRow}>
                <View style={styles.gridKeyCell}>
                  <Ionicons name="location-outline" size={16} color="#555" />
                  <Text style={styles.gridKeyText}>यात्रा का प्रकार (Trip Type)</Text>
                </View>
                <Text style={styles.gridSep}>:</Text>
                <Text style={styles.gridValWork}>
                  {pending.description || 'ऑफिस पिकअप'}
                </Text>
              </View>

              {/* Pickup Location Row */}
              <View style={styles.gridRow}>
                <View style={styles.gridKeyCell}>
                  <Ionicons name="pin-outline" size={16} color="#555" />
                  <Text style={styles.gridKeyText}>पिकअप स्थान (Pickup Location)</Text>
                </View>
                <Text style={styles.gridSep}>:</Text>
                <Text style={styles.gridValText}>
                  {pending.pickup_location || pending.address || 'इलेक्ट्रीशियन ऑफिस, लखनऊ'}
                </Text>
              </View>

              {/* Drop Location Row */}
              <View style={styles.gridRow}>
                <View style={styles.gridKeyCell}>
                  <Ionicons name="flag-outline" size={16} color="#555" />
                  <Text style={styles.gridKeyText}>ड्रॉप स्थान (Drop Location)</Text>
                </View>
                <Text style={styles.gridSep}>:</Text>
                <Text style={styles.gridValText}>
                  {pending.drop_location || 'गोमती नगर, लखनऊ'}
                </Text>
              </View>

              {/* Vehicle Type Row */}
              <View style={styles.gridRow}>
                <View style={styles.gridKeyCell}>
                  <Ionicons name="car-outline" size={16} color="#555" />
                  <Text style={styles.gridKeyText}>गाड़ी का प्रकार (Vehicle Type)</Text>
                </View>
                <Text style={styles.gridSep}>:</Text>
                <Text style={styles.gridValText}>
                  {pending.vehicle_type || 'SUV'}
                </Text>
              </View>

              {/* Date Row */}
              <View style={styles.gridRow}>
                <View style={styles.gridKeyCell}>
                  <Ionicons name="calendar-outline" size={16} color="#555" />
                  <Text style={styles.gridKeyText}>यात्रा की तिथि (Date)</Text>
                </View>
                <Text style={styles.gridSep}>:</Text>
                <Text style={styles.gridValText}>
                  {pending.start_date || '6 मई 2025, मंगलवार'}
                </Text>
              </View>

              {/* Pickup Time Row */}
              <View style={styles.gridRow}>
                <View style={styles.gridKeyCell}>
                  <Ionicons name="time-outline" size={16} color="#555" />
                  <Text style={styles.gridKeyText}>पिकअप समय (Pickup Time)</Text>
                </View>
                <Text style={styles.gridSep}>:</Text>
                <Text style={styles.gridValText}>
                  {pending.start_time || 'शाम 5:00 बजे'}
                </Text>
              </View>

              {/* Distance Row */}
              <View style={styles.gridRow}>
                <View style={styles.gridKeyCell}>
                  <Ionicons name="navigate-outline" size={16} color="#555" />
                  <Text style={styles.gridKeyText}>यात्रा दूरी (Distance)</Text>
                </View>
                <Text style={styles.gridSep}>:</Text>
                <Text style={styles.gridValText}>
                  आपकी लोकेशन से {distanceVal} KM दूर
                </Text>
              </View>

              {/* Wage Row */}
              <View style={styles.gridRow}>
                <View style={styles.gridKeyCell}>
                  <Ionicons name="cash-outline" size={16} color="#555" />
                  <Text style={styles.gridKeyText}>प्रस्तावित दिहाड़ी (Wage)</Text>
                </View>
                <Text style={styles.gridSep}>:</Text>
                <Text style={styles.gridValText}>
                  ₹{pending.wage ?? 600} / व्यक्ति
                </Text>
              </View>

              {/* Total Required Row */}
              <View style={styles.gridRow}>
                <View style={styles.gridKeyCell}>
                  <Ionicons name="people-outline" size={16} color="#555" />
                  <Text style={styles.gridKeyText}>कुल ड्राइवर चाहिए</Text>
                </View>
                <Text style={styles.gridSep}>:</Text>
                <Text style={styles.gridValText}>
                  {totalSpots} ड्राइवर
                </Text>
              </View>
            </View>

            {/* Live Progress Status Box */}
            <View style={styles.liveStatusBox}>
              <View style={styles.liveStatusHeader}>
                <Ionicons name="people" size={18} color="#2E7D32" style={{ marginRight: 6 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.liveStatusTitle}>Live Status</Text>
                  <Text style={styles.liveStatusDesc}>
                    इस काम के लिए {totalSpots} ड्राइवरों की आवश्यकता है ({leftSpots} जगह बाकी है)
                  </Text>
                </View>
                <Text style={styles.liveStatusRatio}>{bookedSpots}/{totalSpots} Accepted</Text>
              </View>

              <View style={styles.progressBarTrack}>
                <View style={[styles.progressBarFill, { width: `${Math.min(100, (bookedSpots / totalSpots) * 100)}%` }]} />
              </View>
            </View>

            {/* Info Note Box */}
            <View style={styles.infoNoteBox}>
              <Ionicons name="information-circle" size={16} color="#1565C0" style={{ marginRight: 6 }} />
              <Text style={styles.infoNoteText}>
                जैसे ही कोई अन्य ड्राइवर काम लेगा, यह संख्या लाइव अपडेट होकर घटती जाएगी।
              </Text>
            </View>

            {/* Action Buttons Row */}
            <View style={styles.actionsRow}>
              {/* Accept Button */}
              <TouchableOpacity
                style={[styles.bigBtn, styles.acceptBigBtn, (accepting || countdown === 0) && { opacity: 0.5 }]}
                disabled={accepting || countdown === 0}
                onPress={handleAccept}
              >
                <View style={styles.bigBtnHeader}>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={styles.bigBtnTitle}>स्वीकार करें</Text>
                </View>
                <Text style={styles.bigBtnSub}>(Accept)</Text>

                <View style={styles.bigBtnBadge}>
                  <Text style={styles.bigBtnBadgeText}>1 मिनट के अंदर स्वीकार करें</Text>
                </View>
              </TouchableOpacity>

              {/* Cross Offer Button */}
              <TouchableOpacity
                style={[styles.bigBtn, styles.offerBigBtn, countdown === 0 && { opacity: 0.5 }]}
                disabled={countdown === 0}
                onPress={() => navigation.navigate('NegotiationChatScreen', { job_id: pending.job_id, module: 'driver' })}
              >
                <View style={styles.bigBtnHeader}>
                  <Ionicons name="chatbubbles" size={20} color="#fff" />
                  <Text style={styles.bigBtnTitle}>अपना दाम बताएं</Text>
                </View>
                <Text style={styles.bigBtnSub}>(Cross Offer)</Text>

                <View style={[styles.bigBtnBadge, { backgroundColor: '#FFF3E0' }]}>
                  <Text style={[styles.bigBtnBadgeText, { color: '#E65100' }]}>अपना दाम बताकर बातचीत करें</Text>
                </View>
              </TouchableOpacity>
            </View>
          </Surface>
        ) : (
          <Surface style={styles.emptyCard}>
            <Ionicons name="car-outline" size={48} color="#A0A0A0" />
            <Text style={styles.emptyTitle}>कोई नया काम उपलब्ध नहीं है</Text>
            <Text style={styles.emptySub}>नया काम आते ही आपको अलर्ट और नोटिफिकेशन मिल जाएगा।</Text>
          </Surface>
        )}

        {/* ── Bottom Information Cards Section (Page 2) ── */}
        <View style={styles.moreInfoSection}>
          <Text style={styles.moreInfoHeading}>और जानकारी</Text>

          <View style={styles.infoCardsRow}>
            {/* Card 1 */}
            <View style={styles.infoMiniCard}>
              <Ionicons name="shield-checkmark" size={22} color="#2E7D32" />
              <Text style={styles.infoCardTitle}>कोई शुल्क नहीं</Text>
              <Text style={styles.infoCardDesc}>काम पक्का होने पर कोई शुल्क नहीं लगता</Text>
            </View>

            {/* Card 2 */}
            <View style={styles.infoMiniCard}>
              <Ionicons name="call" size={22} color="#2E7D32" />
              <Text style={styles.infoCardTitle}>काम पक्का होने पर</Text>
              <Text style={styles.infoCardDesc}>ग्राहक और आपका मोबाइल नंबर दिखेगा</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6F8' },
  centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  topHeader: {
    height: 56,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderColor: '#EEEEEE',
  },
  brandTitleContainer: { flex: 1, marginLeft: 10 },
  brandMain: { fontSize: 16, fontWeight: 'bold', color: '#1B5E20' },
  brandSub: { fontSize: 9, fontWeight: '700', color: '#555' },
  headerRightRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  distPill: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#E8F5E9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 14,
  },
  distText: { fontSize: 11, fontWeight: '700', color: '#2E7D32', marginLeft: 3 },
  bellBtn: { padding: 4, position: 'relative' },
  badgeDot: {
    position: 'absolute', top: 2, right: 2, width: 14, height: 14,
    borderRadius: 7, backgroundColor: '#C62828', justifyContent: 'center', alignItems: 'center'
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: 'bold' },

  navTabsContainer: { backgroundColor: '#fff', paddingVertical: 8, borderBottomWidth: 1, borderColor: '#E0E0E0' },
  navHeaderTitle: { fontSize: 16, fontWeight: 'bold', color: '#111', paddingHorizontal: 14, marginBottom: 6 },
  tabsScroll: { paddingHorizontal: 14, gap: 8 },
  tabItem: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 16, backgroundColor: '#F0F2F5', borderWidth: 1, borderColor: '#E0E0E0', gap: 4
  },
  activeTabItem: { backgroundColor: '#FFF3E0', borderColor: '#FFE0B2' },
  tabText: { fontSize: 12, color: '#555', fontWeight: '600' },
  activeTabText: { color: '#E65100', fontWeight: 'bold' },

  scrollContent: { padding: 12, paddingBottom: 30 },

  jobAlertCard: {
    borderRadius: 16, backgroundColor: '#fff', padding: 14, elevation: 3,
    borderWidth: 1, borderColor: '#FFE0B2', marginBottom: 14
  },
  alertHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  alertTitleGroup: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  orangeBellCircle: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#FF8F00',
    justifyContent: 'center', alignItems: 'center'
  },
  alertMainTitle: { fontSize: 16, fontWeight: 'bold', color: '#D84315' },
  alertSubTitle: { fontSize: 11, color: '#D84315', fontWeight: '600' },
  timePill: { backgroundColor: '#E8F5E9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  timePillText: { fontSize: 11, color: '#2E7D32', fontWeight: 'bold' },

  voiceBanner: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF8E1',
    padding: 10, borderRadius: 12, borderWidth: 1, borderColor: '#FFE082', marginBottom: 14
  },
  speakerBtn: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: '#2E7D32',
    justifyContent: 'center', alignItems: 'center', marginRight: 8
  },
  voiceTextGroup: { flex: 1, paddingRight: 6 },
  voiceTitle: { fontSize: 11, fontWeight: 'bold', color: '#2E7D32' },
  voiceBody: { fontSize: 11, color: '#333', lineHeight: 15, fontStyle: 'italic' },
  voiceNote: { fontSize: 9, color: '#777', marginTop: 2 },
  waveVisualizer: { alignItems: 'center', flexDirection: 'row', gap: 3, backgroundColor: '#fff', padding: 6, borderRadius: 8 },
  waveBar: { width: 3, height: 20, backgroundColor: '#2E7D32', borderRadius: 2 },
  waveTimer: { fontSize: 10, fontWeight: 'bold', color: '#333', marginLeft: 4 },

  detailsGrid: { backgroundColor: '#FFFDE7', padding: 12, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#FFF59D' },
  gridRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  gridKeyCell: { flex: 1.2, flexDirection: 'row', alignItems: 'center', gap: 6 },
  gridKeyText: { fontSize: 12, color: '#444', fontWeight: '600' },
  gridSep: { fontSize: 12, color: '#444', fontWeight: 'bold', marginHorizontal: 6 },
  gridValWork: { flex: 1.5, fontSize: 12, color: '#E65100', fontWeight: 'bold' },
  gridValText: { flex: 1.5, fontSize: 12, color: '#222', fontWeight: '700' },

  liveStatusBox: {
    backgroundColor: '#E8F5E9', padding: 10, borderRadius: 10, marginBottom: 10,
    borderWidth: 1, borderColor: '#C8E6C9'
  },
  liveStatusHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  liveStatusTitle: { fontSize: 12, fontWeight: 'bold', color: '#2E7D32' },
  liveStatusDesc: { fontSize: 11, color: '#333' },
  liveStatusRatio: { fontSize: 11, fontWeight: 'bold', color: '#555' },
  progressBarTrack: { height: 6, backgroundColor: '#C8E6C9', borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#2E7D32', borderRadius: 3 },

  infoNoteBox: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, paddingHorizontal: 4 },
  infoNoteText: { fontSize: 11, color: '#1565C0', flex: 1, lineHeight: 15 },

  actionsRow: { flexDirection: 'row', gap: 10 },
  bigBtn: { flex: 1, borderRadius: 12, padding: 10, alignItems: 'center' },
  acceptBigBtn: { backgroundColor: '#2E7D32' },
  offerBigBtn: { backgroundColor: '#FF8F00' },
  bigBtnHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  bigBtnTitle: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  bigBtnSub: { color: '#E8F5E9', fontSize: 10, marginBottom: 6 },
  bigBtnBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 6, paddingVertical: 3,
    borderRadius: 6, width: '100%', alignItems: 'center'
  },
  bigBtnBadgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },

  emptyCard: { padding: 30, borderRadius: 16, alignItems: 'center', backgroundColor: '#fff' },
  emptyTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginTop: 12 },
  emptySub: { fontSize: 12, color: '#777', textAlign: 'center', marginTop: 4 },

  moreInfoSection: { marginTop: 10 },
  moreInfoHeading: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  infoCardsRow: { flexDirection: 'row', gap: 8 },
  infoMiniCard: {
    flex: 1, backgroundColor: '#fff', padding: 10, borderRadius: 10,
    borderWidth: 1, borderColor: '#E0E0E0', alignItems: 'center'
  },
  infoCardTitle: { fontSize: 11, fontWeight: 'bold', color: '#333', marginTop: 6, textAlign: 'center' },
  infoCardDesc: { fontSize: 9, color: '#666', textAlign: 'center', marginTop: 2 },
});
