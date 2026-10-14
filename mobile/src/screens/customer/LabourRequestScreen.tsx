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
} from 'react-native';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Text, TextInput } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { api, getErrorMessage } from '../../services/api';
import { useLanguage } from '../../i18n/LanguageContext';
import { useNavigation } from '@react-navigation/native';

// ─── Theme ───────────────────────────────────────────────────────────────────
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

// Minimum wage restrictions removed as per PDF specification (mutual negotiation)
interface Props { route: any; navigation: any; }

// ─── Dropdown Picker ──────────────────────────────────────────────────────────
function DropdownPicker({
  value,
  options,
  onSelect,
  placeholder,
  sheetTitle,
}: {
  value: string;
  options: { value: string; label: string }[];
  onSelect: (v: string) => void;
  placeholder: string;
  sheetTitle: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.value === value);

  return (
    <>
      <TouchableOpacity style={styles.dropdown} onPress={() => setOpen(true)} activeOpacity={0.7}>
        <Text style={[styles.dropdownText, !selected && { color: '#AAA' }]}>
          {selected ? selected.label : placeholder}
        </Text>
        <Text style={{ fontSize: 14, color: '#666' }}>▾</Text>
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
                {item.value === value && <Text style={{ color: G.primary, fontSize: 16 }}>✓</Text>}
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
    </>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({ icon, title }: { icon: string; title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionIcon}>{icon}</Text>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function LabourRequestScreen({ route, navigation }: Props) {
  const { lang } = useLanguage();
  const rootNavigation = useNavigation<any>();
  const { labour_type: initType, lat: initLat, lng: initLng } = route?.params ?? {};

  const hi = lang === 'hi';

  // Form state
  const [jobMode, setJobMode] = useState<'daily' | 'permanent'>('daily');
  const [labourType, setLabourType] = useState<string>(initType ?? '');
  const [workType, setWorkType] = useState<string>('');
  const [manualDescription, setManualDescription] = useState<string>('');
  const [wage, setWage] = useState<string>('600');
  const [timeShift, setTimeShift] = useState<'full_day' | 'half_day' | 'piece'>('full_day');
  const [address, setAddress] = useState<string>('');
  const [nearestPlace, setNearestPlace] = useState<string>('');
  const [lat, setLat] = useState<number | null>(initLat ?? null);
  const [lng, setLng] = useState<number | null>(initLng ?? null);
  const [startTime, setStartTime] = useState<'today' | 'tomorrow'>('today');
  const [submitting, setSubmitting] = useState(false);
  const [locating, setLocating] = useState(false);
  const [labourCount, setLabourCount] = useState(2);
  const [rateUnit, setRateUnit] = useState<'daily' | 'monthly' | 'hourly'>('daily');
  const [startDateObj, setStartDateObj] = useState<Date>(new Date(Date.now() + 86400000));
  const [specificTimeObj, setSpecificTimeObj] = useState<Date>(new Date());
  const [useSpecificTime, setUseSpecificTime] = useState<boolean>(false);
  const [liveChatEnabled, setLiveChatEnabled] = useState(true);

  const handleJobModeChange = (mode: 'daily' | 'permanent') => {
    setJobMode(mode);
    if (mode === 'permanent') {
      setRateUnit('monthly');
      if (wage === '600' || !wage) setWage('15000');
    } else {
      setRateUnit('daily');
      if (wage === '15000' || !wage) setWage('600');
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

  // PDF Page 4 Core Unorganised Labour Categories + Standard Skilled
  const labourTypes = [
    { value: 'agri_labour', label: hi ? '🌾 कृषि मज़दूर (Agricultural Labour)' : 'Agricultural Labour' },
    { value: 'construction_labour', label: hi ? '🏗️ निर्माण मज़दूर (Construction Labour)' : 'Construction Labour' },
    { value: 'loading_unloading', label: hi ? '📦 लोडिंग / अनलोडिंग मज़दूर (Loading/Unloading)' : 'Loading / Unloading' },
    { value: 'cleaning_labour', label: hi ? '🧹 सफाई मज़दूर (Cleaning Labour)' : 'Cleaning Labour' },
    { value: 'domestic_worker', label: hi ? '🏠 घरेलू मज़दूर (Domestic Worker)' : 'Domestic Worker' },
    { value: 'rajmistry', label: hi ? '🧱 राजमिस्त्री (Mason / Rajmistry)' : 'Mason / Rajmistry' },
    { value: 'badhhai', label: hi ? '🪚 बढ़ई (Carpenter / Badhhai)' : 'Carpenter / Badhhai' },
    { value: 'plumber', label: hi ? '🔧 प्लम्बर (Plumber)' : 'Plumber' },
    { value: 'electrician', label: hi ? '⚡ इलेक्ट्रीशियन (Electrician)' : 'Electrician' },
    { value: 'painter', label: hi ? '🎨 पेंटर (Painter)' : 'Painter' },
    { value: 'majdoor', label: hi ? '👷 सामान्य मजदूर (General Labour)' : 'General Labour' },
    { value: 'karigar', label: hi ? '🔨 अन्य कुशल कारीगर (Skilled Karigar)' : 'Other Skilled Worker' },
  ];

  // PDF Page 4 Work Descriptions
  const workTypes = [
    { value: 'brick_loading_2nd_floor', label: hi ? '2 मंज़िल तक ईंट चढ़ाना' : 'Brick loading to 2nd floor' },
    { value: 'concreting_work', label: hi ? 'कंक्रीटिंग / ढलाई कार्य (Concreting)' : 'Concreting Work' },
    { value: 'farm_harvest_plow', label: hi ? 'खेत की जुताई / कटाई / निराई' : 'Farming / Harvesting' },
    { value: 'house_deep_cleaning', label: hi ? 'घर की साफ़-सफ़ाई (Deep Cleaning)' : 'House Cleaning' },
    { value: 'goods_loading_unloading', label: hi ? 'बोरियाँ / सामान लोडिंग-अनलोडिंग' : 'Goods Loading / Unloading' },
    { value: 'digging_trenching', label: hi ? 'गड्ढा / नाली / नींव खुदाई' : 'Digging / Trenching' },
    { value: 'plaster_masonry', label: hi ? 'प्लास्टर व दीवार चिनाई कार्य' : 'Plaster & Masonry' },
    { value: 'tiles_flooring', label: hi ? 'फर्श / टाइल्स / मार्बल कार्य' : 'Flooring / Tiles' },
    { value: 'carpentry_repair', label: hi ? 'बढ़ईगीरी व फर्नीचर रिपेयर' : 'Carpentry & Woodwork' },
    { value: 'other', label: hi ? 'अन्य कार्य (Other Work)' : 'Other Work' },
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

  const handleSubmit = async () => {
    if (!labourType) {
      Alert.alert('', hi ? 'मजदूर का प्रकार (Type of Labour) ज़रूर चुनें।' : 'Please select labour type.');
      return;
    }
    if (!address.trim()) {
      Alert.alert('', hi ? 'काम का स्थान (Address) भरना ज़रूरी है।' : 'Please enter the work address.');
      return;
    }
    // Minimum wage check removed as per requirement 2 (Direct mutual negotiation)

    setSubmitting(true);
    try {
      console.log('[LabourRequest] Submitting request...');
      const combinedDescription = [
        workType ? workTypes.find(w => w.value === workType)?.label : null,
        manualDescription.trim() || null
      ].filter(Boolean).join(' - ');

      const calculatedStartDate = jobMode === 'permanent'
        ? startDateObj.toISOString().split('T')[0]
        : (startTime === 'tomorrow' ? new Date(Date.now() + 86400000).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);

      const calculatedStartTime = useSpecificTime
        ? specificTimeObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : startTime;

      const res = await api.post('/api/labour/request', {
        labour_type: labourType,
        work_type: combinedDescription || workType || undefined,
        job_mode: jobMode,
        wage: wageNum || undefined,
        rate_unit: rateUnit,
        start_date: calculatedStartDate,
        time_shift: timeShift,
        start_time: calculatedStartTime,
        description: manualDescription.trim() || undefined,
        address: address.trim(),
        nearest_place: nearestPlace.trim() || undefined,
        lat: lat || null,
        lng: lng || null,
        labour_count: labourCount,
        live_chat_enabled: liveChatEnabled,
      });
      rootNavigation.navigate('LabourRequestStatus' as never, { job_id: res.data.job_id } as never);
    } catch (err: any) {
      if (err.response?.data?.job_id) {
        const existingJobId = err.response.data.job_id;
        Alert.alert(
          '⚠️',
          err.response?.data?.detail || (hi ? 'Aapka ek request pehle se active hai.' : 'You already have an active request.'),
          [
            {
              text: hi ? 'Status Dekhein' : 'View Status',
              onPress: () => rootNavigation.navigate('LabourRequestStatus' as never, { job_id: existingJobId } as never),
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
        {/* ── App Header ── */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{hi ? 'काम की रिक्वेस्ट भेजें' : 'Send Work Request'}</Text>
          <Text style={styles.headerSub}>{hi ? '(Send Work Request)' : '(काम की रिक्वेस्ट भेजें)'}</Text>
          <Text style={styles.headerNote}>
            {hi
              ? 'सिस्टम सबसे करीब उपलब्ध श्रमिकों को रिक्वेस्ट भेजेगा'
              : 'System will send request to nearest available workers'}
          </Text>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          {/* ── 1. Employment Type: Mode Tabs (रोज़गार का प्रकार चुनें) ── */}
          <View style={styles.fieldBox}>
            <SectionHeader
              icon="🤝"
              title={hi ? '1. रोज़गार का प्रकार चुनें (सबसे ऊपर अनिवार्य विकल्प)' : '1. Select Employment Type'}
            />
            <View style={styles.tabRow}>
              <TouchableOpacity
                style={[styles.tab, jobMode === 'daily' && styles.tabActive]}
                onPress={() => handleJobModeChange('daily')}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabText, jobMode === 'daily' && styles.tabTextActive]}>
                  {'📅 '}{hi ? 'दैनिक मज़दूर' : 'Daily Labour'}
                </Text>
                <Text style={[styles.tabSub, jobMode === 'daily' && styles.tabTextActive]}>
                  (Daily Base Labour)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, jobMode === 'permanent' && styles.tabActive]}
                onPress={() => handleJobModeChange('permanent')}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabText, jobMode === 'permanent' && styles.tabTextActive]}>
                  {'💼 '}{hi ? 'मासिक मजदूर / स्थायी नौकरी' : 'Permanent Job'}
                </Text>
                <Text style={[styles.tabSub, jobMode === 'permanent' && styles.tabTextActive]}>
                  (Month Base / Permanent Job)
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── 2. Field 2: Labour Type (Core Unorganised Categories) ── */}
          <View style={styles.fieldBox}>
            <SectionHeader
              icon="👷"
              title={hi ? '2. मज़दूर का प्रकार (Core Unorganised Labour Categories)' : '2. Type of Labour'}
            />
            <DropdownPicker
              value={labourType}
              options={labourTypes}
              onSelect={setLabourType}
              placeholder={hi ? 'ड्रॉपडाउन: चुनें ▼' : 'Dropdown: Select ▼'}
              sheetTitle={hi ? 'मजदूर का प्रकार चुनें' : 'Select Labour Type'}
            />
          </View>

          {/* ── 3. Field 3: Work Description (Work Description) ── */}
          <View style={styles.fieldBox}>
            <SectionHeader
              icon="📋"
              title={hi ? '3. काम का विवरण (Work Description)' : '3. Work Description'}
            />
            <DropdownPicker
              value={workType}
              options={workTypes}
              onSelect={setWorkType}
              placeholder={hi ? 'ड्रॉपडाउन: काम की लिस्ट से चुनें ▼ (उदा: 2 मंज़िल तक ईंट चढ़ाना)' : 'Select from work list ▼'}
              sheetTitle={hi ? 'काम की लिस्ट से चुनें' : 'Select Work Description'}
            />

            {/* Additional Details with Voice / Mic Logo */}
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
                  placeholder={hi ? 'उदा: 2 मंज़िल छत ढलाई के लिए गिट्टी, बालू, सीमेंट मिलाना...' : 'E.g. Mixing cement, sand for 2nd floor roof concreting...'}
                  placeholderTextColor="#94A3B8"
                  value={manualDescription}
                  onChangeText={setManualDescription}
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

          {/* ── 4. Field 4: Number of Labours ── */}
          <View style={styles.fieldBox}>
            <SectionHeader
              icon="👥"
              title={hi ? '4. मज़दूरों की संख्या (Number of Labors)' : '4. Number of Labours'}
            />
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 10 }}>
              <TouchableOpacity onPress={() => setLabourCount(c => Math.max(1, c - 1))} style={styles.counterBtn}>
                <Text style={styles.counterBtnText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.counterText}>{labourCount.toString().padStart(2, '0')}</Text>
              <TouchableOpacity onPress={() => setLabourCount(c => Math.min(20, c + 1))} style={styles.counterBtn}>
                <Text style={styles.counterBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── 5. Field 5: Wage (दिहाड़ी / मज़दूरी) ── */}
          <View style={styles.fieldBox}>
            <SectionHeader
              icon="₹"
              title={
                jobMode === 'permanent'
                  ? (hi ? '5. प्रस्तावित वेतन / मजदूरी' : '5. Proposed Salary / Wage')
                  : (hi ? '5. दिहाड़ी / मज़दूरी (Wage per person)' : '5. Daily Wage per person')
              }
            />

            {/* Rate unit toggle (प्रति दिन, प्रति माह, प्रति घंटा) as per PDF Requirement 1 */}
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
              {[
                { key: 'daily', label: hi ? '📅 प्रति दिन' : '📅 Per Day' },
                { key: 'monthly', label: hi ? '💼 प्रति माह' : '💼 Per Month' },
                { key: 'hourly', label: hi ? '⏰ प्रति घंटा' : '⏰ Per Hour' },
              ].map(u => (
                <TouchableOpacity
                  key={u.key}
                  style={[
                    styles.tab,
                    { flex: 1, paddingVertical: 8, paddingHorizontal: 4 },
                    rateUnit === u.key && styles.tabActive,
                  ]}
                  onPress={() => {
                    setRateUnit(u.key as any);
                    if (u.key === 'monthly' && (wage === '600' || !wage)) setWage('15000');
                    if (u.key === 'daily' && (wage === '15000' || !wage)) setWage('600');
                    if (u.key === 'hourly' && (wage === '600' || wage === '15000')) setWage('100');
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.tabText, { fontSize: 12 }, rateUnit === u.key && styles.tabTextActive]}>
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
                      : (hi ? 'प्रति दिन / मजदूर' : 'per day')}
                </Text>
              </View>
            </View>
            <Text style={{ fontSize: 11, color: G.sub, marginTop: 6, fontStyle: 'italic' }}>
              {hi
                ? 'ℹ️ आपसी बातचीत व सहमति के आधार पर मजदूरी तय होगी (कोई अनिवार्य न्यूनतम सीमा नहीं)।'
                : 'ℹ️ Wages are mutually agreed via direct negotiation (no mandatory minimum).'}
            </Text>
          </View>

          {/* ── 6. Field 6: Time Shift ── */}
          <View style={styles.fieldBox}>
            <SectionHeader
              icon="⏰"
              title={hi ? '6. काम का समय (Time Shift)' : '6. Time Shift'}
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

          {/* ── 7. Field 7: Working Place ── */}
          <View style={styles.fieldBox}>
            <SectionHeader
              icon="📍"
              title={hi ? '7. काम का स्थान (Working Place)' : '7. Working Place'}
            />
            <TouchableOpacity
              style={styles.gpsBtn}
              onPress={handleGetLocation}
              disabled={locating}
              activeOpacity={0.8}
            >
              {locating
                ? <ActivityIndicator size={16} color={G.primary} style={{ marginRight: 8 }} />
                : <Text style={{ fontSize: 16, marginRight: 8 }}>📍</Text>}
              <Text style={styles.gpsBtnText}>
                {locating
                  ? (hi ? 'लोकेशन मिल रही है...' : 'Getting location...')
                  : (hi ? 'मेरी वर्तमान लोकेशन लें (Auto GPS Fetch)' : 'Get My Current Location (Auto GPS)')}
              </Text>
            </TouchableOpacity>
            <TextInput
              mode="flat"
              placeholder={hi ? 'मैनुअल पता: गली, मोहल्ला, शहर...' : 'Manual address: Street, Area, City...'}
              value={address}
              onChangeText={setAddress}
              multiline
              numberOfLines={2}
              style={styles.addressInput}
              underlineColor={G.border}
              activeUnderlineColor={G.primary}
            />

            {/* Nearest Place / Landmark Free-Text Field (Task 10) */}
            <View style={{ marginTop: 8 }}>
              <TextInput
                mode="flat"
                placeholder={hi ? 'निकटतम स्थान / लैंडमार्क / चौराहा / गाँव (वैकल्पिक)' : 'Nearest Landmark / Crossing / Village (Optional)'}
                value={nearestPlace}
                onChangeText={setNearestPlace}
                style={styles.addressInput}
                underlineColor={G.border}
                activeUnderlineColor={G.primary}
              />
            </View>
          </View>

          {/* ── 8. Field 8: Date & Time ── */}
          <View style={styles.fieldBox}>
            <SectionHeader
              icon="⏱️"
              title={hi ? '8. काम शुरू होने का समय (Date & Time)' : '8. Work Start Time'}
            />
            {jobMode === 'daily' ? (
              <>
                <View style={{ backgroundColor: '#FFF8E1', padding: 10, borderRadius: 8, marginBottom: 10, borderColor: '#FFE082', borderWidth: 1 }}>
                  <Text style={{ fontSize: 11, color: '#B78103', lineHeight: 16 }}>
                    {hi
                      ? '⚡ दैनिक मजदूर: आज और कल का चयन उपलब्ध है ताकि मज़दूर समय पर पहुँचे।'
                      : '⚡ Daily Labour: Today and Tomorrow are selectable for prompt arrival.'}
                  </Text>
                </View>
                <View style={styles.dateRowContainer}>
                  {[
                    { value: 'today', title: hi ? 'आज' : 'Today', sub: `(${getFormattedDate(0)})` },
                    { value: 'tomorrow', title: hi ? 'कल सुबह' : 'Tomorrow', sub: `(${getFormattedDate(1)})` },
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
                      ? '📅 अपनी सुविधानुसार आगे की कोई भी तारीख चुनें।'
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
                            : (hi ? 'जैसे सुबह 08:30 AM या दोपहर 02:00 PM' : 'e.g. 08:30 AM or 02:00 PM')}
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

          {/* ── 9. Live Notification Chat Banner (PDF Page 1) ── */}
          <View style={styles.liveChatBanner}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
              <Text style={{ fontSize: 28, marginRight: 12 }}>💬</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: G.text }}>
                  {hi ? 'Live Notification Chat' : 'Live Notification Chat'}
                </Text>
                <Text style={{ fontSize: 11, color: G.sub, marginTop: 3, lineHeight: 16 }}>
                  {hi
                    ? 'आपकी रिक्वेस्ट पास के मजदूरों को भेजी जाएगी। यदि कोई मजदूर accept करता है या cross offer करता है तो आपको सूचित किया जाएगा। आप live chat में उनसे बात कर सकते हैं और offer accept या cross offer कर सकते हैं।'
                    : 'Your request will be sent to nearby workers. You will be notified on accept or cross offers to chat and negotiate.'}
                </Text>
              </View>
            </View>
          </View>

          {/* ── Submit Button ── */}
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
                <Text style={styles.submitIcon}>📢</Text>
                <View style={{ alignItems: 'center' }}>
                  <Text style={styles.submitText}>
                    {hi ? 'काम की रिक्वेस्ट भेजें' : 'Send Work Request'}
                  </Text>
                  <Text style={styles.submitSub}>
                    {hi ? '(Broadcast Request)' : '(Broadcast Request)'}
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

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: G.bg },
  scroll: { paddingBottom: 160 },

  // Header
  header: {
    backgroundColor: G.white,
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12,
    alignItems: 'center', borderBottomWidth: 1, borderBottomColor: G.border,
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: G.text },
  headerSub: { fontSize: 12, color: G.sub, marginTop: 2 },
  headerNote: { fontSize: 11, color: G.sub, marginTop: 6, textAlign: 'center' },

  // Tabs
  tabRow: {
    flexDirection: 'row',
    margin: 14,
    backgroundColor: G.white,
    borderRadius: 10,
    padding: 4,
    elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4,
  },
  tab: {
    flex: 1, paddingVertical: 10, paddingHorizontal: 8,
    borderRadius: 8, alignItems: 'center',
  },
  tabActive: { backgroundColor: G.primaryLight, borderWidth: 1, borderColor: G.primary },
  tabText: { fontSize: 13, fontWeight: '700', color: G.text, textAlign: 'center' },
  tabSub: { fontSize: 10, color: G.sub, marginTop: 2 },
  tabTextActive: { color: G.primary },

  // Field boxes
  fieldBox: {
    backgroundColor: G.white,
    marginHorizontal: 14,
    marginBottom: 10,
    borderRadius: 12,
    padding: 14,
    elevation: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3,
  },

  // Section header
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
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

  // Dropdown modal
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
  modalOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  modalOptionActive: { backgroundColor: G.primaryLight, marginHorizontal: -16, paddingHorizontal: 16, borderRadius: 0 },
  modalOptionText: { fontSize: 14, color: G.text },

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

  // Time Shift
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

  // Counters
  counterBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FAFAFA',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: G.border,
  },
  counterBtnText: {
    fontSize: 24,
    color: G.primary,
    fontWeight: '700',
    lineHeight: 28,
  },
  counterText: {
    fontSize: 24,
    fontWeight: '700',
    color: G.text,
    marginHorizontal: 24,
  },

  // Submit button
  submitBtn: {
    backgroundColor: G.primary, marginHorizontal: 14, marginVertical: 10,
    borderRadius: 12, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    elevation: 3,
    shadowColor: G.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4,
  },
  submitIcon: { fontSize: 24, marginRight: 10, color: G.white },
  submitText: { fontSize: 16, fontWeight: '800', color: G.white, letterSpacing: 0.5 },
  submitSub: { fontSize: 11, color: '#A5D6A7', marginTop: 2 },

  // New Date Row Container
  dateRowContainer: { flexDirection: 'column', paddingLeft: 30, paddingRight: 14, gap: 10 },
  dateCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 14, borderRadius: 10, borderWidth: 1, borderColor: G.border,
    backgroundColor: G.white,
  },
  dateCardActive: { borderColor: G.primary, backgroundColor: G.primaryLight },
  dateTitle: { fontSize: 16, fontWeight: '700', color: G.text },
  dateSub: { fontSize: 12, color: G.sub, marginTop: 2 },

  // Live Chat Banner
  liveChatBanner: {
    backgroundColor: '#E8F5E9',
    marginHorizontal: 14,
    marginTop: 10,
    marginBottom: 5,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },

  // Description & Mic Box
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
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
});
