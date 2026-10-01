import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View, ScrollView, StyleSheet, Alert, RefreshControl, TouchableOpacity, Animated, Modal, Linking, Share,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { Text, Surface, ActivityIndicator, Button, TextInput, Divider, Badge } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { api } from '../../services/api';
import { useLanguage } from '../../i18n/LanguageContext';
import WalletRechargeModal from '../../components/WalletRechargeModal';

interface PendingJob {
  has_request: boolean;
  job_id?: number;
  labour_type?: string;
  work_type?: string;
  job_mode?: string;
  wage?: string | number;
  time_shift?: string;
  start_time?: string;
  labour_count?: number;
  booked_spots?: number;
  description?: string;
  address?: string;
  lat?: number;
  lng?: number;
  distance_km?: number;
  customer_name?: string;
  customer_phone?: string;
  timeout_seconds?: number;
  remaining_seconds?: number;
  assigned_at?: string;
  created_at?: string;
  module?: 'labour' | 'driver' | 'karigar' | 'transport';
  // Transport specific fields
  service_type?: string;
  service_label?: string;
  vehicle_type?: string;
  vehicle_type_label?: string;
  booking_type?: string;
  pickup_address?: string;
  drop_address?: string;
  work_description?: string;
  offered_fare?: number;
  total_fare?: number;
  commission_pct?: number;
  commission_amount?: number;
  driver_net_earnings?: number;
  tts_speech_text?: string;
  messages?: any[];
  status?: string;
}

interface HistoryItem {
  job_id: number;
  status: string;
  labour_type?: string;
  driver_type?: string;
  work_type?: string;
  wage?: number | string;
  time_shift?: string;
  start_time?: string;
  labour_count?: number;
  num_drivers?: number;
  description?: string;
  address: string;
  pickup_address?: string;
  drop_address?: string;
  distance_km?: number;
  service_type?: string;
  vehicle_type?: string;
  total_fare?: number;
  agreed_fare?: number;
  commission_amount?: number;
  driver_net_earnings?: number;
  work_description?: string;
  secret_pin?: string;
  lat?: number;
  lng?: number;
  customer_name?: string;
  customer_phone?: string;
  accepted_at?: string;
  created_at: string;
  module?: 'labour' | 'driver' | 'karigar' | 'transport';
}

interface Props { navigation: any; }

export default function ProviderDashboardScreen({ navigation }: Props) {
  const { lang } = useLanguage();
  const { role } = useSelector((s: RootState) => s.auth);

  const [pending, setPending] = useState<PendingJob | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [selectedJob, setSelectedJob] = useState<HistoryItem | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [countdown, setCountdown] = useState<number>(30);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'my_jobs' | 'messages' | 'history'>('pending');
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [counterModalVisible, setCounterModalVisible] = useState(false);
  const [counterWageInput, setCounterWageInput] = useState('');
  const [counterSending, setCounterSending] = useState(false);
  const [activeTransportTrip, setActiveTransportTrip] = useState<any | null>(null);
  const [completeTripLoading, setCompleteTripLoading] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [enteredPin, setEnteredPin] = useState('');
  const [verifyingPin, setVerifyingPin] = useState(false);
  const [pinTargetBookingId, setPinTargetBookingId] = useState<number | null>(null);
  const [contractProposals, setContractProposals] = useState<any[]>([]);

  const handleToggleOnline = async () => {
    const nextStatus = !isOnline;
    setIsOnline(nextStatus);
    try {
      await api.post('/api/provider/toggle-online', { is_online: nextStatus });
    } catch {
      setIsOnline(!nextStatus);
    }
  };

  const waveAnim = useRef(new Animated.Value(0.3)).current;

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

  const speakJobDetails = (job: PendingJob) => {
    if (job.module === 'transport') {
      const text = job.tts_speech_text || `आपके लिए नया गाड़ी अनुरोध आया है। ${job.work_type || 'सवारी या माल'}। किराया ₹${job.wage || 200} रुपये प्रस्तावित है।`;
      setIsSpeaking(true);
      Speech.speak(text, {
        language: 'hi-IN',
        onDone: () => setIsSpeaking(false),
        onError: () => setIsSpeaking(false)
      });
      return;
    }

    const isDriver = job.module === 'driver';
    const workerNoun = isDriver ? 'ड्राइवर' : 'मजदूरों';
    const shiftStr = job.time_shift === 'full_day' ? '8 घंटे का काम' : 'हाफ डे काम';
    const timeStr = job.start_time === 'tomorrow_morning' ? 'कल सुबह जाना है' : 'आज जाना है';
    const text = isDriver
      ? `आपके लिए नया ड्राइवर काम है। ${job.labour_count ?? 1} ड्राइवर की जरूरत है। ${job.wage ?? 600} रूपए मिलेंगे।`
      : `आपके लिए नया काम है। ${job.labour_count ?? 1} मजदूरों की जरूरत है। ${shiftStr} है, ${timeStr}, ${job.wage ?? 600} रूपए मिलेंगे।`;

    setIsSpeaking(true);
    Speech.speak(text, {
      language: 'hi-IN',
      onDone: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false)
    });
  };

  const [providerCategory, setProviderCategory] = useState<string>('labour');
  const lastSpokenJobId = useRef<number | null>(null);
  const handledJobIds = useRef<Set<number>>(new Set());

  const checkPendingRequests = useCallback(async (forcedCat?: string) => {
    try {
      const activeCat = (forcedCat || providerCategory || 'labour').toLowerCase();

      const [labourRes, driverRes, karigarRes, transportRes, contractRes] = await Promise.allSettled([
        api.get('/api/labour/provider/pending'),
        api.get('/api/driver/provider/pending'),
        api.get('/api/karigar/provider/pending'),
        api.get('/api/transport/driver/pending'),
        api.get('/api/contractor/proposal/contractor/inbox'),
      ]);

      if (contractRes.status === 'fulfilled' && Array.isArray(contractRes.value.data)) {
        setContractProposals(contractRes.value.data);
      }

      let newJob: PendingJob | null = null;

      if (activeCat === 'labour' || activeCat === 'majdoor') {
        if (labourRes.status === 'fulfilled' && labourRes.value.data?.has_request) {
          newJob = { ...labourRes.value.data, module: 'labour' };
        }
      } else if (activeCat === 'karigar') {
        if (karigarRes.status === 'fulfilled' && karigarRes.value.data?.has_request) {
          const k = karigarRes.value.data;
          const karigarLabel = k.karigar_type ? ` कारीगर (${k.karigar_type})` : 'कारीगर';
          newJob = {
            ...k,
            labour_count: k.karigar_count ?? 1,
            labour_type: karigarLabel,
            work_type: k.work_type || k.description || 'कारीगर कार्य',
            module: 'karigar'
          };
        }
      } else if (activeCat === 'driver') {
        if (driverRes.status === 'fulfilled' && driverRes.value.data?.has_request) {
          const d = driverRes.value.data;
          const driverLabel = d.driver_type ? `ड्राइवर (${d.driver_type}${d.vehicle_type ? ' - ' + d.vehicle_type : ''})` : 'पर्सनल / कमर्शियल ड्राइवर';
          newJob = {
            ...d,
            labour_count: d.num_drivers ?? 1,
            labour_type: driverLabel,
            work_type: d.work_type || d.description || 'ड्राइविंग कार्य (Driving Work)',
            module: 'driver'
          };
        }
      } else if (activeCat === 'transport' || activeCat === 'vehicle') {
        if (transportRes.status === 'fulfilled' && transportRes.value.data?.has_request) {
          const tr = transportRes.value.data;
          newJob = {
            ...tr,
            job_id: tr.booking_id,
            labour_count: 1,
            labour_type: `परिवहन (${tr.vehicle_type_label || tr.vehicle_type || 'वाहन'})`,
            work_type: tr.work_description || `${tr.pickup_address} से ${tr.drop_address}`,
            wage: tr.offered_fare || tr.total_fare,
            address: `${tr.pickup_address} ➔ ${tr.drop_address}`,
            module: 'transport',
            messages: tr.messages ?? [],
            status: tr.status ?? 'searching',
            service_type: tr.service_type,
            service_label: tr.service_label,
            vehicle_type: tr.vehicle_type,
            vehicle_type_label: tr.vehicle_type_label,
            pickup_address: tr.pickup_address,
            drop_address: tr.drop_address,
            distance_km: tr.distance_km,
            work_description: tr.work_description,
            offered_fare: tr.offered_fare,
            total_fare: tr.total_fare,
            commission_pct: tr.commission_pct,
            commission_amount: tr.commission_amount,
            driver_net_earnings: tr.driver_net_earnings,
            tts_speech_text: tr.tts_speech_text,
            timeout_seconds: tr.timeout_seconds,
            remaining_seconds: tr.remaining_seconds,
          };
        }
      } else {
        // Fallback for generic category
        if (labourRes.status === 'fulfilled' && labourRes.value.data?.has_request) {
          newJob = { ...labourRes.value.data, module: 'labour' };
        } else if (karigarRes.status === 'fulfilled' && karigarRes.value.data?.has_request) {
          const k = karigarRes.value.data;
          newJob = {
            ...k,
            labour_count: k.karigar_count ?? 1,
            labour_type: k.karigar_type ? ` कारीगर (${k.karigar_type})` : 'कारीगर',
            work_type: k.work_type || k.description || 'कारीगर कार्य',
            module: 'karigar'
          };
        }
      }

      // Ignore jobs already accepted/rejected in this session
      if (newJob && newJob.job_id && handledJobIds.current.has(newJob.job_id)) {
        newJob = null;
      }

      setPending(prev => {
        if (newJob) {
          const isBrandNewJob = !prev || prev.job_id !== newJob.job_id;
          const isCounterChange = prev && prev.job_id === newJob.job_id && (prev.wage !== newJob.wage || (newJob.messages && newJob.messages.length !== (prev.messages || []).length));

          if (isBrandNewJob || isCounterChange) {
            const secs = newJob.remaining_seconds !== undefined
              ? Math.max(10, Math.floor(newJob.remaining_seconds))
              : (newJob.timeout_seconds ?? 120);
            setCountdown(secs);

            if (isBrandNewJob && newJob.job_id && lastSpokenJobId.current !== newJob.job_id && newJob.status !== 'negotiating') {
              lastSpokenJobId.current = newJob.job_id ?? null;
              speakJobDetails(newJob);
            }
          }
          return newJob;
        } else {
          return null;
        }
      });
    } catch {
      // silent
    }
  }, [providerCategory]);

  const fetchData = useCallback(async () => {
    try {
      const [dashRes, labourHist, driverHist, karigarHist, walletRes, transportBookingsRes, contractInboxRes] = await Promise.allSettled([
        api.get('/api/provider/dashboard'),
        api.get('/api/labour/provider/history'),
        api.get('/api/driver/provider/history'),
        api.get('/api/karigar/provider/history'),
        api.get('/api/wallet'),
        api.get('/api/transport/driver/bookings'),
        api.get('/api/contractor/proposal/contractor/inbox'),
      ]);

      if (contractInboxRes.status === 'fulfilled' && Array.isArray(contractInboxRes.value.data)) {
        setContractProposals(contractInboxRes.value.data);
      }

      if (walletRes.status === 'fulfilled' && walletRes.value.data?.balance !== undefined) {
        setWalletBalance(walletRes.value.data.balance);
      }

      let detectedCat = 'labour';
      if (dashRes.status === 'fulfilled' && dashRes.value.data?.category) {
        detectedCat = String(dashRes.value.data.category).toLowerCase();
        setProviderCategory(detectedCat);
      }

      if (dashRes.status === 'fulfilled' && dashRes.value.data?.is_online !== undefined) {
        setIsOnline(dashRes.value.data.is_online);
      }

      if (transportBookingsRes.status === 'fulfilled' && Array.isArray(transportBookingsRes.value.data)) {
        const activeTrip = transportBookingsRes.value.data.find((b: any) => b.status === 'accepted' || b.status === 'active');
        if (activeTrip) {
          try {
            const agreeRes = await api.get(`/api/transport/booking/${activeTrip.id}/agreement`);
            setActiveTransportTrip(agreeRes.data);
          } catch {
            setActiveTransportTrip(activeTrip);
          }
        } else {
          setActiveTransportTrip(null);
        }
      }

      let combinedHistory: HistoryItem[] = [];

      // Category-Based Strict Isolation for "मेरे काम" (My Jobs)
      if (detectedCat === 'labour' || detectedCat === 'majdoor') {
        if (labourHist.status === 'fulfilled' && Array.isArray(labourHist.value.data)) {
          combinedHistory = labourHist.value.data.map((item: any) => ({ ...item, module: 'labour' }));
        }
      } else if (detectedCat === 'karigar') {
        if (karigarHist.status === 'fulfilled' && Array.isArray(karigarHist.value.data)) {
          combinedHistory = karigarHist.value.data.map((item: any) => ({ ...item, module: 'karigar' }));
        }
      } else if (detectedCat === 'driver') {
        if (driverHist.status === 'fulfilled' && Array.isArray(driverHist.value.data)) {
          combinedHistory = driverHist.value.data.map((item: any) => ({ ...item, module: 'driver' }));
        }
      } else if (detectedCat === 'transport' || detectedCat === 'vehicle') {
        if (transportBookingsRes.status === 'fulfilled' && Array.isArray(transportBookingsRes.value.data)) {
          const tList: HistoryItem[] = transportBookingsRes.value.data.map((item: any) => ({
            job_id: item.id || item.booking_id,
            status: item.status,
            module: 'transport' as const,
            service_type: item.service_type,
            vehicle_type: item.vehicle_type,
            pickup_address: item.pickup_address,
            drop_address: item.drop_address,
            address: `${item.pickup_address} ➔ ${item.drop_address}`,
            distance_km: item.distance_km,
            wage: item.agreed_fare || item.offered_fare || item.total_fare,
            total_fare: item.total_fare,
            agreed_fare: item.agreed_fare,
            commission_amount: item.commission_amount,
            driver_net_earnings: (item.agreed_fare || item.total_fare) - (item.commission_amount || 0),
            work_description: item.work_description,
            description: item.work_description,
            customer_name: item.customer_name,
            customer_phone: item.customer_phone,
            secret_pin: item.secret_pin,
            created_at: item.created_at,
            labour_type: item.service_type === 'goods' ? 'माल परिवहन (Goods)' : item.service_type === 'delivery' ? 'डिलीवरी (Delivery)' : 'यात्री सेवा (Passenger)',
          }));
          combinedHistory = tList;
        }
      } else {
        if (labourHist.status === 'fulfilled' && Array.isArray(labourHist.value.data)) {
          combinedHistory = [...combinedHistory, ...labourHist.value.data.map((item: any) => ({ ...item, module: 'labour' }))];
        }
        if (driverHist.status === 'fulfilled' && Array.isArray(driverHist.value.data)) {
          combinedHistory = [...combinedHistory, ...driverHist.value.data.map((item: any) => ({ ...item, module: 'driver' }))];
        }
        if (karigarHist.status === 'fulfilled' && Array.isArray(karigarHist.value.data)) {
          combinedHistory = [...combinedHistory, ...karigarHist.value.data.map((item: any) => ({ ...item, module: 'karigar' }))];
        }
      }

      setHistory(combinedHistory);

      await checkPendingRequests(detectedCat);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [checkPendingRequests]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => checkPendingRequests(), 5000);
    return () => clearInterval(interval);
  }, [fetchData, checkPendingRequests]);

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
    const currentJobId = pending.job_id;
    const mod = pending.module || 'labour';

    Speech.stop();
    setIsSpeaking(false);
    setPending(null);
    handledJobIds.current.add(currentJobId);
    setAccepting(true);

    if (mod === 'transport') {
      const commAmt = pending.commission_amount ?? Math.round((Number(pending.wage) || 200) * 0.07);
      if (walletBalance !== null && walletBalance < commAmt) {
        handledJobIds.current.delete(currentJobId);
        const shortage = Math.round(commAmt - walletBalance);
        Alert.alert(
          'वॉलेट में बैलेंस कम है',
          `इस बुकिंग को स्वीकार करने के लिए वॉलेट में कम से कम ₹${commAmt} (कमीशन) होना चाहिए। (कमी: ₹${shortage})\n\nकृपया पहले रिचार्ज करें।`,
          [
            { text: 'रद्द करें', style: 'cancel' },
            { text: 'रिचार्ज करें', onPress: () => setShowRechargeModal(true) },
          ]
        );
        setAccepting(false);
        return;
      }

      try {
        const res = await api.post('/api/transport/driver/accept', { booking_id: currentJobId });
        Alert.alert('✅ स्वीकृत!', 'गाड़ी बुकिंग स्वीकार कर ली गई है! डिजिटल समझौता तैयार है।');
        await fetchData();
      } catch (err: any) {
        handledJobIds.current.delete(currentJobId);
        const detail = err?.response?.data?.detail;
        if (detail && (detail.includes('वॉलेट') || detail.includes('बैलेंस'))) {
          Alert.alert('वॉलेट बैलेंस कम है', detail, [
            { text: 'रद्द करें', style: 'cancel' },
            { text: 'तुरंत रिचार्ज करें', onPress: () => setShowRechargeModal(true) },
          ]);
        } else {
          Alert.alert('❌ अस्वीकृत', detail || (lang === 'hi' ? 'बुकिंग स्वीकार नहीं हो सकी।' : 'Could not accept booking.'));
        }
      } finally {
        setAccepting(false);
      }
      return;
    }

    try {
      const res = await api.post(`/api/${mod}/provider/accept`, { job_id: currentJobId });
      Alert.alert(
        '✅ Success',
        lang === 'hi'
          ? 'Request Accept Ho Gayi! Customer ka phone number: ' + (res.data.customer_phone ?? 'N/A')
          : 'Request Accepted! Customer phone: ' + (res.data.customer_phone ?? 'N/A'),
      );
      await fetchData();
    } catch (err: any) {
      handledJobIds.current.delete(currentJobId);
      Alert.alert('❌', err.response?.data?.detail || (lang === 'hi' ? 'Request accept nahi hui.' : 'Could not accept request.'));
      await fetchData();
    } finally {
      setAccepting(false);
    }
  };

  const handleSendCounterOffer = async () => {
    if (!pending?.job_id || !counterWageInput.trim()) {
      Alert.alert('त्रुटि', 'कृपया अपना प्रस्तावित किराया दर्ज करें।');
      return;
    }
    const wageNum = parseFloat(counterWageInput);
    if (isNaN(wageNum) || wageNum <= 0) {
      Alert.alert('त्रुटि', 'कृपया सही किराया दर्ज करें।');
      return;
    }

    setCounterSending(true);
    try {
      if (pending.module === 'transport') {
        await api.post('/api/transport/driver/counter', {
          booking_id: pending.job_id,
          wage: wageNum,
          message: `मेरा किराया ₹${wageNum} रहेगा।`,
        });
      } else {
        const mod = pending.module || 'labour';
        await api.post(`/api/${mod}/negotiation/send`, {
          job_id: pending.job_id,
          type: 'offer',
          content: `मेरा रेट ₹${wageNum} रहेगा।`,
          wage: wageNum,
          message: `मेरा रेट ₹${wageNum} रहेगा।`,
        });
      }
      const targetJobId = pending.job_id;
      const targetModule = pending.module || 'labour';
      setCounterModalVisible(false);
      setCounterWageInput('');
      navigation.navigate('NegotiationChatScreen', {
        job_id: targetJobId,
        module: targetModule,
      });
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      if (detail && (detail.includes('वॉलेट') || detail.includes('बैलेंस'))) {
        Alert.alert(
          'वॉलेट बैलेंस कम है',
          detail,
          [
            { text: 'रद्द करें', style: 'cancel' },
            { text: 'तुरंत रिचार्ज करें', onPress: () => setShowRechargeModal(true) },
          ]
        );
      } else {
        Alert.alert('त्रुटि', detail || 'काउंटर-ऑफ़र नहीं भेजा जा सका।');
      }
    } finally {
      setCounterSending(false);
    }
  };

  const handleReject = async () => {
    if (!pending?.job_id) return;
    Speech.stop();
    setIsSpeaking(false);
    const jobId = pending.job_id;
    const mod = pending.module || 'labour';
    handledJobIds.current.add(jobId);
    setPending(null);
    try {
      if (mod === 'transport') {
        await api.post('/api/transport/driver/reject', { booking_id: jobId });
      } else {
        await api.post(`/api/${mod}/provider/reject`, { job_id: jobId });
      }
      await fetchData();
    } catch {
      // silent
    }
  };

  const handleCompleteTransportTrip = async (specificBookingId?: number) => {
    const bId = specificBookingId || activeTransportTrip?.booking_id || activeTransportTrip?.id;
    if (!bId) return;
    setCompleteTripLoading(true);
    try {
      await api.post('/api/transport/driver/complete', {
        booking_id: bId,
      });
      Alert.alert('🎉 बधाई हो!', 'यात्रा / कार्य सफलतापूर्वक पूर्ण हुआ। आपका स्टेटस अब ऑनलाइन (Available) है।');
      setActiveTransportTrip(null);
      await fetchData();
    } catch (e: any) {
      Alert.alert('त्रुटि', e?.response?.data?.detail || 'यात्रा पूर्ण करने में समस्या आई।');
    } finally {
      setCompleteTripLoading(false);
    }
  };

  const handleVerifySecretPin = async () => {
    if (!enteredPin || enteredPin.trim().length !== 4) {
      Alert.alert('अमान्य पिन', 'कृपया ग्राहक से 4-अंकों का सत्यापन पिन पूछकर दर्ज करें।');
      return;
    }
    const bId = pinTargetBookingId || activeTransportTrip?.booking_id || activeTransportTrip?.id;
    if (!bId) return;

    setVerifyingPin(true);
    try {
      await api.post('/api/transport/verify-pin', {
        booking_id: bId,
        pin: enteredPin.trim(),
      });
      Alert.alert('🎉 सत्यापन सफल!', 'पिन सत्यापित हो गया है। यात्रा प्रारंभ हो चुकी है।');
      setShowPinModal(false);
      setEnteredPin('');
      await fetchData();
    } catch (err: any) {
      Alert.alert('त्रुटि', err?.response?.data?.detail || 'गलत पिन दर्ज किया गया है। कृपया ग्राहक से दोबारा पूछें।');
    } finally {
      setVerifyingPin(false);
    }
  };

  const handleShareAgreement = async () => {
    if (!activeTransportTrip) return;
    const text = `🚗 श्रम सारथी नेटवर्क - डिजिटल परिवहन एवं कार्य समझौता\n` +
      `Booking ID: ${activeTransportTrip.booking_id_formatted || 'SSN-TR-' + activeTransportTrip.id}\n` +
      `स्थिति: ${activeTransportTrip.status || 'स्वीकृत'}\n` +
      `सेवा प्रकार: ${activeTransportTrip.service_type_label || 'परिवहन'} | गाड़ी: ${activeTransportTrip.vehicle_type_label || ''} (${activeTransportTrip.vehicle_number || ''})\n` +
      `पिकअप: ${activeTransportTrip.pickup_address}\n` +
      `ड्रॉप: ${activeTransportTrip.drop_address}\n` +
      `कुल दूरी: ${activeTransportTrip.distance_km} KM\n` +
      `कार्य विवरण: "${activeTransportTrip.agreed_work_details || activeTransportTrip.work_description || ''}"\n` +
      `अंतिम तय किराया: ₹${activeTransportTrip.agreed_fare || activeTransportTrip.total_fare}.00\n` +
      `भुगतान: ${activeTransportTrip.payment_mode || 'ड्राइवर को नकद / UPI'}\n` +
      `प्लेटफॉर्म कमीशन: ₹${activeTransportTrip.commission_amount} (कट चुका)\n` +
      `ग्राहक संपर्क: ${activeTransportTrip.customer_name || 'ग्राहक'} (${activeTransportTrip.customer_phone || ''})\n` +
      `नियम: ${activeTransportTrip.terms || 'तय किराये से अतिरिक्त कोई मांग मान्य नहीं होगी।'}`;

    try {
      await Share.share({ message: text });
    } catch {}
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

  const distanceVal = pending?.distance_km ?? 2.5;
  const bookedSpots = pending?.booked_spots ?? 0;
  const totalSpots = pending?.labour_count ?? 2;
  const leftSpots = Math.max(0, totalSpots - bookedSpots);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ── Top Bar Header ── */}
      <View style={styles.topHeader}>
        <Text style={styles.brandMain}>श्रम सारथी</Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {/* Online / Offline Toggle Button */}
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: isOnline ? '#E8F5E9' : '#FFEBEE',
              borderWidth: 1,
              borderColor: isOnline ? '#A5D6A7' : '#FFCDD2',
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 14,
              gap: 6
            }}
            onPress={handleToggleOnline}
            activeOpacity={0.8}
          >
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: isOnline ? '#2E7D32' : '#C62828' }} />
            <Text style={{ fontSize: 12, fontWeight: 'bold', color: isOnline ? '#1B5E20' : '#C62828' }}>
              {isOnline ? '🟢 ऑनलाइन' : '🔴 ऑफलाइन'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.bellBtn} onPress={() => setShowNotifModal(true)}>
            <Ionicons name="notifications-outline" size={24} color="#333" />
            <View style={styles.badgeDot}>
              <Text style={styles.badgeText}>{pending?.has_request ? '1' : '0'}</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>


      {/* ── Notifications Modal ── */}
      <Modal visible={showNotifModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <Surface style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="notifications" size={20} color="#E65100" style={{ marginRight: 6 }} />
                <Text style={styles.modalTitle}>सभी नोटिफिकेशन (All Notifications)</Text>
              </View>
              <TouchableOpacity onPress={() => setShowNotifModal(false)} style={{ padding: 4 }}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 14 }}>
              {pending?.has_request && (
                <TouchableOpacity
                  style={styles.notifItemCard}
                  onPress={() => {
                    setShowNotifModal(false);
                    setActiveTab('pending');
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    <Ionicons name="alert-circle" size={18} color="#D84315" style={{ marginRight: 6 }} />
                    <Text style={styles.notifItemTitle}>नया काम उपलब्ध है! (Job #{pending.job_id})</Text>
                  </View>
                  <Text style={styles.notifItemDesc}>
                    {pending.work_type || pending.labour_type} • ₹{pending.wage}/दिन • {distanceVal} KM दूर
                  </Text>
                </TouchableOpacity>
              )}

              {history.map(item => (
                <View key={item.job_id} style={styles.notifItemCard}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    <Ionicons name="checkmark-circle" size={18} color="#2E7D32" style={{ marginRight: 6 }} />
                    <Text style={styles.notifItemTitle}>जॉब #{item.job_id} - {item.labour_type}</Text>
                  </View>
                  <Text style={styles.notifItemDesc}>📍 {item.address} (Status: {item.status})</Text>
                </View>
              ))}

              {!pending?.has_request && history.length === 0 && (
                <Text style={{ textAlign: 'center', color: '#888', marginVertical: 20 }}>
                  कोई नई नोटिफिकेशन नहीं है।
                </Text>
              )}
            </ScrollView>
          </Surface>
        </View>
      </Modal>

      {/* ── Cross Offer Modal (अपना दाम बताएं) ── */}
      <Modal visible={counterModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <Surface style={[styles.modalContent, { padding: 20 }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontSize: 20, marginRight: 8 }}>🤝</Text>
                <Text style={styles.modalTitle}>अपना दाम बताएं (Cross Offer)</Text>
              </View>
              <TouchableOpacity onPress={() => setCounterModalVisible(false)} style={{ padding: 4 }}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={{ marginVertical: 14 }}>
              <Text style={{ fontSize: 13, color: '#666', marginBottom: 4 }}>
                प्रस्तावित किराया: <Text style={{ fontWeight: 'bold', color: '#1B5E20' }}>₹{pending?.offered_fare || pending?.wage || 200}</Text>
              </Text>
              <Text style={{ fontSize: 13, color: '#333', fontWeight: '600', marginTop: 8, marginBottom: 6 }}>
                आपका प्रस्तावित किराया (₹):
              </Text>
              <TextInput
                mode="outlined"
                keyboardType="numeric"
                value={counterWageInput}
                onChangeText={setCounterWageInput}
                placeholder="उदा. 220"
                style={{ backgroundColor: '#fff', fontSize: 18 }}
                outlineColor="#E0E0E0"
                activeOutlineColor="#F26333"
              />

              <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                {[-20, 20, 50, 100].map(delta => {
                  const base = Number(pending?.offered_fare || pending?.wage || 200);
                  const target = Math.max(30, base + delta);
                  return (
                    <TouchableOpacity
                      key={delta}
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        backgroundColor: '#FFF3E0',
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: '#FFE0B2',
                      }}
                      onPress={() => setCounterWageInput(String(target))}
                    >
                      <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#E65100' }}>
                        {delta > 0 ? `+₹${delta}` : `-₹${Math.abs(delta)}`}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
              <Button
                mode="outlined"
                style={{ flex: 1, borderColor: '#999' }}
                textColor="#666"
                onPress={() => setCounterModalVisible(false)}
              >
                रद्द करें
              </Button>
              <Button
                mode="contained"
                loading={counterSending}
                disabled={counterSending}
                style={{ flex: 2, backgroundColor: '#F26333' }}
                labelStyle={{ fontWeight: 'bold', color: '#fff' }}
                onPress={handleSendCounterOffer}
              >
                ऑफ़र भेजें ➔
              </Button>
            </View>
          </Surface>
        </View>
      </Modal>

      {/* ── Sub Navigation Tabs ── */}
      {(() => {
        const actionableProposals = contractProposals.filter((p: any) => p.is_actionable || p.offer_status === 'pending' || p.offer_status === 'countered');
        const lockedProposals = contractProposals.filter((p: any) => p.status === 'locked');
        const pendingCount = (pending?.has_request ? 1 : 0) + actionableProposals.length;
        const myJobsCount = history.length + (activeTransportTrip ? 1 : 0) + lockedProposals.length;

        return (
          <View style={styles.navTabsContainer}>
            <Text style={styles.navHeaderTitle}>नोटिफिकेशन</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
              <TouchableOpacity
                style={[styles.tabItem, activeTab === 'pending' && styles.activeTabItem]}
                onPress={() => setActiveTab('pending')}
              >
                <Ionicons name="notifications" size={16} color={activeTab === 'pending' ? '#E65100' : '#666'} />
                <Text style={[styles.tabText, activeTab === 'pending' && styles.activeTabText]}>
                  नया काम ({pendingCount})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabItem, activeTab === 'my_jobs' && styles.activeTabItem]}
                onPress={() => setActiveTab('my_jobs')}
              >
                <Ionicons name="briefcase-outline" size={16} color={activeTab === 'my_jobs' ? '#E65100' : '#666'} />
                <Text style={[styles.tabText, activeTab === 'my_jobs' && styles.activeTabText]}>
                  मेरे काम ({myJobsCount})
                </Text>
              </TouchableOpacity>

              {contractProposals.length > 0 && (
                <TouchableOpacity
                  style={[styles.tabItem, { backgroundColor: '#FFF4E5', borderColor: '#FF9800', borderWidth: 1 }]}
                  onPress={() => navigation.navigate('ContractorProposalInbox')}
                >
                  <Ionicons name="document-text-outline" size={16} color="#E65100" />
                  <Text style={[styles.tabText, { color: '#E65100', fontWeight: 'bold' }]}>
                    ठेका इनबॉक्स ({contractProposals.length})
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.tabItem, activeTab === 'messages' && styles.activeTabItem]}
                onPress={() => setActiveTab('messages')}
              >
                <Ionicons name="chatbox-outline" size={16} color={activeTab === 'messages' ? '#E65100' : '#666'} />
                <Text style={[styles.tabText, activeTab === 'messages' && styles.activeTabText]}>मैसेज</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabItem, activeTab === 'history' && styles.activeTabItem]}
                onPress={() => setActiveTab('history')}
              >
                <Ionicons name="time-outline" size={16} color={activeTab === 'history' ? '#E65100' : '#666'} />
                <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>इतिहास</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        );
      })()}

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {activeTab === 'pending' && (
          <>
            {/* 1. Active Transport Trip Agreement (यदि कोई सक्रिय यात्रा चल रही है) */}
            {activeTransportTrip ? (
              <Surface style={[styles.jobAlertCard, { borderColor: '#81C784', borderWidth: 1.5, marginBottom: 16 }]}>
                <View style={[styles.alertHeaderRow, { marginBottom: 8 }]}>
                  <View style={styles.alertTitleGroup}>
                    <View style={[styles.orangeBellCircle, { backgroundColor: '#2E7D32' }]}>
                      <Ionicons name="shield-checkmark" size={20} color="#fff" />
                    </View>
                    <View>
                      <Text style={[styles.alertMainTitle, { color: '#1B5E20' }]}>डिजिटल यात्रा व कार्य समझौता</Text>
                      <Text style={[styles.alertSubTitle, { color: '#2E7D32' }]}>Booking #{activeTransportTrip.booking_id || activeTransportTrip.id}</Text>
                    </View>
                  </View>
                  <View style={[styles.timePill, { backgroundColor: '#E8F5E9' }]}>
                    <Text style={[styles.timePillText, { color: '#2E7D32' }]}>🟢 स्वीकृत (Locked)</Text>
                  </View>
                </View>

                {/* Details Grid */}
                <View style={[styles.detailsGrid, { backgroundColor: '#F1F8E9', borderColor: '#C8E6C9' }]}>
                  <View style={styles.gridRow}>
                    <View style={styles.gridKeyCell}>
                      <Ionicons name="person-outline" size={16} color="#555" />
                      <Text style={styles.gridKeyText}>ग्राहक (Customer)</Text>
                    </View>
                    <Text style={styles.gridSep}>:</Text>
                    <Text style={styles.gridValText}>{activeTransportTrip.customer_name || 'ग्राहक'} ({activeTransportTrip.customer_phone || ''})</Text>
                  </View>

                  <View style={styles.gridRow}>
                    <View style={styles.gridKeyCell}>
                      <Ionicons name="car-outline" size={16} color="#555" />
                      <Text style={styles.gridKeyText}>गाड़ी व सेवा</Text>
                    </View>
                    <Text style={styles.gridSep}>:</Text>
                    <Text style={styles.gridValText}>{activeTransportTrip.service_type_label || 'परिवहन'} - {activeTransportTrip.vehicle_type_label || ''}</Text>
                  </View>

                  <View style={styles.gridRow}>
                    <View style={styles.gridKeyCell}>
                      <Ionicons name="navigate-outline" size={16} color="#555" />
                      <Text style={styles.gridKeyText}>पिकअप स्थान</Text>
                    </View>
                    <Text style={styles.gridSep}>:</Text>
                    <Text style={styles.gridValText}>{activeTransportTrip.pickup_address}</Text>
                  </View>

                  <View style={styles.gridRow}>
                    <View style={styles.gridKeyCell}>
                      <Ionicons name="location-outline" size={16} color="#555" />
                      <Text style={styles.gridKeyText}>ड्रॉप स्थान</Text>
                    </View>
                    <Text style={styles.gridSep}>:</Text>
                    <Text style={styles.gridValText}>{activeTransportTrip.drop_address}</Text>
                  </View>

                  <View style={styles.gridRow}>
                    <View style={styles.gridKeyCell}>
                      <Ionicons name="cash-outline" size={16} color="#555" />
                      <Text style={styles.gridKeyText}>कुल किराया</Text>
                    </View>
                    <Text style={styles.gridSep}>:</Text>
                    <Text style={[styles.gridValText, { color: '#1B5E20', fontSize: 14, fontWeight: 'bold' }]}>
                      ₹{activeTransportTrip.agreed_fare || activeTransportTrip.total_fare}.00
                    </Text>
                  </View>

                  <View style={styles.gridRow}>
                    <View style={styles.gridKeyCell}>
                      <Ionicons name="cut-outline" size={16} color="#555" />
                      <Text style={styles.gridKeyText}>सारथी कमीशन (7%)</Text>
                    </View>
                    <Text style={styles.gridSep}>:</Text>
                    <Text style={[styles.gridValText, { color: '#D32F2F', fontWeight: '600' }]}>
                      -₹{activeTransportTrip.commission_amount || 0} (वॉलेट से कटा)
                    </Text>
                  </View>

                  <View style={styles.gridRow}>
                    <View style={styles.gridKeyCell}>
                      <Ionicons name="wallet-outline" size={16} color="#2E7D32" />
                      <Text style={[styles.gridKeyText, { color: '#2E7D32', fontWeight: 'bold' }]}>आपकी शुद्ध कमाई</Text>
                    </View>
                    <Text style={styles.gridSep}>:</Text>
                    <Text style={[styles.gridValText, { color: '#2E7D32', fontWeight: 'bold', fontSize: 15 }]}>
                      ₹{((activeTransportTrip.agreed_fare || activeTransportTrip.total_fare) - (activeTransportTrip.commission_amount || 0)).toFixed(2)} (ग्राहक से लें)
                    </Text>
                  </View>
                </View>

                {/* 3 Action Buttons Row: Call, Map, Share */}
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
                  <TouchableOpacity
                    style={{ flex: 1, backgroundColor: '#2E7D32', paddingVertical: 10, borderRadius: 8, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 4 }}
                    onPress={() => {
                      if (activeTransportTrip.customer_phone) {
                        Linking.openURL(`tel:${activeTransportTrip.customer_phone}`);
                      } else {
                        Alert.alert('सूचना', 'ग्राहक का फोन नंबर उपलब्ध नहीं है।');
                      }
                    }}
                  >
                    <Ionicons name="call" size={16} color="#fff" />
                    <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 12 }}>कॉल ग्राहक</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{ flex: 1, backgroundColor: '#1565C0', paddingVertical: 10, borderRadius: 8, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 4 }}
                    onPress={() => {
                      const dest = encodeURIComponent(activeTransportTrip.drop_address || '');
                      const origin = encodeURIComponent(activeTransportTrip.pickup_address || '');
                      Linking.openURL(`https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}`);
                    }}
                  >
                    <Ionicons name="navigate" size={16} color="#fff" />
                    <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 12 }}>मैप देखें</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{ flex: 1, backgroundColor: '#475569', paddingVertical: 10, borderRadius: 8, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 4 }}
                    onPress={handleShareAgreement}
                  >
                    <Ionicons name="share-social" size={16} color="#fff" />
                    <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 12 }}>शेयर PDF</Text>
                  </TouchableOpacity>
                </View>

                {/* Status Action: Enter PIN to Start Trip OR Complete Trip */}
                {(activeTransportTrip.status === 'accepted' || !activeTransportTrip.status || activeTransportTrip.status === 'confirmed') ? (
                  <TouchableOpacity
                    style={{
                      backgroundColor: '#1565C0',
                      paddingVertical: 12,
                      borderRadius: 10,
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'row',
                      gap: 8,
                    }}
                    onPress={() => {
                      setPinTargetBookingId(activeTransportTrip.booking_id || activeTransportTrip.id);
                      setEnteredPin('');
                      setShowPinModal(true);
                    }}
                  >
                    <Ionicons name="key-outline" size={20} color="#fff" />
                    <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 14 }}>
                      🔑 ग्राहक से PIN लेकर यात्रा शुरू करें (Start Trip)
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={{
                      backgroundColor: '#1B5E20',
                      paddingVertical: 12,
                      borderRadius: 10,
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'row',
                      gap: 8,
                    }}
                    disabled={completeTripLoading}
                    onPress={() => handleCompleteTransportTrip()}
                  >
                    {completeTripLoading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-done-circle" size={20} color="#4ADE80" />
                        <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 14 }}>🏁 कार्य / यात्रा पूर्ण करें (Complete Done)</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </Surface>
            ) : null}

            {/* 2. Pending / Incoming Request Alert */}
            {pending?.has_request && pending.job_id ? (
              pending.module === 'transport' ? (
                /* ── TRANSPORT ALERT CARD (Blueprint Specs) ── */
                <Surface style={styles.jobAlertCard}>
                  {/* Alert Header Row */}
                  <View style={styles.alertHeaderRow}>
                    <View style={styles.alertTitleGroup}>
                      <View style={styles.orangeBellCircle}>
                        <Ionicons name="car-sport" size={20} color="#fff" />
                      </View>
                      <View>
                        <Text style={styles.alertMainTitle}>नया परिवहन अनुरोध!</Text>
                        <Text style={styles.alertSubTitle}>(Live Transport Alert)</Text>
                      </View>
                    </View>

                    <View style={styles.timePill}>
                      <Text style={styles.timePillText}>{getRelativeTime(pending.assigned_at || pending.created_at)}</Text>
                    </View>
                  </View>

                  {/* AI Voice Waveform Banner */}
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
                        "{pending.tts_speech_text || `नया गाड़ी अनुरोध आया है। ${pending.work_type}। प्रस्तावित किराया ₹${pending.wage} रुपये है।`}"
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

                  {/* Key-Value Details Grid */}
                  <View style={styles.detailsGrid}>
                    <View style={styles.gridRow}>
                      <View style={styles.gridKeyCell}>
                        <Ionicons name="car-outline" size={16} color="#555" />
                        <Text style={styles.gridKeyText}>गाड़ी व सेवा</Text>
                      </View>
                      <Text style={styles.gridSep}>:</Text>
                      <Text style={styles.gridValWork}>
                        {pending.service_label || 'यात्री (Passenger)'} - {pending.vehicle_type_label || pending.vehicle_type || 'वाहन'}
                      </Text>
                    </View>

                    <View style={styles.gridRow}>
                      <View style={styles.gridKeyCell}>
                        <Ionicons name="navigate-outline" size={16} color="#555" />
                        <Text style={styles.gridKeyText}>पिकअप स्थान</Text>
                      </View>
                      <Text style={styles.gridSep}>:</Text>
                      <Text style={styles.gridValText}>{pending.pickup_address}</Text>
                    </View>

                    <View style={styles.gridRow}>
                      <View style={styles.gridKeyCell}>
                        <Ionicons name="location-outline" size={16} color="#555" />
                        <Text style={styles.gridKeyText}>ड्रॉप स्थान</Text>
                      </View>
                      <Text style={styles.gridSep}>:</Text>
                      <Text style={styles.gridValText}>{pending.drop_address}</Text>
                    </View>

                    <View style={styles.gridRow}>
                      <View style={styles.gridKeyCell}>
                        <Ionicons name="map-outline" size={16} color="#555" />
                        <Text style={styles.gridKeyText}>कुल दूरी</Text>
                      </View>
                      <Text style={styles.gridSep}>:</Text>
                      <Text style={styles.gridValText}>{pending.distance_km ?? distanceVal} KM</Text>
                    </View>

                    {!!pending.work_description && (
                      <View style={styles.gridRow}>
                        <View style={styles.gridKeyCell}>
                          <Ionicons name="clipboard-outline" size={16} color="#555" />
                          <Text style={styles.gridKeyText}>कार्य विवरण</Text>
                        </View>
                        <Text style={styles.gridSep}>:</Text>
                        <Text style={styles.gridValText}>"{pending.work_description}"</Text>
                      </View>
                    )}

                    <View style={styles.gridRow}>
                      <View style={styles.gridKeyCell}>
                        <Ionicons name="cash-outline" size={16} color="#555" />
                        <Text style={styles.gridKeyText}>प्रस्तावित किराया</Text>
                      </View>
                      <Text style={styles.gridSep}>:</Text>
                      <Text style={[styles.gridValText, { color: '#E65100', fontSize: 14 }]}>
                        ₹{pending.offered_fare || pending.wage}
                      </Text>
                    </View>

                    <View style={styles.gridRow}>
                      <View style={styles.gridKeyCell}>
                        <Ionicons name="cut-outline" size={16} color="#555" />
                        <Text style={styles.gridKeyText}>कमीशन ({pending.commission_pct || 7}%)</Text>
                      </View>
                      <Text style={styles.gridSep}>:</Text>
                      <Text style={styles.gridValText}>
                        ₹{pending.commission_amount || (Number(pending.wage) * 0.07).toFixed(2)} (वॉलेट से कटेगा)
                      </Text>
                    </View>

                    <View style={styles.gridRow}>
                      <View style={styles.gridKeyCell}>
                        <Ionicons name="wallet-outline" size={16} color="#555" />
                        <Text style={styles.gridKeyText}>शुद्ध कमाई (Net)</Text>
                      </View>
                      <Text style={styles.gridSep}>:</Text>
                      <Text style={[styles.gridValText, { color: '#2E7D32' }]}>
                        ₹{pending.driver_net_earnings || (Number(pending.wage) * 0.93).toFixed(2)}
                      </Text>
                    </View>
                  </View>

                  {/* Live Negotiation Messages Box (यदि बातचीत है) */}
                  {pending.messages && pending.messages.length > 0 && (
                    <View style={{ backgroundColor: '#FFF3E0', padding: 10, borderRadius: 10, marginBottom: 12, borderWidth: 1, borderColor: '#FFE0B2' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <Ionicons name="chatbubbles" size={16} color="#E65100" />
                        <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#E65100' }}>लाइव मोलभाव बातचीत (Live Negotiation):</Text>
                      </View>
                      {pending.messages.map((m: any, idx: number) => {
                        const isMe = m.sender === 'driver' || m.sender === 'provider';
                        return (
                          <View key={idx} style={{
                            alignSelf: isMe ? 'flex-end' : 'flex-start',
                            backgroundColor: isMe ? '#E8F5E9' : '#fff',
                            borderColor: isMe ? '#A5D6A7' : '#E0E0E0',
                            borderWidth: 1,
                            paddingHorizontal: 10,
                            paddingVertical: 5,
                            borderRadius: 8,
                            marginVertical: 2,
                            maxWidth: '90%',
                          }}>
                            <Text style={{ fontSize: 10, fontWeight: 'bold', color: isMe ? '#2E7D32' : '#1565C0' }}>
                              {isMe ? '👨‍✈️ आप (ड्राइवर)' : '👤 ग्राहक'}
                            </Text>
                            <Text style={{ fontSize: 12, color: '#333', marginTop: 1 }}>{m.message || `किराया: ₹${m.wage}`}</Text>
                          </View>
                        );
                      })}
                    </View>
                  )}

                  {/* Actions Row */}
                  {(() => {
                    const currentWage = pending.offered_fare || pending.wage || 200;

                    return (
                      <View style={{ gap: 8 }}>
                        <View style={styles.actionsRow}>
                          {/* Accept Button */}
                          <TouchableOpacity
                            style={[styles.bigBtn, styles.acceptBigBtn, accepting && { opacity: 0.6 }]}
                            disabled={accepting}
                            onPress={handleAccept}
                          >
                            <View style={styles.bigBtnHeader}>
                              <Ionicons name="checkmark-circle" size={20} color="#fff" />
                              <Text style={styles.bigBtnTitle}>स्वीकार करें</Text>
                            </View>
                            <Text style={styles.bigBtnSub}>(Accept)</Text>

                            <View style={styles.bigBtnBadge}>
                              <Text style={styles.bigBtnBadgeText}>तुरंत बुक करें ₹{currentWage} पर</Text>
                            </View>
                          </TouchableOpacity>

                          {/* Live Chat & Negotiation Screen Button */}
                          <TouchableOpacity
                            style={[styles.bigBtn, styles.offerBigBtn]}
                            onPress={() => {
                              navigation.navigate('NegotiationChatScreen', {
                                job_id: pending.job_id,
                                jobId: pending.job_id,
                                module: pending.module || 'transport',
                              });
                            }}
                          >
                            <View style={styles.bigBtnHeader}>
                              <Ionicons name="chatbubbles" size={20} color="#fff" />
                              <Text style={styles.bigBtnTitle}>चैट / मोलभाव</Text>
                            </View>
                            <Text style={styles.bigBtnSub}>(Live Chat & Counter)</Text>

                            <View style={[styles.bigBtnBadge, { backgroundColor: '#FFF3E0' }]}>
                              <Text style={[styles.bigBtnBadgeText, { color: '#E65100' }]}>मोलभाव स्क्रीन खोलें ➔</Text>
                            </View>
                          </TouchableOpacity>
                        </View>

                        {/* Reject Button */}
                        <TouchableOpacity
                          style={{
                            borderWidth: 1.5,
                            borderColor: '#E53935',
                            backgroundColor: '#FFEBEE',
                            paddingVertical: 9,
                            borderRadius: 10,
                            alignItems: 'center',
                          }}
                          onPress={handleReject}
                        >
                          <Text style={{ color: '#C62828', fontWeight: 'bold', fontSize: 13 }}>✕ मना करें (Reject)</Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })()}
                </Surface>
              ) : (
                /* ── LABOUR / DRIVER / KARIGAR ALERT CARD (PDF Page 2 & 6) ── */
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

                  {/* AI Voice Waveform Banner (PDF Page 2 & 6) */}
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
                        "आपके लिए नया काम है। {totalSpots} मजदूरों की जरूरत है। {pending.time_shift === 'full_day' ? '8 घंटे' : '4 घंटे'} का काम है, {pending.start_time === 'tomorrow_morning' || pending.start_time === 'tomorrow' ? 'कल सुबह' : 'आज'} जाना है, {pending.wage ?? 600} रूपए मिलेंगे..."
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

                  {/* Key-Value Details Grid */}
                  <View style={styles.detailsGrid}>
                    <View style={styles.gridRow}>
                      <View style={styles.gridKeyCell}>
                        <Ionicons name="clipboard-outline" size={16} color="#555" />
                        <Text style={styles.gridKeyText}>काम क्या करना है (Work)</Text>
                      </View>
                      <Text style={styles.gridSep}>:</Text>
                      <Text style={styles.gridValWork}>
                        {pending.work_type || pending.description || 'कंक्रीटिंग करना है (Concreting करना है)'}
                      </Text>
                    </View>

                    <View style={styles.gridRow}>
                      <View style={styles.gridKeyCell}>
                        <Ionicons name="person-outline" size={16} color="#555" />
                        <Text style={styles.gridKeyText}>श्रेणी (Category)</Text>
                      </View>
                      <Text style={styles.gridSep}>:</Text>
                      <Text style={styles.gridValText}>
                        {pending.labour_type || 'लेबर / अनलोडिंग मजदूर'}
                      </Text>
                    </View>

                    <View style={styles.gridRow}>
                      <View style={styles.gridKeyCell}>
                        <Ionicons name="time-outline" size={16} color="#555" />
                        <Text style={styles.gridKeyText}>शिफ्ट (Time Shift)</Text>
                      </View>
                      <Text style={styles.gridSep}>:</Text>
                      <Text style={styles.gridValText}>
                        {pending.time_shift === 'full_day' ? 'फुल डे (8 घंटे)' : (pending.time_shift === 'half_day' ? 'हाफ डे (4 घंटे)' : 'ठेका')}
                      </Text>
                    </View>

                    <View style={styles.gridRow}>
                      <View style={styles.gridKeyCell}>
                        <Ionicons name="calendar-outline" size={16} color="#555" />
                        <Text style={styles.gridKeyText}>काम शुरू होने का समय</Text>
                      </View>
                      <Text style={styles.gridSep}>:</Text>
                      <Text style={styles.gridValText}>
                        {pending.start_time === 'tomorrow_morning' || pending.start_time === 'tomorrow' ? 'कल सुबह' : 'आज'}
                      </Text>
                    </View>

                    <View style={styles.gridRow}>
                      <View style={styles.gridKeyCell}>
                        <Ionicons name="location-outline" size={16} color="#555" />
                        <Text style={styles.gridKeyText}>दूरी (Distance)</Text>
                      </View>
                      <Text style={styles.gridSep}>:</Text>
                      <Text style={styles.gridValText}>
                        आपकी लोकेशन से {distanceVal} KM दूर
                      </Text>
                    </View>

                    <View style={styles.gridRow}>
                      <View style={styles.gridKeyCell}>
                        <Ionicons name="cash-outline" size={16} color="#555" />
                        <Text style={styles.gridKeyText}>प्रस्तावित दिहाड़ी (Wage)</Text>
                      </View>
                      <Text style={styles.gridSep}>:</Text>
                      <Text style={[styles.gridValText, { color: '#E65100', fontWeight: 'bold', fontSize: 14 }]}>
                        ₹{pending.wage ?? 600} / {pending.job_mode === 'permanent' ? 'माह' : 'व्यक्ति'}
                      </Text>
                    </View>

                    <View style={styles.gridRow}>
                      <View style={styles.gridKeyCell}>
                        <Ionicons name="people-outline" size={16} color="#555" />
                        <Text style={styles.gridKeyText}>कुल {pending?.module === 'driver' ? 'ड्राइवर' : 'मजदूर'} चाहिए</Text>
                      </View>
                      <Text style={styles.gridSep}>:</Text>
                      <Text style={styles.gridValText}>
                        {totalSpots} {pending?.module === 'driver' ? 'ड्राइवर' : 'मजदूर'}
                      </Text>
                    </View>

                    {/* Live Status Row (PDF Page 2 & 6) */}
                    <View style={[styles.gridRow, { backgroundColor: '#E8F5E9', paddingVertical: 6, paddingHorizontal: 8, borderRadius: 6, marginTop: 4 }]}>
                      <View style={styles.gridKeyCell}>
                        <Ionicons name="pulse" size={16} color="#2E7D32" />
                        <Text style={[styles.gridKeyText, { color: '#2E7D32', fontWeight: 'bold' }]}>Live Status</Text>
                      </View>
                      <Text style={styles.gridSep}>:</Text>
                      <Text style={[styles.gridValText, { color: '#1B5E20', fontWeight: 'bold' }]}>
                        {leftSpots > 0 ? `कुल ${totalSpots} मजदूर चाहिए (${leftSpots} जगह बाकी हैं)` : 'काम फुल हो गया (Job Filled)'} ({bookedSpots}/{totalSpots} Accepted)
                      </Text>
                    </View>
                  </View>

                  {/* Info Notice Note */}
                  <View style={{ backgroundColor: '#E3F2FD', padding: 8, borderRadius: 8, marginVertical: 8, flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="information-circle" size={16} color="#1565C0" style={{ marginRight: 6 }} />
                    <Text style={{ fontSize: 11, color: '#0D47A1', flex: 1 }}>
                      जैसे ही कोई अन्य मजदूर काम लेगा, यह संख्या लाइव अपडेट होकर घटती जाएगी!
                    </Text>
                  </View>

                  {/* Exactly 2 Action Buttons (No reject button as per PDF Page 6) */}
                  <View style={styles.actionsRow}>
                    {/* Button 1: Accept 1 Spot */}
                    <TouchableOpacity
                      style={[styles.bigBtn, styles.acceptBigBtn, accepting && { opacity: 0.6 }]}
                      disabled={accepting}
                      onPress={handleAccept}
                    >
                      <View style={styles.bigBtnHeader}>
                        <Ionicons name="checkmark-circle" size={20} color="#fff" />
                        <Text style={styles.bigBtnTitle}>स्वीकार करें</Text>
                      </View>
                      <Text style={styles.bigBtnSub}>(Accept 1 Spot)</Text>

                      <View style={styles.bigBtnBadge}>
                        <Text style={styles.bigBtnBadgeText}>1 मिनट के अंदर बुक करें ₹{pending.wage ?? 600} पर</Text>
                      </View>
                    </TouchableOpacity>

                    {/* Button 2: Cross Offer & Live Chat */}
                    <TouchableOpacity
                      style={[styles.bigBtn, styles.offerBigBtn]}
                      onPress={() => {
                        navigation.navigate('NegotiationChatScreen', {
                          job_id: pending.job_id,
                          module: pending.module || 'labour',
                        });
                      }}
                    >
                      <View style={styles.bigBtnHeader}>
                        <Ionicons name="chatbubbles" size={20} color="#fff" />
                        <Text style={styles.bigBtnTitle}>अपना दाम बताएँ</Text>
                      </View>
                      <Text style={styles.bigBtnSub}>(Cross Offer)</Text>

                      <View style={[styles.bigBtnBadge, { backgroundColor: '#FFF3E0' }]}>
                        <Text style={[styles.bigBtnBadgeText, { color: '#E65100' }]}>अपना दाम बताकर बातचीत करें ➔</Text>
                      </View>
                    </TouchableOpacity>
                  </View>

                  {/* Bottom Info Badges (PDF Page 2) */}
                  <View style={{ marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F0F0F0' }}>
                    <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#666', marginBottom: 8 }}>और जानकारी:</Text>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 6 }}>
                      <View style={{ flex: 1, backgroundColor: '#F9FBE7', padding: 8, borderRadius: 8, borderWidth: 1, borderColor: '#E6EE9C', alignItems: 'center' }}>
                        <Text style={{ fontSize: 16 }}>🛡️</Text>
                        <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#33691E', textAlign: 'center', marginTop: 2 }}>कोई शुल्क नहीं</Text>
                        <Text style={{ fontSize: 8, color: '#558B2F', textAlign: 'center' }}>काम पक्का होने पर कोई शुल्क नहीं लगता</Text>
                      </View>
                      <View style={{ flex: 1, backgroundColor: '#E8F5E9', padding: 8, borderRadius: 8, borderWidth: 1, borderColor: '#C8E6C9', alignItems: 'center' }}>
                        <Text style={{ fontSize: 16 }}>📞</Text>
                        <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#1B5E20', textAlign: 'center', marginTop: 2 }}>काम पक्का होने पर</Text>
                        <Text style={{ fontSize: 8, color: '#2E7D32', textAlign: 'center' }}>ग्राहक और आपका मोबाइल नंबर दिखेगा</Text>
                      </View>
                    </View>
                  </View>
                </Surface>
              )
            ) : null}

            {/* 3. Incoming / Actionable Contract Work Proposals (ठेका प्रस्ताव - Screen 2) */}
            {contractProposals.filter((p: any) => p.is_actionable || p.offer_status === 'pending' || p.offer_status === 'countered').map((cp: any) => (
              <Surface key={cp.proposal_id} style={[styles.jobAlertCard, { borderColor: '#F59E0B', borderWidth: 1.5, marginBottom: 14 }]}>
                {/* Alert Header Row */}
                <View style={styles.alertHeaderRow}>
                  <View style={styles.alertTitleGroup}>
                    <View style={[styles.orangeBellCircle, { backgroundColor: '#E65100' }]}>
                      <Ionicons name="document-text" size={20} color="#fff" />
                    </View>
                    <View>
                      <Text style={[styles.alertMainTitle, { color: '#B45309' }]}>नया ठेका कार्य प्रस्ताव!</Text>
                      <Text style={styles.alertSubTitle}>{cp.proposal_code} · V{cp.current_version}</Text>
                    </View>
                  </View>
                  <View style={[styles.timePill, { backgroundColor: '#FEF3C7' }]}>
                    <Text style={[styles.timePillText, { color: '#B45309' }]}>{cp.status_label || 'सक्रिय'}</Text>
                  </View>
                </View>

                {/* Details Grid */}
                <View style={styles.detailsGrid}>
                  <View style={styles.gridRow}>
                    <View style={styles.gridKeyCell}>
                      <Ionicons name="construct-outline" size={16} color="#555" />
                      <Text style={styles.gridKeyText}>कार्य का प्रकार</Text>
                    </View>
                    <Text style={styles.gridSep}>:</Text>
                    <Text style={styles.gridValWork}>{cp.contractor_type_label}</Text>
                  </View>

                  <View style={styles.gridRow}>
                    <View style={styles.gridKeyCell}>
                      <Ionicons name="clipboard-outline" size={16} color="#555" />
                      <Text style={styles.gridKeyText}>कार्य विवरण</Text>
                    </View>
                    <Text style={styles.gridSep}>:</Text>
                    <Text style={styles.gridValText} numberOfLines={2}>"{cp.work_description}"</Text>
                  </View>

                  <View style={styles.gridRow}>
                    <View style={styles.gridKeyCell}>
                      <Ionicons name="cash-outline" size={16} color="#555" />
                      <Text style={styles.gridKeyText}>प्रस्तावित राशि</Text>
                    </View>
                    <Text style={styles.gridSep}>:</Text>
                    <Text style={[styles.gridValText, { color: '#1B5E20', fontSize: 15, fontWeight: 'bold' }]}>
                      ₹{Number(cp.total_amount || 0).toLocaleString('en-IN')}
                    </Text>
                  </View>

                  <View style={styles.gridRow}>
                    <View style={styles.gridKeyCell}>
                      <Ionicons name="wallet-outline" size={16} color="#555" />
                      <Text style={styles.gridKeyText}>अग्रिम (Advance)</Text>
                    </View>
                    <Text style={styles.gridSep}>:</Text>
                    <Text style={styles.gridValText}>{cp.advance_percent}%</Text>
                  </View>

                  <View style={styles.gridRow}>
                    <View style={styles.gridKeyCell}>
                      <Ionicons name="time-outline" size={16} color="#555" />
                      <Text style={styles.gridKeyText}>कार्य अवधि</Text>
                    </View>
                    <Text style={styles.gridSep}>:</Text>
                    <Text style={styles.gridValText}>{cp.duration_days} दिन</Text>
                  </View>

                  <View style={styles.gridRow}>
                    <View style={styles.gridKeyCell}>
                      <Ionicons name="location-outline" size={16} color="#555" />
                      <Text style={styles.gridKeyText}>स्थान व दूरी</Text>
                    </View>
                    <Text style={styles.gridSep}>:</Text>
                    <Text style={styles.gridValText}>
                      {cp.place || '—'} {cp.distance_km ? `(${cp.distance_km} KM)` : ''}
                    </Text>
                  </View>
                </View>

                {/* 3 Buttons Actions Row (Screen 2 PDF) */}
                <View style={{ gap: 8, marginTop: 4 }}>
                  <TouchableOpacity
                    style={{
                      backgroundColor: '#1E8E3E',
                      paddingVertical: 11,
                      borderRadius: 10,
                      alignItems: 'center',
                      flexDirection: 'row',
                      justifyContent: 'center',
                      gap: 6,
                    }}
                    onPress={() => navigation.navigate('ContractProposalDetail', { proposalId: cp.proposal_id })}
                  >
                    <Ionicons name="checkmark-circle" size={18} color="#fff" />
                    <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 13 }}>
                      ☑ प्रस्ताव देखें / स्वीकार करें (Accept)
                    </Text>
                  </TouchableOpacity>

                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity
                      style={{
                        flex: 1,
                        backgroundColor: '#FF6B00',
                        paddingVertical: 9,
                        borderRadius: 8,
                        alignItems: 'center',
                        flexDirection: 'row',
                        justifyContent: 'center',
                        gap: 4,
                      }}
                      onPress={() => navigation.navigate('ContractProposalDetail', { proposalId: cp.proposal_id })}
                    >
                      <Ionicons name="create-outline" size={16} color="#fff" />
                      <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 12 }}>संशोधित करें (Counter)</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={{
                        flex: 1,
                        backgroundColor: '#F3F4F6',
                        borderWidth: 1,
                        borderColor: '#D1D5DB',
                        paddingVertical: 9,
                        borderRadius: 8,
                        alignItems: 'center',
                        flexDirection: 'row',
                        justifyContent: 'center',
                        gap: 4,
                      }}
                      onPress={() => navigation.navigate('ContractorProposalInbox')}
                    >
                      <Ionicons name="folder-open-outline" size={16} color="#374151" />
                      <Text style={{ color: '#374151', fontWeight: 'bold', fontSize: 12 }}>ठेका इनबॉक्स</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Surface>
            ))}

            {!pending?.has_request && !activeTransportTrip && contractProposals.filter((p: any) => p.is_actionable || p.offer_status === 'pending' || p.offer_status === 'countered').length === 0 ? (
              <Surface style={styles.emptyCard}>
                <Ionicons name="briefcase-outline" size={48} color="#A0A0A0" />
                <Text style={styles.emptyTitle}>कोई नया काम उपलब्ध नहीं है</Text>
                <Text style={styles.emptySub}>नया काम या ठेका प्रस्ताव आते ही आपको अलर्ट मिल जाएगा।</Text>
              </Surface>
            ) : null}
          </>
        )}

        {(activeTab === 'my_jobs' || activeTab === 'history') && (
          <View style={{ gap: 10 }}>
            {/* Locked Contracts in My Jobs */}
            {contractProposals.filter((p: any) => p.status === 'locked').map((lp: any) => (
              <TouchableOpacity
                key={lp.proposal_id}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('DigitalContract', { proposalId: lp.proposal_id })}
              >
                <Surface style={[styles.historyCard, { borderColor: '#81C784', borderWidth: 1.5, backgroundColor: '#F9FDF9' }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontWeight: 'bold', fontSize: 15, color: '#1B5E20' }}>
                      🔒 {lp.contract_id || lp.proposal_code} · {lp.contractor_type_label}
                    </Text>
                    <View style={[styles.timePill, { backgroundColor: '#E8F5E9' }]}>
                      <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#2E7D32' }}>🟢 LOCKED</Text>
                    </View>
                  </View>

                  <Text style={{ color: '#333', fontSize: 13, marginTop: 4, fontWeight: '600' }}>
                    💰 ₹{Number(lp.total_amount || 0).toLocaleString('en-IN')} (अग्रिम: {lp.advance_percent}%)
                  </Text>
                  <Text style={{ color: '#666', fontSize: 12, marginTop: 2 }}>📍 {lp.place || lp.site_address}</Text>

                  <View style={{ marginTop: 8, backgroundColor: '#1B5E20', paddingVertical: 8, borderRadius: 8, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
                    <Ionicons name="document-text-outline" size={16} color="#fff" />
                    <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 12 }}>📋 डिजिटल कॉन्ट्रैक्ट प्रमाणपत्र देखें ›</Text>
                  </View>
                </Surface>
              </TouchableOpacity>
            ))}
            {history.length > 0 ? (
              history.map(item => {
                const isNegotiating = item.status === 'negotiating';
                const isAccepted = item.status === 'accepted' || item.status === 'completed';
                return (
                  <TouchableOpacity
                    key={item.job_id}
                    activeOpacity={0.8}
                    onPress={() => setSelectedJob(item)}
                  >
                    <Surface style={[styles.historyCard, isNegotiating && { borderColor: '#FF9800', borderWidth: 1.5, backgroundColor: '#FFFBF5' }]}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontWeight: 'bold', fontSize: 15, color: '#333' }}>
                          Job #{item.job_id} - {item.labour_type || item.driver_type}
                        </Text>
                        <View style={[styles.timePill, { backgroundColor: isAccepted ? '#E8F5E9' : (isNegotiating ? '#FFF3E0' : '#ECEFF1') }]}>
                          <Text style={{ fontSize: 11, fontWeight: 'bold', color: isAccepted ? '#2E7D32' : (isNegotiating ? '#E65100' : '#546E7A') }}>
                            {isNegotiating ? '💬 बातचीत जारी है' : item.status.toUpperCase()}
                          </Text>
                        </View>
                      </View>

                      <Text style={{ color: '#666', fontSize: 12, marginTop: 4 }}>📍 {item.address}</Text>
                      {item.customer_name && (
                        <Text style={{ color: '#1B5E20', fontWeight: 'bold', fontSize: 12, marginTop: 4 }}>
                          👤 Customer: {item.customer_name} {item.customer_phone ? `(${item.customer_phone})` : ''}
                        </Text>
                      )}

                      <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                        <TouchableOpacity
                          style={{
                            flex: 1, backgroundColor: '#1B5E20', paddingVertical: 8, paddingHorizontal: 10,
                            borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4
                          }}
                          onPress={() => setSelectedJob(item)}
                        >
                          <Ionicons name="eye-outline" size={16} color="#fff" />
                          <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 11 }}>📋 पूरा विवरण देखें (Full Details)</Text>
                        </TouchableOpacity>

                        {isNegotiating && (
                          <TouchableOpacity
                            style={{
                              backgroundColor: '#E65100', paddingVertical: 8, paddingHorizontal: 12,
                              borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4
                            }}
                            onPress={() => navigation.navigate('NegotiationChatScreen', { job_id: item.job_id, module: item.module || 'labour' })}
                          >
                            <Ionicons name="chatbubbles" size={16} color="#fff" />
                            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 11 }}>💬 चैट</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </Surface>
                  </TouchableOpacity>
                );
              })
            ) : (
              <Surface style={styles.emptyCard}>
                <Ionicons name="time-outline" size={48} color="#A0A0A0" />
                <Text style={styles.emptyTitle}>कोई बुकिंग/काम नहीं है</Text>
              </Surface>
            )}
          </View>
        )}

        {activeTab === 'messages' && (
          <View style={{ gap: 10 }}>
            {history.filter(i => i.status === 'negotiating' || i.status === 'searching').length > 0 ? (
              history.filter(i => i.status === 'negotiating' || i.status === 'searching').map(item => (
                <TouchableOpacity
                  key={item.job_id}
                  activeOpacity={0.8}
                  onPress={() => navigation.navigate('NegotiationChatScreen', { job_id: item.job_id, module: item.module || 'labour' })}
                >
                  <Surface style={[styles.historyCard, { borderColor: '#FF9800', borderWidth: 1.5, backgroundColor: '#FFFBF5' }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ fontWeight: 'bold', fontSize: 15, color: '#333' }}>Job #{item.job_id} - {item.labour_type || item.driver_type}</Text>
                      <View style={[styles.timePill, { backgroundColor: '#FFF3E0' }]}>
                        <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#E65100' }}>💬 बातचीत जारी है</Text>
                      </View>
                    </View>
                    <Text style={{ color: '#666', fontSize: 12, marginTop: 4 }}>📍 {item.address}</Text>
                    <View style={{
                      marginTop: 10, backgroundColor: '#E65100', paddingVertical: 8, paddingHorizontal: 12,
                      borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6
                    }}>
                      <Ionicons name="chatbubbles" size={16} color="#fff" />
                      <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 12 }}>💬 चैट मैसेज खोलें</Text>
                    </View>
                  </Surface>
                </TouchableOpacity>
              ))
            ) : (
              <Surface style={styles.emptyCard}>
                <Ionicons name="chatbubbles-outline" size={48} color="#A0A0A0" />
                <Text style={styles.emptyTitle}>कोई सक्रिय चैट मैसेज नहीं है</Text>
              </Surface>
            )}
          </View>
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

      {/* Full Job Details Modal for Provider */}
      <Modal
        visible={!!selectedJob}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setSelectedJob(null)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 14 }}>
          <Surface style={{ backgroundColor: '#fff', borderRadius: 16, padding: 18, maxHeight: '90%', elevation: 6 }}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Modal Header */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 17, fontWeight: 'bold', color: '#1B5E20' }}>
                    {selectedJob?.module === 'transport'
                      ? `🚗 परिवहन विवरण (SSN-TR-${selectedJob.job_id})`
                      : `📋 काम का विवरण (Job #${selectedJob?.job_id})`}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#666', fontWeight: '600', marginTop: 2 }}>
                    {selectedJob?.labour_type || selectedJob?.driver_type || selectedJob?.service_type || 'Sarthi Service'}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedJob(null)}>
                  <Ionicons name="close-circle" size={28} color="#888" />
                </TouchableOpacity>
              </View>

              {/* Status Banner */}
              <View style={{
                backgroundColor: (selectedJob?.status === 'accepted' || selectedJob?.status === 'active')
                  ? '#E8F5E9'
                  : (selectedJob?.status === 'negotiating' ? '#FFF3E0' : (selectedJob?.status === 'completed' ? '#E3F2FD' : '#F5F5F5')),
                padding: 10, borderRadius: 10, marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 8
              }}>
                <Ionicons
                  name={(selectedJob?.status === 'accepted' || selectedJob?.status === 'active') ? 'checkmark-circle' : (selectedJob?.status === 'completed' ? 'flag' : 'information-circle')}
                  size={20}
                  color={(selectedJob?.status === 'accepted' || selectedJob?.status === 'active') ? '#2E7D32' : (selectedJob?.status === 'completed' ? '#1565C0' : '#E65100')}
                />
                <Text style={{
                  fontSize: 13, fontWeight: 'bold',
                  color: (selectedJob?.status === 'accepted' || selectedJob?.status === 'active') ? '#2E7D32' : (selectedJob?.status === 'completed' ? '#1565C0' : '#E65100'),
                  flex: 1
                }}>
                  {selectedJob?.status === 'accepted' ? '🟢 स्वीकृत / चालू (Active)' :
                   selectedJob?.status === 'active' ? '🟢 यात्रा चालू है (In Progress)' :
                   selectedJob?.status === 'completed' ? '🏁 पूर्ण हो चुका है (Completed)' :
                   selectedJob?.status === 'negotiating' ? '💬 बातचीत जारी है (Negotiating)' :
                   selectedJob?.status?.toUpperCase()}
                </Text>
              </View>

              {/* Customer Info Card */}
              {!!selectedJob?.customer_name && (
                <Surface style={{ backgroundColor: '#F1F8E9', padding: 12, borderRadius: 10, marginBottom: 12, borderWidth: 1, borderColor: '#C8E6C9' }}>
                  <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#1B5E20' }}>
                    👤 ग्राहक विवरण (Customer Details)
                  </Text>
                  <Text style={{ fontSize: 13, color: '#333', marginTop: 4 }}>नाम: <Text style={{ fontWeight: 'bold' }}>{selectedJob.customer_name}</Text></Text>
                  {selectedJob.customer_phone ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                      <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#1A1A1A' }}>📞 {selectedJob.customer_phone}</Text>
                      <TouchableOpacity
                        style={{ backgroundColor: '#2E7D32', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, flexDirection: 'row', alignItems: 'center', gap: 4 }}
                        onPress={() => Linking.openURL(`tel:${selectedJob.customer_phone}`)}
                      >
                        <Ionicons name="call" size={15} color="#fff" />
                        <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>कॉल करें</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, backgroundColor: '#FFF3E0', padding: 6, borderRadius: 6, gap: 4 }}>
                      <Ionicons name="lock-closed" size={14} color="#E65100" />
                      <Text style={{ fontSize: 11, color: '#E65100', fontWeight: 'bold', flex: 1 }}>
                        स्वीकार (Accept) होने पर ग्राहक का फोन नंबर दिखेगा
                      </Text>
                    </View>
                  )}
                </Surface>
              )}

              {/* Transport Specific Routing Details */}
              {selectedJob?.module === 'transport' ? (
                <View style={[styles.detailsGrid, { marginBottom: 12 }]}>
                  <View style={styles.gridRow}>
                    <View style={styles.gridKeyCell}>
                      <Ionicons name="car-outline" size={16} color="#555" />
                      <Text style={styles.gridKeyText}>गाड़ी / सेवा</Text>
                    </View>
                    <Text style={styles.gridSep}>:</Text>
                    <Text style={[styles.gridValText, { fontWeight: 'bold' }]}>
                      {selectedJob.labour_type || selectedJob.vehicle_type || 'Transport'}
                    </Text>
                  </View>

                  <View style={styles.gridRow}>
                    <View style={styles.gridKeyCell}>
                      <Ionicons name="navigate-circle-outline" size={16} color="#2E7D32" />
                      <Text style={styles.gridKeyText}>पिकअप स्थान</Text>
                    </View>
                    <Text style={styles.gridSep}>:</Text>
                    <Text style={[styles.gridValText, { flex: 1 }]}>
                      {selectedJob.pickup_address || selectedJob.address}
                    </Text>
                  </View>

                  {!!selectedJob.drop_address && (
                    <View style={styles.gridRow}>
                      <View style={styles.gridKeyCell}>
                        <Ionicons name="flag-outline" size={16} color="#E53935" />
                        <Text style={styles.gridKeyText}>ड्रॉप स्थान</Text>
                      </View>
                      <Text style={styles.gridSep}>:</Text>
                      <Text style={[styles.gridValText, { flex: 1 }]}>
                        {selectedJob.drop_address}
                      </Text>
                    </View>
                  )}

                  {!!selectedJob.distance_km && (
                    <View style={styles.gridRow}>
                      <View style={styles.gridKeyCell}>
                        <Ionicons name="speedometer-outline" size={16} color="#555" />
                        <Text style={styles.gridKeyText}>कुल दूरी</Text>
                      </View>
                      <Text style={styles.gridSep}>:</Text>
                      <Text style={[styles.gridValText, { fontWeight: 'bold' }]}>
                        {selectedJob.distance_km} KM
                      </Text>
                    </View>
                  )}

                  {!!(selectedJob.work_description || selectedJob.description) && (
                    <View style={styles.gridRow}>
                      <View style={styles.gridKeyCell}>
                        <Ionicons name="document-text-outline" size={16} color="#555" />
                        <Text style={styles.gridKeyText}>कार्य विवरण</Text>
                      </View>
                      <Text style={styles.gridSep}>:</Text>
                      <Text style={[styles.gridValText, { flex: 1 }]}>
                        {selectedJob.work_description || selectedJob.description}
                      </Text>
                    </View>
                  )}

                  <View style={styles.gridRow}>
                    <View style={styles.gridKeyCell}>
                      <Ionicons name="cash-outline" size={16} color="#2E7D32" />
                      <Text style={styles.gridKeyText}>तय किराया</Text>
                    </View>
                    <Text style={styles.gridSep}>:</Text>
                    <Text style={[styles.gridValText, { fontWeight: 'bold', color: '#2E7D32', fontSize: 15 }]}>
                      ₹{selectedJob.agreed_fare || selectedJob.wage}
                    </Text>
                  </View>

                  {!!selectedJob.commission_amount && (
                    <View style={styles.gridRow}>
                      <View style={styles.gridKeyCell}>
                        <Ionicons name="cut-outline" size={16} color="#888" />
                        <Text style={styles.gridKeyText}>कमीशन (7%)</Text>
                      </View>
                      <Text style={styles.gridSep}>:</Text>
                      <Text style={[styles.gridValText, { color: '#666' }]}>
                        ₹{selectedJob.commission_amount} (कट चुका)
                      </Text>
                    </View>
                  )}

                  {!!selectedJob.secret_pin && (
                    <View style={styles.gridRow}>
                      <View style={styles.gridKeyCell}>
                        <Ionicons name="key-outline" size={16} color="#1565C0" />
                        <Text style={styles.gridKeyText}>सत्यापन पिन</Text>
                      </View>
                      <Text style={styles.gridSep}>:</Text>
                      <Text style={[styles.gridValText, { fontWeight: 'bold', color: '#1565C0' }]}>
                        {selectedJob.secret_pin}
                      </Text>
                    </View>
                  )}
                </View>
              ) : (
                /* Regular Labour/Driver Job Grid */
                <View style={[styles.detailsGrid, { marginBottom: 12 }]}>
                  <View style={styles.gridRow}>
                    <View style={styles.gridKeyCell}>
                      <Ionicons name="cash-outline" size={16} color="#555" />
                      <Text style={styles.gridKeyText}>दिहाड़ी (Wage)</Text>
                    </View>
                    <Text style={styles.gridSep}>:</Text>
                    <Text style={[styles.gridValText, { fontWeight: 'bold', color: '#2E7D32', fontSize: 15 }]}>
                      ₹{selectedJob?.wage ?? 600} / व्यक्ति
                    </Text>
                  </View>

                  {!!selectedJob?.work_type && (
                    <View style={styles.gridRow}>
                      <View style={styles.gridKeyCell}>
                        <Ionicons name="clipboard-outline" size={16} color="#555" />
                        <Text style={styles.gridKeyText}>काम का प्रकार</Text>
                      </View>
                      <Text style={styles.gridSep}>:</Text>
                      <Text style={styles.gridValText}>{selectedJob.work_type}</Text>
                    </View>
                  )}

                  {!!selectedJob?.time_shift && (
                    <View style={styles.gridRow}>
                      <View style={styles.gridKeyCell}>
                        <Ionicons name="time-outline" size={16} color="#555" />
                        <Text style={styles.gridKeyText}>शिफ्ट</Text>
                      </View>
                      <Text style={styles.gridSep}>:</Text>
                      <Text style={styles.gridValText}>
                        {selectedJob.time_shift === 'full_day' ? '8 घंटे (Full Day)' : (selectedJob.time_shift === 'half_day' ? '4 घंटे (Half Day)' : 'ठेका')}
                      </Text>
                    </View>
                  )}

                  <View style={styles.gridRow}>
                    <View style={styles.gridKeyCell}>
                      <Ionicons name="location-outline" size={16} color="#555" />
                      <Text style={styles.gridKeyText}>काम का पता</Text>
                    </View>
                    <Text style={styles.gridSep}>:</Text>
                    <Text style={[styles.gridValText, { flex: 1 }]}>{selectedJob?.address}</Text>
                  </View>

                  {!!selectedJob?.description && (
                    <View style={styles.gridRow}>
                      <View style={styles.gridKeyCell}>
                        <Ionicons name="information-circle-outline" size={16} color="#555" />
                        <Text style={styles.gridKeyText}>विवरण</Text>
                      </View>
                      <Text style={styles.gridSep}>:</Text>
                      <Text style={[styles.gridValText, { flex: 1 }]}>{selectedJob.description}</Text>
                    </View>
                  )}
                </View>
              )}

              {/* Action Buttons Grid in Modal */}
              <View style={{ gap: 8, marginTop: 10 }}>
                {/* Row 1: Call + Route */}
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {!!selectedJob?.customer_phone && (
                    <TouchableOpacity
                      style={{ flex: 1, backgroundColor: '#2E7D32', paddingVertical: 10, borderRadius: 8, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}
                      onPress={() => Linking.openURL(`tel:${selectedJob.customer_phone}`)}
                    >
                      <Ionicons name="call" size={16} color="#fff" />
                      <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 12 }}>कॉल करें</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={{ flex: 1, backgroundColor: '#1565C0', paddingVertical: 10, borderRadius: 8, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}
                    onPress={() => {
                      const pickup = selectedJob?.pickup_address || selectedJob?.address || '';
                      const drop = selectedJob?.drop_address || '';
                      const url = drop
                        ? `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(pickup)}&destination=${encodeURIComponent(drop)}`
                        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pickup)}`;
                      Linking.openURL(url);
                    }}
                  >
                    <Ionicons name="map" size={16} color="#fff" />
                    <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 12 }}>मैप रूट देखें</Text>
                  </TouchableOpacity>
                </View>

                {/* Row 2: Chat + Share PDF */}
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    style={{ flex: 1, backgroundColor: '#E65100', paddingVertical: 10, borderRadius: 8, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}
                    onPress={() => {
                      if (!selectedJob) return;
                      const job = selectedJob;
                      setSelectedJob(null);
                      navigation.navigate('NegotiationChatScreen', {
                        job_id: job.job_id,
                        jobId: job.job_id,
                        module: job.module || 'transport',
                      });
                    }}
                  >
                    <Ionicons name="chatbubbles" size={16} color="#fff" />
                    <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 12 }}>💬 चैट खोलें</Text>
                  </TouchableOpacity>

                  {selectedJob?.module === 'transport' && (
                    <TouchableOpacity
                      style={{ flex: 1, backgroundColor: '#455A64', paddingVertical: 10, borderRadius: 8, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}
                      onPress={() => {
                        if (!selectedJob) return;
                        Share.share({
                          title: `Sarthi Transport Agreement #${selectedJob.job_id}`,
                          message: `📜 सारथी डिजिटल परिवहन समझौता\nबुकिंग: SSN-TR-${selectedJob.job_id}\nग्राहक: ${selectedJob.customer_name || 'ग्राहक'} (${selectedJob.customer_phone || ''})\nपिकअप: ${selectedJob.pickup_address || selectedJob.address}\nड्रॉप: ${selectedJob.drop_address || ''}\nदूरी: ${selectedJob.distance_km || ''} KM\nतय किराया: ₹${selectedJob.agreed_fare || selectedJob.wage}\nसत्यापन पिन: ${selectedJob.secret_pin || '----'}\nस्थिति: ${selectedJob.status}`
                        });
                      }}
                    >
                      <Ionicons name="share-social" size={16} color="#fff" />
                      <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 12 }}>📤 पर्ची शेयर करें</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Row 3: If accepted transport trip -> Verify PIN & Start Trip */}
                {selectedJob?.module === 'transport' && (selectedJob.status === 'accepted') && (
                  <TouchableOpacity
                    style={{ backgroundColor: '#1565C0', paddingVertical: 11, borderRadius: 8, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}
                    onPress={() => {
                      const bId = selectedJob.job_id;
                      setSelectedJob(null);
                      setPinTargetBookingId(bId);
                      setEnteredPin('');
                      setShowPinModal(true);
                    }}
                  >
                    <Ionicons name="key-outline" size={18} color="#fff" />
                    <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 13 }}>🔑 PIN सत्यापित कर यात्रा शुरू करें</Text>
                  </TouchableOpacity>
                )}

                {/* Row 4: Complete Trip (if active transport trip) */}
                {selectedJob?.module === 'transport' && (selectedJob.status === 'active') && (
                  <TouchableOpacity
                    style={{ backgroundColor: '#2E7D32', paddingVertical: 11, borderRadius: 8, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}
                    onPress={async () => {
                      if (!selectedJob) return;
                      const bId = selectedJob.job_id;
                      setSelectedJob(null);
                      await handleCompleteTransportTrip(bId);
                    }}
                  >
                    <Ionicons name="flag-outline" size={18} color="#fff" />
                    <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 13 }}>🏁 यात्रा पूर्ण करें (Complete Trip)</Text>
                  </TouchableOpacity>
                )}

                {/* Close Button */}
                <TouchableOpacity
                  style={{ backgroundColor: '#ECEFF1', paddingVertical: 10, borderRadius: 8, alignItems: 'center', marginTop: 4 }}
                  onPress={() => setSelectedJob(null)}
                >
                  <Text style={{ color: '#455A64', fontWeight: 'bold', fontSize: 12 }}>बंद करें (Close)</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </Surface>
        </View>
      </Modal>

      {/* ── Driver Secret PIN Verification Modal ── */}
      <Modal
        visible={showPinModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPinModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 }}
        >
          <Surface style={{ backgroundColor: '#fff', borderRadius: 16, padding: 22, width: '100%', maxWidth: 360, elevation: 6 }}>
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: '#E3F2FD', justifyContent: 'center', alignItems: 'center', marginBottom: 8 }}>
                <Ionicons name="key" size={28} color="#1565C0" />
              </View>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1565C0', textAlign: 'center' }}>
                🔑 ग्राहक सत्यापन पिन (Secret PIN)
              </Text>
              <Text style={{ fontSize: 12, color: '#555', textAlign: 'center', marginTop: 4, lineHeight: 17 }}>
                ग्राहक की स्क्रीन पर 4-अंकों का सुरक्षा पिन दिख रहा है। ग्राहक से पूछकर दर्ज करें ताकि यात्रा शुरू हो सके:
              </Text>
            </View>

            <TextInput
              mode="outlined"
              placeholder="4-अंकों का PIN दर्ज करें"
              value={enteredPin}
              onChangeText={t => setEnteredPin(t.replace(/[^0-9]/g, '').slice(0, 4))}
              keyboardType="number-pad"
              maxLength={4}
              style={{ fontSize: 22, textAlign: 'center', fontWeight: 'bold', letterSpacing: 8, backgroundColor: '#FAFAFA', marginBottom: 16 }}
              outlineColor="#90CAF9"
              activeOutlineColor="#1565C0"
            />

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: '#ECEFF1', paddingVertical: 12, borderRadius: 8, alignItems: 'center' }}
                onPress={() => {
                  setShowPinModal(false);
                  setEnteredPin('');
                }}
              >
                <Text style={{ color: '#455A64', fontWeight: 'bold', fontSize: 13 }}>रद्द करें</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{ flex: 1.6, backgroundColor: '#1565C0', paddingVertical: 12, borderRadius: 8, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}
                disabled={verifyingPin}
                onPress={handleVerifySecretPin}
              >
                {verifyingPin ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={18} color="#fff" />
                    <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 13 }}>सत्यापित करें ➔</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </Surface>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Wallet Recharge Modal ── */}
      <WalletRechargeModal
        visible={showRechargeModal}
        onClose={() => setShowRechargeModal(false)}
        onSuccess={() => {
          fetchData();
        }}
      />
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
  brandMain: { fontSize: 18, fontWeight: 'bold', color: '#1B5E20' },
  bellBtn: { padding: 6, position: 'relative' },
  badgeDot: {
    position: 'absolute', top: 2, right: 2, width: 14, height: 14,
    borderRadius: 7, backgroundColor: '#C62828', justifyContent: 'center', alignItems: 'center'
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: 'bold' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%', paddingBottom: 20 },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, borderBottomWidth: 1, borderColor: '#EEE'
  },
  modalTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  notifItemCard: {
    backgroundColor: '#FAFAFA', padding: 12, borderRadius: 10,
    borderWidth: 1, borderColor: '#E0E0E0', marginBottom: 10
  },
  notifItemTitle: { fontSize: 13, fontWeight: 'bold', color: '#333' },
  notifItemDesc: { fontSize: 11, color: '#666', marginTop: 2 },

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

  scrollContent: { padding: 12, paddingBottom: 140 },

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

  emptyCard: { padding: 30, borderRadius: 16, alignItems: 'center', backgroundColor: '#fff', marginBottom: 14 },
  emptyTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginTop: 12 },
  emptySub: { fontSize: 12, color: '#777', textAlign: 'center', marginTop: 4 },

  historyCard: { padding: 12, borderRadius: 12, backgroundColor: '#fff', elevation: 1, borderWidth: 1, borderColor: '#E0E0E0' },

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
