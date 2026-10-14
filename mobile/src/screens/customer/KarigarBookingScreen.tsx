import React, { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  FlatList,
  Image,
} from 'react-native';
import { Text, TextInput } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { api, getErrorMessage } from '../../services/api';
import { useLanguage } from '../../i18n/LanguageContext';
import { useNavigation } from '@react-navigation/native';

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
  warn: '#FFF3CD',
  warnText: '#856404',
};

interface Props { route: any; navigation: any; }

// ─── Dropdown Picker Component ───────────────────────────────────────────────
function DropdownPicker({
  value,
  options,
  onSelect,
  placeholder,
  sheetTitle,
  icon,
}: {
  value: string;
  options: { value: string; label: string }[];
  onSelect: (v: string) => void;
  placeholder: string;
  sheetTitle: string;
  icon?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.value === value);

  return (
    <>
      <TouchableOpacity style={styles.dropdown} onPress={() => setOpen(true)} activeOpacity={0.7}>
        {icon && <Text style={{ fontSize: 18, marginRight: 8 }}>{icon}</Text>}
        <Text style={[styles.dropdownText, !selected && { color: '#AAA' }]}>
          {selected ? selected.label : placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color="#666" />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setOpen(false)} activeOpacity={1} />
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>{sheetTitle}</Text>
          <FlatList
            data={options}
            keyExtractor={i => i.value}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.modalOption, item.value === value && styles.modalOptionActive]}
                onPress={() => { onSelect(item.value); setOpen(false); }}
              >
                <Text style={[styles.modalOptionText, item.value === value && { color: G.primary, fontWeight: '700' }]}>
                  {item.label}
                </Text>
                {item.value === value && <Ionicons name="checkmark" size={18} color={G.primary} />}
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
    </>
  );
}

// ─── Section Header Component ─────────────────────────────────────────────────
function SectionHeader({ icon, title, step }: { icon: string; title: string; step: number }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.stepBadge}>
        <Text style={styles.stepBadgeText}>{step}</Text>
      </View>
      <Text style={styles.sectionIcon}>{icon}</Text>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function KarigarBookingScreen({ route, navigation }: Props) {
  const { lang } = useLanguage();
  const rootNavigation = useNavigation<any>();
  const { karigar_type: initType, lat: initLat, lng: initLng } = route?.params ?? {};

  const hi = lang === 'hi';

  // Form state
  const [jobMode, setJobMode] = useState<'daily' | 'permanent'>('daily');
  const [rateUnit, setRateUnit] = useState<'daily' | 'monthly' | 'hourly'>('daily');
  const [startDateObj, setStartDateObj] = useState<Date>(new Date(Date.now() + 86400000));
  const [specificTimeObj, setSpecificTimeObj] = useState<Date>(new Date());
  const [useSpecificTime, setUseSpecificTime] = useState<boolean>(false);
  const [karigarType, setKarigarType] = useState<string>(initType ?? '');
  const [workType, setWorkType] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [wage, setWage] = useState<string>('600');
  const [timeShift, setTimeShift] = useState<'full_day' | 'half_day' | 'piece'>('full_day');
  const [duration, setDuration] = useState<string>('1_day');
  const [address, setAddress] = useState<string>('');
  const [nearestPlace, setNearestPlace] = useState<string>('');
  const [lat, setLat] = useState<number | null>(initLat ?? null);
  const [lng, setLng] = useState<number | null>(initLng ?? null);
  const [startTime, setStartTime] = useState<'today' | 'tomorrow'>('today');
  const [submitting, setSubmitting] = useState(false);
  const [locating, setLocating] = useState(false);
  const [karigarCount, setKarigarCount] = useState(1);
  const [mediaUri, setMediaUri] = useState<string | null>(null);

  const handleJobModeChange = (mode: 'daily' | 'permanent') => {
    setJobMode(mode);
    if (mode === 'permanent') {
      setRateUnit('monthly');
      setWage('15000');
    } else {
      setRateUnit('daily');
      setWage('600');
    }
  };

  const getFormattedDate = (offsetDays: number) => {
    const d = new Date(Date.now() + offsetDays * 86400000);
    const monthsHi = ['जनवरी', 'फरवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर'];
    const monthsEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = d.getDate();
    const year = d.getFullYear();
    if (hi) {
      return `${day} ${monthsHi[d.getMonth()]} ${year}`;
    }
    return `${day} ${monthsEn[d.getMonth()]} ${year}`;
  };

  const getFormattedDateObj = (dateObj: Date) => {
    const monthsHi = ['जनवरी', 'फरवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर'];
    const monthsEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = dateObj.getDate();
    const year = dateObj.getFullYear();
    if (hi) {
      return `${day} ${monthsHi[dateObj.getMonth()]} ${year}`;
    }
    return `${day} ${monthsEn[dateObj.getMonth()]} ${year}`;
  };

  const showDatePicker = () => {
    if (Platform.OS !== 'android') {
      Alert.alert(hi ? 'जानकारी' : 'Info', hi ? 'कैलेंडर डेट पिकर केवल एंड्रॉइड ऐप पर उपलब्ध है।' : 'Date picker is only available on Android app.');
      return;
    }
    DateTimePickerAndroid.open({
      value: startDateObj,
      onChange: (event: any, selectedDate?: Date) => {
        if (event.type === 'set' && selectedDate) {
          setStartDateObj(selectedDate);
        }
      },
      mode: 'date',
      minimumDate: new Date(),
    });
  };

  const showTimePicker = () => {
    if (Platform.OS !== 'android') {
      Alert.alert(hi ? 'जानकारी' : 'Info', hi ? 'टाइम पिकर केवल एंड्रॉइड ऐप पर उपलब्ध है।' : 'Time picker is only available on Android app.');
      return;
    }
    DateTimePickerAndroid.open({
      value: specificTimeObj,
      onChange: (event: any, selectedTime?: Date) => {
        if (event.type === 'set' && selectedTime) {
          setSpecificTimeObj(selectedTime);
          setUseSpecificTime(true);
        }
      },
      mode: 'time',
      is24Hour: false,
    });
  };

  const wageNum = parseFloat(wage) || 0;

  // Karigar Types (As Per PDF)
  const karigarTypes = [
    { value: 'electrician', label: hi ? '⚡ इलेक्ट्रीशियन (Electrician)' : '⚡ Electrician' },
    { value: 'plumber', label: hi ? '🔧 प्लम्बर (Plumber)' : '🔧 Plumber' },
    { value: 'carpenter', label: hi ? '🪚 बढ़ई (Carpenter)' : '🪚 Carpenter' },
    { value: 'painter', label: hi ? '🎨 पेंटर (Painter)' : '🎨 Painter' },
    { value: 'welder', label: hi ? '🔥 वेल्डर (Welder)' : '🔥 Welder' },
    { value: 'ac_technician', label: hi ? '❄️ AC टेक्नीशियन (AC Tech)' : '❄️ AC Technician' },
    { value: 'fridge_repair', label: hi ? '🧊 फ्रिज रिपेयर (Fridge)' : '🧊 Fridge Repair' },
    { value: 'washing_machine', label: hi ? '🌀 वॉशिंग मशीन रिपेयर' : '🌀 Washing Machine' },
  ];

  // Work Types (As Per PDF)
  const workTypes = [
    { value: 'wiring', label: hi ? '🔌 वायरिंग (Wiring)' : '🔌 Wiring' },
    { value: 'fixing_fan', label: hi ? '🌀 पंखा लगाना (Fan Install)' : '🌀 Fan Installation' },
    { value: 'pipe_repair', label: hi ? '🚰 पाइप रिपेयर (Pipe Repair)' : '🚰 Pipe Repair' },
    { value: 'painting_room', label: hi ? '🎨 रूम पेंटिंग (Room Paint)' : '🎨 Room Painting' },
    { value: 'welding_work', label: hi ? '🔥 वेल्डिंग काम (Welding)' : '🔥 Welding Work' },
    { value: 'furniture_repair', label: hi ? '🪑 फर्नीचर रिपेयर (Furniture)' : '🪑 Furniture Repair' },
    { value: 'ac_service', label: hi ? '❄️ AC सर्विसिंग (AC Service)' : '❄️ AC Servicing' },
    { value: 'other', label: hi ? '📋 अन्य काम (Other)' : '📋 Other Work' },
  ];

  // Duration Options (As Per PDF)
  const durationOptions = [
    { value: '1_day', label: hi ? '1 दिन' : '1 Day' },
    { value: '2_days', label: hi ? '2 दिन' : '2 Days' },
    { value: '3_days', label: hi ? '3 दिन' : '3 Days' },
    { value: '1_week', label: hi ? '1 हफ्ता' : '1 Week' },
    { value: '2_weeks', label: hi ? '2 हफ्ते' : '2 Weeks' },
    { value: '1_month', label: hi ? '1 महीना' : '1 Month' },
  ];

  const handleGetLocation = async () => {
    setLocating(true);
    try {
      const Location = require('expo-location');
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('', hi ? 'Location permission nahi mili.' : 'Location permission denied.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLat(loc.coords.latitude);
      setLng(loc.coords.longitude);
      const addrs = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
      if (addrs.length > 0) {
        const a = addrs[0];
        const parts = [a.street, a.district, a.subregion, a.city, a.region].filter(Boolean);
        setAddress(parts.join(', '));
      }
    } catch {
      Alert.alert('', hi ? 'Location nahi mili. Manual address dalein.' : 'Could not get location. Enter manually.');
    } finally {
      setLocating(false);
    }
  };

  const handlePickMedia = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('', hi ? 'Gallery permission chahiye.' : 'Gallery permission required.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setMediaUri(result.assets[0].uri);
        Alert.alert('✅', hi ? 'Photo/Video select ho gaya!' : 'Media selected!');
      }
    } catch (err) {
      Alert.alert('', hi ? 'Media select nahi ho paya.' : 'Could not select media.');
    }
  };

  const handleSubmit = async () => {
    if (!karigarType) {
      Alert.alert('', hi ? 'Karigar ka type zaroor chunein.' : 'Please select karigar type.');
      return;
    }
    if (!address.trim()) {
      Alert.alert('', hi ? 'Kaam ka pata zaroori hai.' : 'Please enter the work address.');
      return;
    }

    setSubmitting(true);
    try {
      console.log('[KarigarRequest] Submitting request...');
      const targetDate = jobMode === 'permanent'
        ? startDateObj.toISOString().split('T')[0]
        : (startTime === 'tomorrow'
          ? new Date(Date.now() + 86400000).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0]);

      const targetStartTime = useSpecificTime
        ? specificTimeObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : startTime;

      const res = await api.post('/api/karigar/request', {
        karigar_type: karigarType,
        work_type: workType || undefined,
        job_mode: jobMode,
        rate_unit: rateUnit,
        start_date: targetDate,
        wage: wageNum || undefined,
        time_shift: timeShift,
        duration: duration,
        start_time: targetStartTime,
        description: description || undefined,
        address: address.trim(),
        nearest_place: nearestPlace || undefined,
        lat: lat || null,
        lng: lng || null,
        karigar_count: karigarCount,
        media_url: mediaUri || undefined,
        live_chat_enabled: true,
      });
      rootNavigation.navigate('KarigarRequestStatus' as never, { job_id: res.data.job_id } as never);
    } catch (err: any) {
      if (err.response?.data?.job_id) {
        const existingJobId = err.response.data.job_id;
        Alert.alert(
          '⚠️',
          err.response?.data?.detail || (hi ? 'Aapka ek request pehle se active hai.' : 'You already have an active request.'),
          [
            {
              text: hi ? 'Status Dekhein' : 'View Status',
              onPress: () => rootNavigation.navigate('KarigarRequestStatus' as never, { job_id: existingJobId } as never),
            },
            { text: hi ? 'Radd Karein' : 'Cancel', style: 'cancel' }
          ]
        );
      } else {
        const msg = getErrorMessage(err);
        Alert.alert('❌', msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        {/* ── App Header (As Per PDF) ── */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
            <Ionicons name="arrow-back" size={24} color={G.text} />
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={styles.headerTitle}>🔧 {hi ? 'कारीगर बुकिंग करें' : 'Book Karigar'}</Text>
            <Text style={styles.headerSub}>{hi ? '(Send Work Request)' : '(कारीगर बुकिंग करें)'}</Text>
          </View>
          <View style={{ width: 28 }} />
        </View>

        <View style={styles.headerNote}>
          <Ionicons name="information-circle" size={16} color={G.primary} style={{ marginRight: 6 }} />
          <Text style={styles.headerNoteText}>
            {hi
              ? 'आपकी request पास के कारीगरों को भेजी जाएगी'
              : 'Your request will be sent to nearby karigars'}
          </Text>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          {/* ── Mode Tabs (Daily vs Permanent) ── */}
          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tab, jobMode === 'daily' && styles.tabActive]}
              onPress={() => handleJobModeChange('daily')}
              activeOpacity={0.8}
            >
              <Text style={styles.tabIcon}>📅</Text>
              <Text style={[styles.tabText, jobMode === 'daily' && styles.tabTextActive]}>
                {hi ? 'दैनिक कारीगर' : 'Daily Karigar'}
              </Text>
              <Text style={[styles.tabSub, jobMode === 'daily' && styles.tabTextActive]}>
                (Daily Rate Craftsman)
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, jobMode === 'permanent' && styles.tabActive]}
              onPress={() => handleJobModeChange('permanent')}
              activeOpacity={0.8}
            >
              <Text style={styles.tabIcon}>🤝</Text>
              <Text style={[styles.tabText, jobMode === 'permanent' && styles.tabTextActive]}>
                {hi ? 'स्थायी / अनुबंध' : 'Permanent Job'}
              </Text>
              <Text style={[styles.tabSub, jobMode === 'permanent' && styles.tabTextActive]}>
                (Monthly Contract)
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── Field 1: Karigar Type (As Per PDF) ── */}
          <View style={styles.fieldBox}>
            <SectionHeader
              step={1}
              icon="👷"
              title={hi ? 'कारीगर का प्रकार चुनें (Type of Karigar)' : '1. Select Karigar Type'}
            />
            <DropdownPicker
              value={karigarType}
              options={karigarTypes}
              onSelect={setKarigarType}
              placeholder={hi ? 'चुनें (Select)' : 'Select'}
              sheetTitle={hi ? 'कारीगर का प्रकार चुनें' : 'Select Karigar Type'}
            />
          </View>

          {/* ── Field 2: Work Type (As Per PDF) ── */}
          <View style={styles.fieldBox}>
            <SectionHeader
              step={2}
              icon="📋"
              title={hi ? 'काम का विवरण (Work Details)' : '2. Work Description'}
            />
            <DropdownPicker
              value={workType}
              options={workTypes}
              onSelect={setWorkType}
              placeholder={hi ? 'क्या काम करवाना है?' : 'What work needed?'}
              sheetTitle={hi ? 'काम का प्रकार चुनें' : 'Select Work Type'}
            />

            {/* Description Text Input with Mic Logo */}
            <View style={{ marginTop: 12 }}>
              <View style={styles.descHeaderRow}>
                <Text style={styles.fieldLabel}>
                  {hi ? 'काम के बारे में टाइप करें (वैकल्पिक):' : 'Type work details (Optional):'}
                </Text>
                <View style={styles.voiceBadge}>
                  <Ionicons name="mic" size={13} color="#15803D" />
                  <Text style={styles.voiceBadgeText}>
                    {hi ? 'वॉइस बोलकर लिखें' : 'Voice Typing'}
                  </Text>
                </View>
              </View>

              <View style={styles.inputWithMicBox}>
                <TextInput
                  mode="flat"
                  placeholder={hi ? 'उदा: 4 पंखे लगाने हैं और बोर्ड वायरिंग ठीक करनी है...' : 'E.g. Install 4 fans and fix switchboard wiring...'}
                  placeholderTextColor="#94A3B8"
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={3}
                  style={styles.multilineInput}
                  underlineColor="transparent"
                  activeUnderlineColor="transparent"
                />
                <TouchableOpacity
                  style={styles.micCircleBtn}
                  activeOpacity={0.7}
                  onPress={() => {
                    Alert.alert(
                      hi ? 'वॉइस टाइपिंग (Voice Typing)' : 'Voice Typing',
                      hi
                        ? 'बोलकर लिखने के लिए कृपया अपने मोबाइल कीबोर्ड के माइक (🎙️) बटन को दबाएं।'
                        : 'To type with voice, please tap the microphone (🎙️) button on your mobile keyboard.'
                    );
                  }}
                >
                  <Ionicons name="mic" size={18} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* ── Field 3: Number of Karigars (As Per PDF) ── */}
          <View style={styles.fieldBox}>
            <SectionHeader
              step={3}
              icon="👥"
              title={hi ? 'कारीगर संख्या (Number of Karigars)' : '3. Number of Karigars'}
            />
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 10 }}>
              <TouchableOpacity onPress={() => setKarigarCount(c => Math.max(1, c - 1))} style={styles.counterBtn}>
                <Text style={styles.counterBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.counterText}>{karigarCount.toString().padStart(2, '0')}</Text>
              <TouchableOpacity onPress={() => setKarigarCount(c => Math.min(20, c + 1))} style={styles.counterBtn}>
                <Text style={styles.counterBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Field 4: Wage (As Per PDF) ── */}
          <View style={styles.fieldBox}>
            <SectionHeader
              step={4}
              icon="₹"
              title={hi ? 'मज़दूरी / रेट (Wage / Rate)' : '4. Wage / Rate'}
            />

            {/* Rate Unit Selector */}
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 10, marginTop: 4 }}>
              {[
                { key: 'daily', label: hi ? 'प्रति दिन' : 'Per Day' },
                { key: 'monthly', label: hi ? 'प्रति माह' : 'Per Month' },
                { key: 'hourly', label: hi ? 'प्रति घंटा' : 'Per Hour' },
              ].map(u => (
                <TouchableOpacity
                  key={u.key}
                  onPress={() => setRateUnit(u.key as any)}
                  style={{
                    flex: 1,
                    paddingVertical: 7,
                    borderRadius: 8,
                    alignItems: 'center',
                    backgroundColor: rateUnit === u.key ? G.primary : '#EDE7F6',
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: rateUnit === u.key ? '#FFF' : '#333' }}>
                    {u.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.wageContainer}>
              <View style={styles.wageRow}>
                <Text style={styles.wageRupee}>₹</Text>
                <TextInput
                  mode="flat"
                  keyboardType="numeric"
                  value={wage}
                  onChangeText={setWage}
                  style={styles.wageInput}
                  underlineColor="transparent"
                  activeUnderlineColor="transparent"
                  dense
                />
                <Text style={styles.wagePerLabel}>
                  {rateUnit === 'monthly'
                    ? (hi ? 'प्रति माह' : 'per month')
                    : rateUnit === 'hourly'
                      ? (hi ? 'प्रति घंटा' : 'per hour')
                      : (hi ? 'प्रति दिन' : 'per day')}
                </Text>
              </View>
            </View>
            <Text style={{ fontSize: 11, color: G.sub, marginTop: 6, fontStyle: 'italic' }}>
              {hi
                ? 'ℹ️ आपसी बातचीत व सहमति के आधार पर मजदूरी तय होगी (कोई अनिवार्य न्यूनतम सीमा नहीं)।'
                : 'ℹ️ Wages are mutually agreed via direct negotiation (no mandatory minimum).'}
            </Text>
          </View>

          {/* ── Field 5: Time Shift (As Per PDF) ── */}
          <View style={styles.fieldBox}>
            <SectionHeader
              step={5}
              icon="⏰"
              title={hi ? 'काम का समय (Time Shift)' : '5. Time Shift'}
            />
            <View style={styles.shiftRow}>
              {[
                { value: 'full_day', main: hi ? 'फुल डे' : 'Full Day', sub: hi ? '(8 घंटे)' : '(8 hrs)' },
                { value: 'half_day', main: hi ? 'हाफ डे' : 'Half Day', sub: hi ? '(4 घंटे)' : '(4 hrs)' },
                { value: 'piece', main: hi ? 'ठेका' : 'Piece', sub: '' },
              ].map(opt => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.shiftCard, timeShift === opt.value && styles.shiftCardActive]}
                  onPress={() => setTimeShift(opt.value as any)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.radio, timeShift === opt.value && styles.radioActive]}>
                    {timeShift === opt.value && <View style={styles.radioDot} />}
                  </View>
                  <View style={{ alignItems: 'center' }}>
                    <Text style={[styles.shiftMain, timeShift === opt.value && { color: G.primary }]}>
                      {opt.main}
                    </Text>
                    {!!opt.sub && (
                      <Text style={[styles.shiftSub, timeShift === opt.value && { color: G.primary }]}>
                        {opt.sub}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* ── Field 6: Working Place (As Per PDF) ── */}
          <View style={styles.fieldBox}>
            <SectionHeader
              step={6}
              icon="📍"
              title={hi ? 'काम का स्थान (Working Place)' : '6. Working Place'}
            />
            <TouchableOpacity
              style={styles.gpsBtn}
              onPress={handleGetLocation}
              disabled={locating}
              activeOpacity={0.8}
            >
              {locating
                ? <ActivityIndicator size={16} color={G.primary} style={{ marginRight: 8 }} />
                : <Ionicons name="navigate" size={18} color={G.primary} style={{ marginRight: 8 }} />}
              <Text style={styles.gpsBtnText}>
                {locating
                  ? (hi ? 'लोकेशन मिल रही है...' : 'Getting location...')
                  : (hi ? 'मेरी वर्तमान लोकेशन लें (Auto GPS)' : 'Get My Current Location (Auto GPS)')}
              </Text>
            </TouchableOpacity>
            <TextInput
              mode="flat"
              placeholder={hi ? 'मैनुअल पता: गली नं. 4, शाहीद नगर, लखनऊ...' : 'Manual address: Street, Area, City...'}
              value={address}
              onChangeText={setAddress}
              multiline
              numberOfLines={2}
              style={styles.addressInput}
              underlineColor={G.border}
              activeUnderlineColor={G.primary}
            />

            {/* Nearest Place Free-Text Input (Task 10) */}
            <View style={{ marginTop: 12 }}>
              <Text style={styles.fieldLabel}>
                {hi ? 'निकटतम स्थान / लैंडमार्क / गाँव (वैकल्पिक)' : 'Nearest Place / Landmark / Village (Optional)'}
              </Text>
              <TextInput
                mode="flat"
                placeholder={hi ? 'उदा. शिव मंदिर के पास, मुख्य चौराहा, गाँव का नाम...' : 'e.g. Near Shiv Mandir, Main Chowk, Village name...'}
                value={nearestPlace}
                onChangeText={setNearestPlace}
                style={styles.addressInput}
                underlineColor={G.border}
                activeUnderlineColor={G.primary}
              />
            </View>
          </View>

          {/* ── Field 7: Start Date (Lock for Daily, Unlocked for Permanent) ── */}
          <View style={styles.fieldBox}>
            <SectionHeader
              step={7}
              icon="📅"
              title={hi ? 'काम शुरू करने की तारीख व समय' : '7. Work Start Date & Time'}
            />
            {jobMode === 'daily' ? (
              <>
                <View style={{ backgroundColor: '#FFF8E1', padding: 10, borderRadius: 8, marginBottom: 10, borderColor: '#FFE082', borderWidth: 1 }}>
                  <Text style={{ fontSize: 11, color: '#B78103', lineHeight: 16 }}>
                    {hi
                      ? '⚡ दैनिक कारीगर: आज और कल का चयन उपलब्ध है ताकि कारीगर समय पर पहुँचे।'
                      : '⚡ Daily Karigar: Today and Tomorrow are selectable for prompt arrival.'}
                  </Text>
                </View>
                <View style={styles.dateRowContainer}>
                  {[
                    { value: 'today', title: hi ? 'आज' : 'Today', sub: `(${getFormattedDate(0)})` },
                    { value: 'tomorrow', title: hi ? 'कल' : 'Tomorrow', sub: `(${getFormattedDate(1)})` },
                  ].map(opt => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[styles.dateCard, startTime === opt.value && styles.dateCardActive]}
                      onPress={() => setStartTime(opt.value as any)}
                      activeOpacity={0.8}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                        <View style={[styles.radio, startTime === opt.value && styles.radioActive]}>
                          {startTime === opt.value && <View style={styles.radioDot} />}
                        </View>
                        <View>
                          <Text style={[styles.dateTitle, startTime === opt.value && { color: G.primary }]}>{opt.title}</Text>
                          <Text style={[styles.dateSub, startTime === opt.value && { color: G.primary }]}>{opt.sub}</Text>
                        </View>
                      </View>
                      <Text style={{ fontSize: 24, marginLeft: 10 }}>📅</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            ) : (
              <>
                <View style={{ backgroundColor: '#E8F5E9', padding: 10, borderRadius: 8, marginBottom: 10, borderColor: '#A5D6A7', borderWidth: 1 }}>
                  <Text style={{ fontSize: 11, color: '#1B5E20', lineHeight: 16 }}>
                    {hi
                      ? '📅 अपनी सुविधानुसार अनुबंध शुरू करने की कोई भी तारीख चुनें।'
                      : '📅 Select any upcoming start date according to your convenience for permanent hire.'}
                  </Text>
                </View>
                <View style={{ gap: 8 }}>
                  {/* Specific Calendar Date Picker */}
                  <TouchableOpacity
                    style={[
                      styles.dateCard,
                      styles.dateCardActive,
                      { paddingVertical: 12, borderColor: G.primary, borderWidth: 1.5, backgroundColor: '#E8F5E9' }
                    ]}
                    onPress={showDatePicker}
                    activeOpacity={0.8}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                      <Ionicons name="calendar" size={22} color={G.primary} style={{ marginRight: 10 }} />
                      <View>
                        <Text style={[styles.dateTitle, { color: G.primary, fontWeight: '700' }]}>
                          {hi ? '📅 कैलेंडर से तारीख चुनें' : '📅 Pick Date from Calendar'}
                        </Text>
                        <Text style={[styles.dateSub, { color: '#374151' }]}>
                          {getFormattedDateObj(startDateObj)}
                        </Text>
                      </View>
                    </View>
                    <View style={{ backgroundColor: '#C8E6C9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: G.primary }}>
                        {hi ? 'कैलेंडर खोलें' : 'Open Calendar'}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {/* Specific Clock Time Picker */}
                  <TouchableOpacity
                    style={[
                      styles.dateCard,
                      useSpecificTime && styles.dateCardActive,
                      { paddingVertical: 12, borderColor: useSpecificTime ? G.primary : '#CBD5E1', borderWidth: 1.5, backgroundColor: useSpecificTime ? '#E8F5E9' : '#FFFFFF' }
                    ]}
                    onPress={showTimePicker}
                    activeOpacity={0.8}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                      <Ionicons name="time" size={22} color={G.primary} style={{ marginRight: 10 }} />
                      <View>
                        <Text style={[styles.dateTitle, { color: G.primary, fontWeight: '700' }]}>
                          {useSpecificTime ? (hi ? '⏰ निश्चित समय (घड़ी)' : '⏰ Selected Time (Clock)') : (hi ? '⏰ घड़ी से निश्चित समय सेट करें (घंटे व मिनट)' : '⏰ Set Exact Time from Clock (Watch/Picker)')}
                        </Text>
                        <Text style={[styles.dateSub, { color: '#374151' }]}>
                          {useSpecificTime
                            ? specificTimeObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : (hi ? 'जैसे सुबह 09:30 AM या शाम 04:00 PM' : 'e.g. 09:30 AM or 04:00 PM')}
                        </Text>
                      </View>
                    </View>
                    <View style={{ backgroundColor: '#E8F5E9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: G.primary }}>
                        {hi ? 'घड़ी से चुनें ⏱️' : 'Pick Time ⏱️'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>

          {/* ── Field 8: Duration (As Per PDF - NEW FIELD) ── */}
          <View style={styles.fieldBox}>
            <SectionHeader
              step={8}
              icon="⏱️"
              title={hi ? 'अनुमानित कार्य अवधि (Duration)' : '8. Estimated Duration'}
            />
            <DropdownPicker
              value={duration}
              options={durationOptions}
              onSelect={setDuration}
              placeholder={hi ? '1 दिन' : '1 Day'}
              sheetTitle={hi ? 'अनुमानित कार्य अवधि' : 'Estimated Work Duration'}
              icon="⏱️"
            />
          </View>

          {/* ── Field 9: Photo/Video Upload (As Per PDF - NEW FIELD) ── */}
          <View style={styles.fieldBox}>
            <SectionHeader
              step={9}
              icon="📸"
              title={hi ? 'फोटो / वीडियो (Optional)' : '9. Photo / Video'}
            />
            <TouchableOpacity style={styles.uploadBtn} onPress={handlePickMedia} activeOpacity={0.8}>
              <Ionicons name="camera" size={20} color={G.primary} style={{ marginRight: 8 }} />
              <Text style={styles.uploadBtnText}>
                {mediaUri
                  ? (hi ? '✅ Media अपलोड हो गया!' : '✅ Media Uploaded!')
                  : (hi ? 'काम से संबंधित फोटो/वीडियो अपलोड करें' : 'Upload Work-related Photo/Video')}
              </Text>
            </TouchableOpacity>
            {mediaUri && (
              <View style={styles.mediaPreview}>
                <Image source={{ uri: mediaUri }} style={styles.mediaImage} />
                <TouchableOpacity
                  style={styles.removeMediaBtn}
                  onPress={() => setMediaUri(null)}
                >
                  <Ionicons name="close-circle" size={24} color="#DC2626" />
                </TouchableOpacity>
              </View>
            )}
            <Text style={styles.fieldHint}>
              {hi ? '(काम से संबंधित फोटो या वीडियो दिखाई दें)' : '(Show work-related images or videos)'}
            </Text>
          </View>

          {/* ── Live Notification Chat Banner (As Per PDF) ── */}
          <View style={styles.liveChatBanner}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={styles.liveChatIcon}>
                <Ionicons name="chatbubbles" size={20} color={G.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: G.text }}>
                  {hi ? '💬 Live Notification Chat' : '💬 Live Notification Chat'}
                </Text>
                <Text style={{ fontSize: 11, color: G.sub, marginTop: 2 }}>
                  {hi
                    ? 'यहां आपको करीगरों के accept या cross offer की सूचना मिलेगी और आप जवाब दे सकते हैं।'
                    : 'Get notifications when karigars accept or send cross offers, and respond instantly.'}
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.liveChatBtn} activeOpacity={0.8}>
              <Ionicons name="paper-plane" size={16} color={G.white} style={{ marginRight: 6 }} />
              <Text style={styles.liveChatBtnText}>
                {hi ? 'Live Chat खोलें' : 'Open Live Chat'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── Info Note (As Per PDF Bottom Section) ── */}
          <View style={styles.infoNote}>
            <Ionicons name="information-circle" size={18} color="#E65100" style={{ marginRight: 8 }} />
            <Text style={styles.infoNoteText}>
              {hi
                ? 'आपकी request पास के करीगरों को भेजी जाएगी। यदि कोई करीगर accept करता है या cross offer करता है तो आपको सूचित किया जाएगा।'
                : 'Your request will be sent to nearby karigars. You will be notified if anyone accepts or sends a cross offer.'}
            </Text>
          </View>

          {/* ── Submit Button (As Per PDF) ── */}
          <TouchableOpacity
            style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator color={G.white} size={22} />
            ) : (
              <>
                <Ionicons name="paper-plane" size={22} color={G.white} style={{ marginRight: 10 }} />
                <View style={{ alignItems: 'center' }}>
                  <Text style={styles.submitText}>
                    {hi ? 'कारीगरों को request भेजें' : 'Send Request to Karigars'}
                  </Text>
                  <Text style={styles.submitSub}>
                    {hi ? '(Broadcast Request पास के करीगरों को भेजी जाएगी)' : '(Broadcast Request)'}
                  </Text>
                </View>
              </>
            )}
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles (As Per PDF Design) ───────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: G.bg },
  scroll: { paddingBottom: 160 },

  // Header
  header: {
    backgroundColor: G.white,
    paddingHorizontal: 16, paddingVertical: 12,
    flexDirection: 'row', alignItems: 'center',
    borderBottomWidth: 1, borderBottomColor: G.border,
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: G.text },
  headerSub: { fontSize: 11, color: G.sub, marginTop: 2 },
  headerNote: {
    backgroundColor: '#FFF8E1',
    paddingHorizontal: 14, paddingVertical: 8,
    flexDirection: 'row', alignItems: 'center',
    borderBottomWidth: 1, borderBottomColor: '#FFE082',
  },
  headerNoteText: { fontSize: 11, color: '#E65100', flex: 1, fontWeight: '600' },

  // Tabs
  tabRow: {
    flexDirection: 'row',
    margin: 14,
    backgroundColor: G.white,
    borderRadius: 12,
    padding: 4,
    elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4,
  },
  tab: {
    flex: 1, paddingVertical: 10, paddingHorizontal: 8,
    borderRadius: 8, alignItems: 'center',
  },
  tabActive: { backgroundColor: G.primaryLight, borderWidth: 1, borderColor: G.primary },
  tabIcon: { fontSize: 24, marginBottom: 4 },
  tabText: { fontSize: 13, fontWeight: '700', color: G.text, textAlign: 'center' },
  tabSub: { fontSize: 10, color: G.sub, marginTop: 2 },
  tabTextActive: { color: G.primary },

  // Field boxes
  fieldBox: {
    backgroundColor: G.white,
    marginHorizontal: 14,
    marginBottom: 12,
    borderRadius: 12,
    padding: 14,
    elevation: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3,
  },

  // Section header
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  stepBadge: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: G.primary,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 8,
  },
  stepBadgeText: { color: G.white, fontSize: 12, fontWeight: 'bold' },
  sectionIcon: { fontSize: 20, marginRight: 8 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: G.text, flex: 1 },

  // Dropdown
  dropdown: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: G.border, borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 13,
    backgroundColor: G.white,
  },
  dropdownText: { fontSize: 14, color: G.text, flex: 1 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: {
    backgroundColor: G.white,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingHorizontal: 16, paddingBottom: 32, maxHeight: '60%',
  },
  modalHandle: {
    width: 40, height: 4, backgroundColor: '#DDD',
    borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 14,
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: G.text, marginBottom: 10 },
  modalOption: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F0F0F0'
  },
  modalOptionActive: { backgroundColor: G.primaryLight, marginHorizontal: -16, paddingHorizontal: 16 },
  modalOptionText: { fontSize: 14, color: G.text },

  // Description & Mic Box
  descHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  voiceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  voiceBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  inputWithMicBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingRight: 8,
    paddingVertical: 4,
  },
  multilineInput: {
    flex: 1,
    backgroundColor: 'transparent',
    fontSize: 13,
    paddingHorizontal: 10,
    minHeight: 56,
  },
  micCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#15803D',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Counter
  counterBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#FAFAFA',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: G.border,
  },
  counterBtnText: { fontSize: 24, color: G.primary, fontWeight: '700', lineHeight: 28 },
  counterText: { fontSize: 24, fontWeight: '700', color: G.text, marginHorizontal: 24 },

  // Wage
  wageContainer: {
    borderWidth: 1, borderColor: G.border, borderRadius: 8,
    backgroundColor: G.white, overflow: 'hidden',
  },
  wageRow: { flexDirection: 'row', alignItems: 'center', paddingLeft: 14 },
  wageRupee: { fontSize: 18, fontWeight: '700', color: G.text, marginRight: 4 },
  wageInput: {
    flex: 1, fontSize: 22, fontWeight: '700', backgroundColor: 'transparent',
    paddingLeft: 0, height: 52,
  },
  wagePerLabel: {
    paddingRight: 14, fontSize: 13, color: G.sub,
    borderLeftWidth: 1, borderLeftColor: G.border,
    paddingLeft: 12, paddingVertical: 16,
  },

  // Shift
  shiftRow: { flexDirection: 'row', gap: 8 },
  shiftCard: {
    flex: 1, borderWidth: 1.5, borderColor: G.border, borderRadius: 10,
    padding: 10, alignItems: 'center', backgroundColor: G.bg,
  },
  shiftCardActive: { borderColor: G.primary, backgroundColor: G.primaryLight },
  radio: {
    width: 18, height: 18, borderRadius: 9,
    borderWidth: 2, borderColor: '#CCC',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 6,
  },
  radioActive: { borderColor: G.primary },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: G.primary },
  shiftMain: { fontSize: 11, fontWeight: '700', color: G.text, textAlign: 'center' },
  shiftSub: { fontSize: 10, color: G.sub, marginTop: 2, textAlign: 'center' },

  // GPS & Address
  gpsBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: G.primaryLight,
    borderWidth: 1.5, borderColor: G.primary,
    borderRadius: 8, padding: 12, marginBottom: 10,
  },
  gpsBtnText: { fontSize: 13, fontWeight: '600', color: G.primary, flex: 1 },
  addressInput: { backgroundColor: G.white, fontSize: 13, paddingLeft: 0 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: G.text, marginBottom: 8 },

  // Date Row
  dateRowContainer: { flexDirection: 'column', gap: 10 },
  dateCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 14, borderRadius: 10, borderWidth: 1, borderColor: G.border,
    backgroundColor: G.white,
  },
  dateCardActive: { borderColor: G.primary, backgroundColor: G.primaryLight },
  dateTitle: { fontSize: 16, fontWeight: '700', color: G.text },
  dateSub: { fontSize: 12, color: G.sub, marginTop: 2 },

  // Upload Button
  uploadBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: G.primaryLight,
    borderWidth: 1, borderColor: G.primary,
    borderRadius: 8, padding: 12,
  },
  uploadBtnText: { fontSize: 13, fontWeight: '600', color: G.primary, flex: 1 },
  mediaPreview: {
    marginTop: 10,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  mediaImage: {
    width: '100%',
    height: 150,
    resizeMode: 'cover',
  },
  removeMediaBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 12,
  },
  fieldHint: { fontSize: 11, color: G.sub, marginTop: 6, fontStyle: 'italic' },

  // Live Chat Banner
  liveChatBanner: {
    backgroundColor: '#EDF7ED',
    marginHorizontal: 14,
    marginTop: 10,
    marginBottom: 5,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  liveChatIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: G.primaryLight,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 12,
  },
  liveChatBtn: {
    marginTop: 10,
    backgroundColor: G.primaryDark,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveChatBtnText: { color: G.white, fontSize: 13, fontWeight: '700' },

  // Info Note
  infoNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginHorizontal: 14,
    marginTop: 10,
    padding: 12,
    backgroundColor: '#FFF3E0',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  infoNoteText: { fontSize: 11, color: '#E65100', flex: 1, lineHeight: 16 },

  // Submit button
  submitBtn: {
    backgroundColor: G.primary, marginHorizontal: 14, marginTop: 14,
    borderRadius: 12, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    elevation: 3,
    shadowColor: G.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4,
  },
  submitText: { fontSize: 16, fontWeight: '800', color: G.white, letterSpacing: 0.5 },
  submitSub: { fontSize: 11, color: '#A5D6A7', marginTop: 2 },
});
