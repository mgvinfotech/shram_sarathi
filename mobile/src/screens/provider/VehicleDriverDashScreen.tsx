import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View, ScrollView, StyleSheet, Alert, Linking, RefreshControl,
  TouchableOpacity, Modal, Animated, Share, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Text, TextInput, Button, Surface, Divider, Badge, Switch } from 'react-native-paper';
import * as Speech from 'expo-speech';
import { api } from '../../services/api';
import { useLanguage } from '../../i18n/LanguageContext';
import WalletRechargeModal from '../../components/WalletRechargeModal';

interface TransportJobRequest {
  booking_id: number;
  service_type: string;
  service_label: string;
  vehicle_type: string;
  vehicle_type_label: string;
  booking_type: string;
  pickup_address: string;
  drop_address: string;
  distance_km: number;
  work_description: string;
  offered_fare: number;
  total_fare: number;
  commission_pct: number;
  commission_amount: number;
  driver_net_earnings: number;
  tts_speech_text: string;
  timeout_seconds: number;
  remaining_seconds: number;
  messages?: any[];
  status: string;
}

interface DigitalAgreementData {
  booking_id_formatted: string;
  booking_id: number;
  status: string;
  service_type_label: string;
  vehicle_type_label: string;
  vehicle_number: string;
  pickup_address: string;
  drop_address: string;
  distance_km: number;
  agreed_work_details: string;
  agreed_fare: number;
  payment_mode: string;
  commission_pct: number;
  commission_amount: number;
  customer_name: string;
  customer_phone: string;
  terms: string;
}

interface Props { navigation: any; }

export default function VehicleDriverDashScreen({ navigation }: Props) {
  const { lang, t } = useLanguage();

  // Driver Profile & Online State
  const [vehicleProfile, setVehicleProfile] = useState<any>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  // Incoming Job Request & TTS
  const [pendingRequest, setPendingRequest] = useState<TransportJobRequest | null>(null);
  const [countdown, setCountdown] = useState<number>(60);
  const lastSpokenBookingId = useRef<number | null>(null);

  // Active Trip & Digital Agreement
  const [activeTrip, setActiveTrip] = useState<any>(null);
  const [agreementData, setAgreementData] = useState<DigitalAgreementData | null>(null);
  const [tripCompletedSuccess, setTripCompletedSuccess] = useState<boolean>(false);

  // Recent History
  const [recentBookings, setRecentBookings] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Modals
  const [crossOfferModal, setCrossOfferModal] = useState(false);
  const [counterWage, setCounterWage] = useState('');
  const [counterNote, setCounterNote] = useState('');
  const [counterLoading, setCounterLoading] = useState(false);

  const [rechargeModalVisible, setRechargeModalVisible] = useState(false);
  const [rechargeRequiredAmt, setRechargeRequiredAmt] = useState<number>(100);

  // Action Loading
  const [acceptLoading, setAcceptLoading] = useState(false);
  const [completeLoading, setCompleteLoading] = useState(false);

  // ── Fetch Dashboard Data ──────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      const [profileRes, pendingRes, bookingsRes, walletRes] = await Promise.allSettled([
        api.get('/api/transport/vehicle-profile'),
        api.get('/api/transport/driver/pending'),
        api.get('/api/transport/driver/bookings'),
        api.get('/api/wallet'),
      ]);

      if (profileRes.status === 'fulfilled') {
        setVehicleProfile(profileRes.value.data);
        setIsOnline(profileRes.value.data.is_online);
      }

      if (walletRes.status === 'fulfilled') {
        setWalletBalance(profileRes.status === 'fulfilled' ? walletRes.value.data.balance : 0);
      }

      if (pendingRes.status === 'fulfilled') {
        const d = pendingRes.value.data;
        if (d.has_request) {
          setPendingRequest(d);
          // Set countdown
          setCountdown(d.remaining_seconds !== undefined ? Math.max(0, Math.floor(d.remaining_seconds)) : 60);

          // Auto-Play Voice TTS if new booking
          if (d.booking_id && lastSpokenBookingId.current !== d.booking_id && d.tts_speech_text) {
            lastSpokenBookingId.current = d.booking_id;
            try {
              Speech.stop();
              Speech.speak(d.tts_speech_text, {
                language: 'hi-IN',
                pitch: 1.0,
                rate: 0.9,
              });
            } catch (e) {
              // speech fallback
            }
          }
        } else {
          setPendingRequest(null);
        }
      }

      if (bookingsRes.status === 'fulfilled') {
        const bookings = bookingsRes.value.data;
        const active = bookings.find((b: any) => b.status === 'accepted' || b.status === 'active');
        setActiveTrip(active || null);
        setRecentBookings(bookings.filter((b: any) => b.id !== active?.id));

        if (active && active.id) {
          // Fetch complete digital agreement for active trip
          try {
            const agRes = await api.get(`/api/transport/booking/${active.id}/agreement`);
            setAgreementData(agRes.data);
          } catch {}
        } else {
          setAgreementData(null);
        }
      }
    } catch (err) {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 4000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Countdown timer for pending request
  useEffect(() => {
    if (!pendingRequest) return;
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          setPendingRequest(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [pendingRequest]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  // ── Driver Accepts Booking ────────────────────────────────────────────────
  const handleAcceptBooking = async (req: TransportJobRequest) => {
    // 1. Client-side Wallet Check Checkpoint
    const reqCommission = req.commission_amount || Math.round(req.offered_fare * (req.commission_pct / 100));
    if (walletBalance !== null && walletBalance < reqCommission) {
      const shortage = Math.round(reqCommission - walletBalance);
      Alert.alert(
        'वॉलेट में बैलेंस कम है',
        `इस राइड को स्वीकार करने के लिए वॉलेट में कम से कम ₹${reqCommission} (कमीशन) होना चाहिए। (कमी: ₹${shortage})\n\nकृपया पहले रिचार्ज करें।`,
        [
          { text: 'रद्द करें', style: 'cancel' },
          {
            text: 'रिचार्ज करें',
            onPress: () => {
              setRechargeRequiredAmt(Math.max(50, shortage));
              setRechargeModalVisible(true);
            },
          },
        ]
      );
      return;
    }

    setAcceptLoading(true);
    try {
      Speech.stop();
      const res = await api.post('/api/transport/driver/accept', {
        booking_id: req.booking_id,
      });

      Alert.alert('✅ स्वीकार किया!', 'आपने अनुरोध स्वीकार कर लिया है। डिजिटल समझौता तैयार है।');
      setPendingRequest(null);
      await fetchData();
    } catch (e: any) {
      const msg = e?.response?.data?.detail || 'स्वीकृति में समस्या आई।';
      if (e?.response?.data?.shortage) {
        setRechargeRequiredAmt(e.response.data.shortage);
        setRechargeModalVisible(true);
      }
      Alert.alert('स्वीकृति विफल', msg);
    } finally {
      setAcceptLoading(false);
    }
  };

  // ── Driver Rejects Request ────────────────────────────────────────────────
  const handleRejectBooking = async (bookingId: number) => {
    Speech.stop();
    setPendingRequest(null);
    try {
      await api.post('/api/transport/driver/reject', { booking_id: bookingId });
    } catch {}
  };

  // ── Open Cross Offer Modal ────────────────────────────────────────────────
  const openCrossOffer = (req: TransportJobRequest) => {
    setCounterWage(String(Math.round(req.offered_fare + 25)));
    setCounterNote(`${req.pickup_address} से ${req.drop_address} के लिए मेरा किराया ₹${Math.round(req.offered_fare + 25)} रहेगा।`);
    setCrossOfferModal(true);
  };

  // ── Submit Cross Offer ────────────────────────────────────────────────────
  const submitCrossOffer = async () => {
    if (!pendingRequest || !counterWage.trim()) return;
    const wageNum = parseFloat(counterWage);
    if (isNaN(wageNum) || wageNum <= 0) {
      Alert.alert('अमान्य किराया', 'कृपया सही किराया दर्ज करें।');
      return;
    }

    setCounterLoading(true);
    try {
      Speech.stop();
      await api.post('/api/transport/driver/counter', {
        booking_id: pendingRequest.booking_id,
        wage: wageNum,
        message: counterNote,
      });

      const targetBookingId = pendingRequest.booking_id;
      setCrossOfferModal(false);
      navigation.navigate('NegotiationChatScreen', {
        job_id: targetBookingId,
        module: 'transport',
      });
    } catch (e: any) {
      const msg = e?.response?.data?.detail || 'काउंटर-ऑफ़र भेजने में समस्या आई।';
      if (e?.response?.data?.shortage) {
        setRechargeRequiredAmt(e.response.data.shortage);
        setRechargeModalVisible(true);
      }
      Alert.alert('त्रुटि', msg);
    } finally {
      setCounterLoading(false);
    }
  };

  // ── Driver Marks Trip as Completed (End Trip / Done Action) ──────────────
  const handleCompleteTrip = async () => {
    if (!activeTrip) return;
    setCompleteLoading(true);
    try {
      await api.post('/api/transport/driver/complete', {
        booking_id: activeTrip.id,
      });

      setTripCompletedSuccess(true);
      setActiveTrip(null);
      setAgreementData(null);
      await fetchData();
    } catch (e: any) {
      Alert.alert('त्रुटि', e?.response?.data?.detail || 'यात्रा पूर्ण करने में समस्या आई।');
    } finally {
      setCompleteLoading(false);
    }
  };

  // ── Share Digital Agreement Slip (PDF Format Text) ──────────────────────
  const handleShareAgreement = async () => {
    if (!agreementData) return;
    const text = `🚗 श्रम सारथी नेटवर्क - डिजिटल परिवहन एवं कार्य समझौता\n` +
      `Booking ID: ${agreementData.booking_id_formatted || 'SSN-TR-' + activeTrip?.id}\n` +
      `स्थिति: ${agreementData.status}\n` +
      `सेवा प्रकार: ${agreementData.service_type_label || 'परिवहन'} | गाड़ी: ${agreementData.vehicle_type_label || ''} (${agreementData.vehicle_number || ''})\n` +
      `पिकअप स्थान: ${agreementData.pickup_address}\n` +
      `ड्रॉप स्थान: ${agreementData.drop_address}\n` +
      `कुल दूरी: ${agreementData.distance_km} KM\n` +
      `कार्य विवरण: "${agreementData.agreed_work_details}"\n` +
      `अंतिम तय किराया: ₹${agreementData.agreed_fare}.00\n` +
      `भुगतान का माध्यम: ${agreementData.payment_mode || 'ड्राइवर को नकद / UPI'}\n` +
      `प्लेटफॉर्म कमीशन: ₹${agreementData.commission_amount} (कट चुका)\n` +
      `ग्राहक संपर्क: ${agreementData.customer_name || 'ग्राहक'} (${agreementData.customer_phone || ''})\n` +
      `नियम: ${agreementData.terms || 'तय किराये से अतिरिक्त कोई मांग मान्य नहीं होगी।'}`;

    try {
      await Share.share({ message: text });
    } catch {}
  };

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top', 'bottom']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* ── Top Header & Live Wallet Bar ── */}
        <Surface style={styles.topProfileBar}>
          <View style={styles.topProfileRow}>
            <View>
              <Text style={styles.driverNameText}>
                👨‍✈️ {vehicleProfile?.driver_name || 'ड्राइवर साथी'}
              </Text>
              <Text style={styles.vehicleDetailsSub}>
                {vehicleProfile?.vehicle_type?.toUpperCase() || 'WAGONR'} | {vehicleProfile?.vehicle_number || 'UP65-XX-0000'}
              </Text>
            </View>

            <View style={styles.statusBadgeCol}>
              <Badge style={[styles.onlineBadge, isOnline ? { backgroundColor: '#2E7D32' } : { backgroundColor: '#757575' }]}>
                {isOnline ? '🟢 ऑनलाइन' : '🔴 ऑफलाइन (BUSY)'}
              </Badge>
            </View>
          </View>

          <Divider style={{ marginVertical: 8, backgroundColor: '#ECEFF1' }} />

          {/* Wallet Balance Bar */}
          <View style={styles.walletBarRow}>
            <TouchableOpacity
              style={styles.walletInfoCol}
              onPress={() => navigation.navigate('WalletScreen')}
              activeOpacity={0.8}
            >
              <Text style={styles.walletLabel}>💳 वॉलेट बैलेंस (पासबुक ➔):</Text>
              <Text style={styles.walletVal}>₹{walletBalance !== null ? walletBalance.toFixed(2) : '0.00'}</Text>
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', gap: 6 }}>
              <TouchableOpacity
                style={styles.addMoneyBtn}
                onPress={() => {
                  setRechargeRequiredAmt(200);
                  setRechargeModalVisible(true);
                }}
              >
                <Text style={styles.addMoneyBtnText}>+ जोड़ें</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.addMoneyBtn, { backgroundColor: '#2E7D32' }]}
                onPress={() => navigation.navigate('WalletScreen')}
              >
                <Text style={styles.addMoneyBtnText}>निकासी 💸</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Surface>

        {/* ──────────────────────────────────────────────────────────────────
            CASE 1: NEW TRANSPORT JOB ALERT CARD (Matching PDF Page 1 & 3)
           ────────────────────────────────────────────────────────────────── */}
        {pendingRequest && (
          <Surface style={styles.alertCard}>
            {/* Header with Countdown */}
            <View style={styles.alertHeaderRow}>
              <View style={styles.alertTitleCol}>
                <Text style={styles.alertBadge}>🔔 नया परिवहन अनुरोध!</Text>
                <Text style={styles.alertSubBadge}>(New Transport Job)</Text>
              </View>

              <View style={styles.timerBox}>
                <Text style={styles.timerText}>
                  ⏱️ 00:{countdown < 10 ? `0${countdown}` : countdown}
                </Text>
              </View>
            </View>

            {/* Audio Auto-Play Indicator */}
            <View style={styles.ttsAudioBar}>
              <Text style={styles.ttsAudioIcon}>🔊</Text>
              <Text style={styles.ttsAudioLabel}>AI बोल रही है (Auto-Play Voice):</Text>
            </View>
            <Text style={styles.ttsQuoteText}>"{pendingRequest.tts_speech_text}"</Text>

            <Divider style={styles.alertDivider} />

            {/* Job Details Card */}
            <View style={styles.jobSpecsGrid}>
              <Text style={styles.jobSpecLine}>
                🚗 <Text style={styles.specLabel}>सेवा श्रेणी:</Text> {pendingRequest.service_label} | <Text style={styles.specLabel}>गाड़ी:</Text> {pendingRequest.vehicle_type_label}
              </Text>
              <Text style={styles.jobSpecLine}>
                📍 <Text style={styles.specLabel}>पिकअप:</Text> {pendingRequest.pickup_address}
              </Text>
              <Text style={styles.jobSpecLine}>
                🏁 <Text style={styles.specLabel}>ड्रॉप:</Text> {pendingRequest.drop_address}
              </Text>
              <Text style={styles.jobSpecLine}>
                📏 <Text style={styles.specLabel}>दूरी:</Text> {pendingRequest.distance_km} KM
              </Text>
              <Text style={styles.jobSpecLine}>
                📋 <Text style={styles.specLabel}>काम का विवरण:</Text> {pendingRequest.work_description}
              </Text>
            </View>

            <Divider style={styles.alertDivider} />

            {/* Fare & Commission Breakdown */}
            <View style={styles.fareBreakdownBox}>
              <View style={styles.fareRowSpaced}>
                <Text style={styles.fareRowLabel}>💰 प्रस्तावित किराया:</Text>
                <Text style={styles.offeredFareBig}>₹{pendingRequest.offered_fare}.00</Text>
              </View>
              <View style={styles.fareRowSpaced}>
                <Text style={styles.fareRowLabel}>✂️ ड्राइवर कमीशन (7%):</Text>
                <Text style={{ color: '#C62828', fontWeight: 'bold' }}>- ₹{pendingRequest.commission_amount}</Text>
              </View>
              <View style={styles.fareRowSpaced}>
                <Text style={[styles.fareRowLabel, { color: '#2E7D32', fontWeight: 'bold' }]}>💵 शुद्ध कमाई (Net Earnings):</Text>
                <Text style={styles.netEarningsBig}>₹{pendingRequest.driver_net_earnings}.00</Text>
              </View>
            </View>

            {/* Action Buttons: Accept / Cross Offer / Reject */}
            <View style={styles.alertActionButtonsRow}>
              <Button
                mode="contained"
                loading={acceptLoading}
                disabled={acceptLoading}
                style={[styles.jobActionBtn, { backgroundColor: '#2E7D32' }]}
                labelStyle={styles.actionBtnLabel}
                onPress={() => handleAcceptBooking(pendingRequest)}
              >
                ✓ Accept (₹{pendingRequest.offered_fare})
              </Button>

              <Button
                mode="contained"
                style={[styles.jobActionBtn, { backgroundColor: '#1976D2' }]}
                labelStyle={styles.actionBtnLabel}
                onPress={() => navigation.navigate('NegotiationChatScreen', { job_id: pendingRequest.booking_id, module: 'transport' })}
              >
                💬 मोलभाव / चैट
              </Button>

              <Button
                mode="contained"
                style={[styles.jobActionBtn, { backgroundColor: '#E53E3E', flex: 0.7 }]}
                labelStyle={styles.actionBtnLabel}
                onPress={() => handleRejectBooking(pendingRequest.booking_id)}
              >
                ✕
              </Button>
            </View>
          </Surface>
        )}

        {/* ──────────────────────────────────────────────────────────────────
            CASE 2: ACTIVE TRIP & DIGITAL CONTRACT (Matching PDF Page 4 & 5)
           ────────────────────────────────────────────────────────────────── */}
        {activeTrip && agreementData && (
          <Surface style={styles.activeTripWrapper}>
            <View style={styles.contractHeader}>
              <Text style={styles.contractMainTitle}>📜 डिजिटल यात्रा एवं कार्य समझौता</Text>
              <Text style={styles.contractSubTitle}>(Digital Transport & Work Agreement)</Text>
            </View>

            <Divider style={styles.contractDivider} />

            <View style={styles.contractRowSpaced}>
              <Text style={styles.contractLabel}>Booking ID: <Text style={styles.contractValBold}>{agreementData.booking_id_formatted}</Text></Text>
              <Badge style={{ backgroundColor: '#2E7D32', color: '#fff', fontWeight: 'bold' }}>
                {`🟢 ${agreementData.status}`}
              </Badge>
            </View>

            <View style={styles.contractRowSpaced}>
              <Text style={styles.contractLabel}>सेवा: <Text style={styles.contractVal}>{agreementData.service_type_label}</Text></Text>
              <Text style={styles.contractLabel}>गाड़ी: <Text style={styles.contractVal}>{agreementData.vehicle_type_label}</Text></Text>
            </View>

            <Divider style={styles.contractDivider} />

            <Text style={styles.contractLine}>📍 <Text style={styles.contractLabel}>पिकअप:</Text> {agreementData.pickup_address}</Text>
            <Text style={styles.contractLine}>🏁 <Text style={styles.contractLabel}>ड्रॉप:</Text> {agreementData.drop_address}</Text>
            <Text style={styles.contractLine}>📏 <Text style={styles.contractLabel}>कुल दूरी:</Text> {agreementData.distance_km} KM</Text>

            <Divider style={styles.contractDivider} />

            <Text style={styles.contractLabel}>📋 कार्य का विवरण (Agreed Details):</Text>
            <Text style={styles.contractWorkBox}>"{agreementData.agreed_work_details}"</Text>

            <Divider style={styles.contractDivider} />

            <View style={styles.contractRowSpaced}>
              <Text style={styles.contractLabel}>💰 अंतिम तय किराया:</Text>
              <Text style={styles.contractFareBig}>₹ {agreementData.agreed_fare}.00</Text>
            </View>
            <View style={styles.contractRowSpaced}>
              <Text style={styles.contractLabel}>✂️ प्लेटफॉर्म कमीशन:</Text>
              <Text style={{ color: '#2E7D32', fontWeight: 'bold' }}>₹ {agreementData.commission_amount} (कट चुका)</Text>
            </View>

            <Divider style={styles.contractDivider} />

            {/* Customer Contact Unlocked */}
            <View style={styles.customerContactBox}>
              <Text style={styles.contactText}>👤 <Text style={styles.contractLabel}>ग्राहक:</Text> {agreementData.customer_name || 'ग्राहक'}</Text>
              <Text style={styles.contactText}>📞 <Text style={styles.contractLabel}>फोन:</Text> {agreementData.customer_phone}</Text>
            </View>

            <Divider style={styles.contractDivider} />

            <Text style={styles.contractTerms}>
              ⚖️ {agreementData.terms}
            </Text>

            {/* Action Buttons: Call, Maps & Share */}
            <View style={styles.activeActionRow}>
              <Button
                mode="contained"
                icon="phone"
                style={[styles.thirdBtn, { backgroundColor: '#2E7D32' }]}
                onPress={() => Linking.openURL(`tel:${agreementData.customer_phone}`)}
              >
                कॉल ग्राहक
              </Button>

              <Button
                mode="outlined"
                icon="map-marker"
                style={[styles.thirdBtn, { borderColor: '#1976D2' }]}
                textColor="#1976D2"
                onPress={() => Linking.openURL(`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(agreementData.pickup_address)}&destination=${encodeURIComponent(agreementData.drop_address)}`)}
              >
                मैप देखें
              </Button>

              <Button
                mode="outlined"
                icon="share-variant"
                style={[styles.thirdBtn, { borderColor: '#F26333' }]}
                textColor="#F26333"
                onPress={handleShareAgreement}
              >
                शेयर (PDF)
              </Button>
            </View>

            {/* END TRIP / DONE ACTION BUTTON (PDF Rule 4) */}
            <Button
              mode="contained"
              loading={completeLoading}
              disabled={completeLoading}
              style={styles.doneTripButton}
              labelStyle={styles.doneTripLabel}
              onPress={handleCompleteTrip}
            >
              🏁 कार्य पूर्ण / Done
            </Button>
          </Surface>
        )}

        {/* ──────────────────────────────────────────────────────────────────
            CASE 3: TRIP COMPLETED SUCCESS SCREEN (PDF Page 1 bottom)
           ────────────────────────────────────────────────────────────────── */}
        {tripCompletedSuccess && (
          <Surface style={styles.completedSuccessCard}>
            <Text style={{ fontSize: 44, textAlign: 'center', marginBottom: 8 }}>🎉</Text>
            <Text style={styles.completedTitle}>बधाई हो!</Text>
            <Text style={styles.completedSub}>यात्रा / डिलीवरी पूरी हो गई है।</Text>

            <Divider style={{ marginVertical: 12, backgroundColor: '#E0E0E0' }} />

            <View style={styles.onlineNoticeBox}>
              <Text style={styles.onlineNoticeText}>
                🟢 आपका स्टेटस अब <Text style={{ fontWeight: 'bold' }}>AVAILABLE (ऑनलाइन)</Text> है। आप नई बुकिंग प्राप्त कर सकते हैं।
              </Text>
            </View>

            <Button
              mode="contained"
              style={[styles.primaryBtn, { marginTop: 16 }]}
              onPress={() => setTripCompletedSuccess(false)}
            >
              ठीक है
            </Button>
          </Surface>
        )}

        {/* ──────────────────────────────────────────────────────────────────
            CASE 4: IDLE DRIVER DASHBOARD (Waiting for Requests)
           ────────────────────────────────────────────────────────────────── */}
        {!pendingRequest && !activeTrip && !tripCompletedSuccess && (
          <Surface style={styles.idleCard}>
            <Text style={{ fontSize: 38, textAlign: 'center', marginBottom: 12 }}>📡</Text>
            <Text style={styles.idleTitle}>आप ऑनलाइन हैं और तैयार हैं!</Text>
            <Text style={styles.idleSub}>
              जैसे ही आपके 5 KM - 10 KM के दायरे में कोई सवारी या माल ढुलाई की रिक्वेस्ट आएगी, ऐप आपको हिंदी आवाज़ और अलर्ट के साथ तुरंत सूचित करेगा।
            </Text>
          </Surface>
        )}

        {/* ──────────────────────────────────────────────────────────────────
            RECENT BOOKINGS HISTORY
           ────────────────────────────────────────────────────────────────── */}
        {recentBookings.length > 0 && (
          <View style={{ marginTop: 20 }}>
            <Text style={styles.sectionHeaderTitle}>📜 हालिया ट्रिप्स (Recent Trips)</Text>
            {recentBookings.slice(0, 5).map(b => (
              <Surface key={b.id} style={styles.historyCard}>
                <View style={styles.historyRowSpaced}>
                  <Text style={styles.historyVehicle}>{b.vehicle_type?.toUpperCase()} | {b.distance_km} KM</Text>
                  <Badge style={{ backgroundColor: b.status === 'completed' ? '#2E7D32' : '#757575' }}>
                    {b.status}
                  </Badge>
                </View>
                <Text style={styles.historyRoute} numberOfLines={1}>📍 {b.pickup_address} ➔ 🏁 {b.drop_address}</Text>
                <View style={styles.historyRowSpaced}>
                  <Text style={styles.historyFare}>किराया: ₹{b.agreed_fare || b.total_fare}</Text>
                  <Text style={styles.historyCommission}>कमीशन: ₹{b.commission_amount}</Text>
                </View>
              </Surface>
            ))}
          </View>
        )}
      </ScrollView>

      {/* ── Cross Offer Modal ── */}
      <Modal visible={crossOfferModal} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <Surface style={styles.modalContent}>
            <Text style={styles.modalTitle}>🔄 क्रॉस ऑफ़र भेजें (Counter Offer)</Text>
            <Text style={styles.modalSubtitle}>ग्राहक को अपना किराया और शर्त भेजें</Text>

            <Text style={styles.inputLabel}>प्रस्तावित किराया (₹):</Text>
            <TextInput
              mode="outlined"
              value={counterWage}
              onChangeText={setCounterWage}
              keyboardType="numeric"
              style={styles.modalInput}
              outlineColor="#BDBDBD"
              activeOutlineColor="#1976D2"
            />

            <Text style={styles.inputLabel}>शर्त / संदेश (वैकल्पिक):</Text>
            <TextInput
              mode="outlined"
              value={counterNote}
              onChangeText={setCounterNote}
              multiline
              numberOfLines={2}
              style={[styles.modalInput, { minHeight: 60 }]}
              outlineColor="#BDBDBD"
              activeOutlineColor="#1976D2"
            />

            <View style={styles.modalActionRow}>
              <Button
                mode="outlined"
                style={styles.modalBtn}
                onPress={() => setCrossOfferModal(false)}
              >
                रद्द करें
              </Button>
              <Button
                mode="contained"
                loading={counterLoading}
                disabled={counterLoading}
                style={[styles.modalBtn, { backgroundColor: '#1976D2' }]}
                onPress={submitCrossOffer}
              >
                ऑफ़र भेजें
              </Button>
            </View>
          </Surface>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Wallet Recharge Modal ── */}
      <WalletRechargeModal
        visible={rechargeModalVisible}
        onClose={() => setRechargeModalVisible(false)}
        initialAmount={rechargeRequiredAmt}
        title="कमीशन हेतु वॉलेट रिचार्ज करें"
        description="राइड स्वीकार करने के लिए निर्धारित प्लेटफॉर्म कमीशन हेतु तुरंत रिचार्ज करें।"
        onSuccess={() => {
          setRechargeModalVisible(false);
          fetchData();
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: { flex: 1, backgroundColor: '#F8F9FA' },
  scrollContainer: { padding: 16, paddingBottom: 160 },

  topProfileBar: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
  },
  topProfileRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  driverNameText: { fontSize: 16, fontWeight: 'bold', color: '#263238' },
  vehicleDetailsSub: { fontSize: 12, color: '#78909C', marginTop: 2 },
  statusBadgeCol: { alignItems: 'flex-end' },
  onlineBadge: { fontSize: 11, fontWeight: 'bold', color: '#fff', paddingHorizontal: 8, height: 22 },

  walletBarRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  walletInfoCol: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  walletLabel: { fontSize: 13, color: '#546E7A' },
  walletVal: { fontSize: 16, fontWeight: 'bold', color: '#2E7D32' },
  addMoneyBtn: { backgroundColor: '#FFF3E0', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: '#FFE0B2' },
  addMoneyBtnText: { fontSize: 12, fontWeight: 'bold', color: '#E65100' },

  // Alert Card
  alertCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#F26333',
    padding: 16,
    marginBottom: 16,
    elevation: 4,
  },
  alertHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  alertTitleCol: { flex: 1 },
  alertBadge: { fontSize: 17, fontWeight: 'bold', color: '#D84315' },
  alertSubBadge: { fontSize: 11, color: '#78909C' },
  timerBox: { backgroundColor: '#FFEBEE', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  timerText: { fontSize: 14, fontWeight: 'bold', color: '#C62828' },

  ttsAudioBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EDE7F6', padding: 8, borderRadius: 8, marginTop: 12 },
  ttsAudioIcon: { fontSize: 16, marginRight: 6 },
  ttsAudioLabel: { fontSize: 12, fontWeight: 'bold', color: '#512DA8' },
  ttsQuoteText: { fontSize: 13, fontStyle: 'italic', color: '#311B92', marginTop: 4, paddingHorizontal: 6 },

  alertDivider: { backgroundColor: '#CFD8DC', marginVertical: 10 },

  jobSpecsGrid: { gap: 4 },
  jobSpecLine: { fontSize: 13, color: '#263238' },
  specLabel: { fontWeight: 'bold', color: '#455A64' },

  fareBreakdownBox: { backgroundColor: '#FAFAFA', padding: 10, borderRadius: 8, gap: 4 },
  fareRowSpaced: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fareRowLabel: { fontSize: 12, color: '#546E7A' },
  offeredFareBig: { fontSize: 16, fontWeight: 'bold', color: '#263238' },
  netEarningsBig: { fontSize: 18, fontWeight: 'bold', color: '#2E7D32' },

  alertActionButtonsRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  jobActionBtn: { flex: 1, borderRadius: 8 },
  actionBtnLabel: { fontSize: 12, fontWeight: 'bold', color: '#fff' },

  // Active Trip & Contract
  activeTripWrapper: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#37474F',
    padding: 16,
    marginBottom: 16,
    elevation: 3,
  },
  contractHeader: { alignItems: 'center', paddingBottom: 6 },
  contractMainTitle: { fontSize: 16, fontWeight: 'bold', color: '#263238', textAlign: 'center' },
  contractSubTitle: { fontSize: 11, color: '#78909C' },
  contractDivider: { backgroundColor: '#CFD8DC', marginVertical: 8 },
  contractRowSpaced: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 2 },
  contractLabel: { fontSize: 12, color: '#546E7A' },
  contractVal: { fontSize: 12, fontWeight: '600', color: '#263238' },
  contractValBold: { fontSize: 13, fontWeight: 'bold', color: '#263238' },
  contractLine: { fontSize: 12, color: '#263238', marginVertical: 2 },
  contractWorkBox: { backgroundColor: '#FAFAFA', padding: 6, borderRadius: 6, fontSize: 12, fontStyle: 'italic', color: '#37474F', marginTop: 2 },
  contractFareBig: { fontSize: 18, fontWeight: 'bold', color: '#2E7D32' },
  customerContactBox: { backgroundColor: '#E8F5E9', padding: 8, borderRadius: 8 },
  contactText: { fontSize: 13, color: '#1B5E20', marginVertical: 2 },
  contractTerms: { fontSize: 11, color: '#C62828', textAlign: 'center', marginVertical: 4 },

  activeActionRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  halfBtn: { flex: 1, borderRadius: 8 },
  thirdBtn: { flex: 1, borderRadius: 8, paddingHorizontal: 2 },
  doneTripButton: { backgroundColor: '#D84315', borderRadius: 10, paddingVertical: 6, marginTop: 14 },
  doneTripLabel: { fontSize: 15, fontWeight: 'bold', color: '#fff' },

  // Completed Success
  completedSuccessCard: { backgroundColor: '#fff', borderRadius: 14, padding: 24, alignItems: 'center', elevation: 3, marginBottom: 16 },
  completedTitle: { fontSize: 20, fontWeight: 'bold', color: '#2E7D32' },
  completedSub: { fontSize: 14, color: '#546E7A', marginTop: 4 },
  onlineNoticeBox: { backgroundColor: '#E8F5E9', padding: 12, borderRadius: 8, width: '100%' },
  onlineNoticeText: { fontSize: 12, color: '#1B5E20', textAlign: 'center' },
  primaryBtn: { backgroundColor: '#F26333', borderRadius: 8, width: '100%' },

  // Idle Card
  idleCard: { backgroundColor: '#fff', borderRadius: 14, padding: 28, alignItems: 'center', elevation: 2 },
  idleTitle: { fontSize: 16, fontWeight: 'bold', color: '#263238' },
  idleSub: { fontSize: 12, color: '#78909C', textAlign: 'center', marginTop: 6, lineHeight: 18 },

  // History
  sectionHeaderTitle: { fontSize: 14, fontWeight: 'bold', color: '#37474F', marginBottom: 8 },
  historyCard: { backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 8, elevation: 1 },
  historyRowSpaced: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  historyVehicle: { fontSize: 12, fontWeight: 'bold', color: '#37474F' },
  historyRoute: { fontSize: 12, color: '#78909C', marginVertical: 4 },
  historyFare: { fontSize: 12, fontWeight: 'bold', color: '#2E7D32' },
  historyCommission: { fontSize: 11, color: '#C62828' },

  // Modal
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 14, padding: 20, elevation: 5 },
  modalTitle: { fontSize: 16, fontWeight: 'bold', color: '#263238' },
  modalSubtitle: { fontSize: 12, color: '#78909C', marginBottom: 14 },
  inputLabel: { fontSize: 12, fontWeight: 'bold', color: '#546E7A', marginBottom: 4 },
  modalInput: { backgroundColor: '#fff', marginBottom: 12, fontSize: 14 },
  modalActionRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  modalBtn: { flex: 1, borderRadius: 8 },
});
