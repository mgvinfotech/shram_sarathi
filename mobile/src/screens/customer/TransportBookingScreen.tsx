import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View, ScrollView, StyleSheet, Alert, Linking, TouchableOpacity,
  ActivityIndicator, FlatList, Keyboard, Animated, Modal, Share,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { Text, TextInput, Button, Surface, Divider, Chip, Badge } from 'react-native-paper';
import * as Location from 'expo-location';
import * as Speech from 'expo-speech';
import { Ionicons } from '@expo/vector-icons';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import axios from 'axios';
import { api } from '../../services/api';
import { useLanguage } from '../../i18n/LanguageContext';

interface PlaceSuggestion {
  place_id: string;
  display_name: string;
  short_name: string;
  lat: number;
  lng: number;
}

type BookingStep = 'select_service' | 'enter_route' | 'fare_preview' | 'live_contract';
type ServiceType = 'passenger' | 'goods' | 'delivery';
type BookingType = 'immediate' | 'advance';

interface VehicleOption {
  key: string;
  name: string;
  icon: string;
  desc: string;
  ratePerKm: number;
  minFare: number;
  category: ServiceType[];
}

const VEHICLE_OPTIONS: VehicleOption[] = [
  { key: 'bike', name: 'Bike', icon: '🏍️', desc: 'सवारी / पार्सल', ratePerKm: 8, minFare: 30, category: ['passenger', 'delivery'] },
  { key: 'auto', name: 'Auto', icon: '🛺', desc: 'सवारी / सामान', ratePerKm: 12, minFare: 50, category: ['passenger', 'goods'] },
  { key: 'e_rickshaw', name: 'E-Rickshaw', icon: '⚡', desc: 'लोकल यात्रा', ratePerKm: 10, minFare: 40, category: ['passenger', 'delivery'] },
  { key: 'wagonr_dzire', name: 'WagonR / Dzire', icon: '🚗', desc: 'कम्फर्ट सेडान', ratePerKm: 15, minFare: 100, category: ['passenger'] },
  { key: 'scorpio_bolero', name: 'Scorpio / Bolero', icon: '🚙', desc: 'SUV / बड़ा स्पेस', ratePerKm: 20, minFare: 150, category: ['passenger', 'goods'] },
  { key: 'pickup', name: 'Pickup', icon: '🛻', desc: 'माल ढुलाई 1-2 टन', ratePerKm: 22, minFare: 200, category: ['goods'] },
  { key: 'chota_hathi', name: 'Chota Hathi', icon: '🚚', desc: 'कमर्शियल लोडर', ratePerKm: 25, minFare: 250, category: ['goods'] },
  { key: 'loader', name: 'Loader / Tractor', icon: '🏗️', desc: 'भारी मटेरियल', ratePerKm: 30, minFare: 300, category: ['goods'] },
];

interface Props { navigation: any; route: any; }

export default function TransportBookingScreen({ navigation, route }: Props) {
  const { lang, t } = useLanguage();

  // Wizard Steps
  const [step, setStep] = useState<BookingStep>('select_service');

  // Step 1 States
  const [bookingType, setBookingType] = useState<BookingType>('immediate');
  const [scheduledDate, setScheduledDate] = useState<string>(new Date(Date.now() + 86400000).toISOString().split('T')[0]);
  const [scheduledDateObj, setScheduledDateObj] = useState<Date>(new Date(Date.now() + 86400000));
  const [scheduledTime, setScheduledTime] = useState<string>('morning');
  const [scheduledSpecificTime, setScheduledSpecificTime] = useState<Date>(new Date());
  const [serviceType, setServiceType] = useState<ServiceType>('passenger');
  const [selectedVehicleKey, setSelectedVehicleKey] = useState<string>('wagonr_dzire');


  const getFormattedDateObj = (d: Date) => {
    const monthsHi = ['जनवरी', 'फरवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर'];
    const monthsEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = d.getDate();
    const year = d.getFullYear();
    if (lang === 'hi') {
      return `${day} ${monthsHi[d.getMonth()]} ${year}`;
    }
    return `${day} ${monthsEn[d.getMonth()]} ${year}`;
  };

  const showDatePicker = () => {
    if (Platform.OS !== 'android') {
      Alert.alert(lang === 'hi' ? 'जानकारी' : 'Info', lang === 'hi' ? 'कैलेंडर डेट पिकर केवल एंड्रॉइड ऐप पर उपलब्ध है।' : 'Date picker is only available on Android.');
      return;
    }
    DateTimePickerAndroid.open({
      value: scheduledDateObj,
      onChange: (event: any, selectedDate?: Date) => {
        if (event.type === 'set' && selectedDate) {
          setScheduledDateObj(selectedDate);
          setScheduledDate(selectedDate.toISOString().split('T')[0]);
        }
      },
      mode: 'date',
      minimumDate: new Date(),
    });
  };

  const showTimePicker = () => {
    if (Platform.OS !== 'android') {
      Alert.alert(lang === 'hi' ? 'जानकारी' : 'Info', lang === 'hi' ? 'टाइम पिकर केवल एंड्रॉइड ऐप पर उपलब्ध है।' : 'Time picker is only available on Android.');
      return;
    }
    DateTimePickerAndroid.open({
      value: scheduledSpecificTime,
      onChange: (event: any, selectedTime?: Date) => {
        if (event.type === 'set' && selectedTime) {
          setScheduledSpecificTime(selectedTime);
          const timeStr = selectedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          setScheduledTime(`specific_${timeStr}`);
        }
      },
      mode: 'time',
      is24Hour: false,
    });
  };

  // Step 2 States (Route & Work Details)
  const [pickupAddress, setPickupAddress] = useState('लंभुआ, उत्तर प्रदेश');
  const [pickupLat, setPickupLat] = useState<number | null>(26.0416);
  const [pickupLng, setPickupLng] = useState<number | null>(82.2694);
  const [dropAddress, setDropAddress] = useState('सुल्तानपुर, उत्तर प्रदेश');
  const [dropLat, setDropLat] = useState<number | null>(26.2648);
  const [dropLng, setDropLng] = useState<number | null>(82.0727);
  const [workDescription, setWorkDescription] = useState('4 लोग हैं, साथ में 2 बड़े बैग हैं।');
  const [isRecording, setIsRecording] = useState(false);

  // Autocomplete
  const [activeField, setActiveField] = useState<'pickup' | 'drop' | null>(null);
  const [pickupSuggestions, setPickupSuggestions] = useState<PlaceSuggestion[]>([]);
  const [dropSuggestions, setDropSuggestions] = useState<PlaceSuggestion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Step 3 States (Fare & Negotiation)
  const [calcLoading, setCalcLoading] = useState(false);
  const [fareData, setFareData] = useState<any>({
    distance_km: 12.98,
    per_km_rate: 15.0,
    total_fare: 194.7,
    commission_pct: 7.0,
    commission_amount: 13.63,
    driver_net_earnings: 181.07,
  });
  const [offeredFare, setOfferedFare] = useState<number>(195);
  const [fareModifierPercent, setFareModifierPercent] = useState<number>(0);

  // Step 4 States (Live Broadcast, Negotiation & Digital Contract)
  const [bookingId, setBookingId] = useState<number | null>(null);
  const [bookingStatus, setBookingStatus] = useState<string>('searching');
  const [searchSecondsLeft, setSearchSecondsLeft] = useState<number>(60);
  const [negotiationMessages, setNegotiationMessages] = useState<any[]>([]);
  const [contractData, setContractData] = useState<any>(null);
  const [broadcastLoading, setBroadcastLoading] = useState(false);

  // Customer Counter Modal State
  const [counterModalVisible, setCounterModalVisible] = useState(false);
  const [customerProposedWage, setCustomerProposedWage] = useState('');
  const [customerProposedNote, setCustomerProposedNote] = useState('');
  const [counterSubmitLoading, setCounterSubmitLoading] = useState(false);

  // Radar Animation for Searching
  const radarAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (step === 'live_contract' && bookingStatus === 'searching') {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(radarAnim, { toValue: 1.25, duration: 900, useNativeDriver: true }),
          Animated.timing(radarAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }
  }, [step, bookingStatus]);

  // Filter vehicles matching selected service type
  const availableVehicles = VEHICLE_OPTIONS.filter(v => v.category.includes(serviceType));

  // Ensure selected vehicle is in available list
  useEffect(() => {
    if (!availableVehicles.find(v => v.key === selectedVehicleKey)) {
      if (availableVehicles.length > 0) {
        setSelectedVehicleKey(availableVehicles[0].key);
      }
    }
  }, [serviceType]);

  // Adjust default work description example based on service type
  useEffect(() => {
    if (serviceType === 'goods') {
      setWorkDescription('20 बोरी सीमेंट ले जाना है, ग्राउंड फ्लोर पर अनलोड करना है।');
    } else if (serviceType === 'delivery') {
      setWorkDescription('दस्तावेज़ और पार्सल का पैकेट पहुँचाना है।');
    } else {
      setWorkDescription('4 लोग हैं, साथ में 2 बड़े बैग हैं।');
    }
  }, [serviceType]);

  // Handle route params when customer navigates from 'Meri Bookings' or notifications
  useEffect(() => {
    const paramBookingId = route?.params?.booking_id || route?.params?.job_id;
    if (paramBookingId) {
      const bId = Number(paramBookingId);
      setBookingId(bId);
      setStep('live_contract');

      // Fetch agreement details
      api.get(`/api/transport/booking/${bId}/agreement`)
        .then(res => {
          if (res.data) {
            setContractData(res.data);
            setBookingStatus(res.data.raw_status || res.data.status || 'accepted');
            if (res.data.pickup_address) setPickupAddress(res.data.pickup_address);
            if (res.data.drop_address) setDropAddress(res.data.drop_address);
            if (res.data.work_description) setWorkDescription(res.data.work_description);
            if (res.data.agreed_fare) setOfferedFare(Number(res.data.agreed_fare));
          }
        })
        .catch(() => {
          // Fallback to basic booking status
          api.get(`/api/transport/booking/${bId}`)
            .then(res => {
              if (res.data) {
                setBookingStatus(res.data.status);
              }
            })
            .catch(() => { });
        });
    }
  }, [route?.params?.booking_id, route?.params?.job_id]);

  // ── Voice Input Simulation (Speech to Text) ──────────────────────────────
  const toggleVoiceRecording = () => {
    if (isRecording) {
      setIsRecording(false);
    } else {
      setIsRecording(true);
      Speech.speak('कृपया अपनी यात्रा या माल का विवरण बोलें', { language: 'hi-IN', rate: 0.9 });
      setTimeout(() => {
        setIsRecording(false);
        if (serviceType === 'goods') {
          setWorkDescription('25 बोरी सीमेंट एवं 2 लोहे की रॉड, ग्राउंड फ्लोर पर पहुँचाना है।');
        } else {
          setWorkDescription('4 यात्री, 2 बड़े बैग, रास्ते में एक जगह 5 मिनट रुकना होगा।');
        }
      }, 2500);
    }
  };

  // ── GPS Current Location Fetcher ─────────────────────────────────────────
  const [gpsLoading, setGpsLoading] = useState(false);

  const getCurrentLocation = async () => {
    setGpsLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          lang === 'hi' ? 'अनुमति आवश्यक है' : 'Permission Required',
          lang === 'hi'
            ? 'कृपया वर्तमान स्थान खोजने के लिए ऐप में GPS/Location अनुमति दें।'
            : 'Please grant location permission to fetch your current GPS position.'
        );
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const lat = loc.coords.latitude;
      const lng = loc.coords.longitude;
      setPickupLat(lat);
      setPickupLng(lng);

      // Reverse geocode to readable Indian address
      try {
        const rev = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
        if (rev && rev.length > 0) {
          const item = rev[0];
          const parts = [
            item.name,
            item.street,
            item.district || item.subregion || item.city,
            item.region || item.country,
          ].filter(Boolean);
          const formatted = Array.from(new Set(parts)).join(', ');
          setPickupAddress(formatted || `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        } else {
          setPickupAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        }
      } catch {
        setPickupAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      }

      setPickupSuggestions([]);
      setActiveField(null);
      Keyboard.dismiss();
    } catch (err) {
      Alert.alert(
        lang === 'hi' ? 'लोकेशन त्रुटि' : 'Location Error',
        lang === 'hi' ? 'वर्तमान स्थान प्राप्त नहीं हो सका। कृपया अपना स्थान लिखकर चुनें।' : 'Could not fetch current GPS location.'
      );
    } finally {
      setGpsLoading(false);
    }
  };

  // ── Autocomplete Places Search (Multi-Engine: Backend + Photon + Nominatim) ───
  const searchPlaces = useCallback(async (query: string, field: 'pickup' | 'drop') => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      field === 'pickup' ? setPickupSuggestions([]) : setDropSuggestions([]);
      return;
    }
    setSuggestionsLoading(true);

    try {
      // 1. Try Backend searchPlaces proxy first (Photon + Nominatim server-side)
      try {
        const backendRes = await api.get('/api/transport/places/search', {
          params: { q: trimmed },
          timeout: 3500,
        });
        if (backendRes.data && Array.isArray(backendRes.data) && backendRes.data.length > 0) {
          field === 'pickup' ? setPickupSuggestions(backendRes.data) : setDropSuggestions(backendRes.data);
          return;
        }
      } catch {
        // fallback to direct Photon
      }

      // 2. Direct Photon API (ultra-fast OpenStreetMap typeahead)
      try {
        const photonRes = await axios.get('https://photon.komoot.io/api/', {
          params: { q: trimmed, limit: 6, lang: 'en' },
          timeout: 3500,
        });
        const features = photonRes.data?.features || [];
        if (features.length > 0) {
          const suggestions: PlaceSuggestion[] = features.map((f: any) => {
            const p = f.properties || {};
            const coords = f.geometry?.coordinates || [0, 0];
            const parts = [
              p.name,
              p.street,
              p.city || p.town || p.village || p.county,
              p.state,
            ].filter(Boolean);
            const short = Array.from(new Set(parts)).join(', ');
            return {
              place_id: String(p.osm_id || Math.random()),
              display_name: short || p.name || trimmed,
              short_name: short || p.name || trimmed,
              lat: coords[1],
              lng: coords[0],
            };
          });
          field === 'pickup' ? setPickupSuggestions(suggestions) : setDropSuggestions(suggestions);
          return;
        }
      } catch {
        // fallback to Nominatim
      }

      // 3. Fallback to Nominatim OpenStreetMap
      const qParam = trimmed.toLowerCase().includes('india') ? trimmed : `${trimmed}, India`;
      const res = await axios.get('https://nominatim.openstreetmap.org/search', {
        params: {
          q: qParam,
          format: 'json',
          addressdetails: 1,
          limit: 6,
          countrycodes: 'in',
        },
        headers: { 'User-Agent': 'ShramSarthiMobile/2.0' },
        timeout: 4000,
      });
      const suggestions: PlaceSuggestion[] = (res.data || []).map((item: any) => {
        const a = item.address || {};
        const parts = [item.name || a.road || a.suburb, a.city || a.town || a.village || a.county, a.state].filter(Boolean);
        const short = Array.from(new Set(parts)).join(', ');
        return {
          place_id: String(item.place_id),
          display_name: item.display_name,
          short_name: short || item.display_name,
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
        };
      });
      field === 'pickup' ? setPickupSuggestions(suggestions) : setDropSuggestions(suggestions);
    } catch {
      // silent
    } finally {
      setSuggestionsLoading(false);
    }
  }, []);

  const handleAddressChange = (text: string, field: 'pickup' | 'drop') => {
    if (field === 'pickup') {
      setPickupAddress(text);
      setPickupLat(null);
      setPickupLng(null);
      setActiveField('pickup');
    } else {
      setDropAddress(text);
      setDropLat(null);
      setDropLng(null);
      setActiveField('drop');
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchPlaces(text, field), 350);
  };

  const selectSuggestion = (s: PlaceSuggestion, field: 'pickup' | 'drop') => {
    if (field === 'pickup') {
      setPickupAddress(s.short_name);
      setPickupLat(s.lat);
      setPickupLng(s.lng);
      setPickupSuggestions([]);
    } else {
      setDropAddress(s.short_name);
      setDropLat(s.lat);
      setDropLng(s.lng);
      setDropSuggestions([]);
    }
    setActiveField(null);
    Keyboard.dismiss();
  };

  // ── Step 2 -> 3: Calculate Fare ───────────────────────────────────────────
  const handleCalculateFare = async () => {
    if (!pickupAddress.trim() || !dropAddress.trim()) {
      Alert.alert(lang === 'hi' ? 'पता आवश्यक है' : 'Address Required', lang === 'hi' ? 'कृपया पिकअप और ड्रॉप दोनों पते दर्ज करें।' : 'Please enter pickup and drop addresses.');
      return;
    }
    setCalcLoading(true);
    try {
      const res = await api.post('/api/transport/calculate-fare', {
        booking_type: bookingType,
        service_type: serviceType,
        vehicle_type: selectedVehicleKey,
        pickup_address: pickupAddress,
        pickup_lat: pickupLat,
        pickup_lng: pickupLng,
        drop_address: dropAddress,
        drop_lat: dropLat,
        drop_lng: dropLng,
        work_description: workDescription,
        scheduled_date: bookingType === 'advance' ? scheduledDate : null,
        scheduled_time: bookingType === 'advance' ? scheduledTime : null,
      });

      const data = res.data;
      setFareData(data);
      const initialFare = Math.round(data.total_fare);
      setOfferedFare(initialFare);
      setFareModifierPercent(0);
      setStep('fare_preview');
    } catch (e: any) {
      // Fallback calculations for offline / dev demo
      const v = VEHICLE_OPTIONS.find(x => x.key === selectedVehicleKey) || VEHICLE_OPTIONS[3];
      const dist = 12.98;
      const calcFare = Math.round(dist * v.ratePerKm * 10) / 10;
      const total = Math.max(calcFare, v.minFare);
      const commPct = bookingType === 'immediate' ? 7.0 : 5.0;
      const commAmt = Math.max(5.0, Math.round(total * (commPct / 100) * 100) / 100);
      const net = Math.round((total - commAmt) * 100) / 100;

      setFareData({
        distance_km: dist,
        per_km_rate: v.ratePerKm,
        total_fare: total,
        commission_pct: commPct,
        commission_amount: commAmt,
        driver_net_earnings: net,
        commission_notice: lang === 'hi' ? 'प्लेटफॉर्म कमीशन वाहन स्वामी के वॉलेट से काटा जाएगा' : "Platform commission will be deducted from the vehicle owner's wallet",
      });
      setOfferedFare(Math.round(total));
      setFareModifierPercent(0);
      setStep('fare_preview');
    } finally {
      setCalcLoading(false);
    }
  };

  // ── Fare Percentage Chips (-10%, -5%, +5%, +10%) ──────────────────────────
  const applyPercentModifier = (pct: number) => {
    setFareModifierPercent(pct);
    const baseFare = fareData?.total_fare || 195;
    const modified = Math.round(baseFare * (1 + pct / 100));
    setOfferedFare(Math.max(30, modified));
  };

  const changeOfferedFare = (delta: number) => {
    setOfferedFare(prev => {
      const next = Math.max(30, prev + delta);
      const baseFare = fareData?.total_fare || 195;
      const pct = Math.round(((next - baseFare) / baseFare) * 100);
      setFareModifierPercent(pct);
      return next;
    });
  };

  // ── Step 3 -> 4: Broadcast Request ────────────────────────────────────────
  const handleBroadcastRequest = async (overrideFare?: number) => {
    const finalOfferedFare = overrideFare !== undefined ? overrideFare : offeredFare;
    setBroadcastLoading(true);

    try {
      const res = await api.post('/api/transport/book', {
        booking_type: bookingType,
        service_type: serviceType,
        vehicle_type: selectedVehicleKey,
        pickup_address: pickupAddress,
        pickup_lat: pickupLat,
        pickup_lng: pickupLng,
        drop_address: dropAddress,
        drop_lat: dropLat,
        drop_lng: dropLng,
        work_description: workDescription,
        scheduled_date: bookingType === 'advance' ? scheduledDate : null,
        scheduled_time: bookingType === 'advance' ? scheduledTime : null,
        distance_km: fareData.distance_km,
        per_km_rate: fareData.per_km_rate,
        total_fare: fareData.total_fare,
        offered_fare: finalOfferedFare,
      });

      const bId = res.data?.booking_id;
      if (!bId) {
        throw new Error(res.data?.message || 'Booking ID not returned from server');
      }
      setBookingId(bId);
      setSearchSecondsLeft(60);
      setBookingStatus('searching');
      setStep('live_contract');
    } catch (e: any) {
      const errorMsg =
        e?.response?.data?.message ||
        e?.response?.data?.detail ||
        e?.message ||
        (lang === 'hi' ? 'बुकिंग भेजने में त्रुटि हुई। कृपया पुनः प्रयास करें।' : 'Failed to broadcast booking. Please try again.');
      Alert.alert(lang === 'hi' ? 'बुकिंग त्रुटि' : 'Booking Error', errorMsg);
    } finally {
      setBroadcastLoading(false);
    }
  };

  // ── 60-Second Countdown Timer during Searching ────────────────────────────
  useEffect(() => {
    if (step !== 'live_contract' || bookingStatus !== 'searching') return;

    const timer = setInterval(() => {
      setSearchSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setBookingStatus('timeout');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [step, bookingStatus]);

  // ── Polling in Step 4 for Driver Acceptance & Negotiation ─────────────────
  useEffect(() => {
    if (step !== 'live_contract' || !bookingId || bookingStatus === 'timeout' || bookingStatus === 'cancelled') return;

    const pollStatus = async () => {
      try {
        const res = await api.get(`/api/transport/booking/${bookingId}`);
        const data = res.data;
        if (data.status) {
          setBookingStatus(data.status);
        }
        if (data.messages) setNegotiationMessages(data.messages);

        if (data.status === 'accepted' || data.status === 'active' || data.status === 'completed') {
          // Fetch Digital Contract
          const cRes = await api.get(`/api/transport/booking/${bookingId}/agreement`);
          setContractData(cRes.data);
        }
      } catch {
        // silent
      }
    };

    pollStatus();
    const interval = setInterval(pollStatus, 3000);
    return () => clearInterval(interval);
  }, [step, bookingId, bookingStatus]);

  // ── Customer Cancels Search / Request ─────────────────────────────────────
  const handleCancelRequest = () => {
    Alert.alert(
      lang === 'hi' ? 'अनुरोध रद्द करें?' : 'Cancel Search Request?',
      lang === 'hi' ? 'क्या आप गाड़ी खोजने का अनुरोध रद्द करना चाहते हैं?' : 'Are you sure you want to cancel the transport search?',
      [
        { text: lang === 'hi' ? 'नहीं' : 'No', style: 'cancel' },
        {
          text: lang === 'hi' ? 'हाँ, रद्द करें' : 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            if (bookingId) {
              try {
                await api.post(`/api/transport/booking/${bookingId}/cancel`);
              } catch { }
            }
            setBookingStatus('cancelled');
          },
        },
      ]
    );
  };

  // ── Customer Retries Search (with optional fare increment) ────────────────
  const handleRetrySearch = (increment: number = 0) => {
    const nextFare = offeredFare + increment;
    if (increment > 0) {
      setOfferedFare(nextFare);
      const baseFare = fareData?.total_fare || 195;
      const pct = Math.round(((nextFare - baseFare) / baseFare) * 100);
      setFareModifierPercent(pct);
    }
    handleBroadcastRequest(nextFare);
  };

  // ── Customer Accepts Driver's Counter Offer (Non-Self-Acceptance) ────────
  const handleCustomerAccept = async () => {
    if (!bookingId) return;
    try {
      const res = await api.post('/api/transport/customer/accept', { booking_id: bookingId });
      Alert.alert('✅ स्वीकृत!', 'आपने ड्राइवर का काउंटर-ऑफ़र स्वीकार कर लिया है। डिजिटल समझौता तैयार है।');
      setBookingStatus('accepted');
      const cRes = await api.get(`/api/transport/booking/${bookingId}/agreement`);
      setContractData(cRes.data);
    } catch (e: any) {
      Alert.alert('स्वीकृति विफल', e?.response?.data?.detail || 'कृपया दोबारा प्रयास करें।');
    }
  };

  // ── Customer Rejects Driver's Counter Offer ──────────────────────────────
  const handleCustomerReject = async () => {
    if (!bookingId) return;
    Alert.alert(
      lang === 'hi' ? 'ऑफ़र अस्वीकार करें?' : 'Reject Counter Offer?',
      lang === 'hi' ? 'क्या आप इस ड्राइवर के काउंटर-ऑफ़र को अस्वीकार करना चाहते हैं?' : 'Are you sure you want to reject this driver\'s counter offer?',
      [
        { text: lang === 'hi' ? 'नहीं' : 'No', style: 'cancel' },
        {
          text: lang === 'hi' ? 'हाँ, मना करें' : 'Yes, Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await api.post('/api/transport/customer/reject', { booking_id: bookingId });
              setBookingStatus('customer_rejected');
              if (res.data?.messages) setNegotiationMessages(res.data.messages);
            } catch {
              setBookingStatus('customer_rejected');
            }
          },
        },
      ]
    );
  };

  // ── Customer Sends Counter Offer (Blueprint Page 4) ──────────────────────
  const openCounterModal = () => {
    const lastMsgWage = negotiationMessages.length > 0 ? negotiationMessages[negotiationMessages.length - 1]?.wage : offeredFare;
    setCustomerProposedWage(String(Math.round(lastMsgWage - 10 > 0 ? lastMsgWage - 10 : lastMsgWage)));
    setCustomerProposedNote(`मेरा प्रस्तावित किराया ₹${Math.round(lastMsgWage - 10 > 0 ? lastMsgWage - 10 : lastMsgWage)} रहेगा।`);
    setCounterModalVisible(true);
  };

  const submitCustomerCounter = async () => {
    if (!bookingId || !customerProposedWage.trim()) return;
    const wageNum = parseFloat(customerProposedWage);
    if (isNaN(wageNum) || wageNum <= 0) {
      Alert.alert('अमान्य किराया', 'कृपया सही किराया दर्ज करें।');
      return;
    }

    setCounterSubmitLoading(true);
    try {
      await api.post('/api/transport/customer/counter', {
        booking_id: bookingId,
        wage: wageNum,
        message: customerProposedNote,
      });

      Alert.alert('काउंटर-ऑफ़र भेजा गया!', `ड्राइवर को ₹${wageNum} का काउंटर-ऑफ़र भेज दिया गया है।`);
      setOfferedFare(wageNum);
      setCounterModalVisible(false);
    } catch (e: any) {
      Alert.alert('त्रुटि', e?.response?.data?.detail || 'काउंटर-ऑफ़र भेजने में समस्या आई।');
    } finally {
      setCounterSubmitLoading(false);
    }
  };

  // ── Share Agreement Text / Slip (PDF Simulation) ─────────────────────────
  const handleShareAgreement = async () => {
    if (!contractData) return;
    const text = `🚗 श्रम सारथी नेटवर्क - डिजिटल परिवहन एवं कार्य समझौता\n` +
      `Booking ID: ${contractData.booking_id_formatted || 'SSN-TR-' + bookingId}\n` +
      `स्थिति: ${contractData.status}\n` +
      `सेवा प्रकार: ${contractData.service_type_label || 'यात्री'} | गाड़ी: ${contractData.vehicle_type_label || ''} (${contractData.vehicle_number || ''})\n` +
      `पिकअप स्थान: ${contractData.pickup_address}\n` +
      `ड्रॉप स्थान: ${contractData.drop_address}\n` +
      `कुल दूरी: ${contractData.distance_km} KM\n` +
      `कार्य का विवरण: "${contractData.agreed_work_details || workDescription}"\n` +
      `अंतिम तय किराया: ₹${contractData.agreed_fare}.00\n` +
      `भुगतान का माध्यम: ${contractData.payment_mode || 'ड्राइवर को नकद / UPI'}\n` +
      `प्लेटफॉर्म कमीशन: ₹${contractData.commission_amount} (कट चुका)\n` +
      `ड्राइवर संपर्क: ${contractData.driver_name || 'ड्राइवर'} (${contractData.driver_phone || ''})\n` +
      `ग्राहक संपर्क: ${contractData.customer_name || 'ग्राहक'} (${contractData.customer_phone || ''})\n` +
      `नियम: ${contractData.terms || 'तय किराये से अतिरिक्त कोई मांग मान्य नहीं होगी।'}`;

    try {
      await Share.share({ message: text });
    } catch { }
  };

  const selectedVehicleObj = VEHICLE_OPTIONS.find(v => v.key === selectedVehicleKey) || VEHICLE_OPTIONS[3];

  // ──────────────────────────────────────────────────────────────────────────
  // RENDER SCREEN 1: सेवा व गाड़ी चयन
  // ──────────────────────────────────────────────────────────────────────────
  const renderStep1 = () => (
    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scrollContainer}>
      <View style={styles.headerBox}>
        <Text style={styles.pageTitle}>🚗 {lang === 'hi' ? 'परिवहन सेवा' : 'Transport Service'}</Text>
        <Text style={styles.pageSubtitle}>{lang === 'hi' ? 'यात्री, माल एवं डिलीवरी' : 'Passenger, Logistics & Delivery'}</Text>
      </View>

      {/* 1. बुकिंग का प्रकार */}
      <Surface style={styles.cardSection}>
        <Text style={styles.sectionTitle}>⚡ {lang === 'hi' ? 'बुकिंग का प्रकार' : 'Booking Type'}</Text>
        <View style={styles.rowChoices}>
          <TouchableOpacity
            style={[styles.choiceTab, bookingType === 'immediate' && styles.choiceTabActive]}
            onPress={() => setBookingType('immediate')}
            activeOpacity={0.8}
          >
            <Text style={[styles.choiceTabTitle, bookingType === 'immediate' && styles.choiceTabTitleActive]}>
              ⚡ {lang === 'hi' ? 'अभी चाहिए (Immediate)' : 'Immediate'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.choiceTab, bookingType === 'advance' && styles.choiceTabActive]}
            onPress={() => setBookingType('advance')}
            activeOpacity={0.8}
          >
            <Text style={[styles.choiceTabTitle, bookingType === 'advance' && styles.choiceTabTitleActive]}>
              📅 {lang === 'hi' ? 'बाद में (Advance)' : 'Advance'}
            </Text>
          </TouchableOpacity>
        </View>
      </Surface>

      {/* 1.1 एडवांस बुकिंग के लिए तारीख व समय (Date & Time Selection) */}
      {bookingType === 'advance' && (
        <Surface style={[styles.cardSection, { borderColor: '#81C784', borderWidth: 1.5, backgroundColor: '#F1F8E9' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Ionicons name="calendar" size={20} color="#2E7D32" style={{ marginRight: 6 }} />
            <Text style={[styles.sectionTitle, { color: '#1B5E20', marginBottom: 0 }]}>
              {lang === 'hi' ? 'एडवांस यात्रा की तारीख व समय चुनें' : 'Select Advance Date & Time'}
            </Text>
          </View>
          <Text style={{ fontSize: 12, color: '#558B2F', marginBottom: 12 }}>
            {lang === 'hi' ? '📅 अपनी सुविधानुसार वाहन पहले से बुक करें' : '📅 Pre-book vehicle in advance at your convenience'}
          </Text>

          {/* Custom Calendar Date Picker */}
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#333', marginBottom: 6 }}>
            {lang === 'hi' ? 'तारीख चुनें (Select Date):' : 'Select Date:'}
          </Text>
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingVertical: 12,
              paddingHorizontal: 14,
              borderRadius: 10,
              backgroundColor: '#E8F5E9',
              borderWidth: 1.5,
              borderColor: '#2E7D32',
              marginBottom: 14,
            }}
            onPress={showDatePicker}
            activeOpacity={0.8}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <Ionicons name="calendar" size={22} color="#2E7D32" style={{ marginRight: 10 }} />
              <View>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#1B5E20' }}>
                  {lang === 'hi' ? '📅 कैलेंडर से तारीख चुनें' : '📅 Pick Date from Calendar'}
                </Text>
                <Text style={{ fontSize: 12, color: '#374151', marginTop: 2 }}>
                  {getFormattedDateObj(scheduledDateObj)}
                </Text>
              </View>
            </View>
            <View style={{ backgroundColor: '#C8E6C9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#2E7D32' }}>
                {lang === 'hi' ? 'कैलेंडर खोलें' : 'Open Calendar'}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Time Slot Selector */}
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#333', marginBottom: 6 }}>
            {lang === 'hi' ? 'समय स्लॉट चुनें (Select Time Slot):' : 'Select Time Slot:'}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {[
              { key: 'morning', label: lang === 'hi' ? '🌅 सुबह (8-11 AM)' : '🌅 Morning (8-11 AM)' },
              { key: 'afternoon', label: lang === 'hi' ? '☀️ दोपहर (12-3 PM)' : '☀️ Afternoon (12-3 PM)' },
              { key: 'evening', label: lang === 'hi' ? '🌆 शाम (4-7 PM)' : '🌆 Evening (4-7 PM)' },
              { key: 'night', label: lang === 'hi' ? '🌙 रात (8-11 PM)' : '🌙 Night (8-11 PM)' },
            ].map(slot => {
              const isSelected = scheduledTime === slot.key;
              return (
                <TouchableOpacity
                  key={slot.key}
                  onPress={() => setScheduledTime(slot.key)}
                  style={{
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    borderRadius: 20,
                    backgroundColor: isSelected ? '#2E7D32' : '#FFFFFF',
                    borderWidth: 1,
                    borderColor: isSelected ? '#2E7D32' : '#E0E0E0',
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: isSelected ? '700' : '500', color: isSelected ? '#FFFFFF' : '#333' }}>
                    {slot.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Specific Time Picker via Clock/Watch (PDF Page 4 requirement) */}
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingVertical: 12,
              paddingHorizontal: 14,
              borderRadius: 10,
              backgroundColor: scheduledTime.startsWith('specific') ? '#E8F5E9' : '#FFFFFF',
              borderWidth: 1.5,
              borderColor: scheduledTime.startsWith('specific') ? '#2E7D32' : '#CBD5E1',
              marginTop: 10,
            }}
            onPress={showTimePicker}
            activeOpacity={0.8}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <Ionicons name="time" size={22} color="#2E7D32" style={{ marginRight: 10 }} />
              <View>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#1B5E20' }}>
                  {scheduledTime.startsWith('specific')
                    ? (lang === 'hi' ? '⏰ चुना हुआ विशिष्ट समय (घड़ी)' : '⏰ Selected Exact Time (Clock)')
                    : (lang === 'hi' ? '⏰ घड़ी से निश्चित समय सेट करें (घंटे व मिनट)' : '⏰ Set Exact Time from Clock (Watch/Picker)')}
                </Text>
                <Text style={{ fontSize: 12, color: '#374151', marginTop: 2 }}>
                  {scheduledTime.startsWith('specific')
                    ? scheduledSpecificTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : (lang === 'hi' ? 'जैसे 10:30 AM, 04:15 PM आदि' : 'e.g. 10:30 AM, 04:15 PM')}
                </Text>
              </View>
            </View>
            <View style={{ backgroundColor: '#E8F5E9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#2E7D32' }}>
                {lang === 'hi' ? 'घड़ी से चुनें ⏱️' : 'Pick Time ⏱️'}
              </Text>
            </View>
          </TouchableOpacity>
        </Surface>
      )}

      {/* 2. सेवा का प्रकार */}
      <Surface style={styles.cardSection}>
        <Text style={styles.sectionTitle}>📦 {lang === 'hi' ? 'सेवा का प्रकार चुनें' : 'Select Service Type'}</Text>
        <View style={styles.serviceTypesList}>
          <TouchableOpacity
            style={[styles.serviceOptionCard, serviceType === 'passenger' && styles.serviceOptionCardActive]}
            onPress={() => setServiceType('passenger')}
            activeOpacity={0.8}
          >
            <Text style={styles.serviceIcon}>👨‍👩‍👦</Text>
            <View style={styles.serviceTextCol}>
              <Text style={[styles.serviceName, serviceType === 'passenger' && styles.serviceNameActive]}>
                {lang === 'hi' ? 'यात्री (Passenger)' : 'Passenger'}
              </Text>
              <Text style={styles.serviceDesc}>{lang === 'hi' ? 'सवारी एवं परिवार के लिए' : 'For passengers & families'}</Text>
            </View>
            {serviceType === 'passenger' && <Text style={styles.checkMark}>✓</Text>}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.serviceOptionCard, serviceType === 'goods' && styles.serviceOptionCardActive]}
            onPress={() => setServiceType('goods')}
            activeOpacity={0.8}
          >
            <Text style={styles.serviceIcon}>📦</Text>
            <View style={styles.serviceTextCol}>
              <Text style={[styles.serviceName, serviceType === 'goods' && styles.serviceNameActive]}>
                {lang === 'hi' ? 'माल (Goods / Logistics)' : 'Goods / Logistics'}
              </Text>
              <Text style={styles.serviceDesc}>{lang === 'hi' ? 'भारी माल और कमर्शियल ढुलाई' : 'Heavy goods & logistics'}</Text>
            </View>
            {serviceType === 'goods' && <Text style={styles.checkMark}>✓</Text>}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.serviceOptionCard, serviceType === 'delivery' && styles.serviceOptionCardActive]}
            onPress={() => setServiceType('delivery')}
            activeOpacity={0.8}
          >
            <Text style={styles.serviceIcon}>🛵</Text>
            <View style={styles.serviceTextCol}>
              <Text style={[styles.serviceName, serviceType === 'delivery' && styles.serviceNameActive]}>
                {lang === 'hi' ? 'डिलीवरी (Delivery)' : 'Delivery'}
              </Text>
              <Text style={styles.serviceDesc}>{lang === 'hi' ? 'लोकल पार्सल और कूरियर' : 'Local parcel & courier'}</Text>
            </View>
            {serviceType === 'delivery' && <Text style={styles.checkMark}>✓</Text>}
          </TouchableOpacity>
        </View>
      </Surface>

      {/* 3. गाड़ी का प्रकार चुनें */}
      <Surface style={styles.cardSection}>
        <Text style={styles.sectionTitle}>🚘 {lang === 'hi' ? 'गाड़ी का प्रकार चुनें' : 'Select Vehicle Type'}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.vehicleScrollList}>
          {availableVehicles.map(veh => {
            const isSelected = veh.key === selectedVehicleKey;
            return (
              <TouchableOpacity
                key={veh.key}
                style={[styles.vehicleCard, isSelected && styles.vehicleCardActive]}
                onPress={() => setSelectedVehicleKey(veh.key)}
                activeOpacity={0.8}
              >
                <Text style={styles.vehicleCardIcon}>{veh.icon}</Text>
                <Text style={[styles.vehicleCardName, isSelected && styles.vehicleCardNameActive]} numberOfLines={1}>
                  {veh.name}
                </Text>
                <Text style={styles.vehicleCardRate}>₹{veh.ratePerKm}/km</Text>
                <Badge style={[styles.vehicleBadge, isSelected ? { backgroundColor: '#F26333' } : { backgroundColor: '#ECEFF1', color: '#607D8B' }]}>
                  {veh.desc}
                </Badge>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </Surface>

      {/* Next Button */}
      <Button
        mode="contained"
        style={styles.primaryActionButton}
        labelStyle={styles.primaryActionButtonLabel}
        onPress={() => setStep('enter_route')}
      >
        {lang === 'hi' ? 'रास्ता दर्ज करें ➔' : 'Enter Route ➔'}
      </Button>
    </ScrollView>
  );

  // ──────────────────────────────────────────────────────────────────────────
  // RENDER SCREEN 2: रास्ता एवं कार्य का विवरण
  // ──────────────────────────────────────────────────────────────────────────
  const renderStep2 = () => (
    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scrollContainer}>
      <View style={styles.headerBox}>
        <TouchableOpacity style={styles.backRow} onPress={() => setStep('select_service')}>
          <Text style={styles.backArrow}>←</Text>
          <Text style={styles.pageTitle}>{lang === 'hi' ? 'रास्ता दर्ज करें' : 'Enter Route'}</Text>
        </TouchableOpacity>
        <Text style={styles.pageSubtitle}>
          {selectedVehicleObj.icon} {selectedVehicleObj.name} ({serviceType === 'goods' ? 'माल' : serviceType === 'delivery' ? 'डिलीवरी' : 'यात्री'})
        </Text>
      </View>

      {/* Pickup Address */}
      <Surface style={styles.cardSection}>
        <View style={styles.locationHeaderRow}>
          <Text style={styles.sectionTitle}>📍 {lang === 'hi' ? 'पिकअप का पता' : 'Pickup Location'}</Text>
          <TouchableOpacity style={styles.gpsButton} disabled={gpsLoading} onPress={getCurrentLocation}>
            {gpsLoading ? (
              <ActivityIndicator size="small" color="#1565C0" />
            ) : (
              <Text style={styles.gpsButtonText}>📍 {lang === 'hi' ? 'वर्तमान लोकेशन लें' : 'Current GPS'}</Text>
            )}
          </TouchableOpacity>
        </View>
        <TextInput
          mode="outlined"
          value={pickupAddress}
          onChangeText={t => handleAddressChange(t, 'pickup')}
          placeholder={lang === 'hi' ? 'पिकअप का पता लिखें...' : 'Enter pickup address...'}
          style={styles.inputStyle}
          outlineColor="#E0E0E0"
          activeOutlineColor="#F26333"
        />
        {activeField === 'pickup' && pickupSuggestions.length > 0 && (
          <View style={styles.suggestionsContainer}>
            {pickupSuggestions.map((s, idx) => (
              <TouchableOpacity key={`pickup_${s.place_id}_${idx}`} style={styles.suggestionItem} onPress={() => selectSuggestion(s, 'pickup')}>
                <Text style={styles.suggestionText}>📍 {s.short_name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </Surface>

      {/* Drop Address */}
      <Surface style={styles.cardSection}>
        <Text style={styles.sectionTitle}>🏁 {lang === 'hi' ? 'ड्रॉप का पता' : 'Drop Location'}</Text>
        <TextInput
          mode="outlined"
          value={dropAddress}
          onChangeText={t => handleAddressChange(t, 'drop')}
          placeholder={lang === 'hi' ? 'ड्रॉप लोकेशन दर्ज करें...' : 'Enter drop address...'}
          style={styles.inputStyle}
          outlineColor="#E0E0E0"
          activeOutlineColor="#F26333"
        />
        {activeField === 'drop' && dropSuggestions.length > 0 && (
          <View style={styles.suggestionsContainer}>
            {dropSuggestions.map((s, idx) => (
              <TouchableOpacity key={`drop_${s.place_id}_${idx}`} style={styles.suggestionItem} onPress={() => selectSuggestion(s, 'drop')}>
                <Text style={styles.suggestionText}>🏁 {s.short_name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </Surface>

      {/* Work / Trip Details */}
      <Surface style={styles.cardSection}>
        <View style={styles.locationHeaderRow}>
          <Text style={styles.sectionTitle}>📝 {lang === 'hi' ? 'कार्य / यात्रा का विस्तृत विवरण' : 'Work / Trip Details'}</Text>
          <TouchableOpacity
            style={[styles.micButton, isRecording && styles.micButtonActive]}
            onPress={toggleVoiceRecording}
            activeOpacity={0.7}
          >
            <Text style={styles.micIcon}>{isRecording ? '⏹️' : '🎙️'}</Text>
            <Text style={styles.micButtonText}>{isRecording ? 'रिकॉर्ड हो रहा है...' : 'बोलकर लिखें'}</Text>
          </TouchableOpacity>
        </View>

        <TextInput
          mode="outlined"
          value={workDescription}
          onChangeText={setWorkDescription}
          placeholder={lang === 'hi' ? 'यात्रा या माल का विवरण लिखें...' : 'Describe journey or goods details...'}
          multiline
          numberOfLines={3}
          style={[styles.inputStyle, { minHeight: 75 }]}
          outlineColor="#E0E0E0"
          activeOutlineColor="#F26333"
        />

        {/* Quick Example Chips */}
        <Text style={styles.exampleTitle}>💡 {lang === 'hi' ? 'त्वरित उदाहरण:' : 'Quick Examples:'}</Text>
        <View style={styles.chipsRow}>
          <TouchableOpacity
            style={styles.exampleChip}
            onPress={() => setWorkDescription('4 लोग हैं, साथ में 2 बड़े बैग हैं।')}
          >
            <Text style={styles.exampleChipText}>"4 लोग हैं, 2 बड़े बैग"</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.exampleChip}
            onPress={() => setWorkDescription('20 बोरी सीमेंट ले जाना है, ग्राउंड फ्लोर पर अनलोड करना है।')}
          >
            <Text style={styles.exampleChipText}>"20 बोरी सीमेंट अनलोडिंग"</Text>
          </TouchableOpacity>
        </View>
      </Surface>

      {/* Calculate Fare Button */}
      <Button
        mode="contained"
        loading={calcLoading}
        disabled={calcLoading}
        style={styles.primaryActionButton}
        labelStyle={styles.primaryActionButtonLabel}
        onPress={handleCalculateFare}
      >
        {lang === 'hi' ? 'किराया कैलकुलेट करें ➔' : 'Calculate Fare ➔'}
      </Button>
    </ScrollView>
  );

  // ──────────────────────────────────────────────────────────────────────────
  // RENDER SCREEN 3: किराया विवरण एवं मोलभाव
  // ──────────────────────────────────────────────────────────────────────────
  const renderStep3 = () => (
    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scrollContainer}>
      <View style={styles.headerBox}>
        <TouchableOpacity style={styles.backRow} onPress={() => setStep('enter_route')}>
          <Text style={styles.backArrow}>←</Text>
          <Text style={styles.pageTitle}>{lang === 'hi' ? 'किराया विवरण' : 'Fare Details'}</Text>
        </TouchableOpacity>
        <Text style={styles.pageSubtitle}>
          {selectedVehicleObj.icon} {selectedVehicleObj.name} | {serviceType === 'goods' ? 'माल (Goods)' : serviceType === 'delivery' ? 'डिलीवरी' : 'यात्री (Passenger)'}
        </Text>
      </View>

      {/* Distance & Rate Breakdown */}
      <Surface style={styles.cardSection}>
        <View style={styles.fareBreakdownRow}>
          <View style={styles.fareMetricCol}>
            <Text style={styles.fareMetricLabel}>📏 {lang === 'hi' ? 'दूरी (Distance)' : 'Distance'}</Text>
            <Text style={styles.fareMetricVal}>{fareData?.distance_km || 12.98} km</Text>
          </View>
          <Divider style={{ width: 1, height: '80%', backgroundColor: '#E0E0E0' }} />
          <View style={styles.fareMetricCol}>
            <Text style={styles.fareMetricLabel}>🏷️ {lang === 'hi' ? 'रेट (Rate)' : 'Rate'}</Text>
            <Text style={styles.fareMetricVal}>₹{fareData?.per_km_rate || 15}/km</Text>
          </View>
        </View>

        <Divider style={{ marginVertical: 12, backgroundColor: '#F0F0F0' }} />

        <View style={styles.totalFareRow}>
          <Text style={styles.totalFareLabel}>{lang === 'hi' ? 'सिस्टम कुल किराया (Total Fare):' : 'System Total Fare:'}</Text>
          <Text style={styles.totalFareVal}>₹{fareData?.total_fare || 194.7}</Text>
        </View>
      </Surface>

      {/* Offered Fare / Negotiation Box */}
      <Surface style={styles.cardSection}>
        <Text style={styles.sectionTitle}>🤝 {lang === 'hi' ? 'प्रस्तावित किराया / मोलभाव (Offered Fare)' : 'Offered Fare / Negotiation'}</Text>
        <Text style={styles.fieldHint}>
          {lang === 'hi' ? 'ग्राहक आवश्यकतानुसार किराया कम या अधिक प्रस्तावित कर सकता है' : 'You can adjust offered fare to negotiate with drivers'}
        </Text>

        {/* Counter Widget */}
        <View style={styles.counterWidget}>
          <TouchableOpacity style={styles.counterBtn} onPress={() => changeOfferedFare(-10)}>
            <Text style={styles.counterBtnText}>-</Text>
          </TouchableOpacity>
          <View style={styles.counterValueContainer}>
            <Text style={styles.counterCurrency}>₹</Text>
            <Text style={styles.counterNumber}>{offeredFare}</Text>
          </View>
          <TouchableOpacity style={styles.counterBtn} onPress={() => changeOfferedFare(10)}>
            <Text style={styles.counterBtnText}>+</Text>
          </TouchableOpacity>
        </View>

        {/* Percentage Modifier Chips */}
        <View style={styles.pctChipsRow}>
          {[-10, -5, 5, 10].map(pct => {
            const isSelected = fareModifierPercent === pct;
            return (
              <TouchableOpacity
                key={pct}
                style={[styles.pctChip, isSelected && styles.pctChipActive]}
                onPress={() => applyPercentModifier(pct)}
              >
                <Text style={[styles.pctChipText, isSelected && styles.pctChipTextActive]}>
                  {pct > 0 ? `+${pct}%` : `${pct}%`}
                </Text>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity style={styles.pctChip} onPress={() => applyPercentModifier(0)}>
            <Text style={styles.pctChipText}>Reset</Text>
          </TouchableOpacity>
        </View>
      </Surface>

      {/* Commission Notice Card */}
      <Surface style={styles.commissionNoticeCard}>
        <Text style={styles.commissionNoticeIcon}>ℹ️</Text>
        <Text style={styles.commissionNoticeText}>
          {lang === 'hi'
            ? 'प्लेटफॉर्म कमीशन वाहन स्वामी के वॉलेट से काटा जाएगा'
            : "Platform commission will be deducted from the vehicle owner's wallet"}
        </Text>
      </Surface>

      {/* Broadcast Request Button */}
      <Button
        mode="contained"
        loading={broadcastLoading}
        disabled={broadcastLoading}
        style={styles.broadcastButton}
        labelStyle={styles.primaryActionButtonLabel}
        onPress={() => handleBroadcastRequest()}
      >
        📢 {lang === 'hi' ? 'गाड़ी रिक्वेस्ट भेजें (Broadcast Request)' : 'Broadcast Request'}
      </Button>
    </ScrollView>
  );

  // ──────────────────────────────────────────────────────────────────────────
  // RENDER SCREEN 4: लाइव नेगोशिएशन चैट एवं डिजिटल समझौता
  // ──────────────────────────────────────────────────────────────────────────
  const renderStep4 = () => {
    const isLocked = bookingStatus === 'accepted' || bookingStatus === 'active' || bookingStatus === 'completed';
    const isTimeoutOrCancelled = bookingStatus === 'timeout' || bookingStatus === 'cancelled';
    const lastMsg = negotiationMessages.length > 0 ? negotiationMessages[negotiationMessages.length - 1] : null;
    const isRejected = bookingStatus === 'driver_rejected' || bookingStatus === 'customer_rejected' || lastMsg?.type === 'rejected';

    // Strict Non-Self-Acceptance check
    const isLatestOfferFromDriver = lastMsg ? lastMsg.sender === 'driver' : bookingStatus === 'negotiating';
    const latestOfferWage = lastMsg?.wage || offeredFare + 25;

    return (
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scrollContainer}>
        {/* State 1: Searching for Drivers with 60s Live Countdown & Cancel Action */}
        {!isLocked && !isTimeoutOrCancelled && !isRejected && bookingStatus === 'searching' && (
          <Surface style={styles.searchingRadarCard}>
            <Animated.View style={[styles.radarCircle, { transform: [{ scale: radarAnim }] }]}>
              <Text style={{ fontSize: 36 }}>📡</Text>
            </Animated.View>
            <Text style={styles.searchingTitle}>
              {lang === 'hi' ? 'पास के ड्राइवरों को रिक्वेस्ट भेजी जा रही है...' : 'Broadcasting to nearby drivers...'}
            </Text>
            <Text style={styles.searchingSub}>
              5 KM - 10 KM {lang === 'hi' ? 'दायरे के ऑनलाइन ड्राइवरों को सूचना भेजी गई है।' : 'radius drivers are receiving your request.'}
            </Text>

            {/* Countdown Badge */}
            <View style={styles.countdownBadge}>
              <Text style={styles.countdownBadgeText}>
                ⏱️ {lang === 'hi' ? `समय शेष: ${searchSecondsLeft} सेकंड` : `${searchSecondsLeft}s remaining`}
              </Text>
            </View>

            <ActivityIndicator color="#F26333" size="small" style={{ marginVertical: 12 }} />

            {/* Cancel Request Button */}
            <Button
              mode="outlined"
              icon="close-circle-outline"
              style={styles.cancelSearchBtn}
              textColor="#D32F2F"
              labelStyle={{ fontSize: 13, fontWeight: 'bold' }}
              onPress={handleCancelRequest}
            >
              {lang === 'hi' ? '🚫 अनुरोध रद्द करें (Cancel Request)' : '🚫 Cancel Request'}
            </Button>
          </Surface>
        )}

        {/* State 1B: No Driver Found / Request Cancelled Timeout Card */}
        {!isLocked && isTimeoutOrCancelled && !isRejected && (
          <Surface style={styles.noDriverCard}>
            <View style={styles.noDriverIconCircle}>
              <Text style={{ fontSize: 36 }}>{bookingStatus === 'cancelled' ? '🚫' : '📭'}</Text>
            </View>
            <Text style={styles.noDriverTitle}>
              {bookingStatus === 'cancelled'
                ? (lang === 'hi' ? 'अनुरोध रद्द कर दिया गया' : 'Request Cancelled')
                : (lang === 'hi' ? 'कोई गाड़ी/ड्राइवर नहीं मिला' : 'No Transport Available')}
            </Text>
            <Text style={styles.noDriverSub}>
              {bookingStatus === 'cancelled'
                ? (lang === 'hi' ? 'आपने इस गाड़ी सर्च रिक्वेस्ट को रद्द कर दिया है।' : 'You cancelled this search request.')
                : (lang === 'hi' ? 'निर्धारित समय में किसी ड्राइवर ने अनुरोध स्वीकार नहीं किया। आप किराया थोड़ा बढ़ाकर तुरंत दोबारा भेज सकते हैं।' : 'No drivers accepted within 60 seconds. Try increasing your offered fare or search again.')}
            </Text>

            {/* Action Options */}
            <View style={styles.noDriverActionCol}>
              <Button
                mode="contained"
                icon="trending-up"
                style={[styles.noDriverBtn, { backgroundColor: '#F26333' }]}
                labelStyle={{ fontSize: 14, fontWeight: 'bold', color: '#fff' }}
                onPress={() => handleRetrySearch(20)}
              >
                {lang === 'hi' ? `📈 ₹20 बढ़ाकर पुनः खोजें (₹${offeredFare + 20})` : `Offer +₹20 & Retry (₹${offeredFare + 20})`}
              </Button>

              <Button
                mode="outlined"
                icon="refresh"
                style={[styles.noDriverBtn, { borderColor: '#1976D2' }]}
                textColor="#1976D2"
                labelStyle={{ fontSize: 14, fontWeight: 'bold' }}
                onPress={() => handleRetrySearch(0)}
              >
                {lang === 'hi' ? `🔄 इसी किराये पर दोबारा खोजें (₹${offeredFare})` : `Retry Same Fare (₹${offeredFare})`}
              </Button>

              <Button
                mode="text"
                icon="arrow-left"
                textColor="#546E7A"
                labelStyle={{ fontSize: 13 }}
                onPress={() => setStep('enter_route')}
              >
                {lang === 'hi' ? '← गाड़ी प्रकार या लोकेशन बदलें' : '← Change Vehicle or Route'}
              </Button>
            </View>
          </Surface>
        )}

        {/* State 1C: Offer Rejected by Driver / Customer */}
        {!isLocked && isRejected && (
          <Surface style={styles.noDriverCard}>
            <View style={[styles.noDriverIconCircle, { backgroundColor: '#FFEBEE' }]}>
              <Text style={{ fontSize: 36 }}>❌</Text>
            </View>
            <Text style={[styles.noDriverTitle, { color: '#D32F2F' }]}>
              {bookingStatus === 'driver_rejected' || lastMsg?.type === 'rejected'
                ? (lang === 'hi' ? 'ड्राइवर ने ऑफ़र अस्वीकार कर दिया' : 'Offer Rejected by Driver')
                : (lang === 'hi' ? 'आपने ऑफ़र अस्वीकार किया' : 'Offer Rejected')}
            </Text>
            <Text style={styles.noDriverSub}>
              {lastMsg?.message || (lang === 'hi'
                ? 'ड्राइवर ने इस किराये पर यात्रा / डिलीवरी अस्वीकार कर दी है। आप किराया थोड़ा बढ़ाकर या किसी अन्य ड्राइवर के लिए दोबारा खोज सकते हैं।'
                : 'The driver declined this offer. You can increase the fare or search again for other drivers.')}
            </Text>

            {/* Action Options */}
            <View style={styles.noDriverActionCol}>
              <Button
                mode="contained"
                icon="trending-up"
                style={[styles.noDriverBtn, { backgroundColor: '#F26333' }]}
                labelStyle={{ fontSize: 14, fontWeight: 'bold', color: '#fff' }}
                onPress={() => handleRetrySearch(20)}
              >
                {lang === 'hi' ? `📈 ₹20 बढ़ाकर पुनः खोजें (₹${offeredFare + 20})` : `Offer +₹20 & Retry (₹${offeredFare + 20})`}
              </Button>

              <Button
                mode="outlined"
                icon="refresh"
                style={[styles.noDriverBtn, { borderColor: '#1976D2' }]}
                textColor="#1976D2"
                labelStyle={{ fontSize: 14, fontWeight: 'bold' }}
                onPress={() => handleRetrySearch(0)}
              >
                {lang === 'hi' ? `🔄 अन्य ड्राइवर खोजें (₹${offeredFare})` : `Search Other Drivers (₹${offeredFare})`}
              </Button>

              <Button
                mode="text"
                icon="arrow-left"
                textColor="#546E7A"
                labelStyle={{ fontSize: 13 }}
                onPress={() => setStep('enter_route')}
              >
                {lang === 'hi' ? '← गाड़ी प्रकार या लोकेशन बदलें' : '← Change Vehicle or Route'}
              </Button>
            </View>
          </Surface>
        )}

        {/* State 2: Negotiation Counter Offers from Driver (Blueprint Page 4) */}
        {!isLocked && !isTimeoutOrCancelled && !isRejected && (negotiationMessages.length > 0 || bookingStatus === 'negotiating') && (
          <Surface style={styles.negotiationChatCard}>
            <Text style={styles.sectionTitle}>💬 {lang === 'hi' ? 'लाइव नेगोशिएशन (Live Counter Offer)' : 'Live Negotiation'}</Text>

            {/* Driver Chat Bubble */}
            <View style={styles.driverChatBubble}>
              <Text style={styles.driverChatName}>
                {isLatestOfferFromDriver ? '👨‍✈️ ड्राइवर (Driver):' : '👤 आप (Customer):'}
              </Text>
              <Text style={styles.driverChatText}>
                {lastMsg?.message || `"${pickupAddress} से ${dropAddress} के लिए किराया ₹${latestOfferWage} रहेगा।"`}
              </Text>
            </View>

            {/* Strict Non-Self-Acceptance Rule: Only recipient can accept */}
            {isLatestOfferFromDriver ? (
              <View style={styles.negotiationActionRow}>
                <Button
                  mode="contained"
                  style={[styles.negoBtn, { backgroundColor: '#2E7D32', flex: 1.2 }]}
                  labelStyle={{ fontSize: 13, fontWeight: 'bold' }}
                  onPress={handleCustomerAccept}
                >
                  ✓ {lang === 'hi' ? `स्वीकार करें (₹${latestOfferWage})` : `Accept ₹${latestOfferWage}`}
                </Button>

                <Button
                  mode="contained"
                  style={[styles.negoBtn, { backgroundColor: '#1976D2', flex: 1 }]}
                  labelStyle={{ fontSize: 13, fontWeight: 'bold' }}
                  onPress={openCounterModal}
                >
                  🔄 {lang === 'hi' ? 'काउंटर दें' : 'Counter'}
                </Button>

                <Button
                  mode="outlined"
                  style={[styles.negoBtn, { borderColor: '#E53E3E', flex: 0.8 }]}
                  textColor="#E53E3E"
                  labelStyle={{ fontSize: 13, fontWeight: 'bold' }}
                  onPress={handleCustomerReject}
                >
                  ✕ {lang === 'hi' ? 'मना करें' : 'Reject'}
                </Button>
              </View>
            ) : (
              <View style={styles.waitingDriverResponseBox}>
                <Text style={styles.waitingDriverResponseText}>
                  ⏳ आपने ₹{latestOfferWage} का काउंटर-ऑफ़र भेज दिया है। ड्राइवर की स्वीकृति या उत्तर की प्रतीक्षा है...
                </Text>
              </View>
            )}

            {/* Open Full Negotiation Chat Screen Button */}
            <TouchableOpacity
              style={styles.openFullChatBtn}
              onPress={() => navigation.navigate('NegotiationChatScreen', { job_id: bookingId, module: 'transport' })}
            >
              <Ionicons name="chatbubbles" size={18} color="#1565C0" />
              <Text style={styles.openFullChatBtnText}>
                {lang === 'hi' ? '💬 लाइव चैट (नेगोशिएशन) स्क्रीन खोलें ➔' : '💬 Open Live Chat Screen ➔'}
              </Text>
            </TouchableOpacity>
          </Surface>
        )}

        {/* State 3: DIGITAL CONTRACT (डिजिटल यात्रा एवं कार्य समझौता - Blueprint Page 4 & 5) */}
        {isLocked && (
          <View style={styles.contractWrapper}>
            <Surface style={styles.contractCard}>
              <View style={styles.contractHeader}>
                <Text style={styles.contractMainTitle}>📜 {lang === 'hi' ? 'डिजिटल यात्रा एवं कार्य समझौता' : 'Digital Transport & Work Agreement'}</Text>
                <Text style={styles.contractSubTitle}>(Digital Transport & Work Agreement)</Text>
              </View>

              <Divider style={styles.contractDivider} />

              <View style={styles.contractRowSpaced}>
                <Text style={styles.contractLabel}>Booking ID: <Text style={styles.contractValBold}>{contractData?.booking_reference || `SSN-TR-${bookingId}`}</Text></Text>
                <Badge style={{ backgroundColor: bookingStatus === 'completed' ? '#1565C0' : '#2E7D32', color: '#fff', fontWeight: 'bold' }}>
                  {bookingStatus === 'completed' ? '🏁 पूर्ण (Completed)' : (bookingStatus === 'active' ? '🟢 यात्रा चालू है' : '🟢 स्वीकृत (Confirmed)')}
                </Badge>
              </View>

              <View style={styles.contractRowSpaced}>
                <Text style={styles.contractLabel}>सेवा प्रकार: <Text style={styles.contractVal}>{contractData?.service_label || (serviceType === 'goods' ? 'माल' : serviceType === 'delivery' ? 'डिलीवरी' : 'यात्री')}</Text></Text>
                <Text style={styles.contractLabel}>गाड़ी: <Text style={styles.contractVal}>{contractData?.vehicle_type_label || selectedVehicleObj.name}</Text></Text>
              </View>

              <Divider style={styles.contractDivider} />

              <Text style={styles.contractLine}>📍 <Text style={styles.contractLabel}>पिकअप स्थान:</Text> {contractData?.pickup_address || pickupAddress}</Text>
              <Text style={styles.contractLine}>🏁 <Text style={styles.contractLabel}>ड्रॉप स्थान:</Text> {contractData?.drop_address || dropAddress}</Text>
              <Text style={styles.contractLine}>📏 <Text style={styles.contractLabel}>कुल दूरी:</Text> {contractData?.distance_km || fareData.distance_km} KM</Text>

              <Divider style={styles.contractDivider} />

              <Text style={styles.contractLabel}>📋 कार्य का अंतिम विवरण (Agreed Work Details):</Text>
              <Text style={styles.contractWorkBox}>"{contractData?.work_description || workDescription}"</Text>

              <Divider style={styles.contractDivider} />

              <View style={styles.contractRowSpaced}>
                <Text style={styles.contractLabel}>💵 कुल देय किराया (Total Fare to Pay):</Text>
                <Text style={styles.contractFareText}>₹ {contractData?.agreed_fare || offeredFare}.00</Text>
              </View>

              <View style={styles.contractRowSpaced}>
                <Text style={styles.contractLabel}>💳 भुगतान का माध्यम:</Text>
                <Text style={styles.contractVal}>सीधे ड्राइवर को नकद / UPI दें</Text>
              </View>

              <Divider style={styles.contractDivider} />

              {/* Contact Information Unlocked */}
              <View style={styles.contactUnlockBox}>
                <Text style={styles.contactLine}>👤 <Text style={styles.contractLabel}>ड्राइवर नाम:</Text> {contractData?.driver_name || 'चालक साथी'}</Text>
                <Text style={styles.contactLine}>📞 <Text style={styles.contractLabel}>ड्राइवर संपर्क:</Text> {contractData?.driver_phone || 'स्वीकृत'}</Text>
                {!!contractData?.vehicle_number && (
                  <Text style={styles.contactLine}>🚗 <Text style={styles.contractLabel}>गाड़ी नंबर:</Text> {contractData.vehicle_number}</Text>
                )}

                {/* 🔑 Secret PIN Box with clear instruction */}
                {!!(contractData?.secret_pin || bookingStatus === 'accepted') && (
                  <View style={{ marginTop: 10, backgroundColor: '#E3F2FD', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#90CAF9' }}>
                    <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#1565C0' }}>
                      🔑 सुरक्षा सत्यापन कोड (Secret PIN):
                    </Text>
                    <Text style={{ fontSize: 26, fontWeight: 'bold', color: '#0D47A1', letterSpacing: 5, marginVertical: 4, textAlign: 'center' }}>
                      {contractData?.secret_pin || '----'}
                    </Text>
                    <Text style={{ fontSize: 11, color: '#37474F', textAlign: 'center' }}>
                      ℹ️ जब ड्राइवर आपके पास पहुंचे, तो गाड़ी में बैठने के बाद यह पिन ड्राइवर को बताएं ताकि वह यात्रा शुरू (Start Trip) कर सके।
                    </Text>
                  </View>
                )}
              </View>

              <Divider style={styles.contractDivider} />

              <Text style={styles.contractTerms}>
                ⚖️ <Text style={{ fontWeight: 'bold' }}>नियम:</Text> तय किराये से अतिरिक्त कोई मांग मान्य नहीं होगी।
              </Text>
            </Surface>

            {/* Action Buttons for Active Trip */}
            <View style={styles.activeActionsRow}>
              <Button
                mode="contained"
                icon="phone"
                style={[styles.activeActionBtn, { backgroundColor: '#2E7D32' }]}
                onPress={() => Linking.openURL(`tel:${contractData?.driver_phone || '9400000022'}`)}
              >
                {lang === 'hi' ? 'कॉल ड्राइवर' : 'Call Driver'}
              </Button>

              <Button
                mode="outlined"
                icon="map-marker"
                style={[styles.activeActionBtn, { borderColor: '#F26333' }]}
                textColor="#F26333"
                onPress={() => Linking.openURL(`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(pickupAddress)}&destination=${encodeURIComponent(dropAddress)}`)}
              >
                {lang === 'hi' ? 'मैप रूट' : 'View Route'}
              </Button>

              <Button
                mode="outlined"
                icon="share-variant"
                style={[styles.activeActionBtn, { borderColor: '#1976D2' }]}
                textColor="#1976D2"
                onPress={handleShareAgreement}
              >
                {lang === 'hi' ? 'शेयर समझौता' : 'Share PDF'}
              </Button>
            </View>

            {/* Trip Completed State */}
            {bookingStatus === 'completed' && (
              <Surface style={styles.customerCompletedCard}>
                <Text style={{ fontSize: 36, textAlign: 'center', marginBottom: 6 }}>🎉</Text>
                <Text style={styles.completedTitle}>यात्रा सफलतापूर्वक पूर्ण हुई!</Text>
                <Text style={styles.completedSub}>आपकी यात्रा पूरी हो चुकी है। कृपया अनुभव साझा करें।</Text>
                <Button
                  mode="contained"
                  style={[styles.primaryActionButton, { marginTop: 12 }]}
                  onPress={() => {
                    setStep('select_service');
                    setBookingId(null);
                    setBookingStatus('searching');
                  }}
                >
                  नई बुकिंग करें
                </Button>
              </Surface>
            )}
          </View>
        )}

        {/* CUSTOMER COUNTER OFFER MODAL */}
        <Modal
          visible={counterModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setCounterModalVisible(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalBackdrop}
          >
            <Surface style={styles.counterModalCard}>
              <Text style={styles.modalTitle}>🔄 {lang === 'hi' ? 'काउंटर-ऑफ़र दें' : 'Propose Counter Fare'}</Text>
              <Text style={styles.modalSub}>ड्राइवर को अपना नया प्रस्तावित किराया और टिप्पणी भेजें:</Text>

              <TextInput
                mode="outlined"
                label={lang === 'hi' ? 'प्रस्तावित किराया (₹)' : 'Offered Wage (₹)'}
                value={customerProposedWage}
                onChangeText={setCustomerProposedWage}
                keyboardType="numeric"
                style={{ marginTop: 10, backgroundColor: '#fff' }}
                outlineColor="#B0BEC5"
                activeOutlineColor="#F26333"
              />

              <TextInput
                mode="outlined"
                label={lang === 'hi' ? 'संदेश / टिप्पणी' : 'Message / Note'}
                value={customerProposedNote}
                onChangeText={setCustomerProposedNote}
                style={{ marginTop: 10, backgroundColor: '#fff' }}
                outlineColor="#B0BEC5"
                activeOutlineColor="#F26333"
              />

              <View style={styles.modalButtonsRow}>
                <Button
                  mode="outlined"
                  style={{ flex: 1, borderColor: '#757575' }}
                  textColor="#757575"
                  onPress={() => setCounterModalVisible(false)}
                >
                  रद्द करें
                </Button>
                <Button
                  mode="contained"
                  loading={counterSubmitLoading}
                  disabled={counterSubmitLoading}
                  style={{ flex: 1.5, backgroundColor: '#F26333' }}
                  onPress={submitCustomerCounter}
                >
                  भेजें ➔
                </Button>
              </View>
            </Surface>
          </KeyboardAvoidingView>
        </Modal>
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        {step === 'select_service' && renderStep1()}
        {step === 'enter_route' && renderStep2()}
        {step === 'fare_preview' && renderStep3()}
        {step === 'live_contract' && renderStep4()}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: { flex: 1, backgroundColor: '#F8F9FA' },
  scrollContainer: { padding: 16, paddingBottom: 160 },
  headerBox: { marginBottom: 16 },
  pageTitle: { fontSize: 22, fontWeight: 'bold', color: '#212121' },
  pageSubtitle: { fontSize: 13, color: '#757575', marginTop: 2 },
  backRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  backArrow: { fontSize: 24, color: '#212121', marginRight: 8, fontWeight: 'bold' },

  cardSection: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: '#37474F', marginBottom: 10 },
  fieldHint: { fontSize: 12, color: '#78909C', marginBottom: 12 },

  // Booking Type Choices
  rowChoices: { flexDirection: 'row', gap: 10 },
  choiceTab: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#CFD8DC',
    backgroundColor: '#FAFAFA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceTabActive: { borderColor: '#F26333', backgroundColor: '#FFF3E0' },
  choiceTabTitle: { fontSize: 13, fontWeight: 'bold', color: '#546E7A' },
  choiceTabTitleActive: { color: '#E65100' },
  choiceTabSub: { fontSize: 11, color: '#90A4AE', marginTop: 3 },
  choiceTabSubActive: { color: '#EF6C00', fontWeight: '600' },

  // Service Type Cards
  serviceTypesList: { gap: 10 },
  serviceOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#ECEFF1',
    backgroundColor: '#FAFAFA',
  },
  serviceOptionCardActive: { borderColor: '#F26333', backgroundColor: '#FFF8F5' },
  serviceIcon: { fontSize: 26, marginRight: 12 },
  serviceTextCol: { flex: 1 },
  serviceName: { fontSize: 14, fontWeight: 'bold', color: '#37474F' },
  serviceNameActive: { color: '#E65100' },
  serviceDesc: { fontSize: 11, color: '#78909C', marginTop: 2 },
  checkMark: { fontSize: 16, fontWeight: 'bold', color: '#F26333' },

  // Vehicle Cards Horizontal
  vehicleScrollList: { paddingVertical: 4, gap: 10 },
  vehicleCard: {
    width: 120,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#ECEFF1',
    backgroundColor: '#FAFAFA',
    alignItems: 'center',
  },
  vehicleCardActive: { borderColor: '#F26333', backgroundColor: '#FFF3E0' },
  vehicleCardIcon: { fontSize: 28, marginBottom: 4 },
  vehicleCardName: { fontSize: 12, fontWeight: 'bold', color: '#37474F', textAlign: 'center' },
  vehicleCardNameActive: { color: '#E65100' },
  vehicleCardRate: { fontSize: 12, fontWeight: 'bold', color: '#2E7D32', marginTop: 2 },
  vehicleBadge: { marginTop: 6, fontSize: 9, height: 18 },

  // Inputs & GPS
  locationHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  gpsButton: { backgroundColor: '#E8F5E9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  gpsButtonText: { fontSize: 11, color: '#2E7D32', fontWeight: 'bold' },
  micButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF3E0', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  micButtonActive: { backgroundColor: '#FFCDD2' },
  micIcon: { fontSize: 14, marginRight: 4 },
  micButtonText: { fontSize: 11, color: '#E65100', fontWeight: 'bold' },
  inputStyle: { backgroundColor: '#fff', fontSize: 14 },

  suggestionsContainer: { backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#E0E0E0', marginTop: 4 },
  suggestionItem: { padding: 10, borderBottomWidth: 0.5, borderBottomColor: '#F0F0F0' },
  suggestionText: { fontSize: 12, color: '#424242' },

  exampleTitle: { fontSize: 11, color: '#90A4AE', marginTop: 10, marginBottom: 6 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  exampleChip: { backgroundColor: '#ECEFF1', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  exampleChipText: { fontSize: 11, color: '#455A64' },

  // Fare Breakdown
  fareBreakdownRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingVertical: 6 },
  fareMetricCol: { alignItems: 'center' },
  fareMetricLabel: { fontSize: 12, color: '#78909C' },
  fareMetricVal: { fontSize: 16, fontWeight: 'bold', color: '#263238', marginTop: 4 },
  totalFareRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalFareLabel: { fontSize: 14, fontWeight: 'bold', color: '#37474F' },
  totalFareVal: { fontSize: 20, fontWeight: 'bold', color: '#F26333' },

  // Counter Widget
  counterWidget: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginVertical: 12 },
  counterBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#F26333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterBtnText: { fontSize: 24, fontWeight: 'bold', color: '#fff', lineHeight: 28 },
  counterValueContainer: { flexDirection: 'row', alignItems: 'baseline', marginHorizontal: 24 },
  counterCurrency: { fontSize: 20, fontWeight: 'bold', color: '#263238', marginRight: 4 },
  counterNumber: { fontSize: 32, fontWeight: 'bold', color: '#263238' },

  pctChipsRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 6 },
  pctChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, backgroundColor: '#ECEFF1' },
  pctChipActive: { backgroundColor: '#F26333' },
  pctChipText: { fontSize: 12, color: '#455A64', fontWeight: 'bold' },
  pctChipTextActive: { color: '#fff' },

  commissionNoticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#1976D2',
  },
  commissionNoticeIcon: { fontSize: 18, marginRight: 8 },
  commissionNoticeText: { flex: 1, fontSize: 12, color: '#0D47A1', lineHeight: 17 },

  primaryActionButton: {
    backgroundColor: '#F26333',
    borderRadius: 12,
    paddingVertical: 6,
    marginTop: 8,
  },
  primaryActionButtonLabel: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  broadcastButton: {
    backgroundColor: '#F26333',
    borderRadius: 12,
    paddingVertical: 8,
    marginTop: 8,
  },

  // Searching Radar
  searchingRadarCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    elevation: 2,
    marginBottom: 16,
  },
  radarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF3E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  searchingTitle: { fontSize: 16, fontWeight: 'bold', color: '#263238', textAlign: 'center' },
  searchingSub: { fontSize: 12, color: '#78909C', textAlign: 'center', marginTop: 4 },
  countdownBadge: {
    backgroundColor: '#FFF8E1',
    borderWidth: 1,
    borderColor: '#FFE082',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    marginTop: 10,
  },
  countdownBadgeText: { fontSize: 12, fontWeight: 'bold', color: '#F57F17' },
  cancelSearchBtn: { borderColor: '#EF9A9A', borderRadius: 8, marginTop: 10, width: '100%' },

  // No Driver Found / Timeout Card
  noDriverCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    elevation: 2,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  noDriverIconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#FFEBEE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  noDriverTitle: { fontSize: 17, fontWeight: 'bold', color: '#C62828', textAlign: 'center' },
  noDriverSub: { fontSize: 13, color: '#546E7A', textAlign: 'center', marginTop: 6, lineHeight: 18 },
  noDriverActionCol: { width: '100%', marginTop: 18, gap: 10 },
  noDriverBtn: { borderRadius: 10, paddingVertical: 4 },

  // Negotiation Card
  negotiationChatCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
  },
  driverChatBubble: {
    backgroundColor: '#E8F5E9',
    borderRadius: 10,
    padding: 12,
    marginVertical: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#2E7D32',
  },
  driverChatName: { fontSize: 12, fontWeight: 'bold', color: '#2E7D32' },
  driverChatText: { fontSize: 14, color: '#1B5E20', marginTop: 4, fontStyle: 'italic' },
  negotiationActionRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  negoBtn: { borderRadius: 8 },
  waitingDriverResponseBox: {
    backgroundColor: '#FFF8E1',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  waitingDriverResponseText: { fontSize: 12, color: '#E65100', textAlign: 'center' },
  openFullChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E3F2FD',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#90CAF9',
    gap: 6,
  },
  openFullChatBtnText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1565C0',
  },

  // Digital Contract Card (Exact PDF style)
  contractWrapper: { marginTop: 4 },
  contractCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#37474F',
    padding: 16,
    elevation: 3,
  },
  contractHeader: { alignItems: 'center', paddingBottom: 8 },
  contractMainTitle: { fontSize: 16, fontWeight: 'bold', color: '#263238', textAlign: 'center' },
  contractSubTitle: { fontSize: 11, color: '#78909C', marginTop: 2 },
  contractDivider: { backgroundColor: '#CFD8DC', marginVertical: 10 },
  contractRowSpaced: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 3 },
  contractLabel: { fontSize: 12, color: '#546E7A' },
  contractVal: { fontSize: 12, fontWeight: '600', color: '#263238' },
  contractValBold: { fontSize: 13, fontWeight: 'bold', color: '#263238' },
  contractLine: { fontSize: 12, color: '#263238', marginVertical: 3 },
  contractWorkBox: {
    backgroundColor: '#FAFAFA',
    padding: 8,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: '#E0E0E0',
    fontSize: 12,
    color: '#37474F',
    fontStyle: 'italic',
    marginTop: 4,
  },
  contractFareText: { fontSize: 18, fontWeight: 'bold', color: '#2E7D32' },
  contactUnlockBox: { backgroundColor: '#E8F5E9', padding: 10, borderRadius: 8, marginVertical: 4 },
  contactLine: { fontSize: 12, color: '#1B5E20', marginVertical: 2 },
  contractTerms: { fontSize: 11, color: '#C62828', textAlign: 'center', marginTop: 4 },

  activeActionsRow: { flexDirection: 'row', gap: 8, marginTop: 16 },
  activeActionBtn: { flex: 1, borderRadius: 10 },

  customerCompletedCard: {
    backgroundColor: '#E8F5E9',
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#A5D6A7',
  },
  completedTitle: { fontSize: 18, fontWeight: 'bold', color: '#1B5E20' },
  completedSub: { fontSize: 13, color: '#388E3C', marginTop: 4, textAlign: 'center' },

  // Modal
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  counterModalCard: { width: '100%', backgroundColor: '#fff', borderRadius: 14, padding: 20 },
  modalTitle: { fontSize: 17, fontWeight: 'bold', color: '#263238' },
  modalSub: { fontSize: 12, color: '#78909C', marginTop: 4 },
  modalButtonsRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
});
