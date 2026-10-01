import React, { useState } from 'react';
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
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { api, getErrorMessage } from '../../services/api';
import { useLanguage } from '../../i18n/LanguageContext';
import { useNavigation } from '@react-navigation/native';

// ─── Theme Colors ────────────────────────────────────────────────────────────
const G = {
  primary: '#1B5E20',       // Dark emerald green matching the PDF design
  primaryLight: '#E8F5E9',  // Light green background fill
  primaryMedium: '#2E7D32', // Medium green accent
  accent: '#FF8F00',
  bg: '#F4F5F7',
  white: '#FFFFFF',
  text: '#111827',
  sub: '#6B7280',
  border: '#D1D5DB',
  inputBg: '#FAFAFA',
  badgeGreen: '#2E7D32',
  chatBg: '#EDF7ED',
  chatBorder: '#C8E6C9',
  chatBtnDark: '#1B5E20',
};

interface Props { route: any; navigation: any; }

// ─── Dropdown Picker Component ───────────────────────────────────────────────
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
        <Text style={[styles.dropdownText, !selected && { color: '#9CA3AF' }]}>
          {selected ? selected.label : placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color="#6B7280" />
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

// ─── Step Header Component ────────────────────────────────────────────────────
function StepHeader({
  stepNumber,
  iconName,
  iconFamily = 'MaterialCommunityIcons',
  titleHi,
  titleEn,
}: {
  stepNumber: number;
  iconName: string;
  iconFamily?: 'Ionicons' | 'MaterialCommunityIcons' | 'FontAwesome5';
  titleHi: string;
  titleEn: string;
}) {
  const renderIcon = () => {
    if (iconFamily === 'Ionicons') {
      return <Ionicons name={iconName as any} size={18} color={G.primaryMedium} />;
    }
    if (iconFamily === 'FontAwesome5') {
      return <FontAwesome5 name={iconName as any} size={16} color={G.primaryMedium} />;
    }
    return <MaterialCommunityIcons name={iconName as any} size={20} color={G.primaryMedium} />;
  };

  return (
    <View style={styles.stepHeaderRow}>
      <View style={styles.stepBadge}>
        <Text style={styles.stepBadgeText}>{stepNumber}</Text>
      </View>
      <View style={styles.stepIconWrap}>
        {renderIcon()}
      </View>
      <Text style={styles.stepTitleHi}>
        {titleHi} <Text style={styles.stepTitleEn}>({titleEn})</Text>
      </Text>
    </View>
  );
}

// ─── Main Driver Booking Screen ──────────────────────────────────────────────
export default function DriverBookingScreen({ route, navigation }: Props) {
  const { lang } = useLanguage();
  const rootNavigation = useNavigation<any>();
  const { labour_type: initType, lat: initLat, lng: initLng } = route?.params ?? {};

  const hi = lang === 'hi';

  // Form state
  const [jobMode, setJobMode] = useState<'daily' | 'permanent'>('daily');
  const [rateUnit, setRateUnit] = useState<'daily' | 'monthly' | 'hourly'>('daily');
  const [driverType, setDriverType] = useState<string>(initType ?? '');
  const [vehicleType, setVehicleType] = useState<string>('');
  const [wage, setWage] = useState<string>('600');
  const [description, setDescription] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [nearestPlace, setNearestPlace] = useState<string>('');
  const [lat, setLat] = useState<number | null>(initLat ?? null);
  const [lng, setLng] = useState<number | null>(initLng ?? null);
  
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [startTime, setStartTime] = useState<string>('morning');
  const [specificTime, setSpecificTime] = useState<Date>(new Date());
  
  const [submitting, setSubmitting] = useState(false);
  const [locating, setLocating] = useState(false);
  const [numDrivers, setNumDrivers] = useState(1);
  const [liveChatEnabled, setLiveChatEnabled] = useState(true);

  const handleJobModeChange = (mode: 'daily' | 'permanent') => {
    setJobMode(mode);
    if (mode === 'permanent') {
      setRateUnit('monthly');
      setWage('18000');
    } else {
      setRateUnit('daily');
      setWage('600');
    }
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

  const wageNum = parseFloat(wage) || 0;

  const driverTypes = [
    { value: 'commercial', label: hi ? 'कमर्शियल / बिज़नेस (Commercial)' : 'Commercial / Business' },
    { value: 'personal', label: hi ? 'पर्सनल / घरेलू (Personal)' : 'Personal / Private' },
    { value: 'heavy', label: hi ? 'हैवी लाइसेंस (Heavy Vehicle Driver)' : 'Heavy License Driver' },
  ];

  // Vehicle type values MUST match DB casing (vehicle_type column in provider_profiles)
  const vehicleTypes = [
    { value: 'Hatchback', label: hi ? 'हैचबैक — Dzire, Alto, WagonR' : 'Hatchback — Dzire, Alto' },
    { value: 'Sedan',     label: hi ? 'सेडान — Honda City, Ciaz' : 'Sedan — Honda City, Ciaz' },
    { value: 'SUV',       label: hi ? 'SUV — Innova, Ertiga, Fortuner' : 'SUV — Innova, Ertiga' },
    { value: 'Heavy',     label: hi ? 'भारी वाहन — 407 ट्रक, Bus, Tempu' : 'Heavy — 407 Truck, Bus' },
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

  const showDatePicker = () => {
    if (Platform.OS !== 'android') {
      Alert.alert(hi ? 'जानकारी' : 'Info', hi ? 'डेट पिकर केवल एंड्रॉइड ऐप पर उपलब्ध है।' : 'Date picker is only available on Android app.');
      return;
    }
    DateTimePickerAndroid.open({
      value: startDate,
      onChange: (event: any, selectedDate?: Date) => {
        if (event.type === 'set' && selectedDate) {
          setStartDate(selectedDate);
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
      value: specificTime,
      onChange: (event: any, selectedTime?: Date) => {
        if (event.type === 'set' && selectedTime) {
          setSpecificTime(selectedTime);
          setStartTime('specific');
        }
      },
      mode: 'time',
      is24Hour: false,
    });
  };

  const handleSubmit = async () => {
    if (!driverType) {
      Alert.alert('', hi ? 'Driver ka type zaroor chunein.' : 'Please select driver type.');
      return;
    }
    if (!address.trim()) {
      Alert.alert('', hi ? 'Kaam ka pata zaroori hai.' : 'Please enter the work address.');
      return;
    }

    setSubmitting(true);
    try {
      console.log('[DriverRequest] Submitting request...');
      const payload = {
        driver_type: driverType,
        vehicle_type: vehicleType,
        job_mode: jobMode,
        rate_unit: rateUnit,
        wage: wageNum,
        description,
        start_date: startDate.toISOString().split('T')[0],
        start_time: startTime === 'specific' ? specificTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : startTime,
        num_drivers: numDrivers,
        address,
        nearest_place: nearestPlace,
        lat,
        lng,
        live_chat: liveChatEnabled,
      };
      const res = await api.post('/api/driver/request', payload);
      console.log('[DriverRequest] Response:', JSON.stringify(res.data));
      rootNavigation.navigate('DriverRequestStatus' as never, { job_id: res.data.job_id } as never);
    } catch (err: any) {
      if (err.response?.data?.job_id) {
        const existingJobId = err.response.data.job_id;
        Alert.alert(
          '⚠️',
          err.response?.data?.detail || (hi ? 'Aapka ek request pehle se active hai.' : 'You already have an active request.'),
          [
            {
              text: hi ? 'Status Dekhein' : 'View Status',
              onPress: () => rootNavigation.navigate('DriverRequestStatus' as never, { job_id: existingJobId } as never),
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
        {/* ── App Top Header ── */}
        <View style={styles.topAppBar}>
          <View style={styles.brandContainer}>
            <View style={styles.logoBadge}>
              <MaterialCommunityIcons name="steering" size={24} color="#1E3A8A" />
            </View>
            <View style={{ justifyContent: 'center' }}>
              <Text style={styles.brandTitle}>श्रम सारथी</Text>
              <Text style={styles.brandSub}>SHRAM SARTHI</Text>
            </View>
          </View>
        </View>

        {/* ── Page Header Box ── */}
        <View style={styles.pageHeaderBox}>
          <Text style={styles.pageTitle}>
            ड्राइवर बुक करें <Text style={styles.pageTitleEn}>(Book a Driver)</Text>
          </Text>
          <Text style={styles.pageSubtitle}>
            {hi
              ? 'सिस्टम आपके नजदीक उपलब्ध ड्राइवरों को रिक्वेस्ट भेजेगा।'
              : 'System will send request to nearest available drivers.'}
          </Text>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          {/* ── Mode Tabs ── */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tabCard, jobMode === 'daily' && styles.tabCardActive]}
              onPress={() => handleJobModeChange('daily')}
              activeOpacity={0.8}
            >
              <View style={[styles.tabIconCircle, jobMode === 'daily' && styles.tabIconCircleActive]}>
                <MaterialCommunityIcons
                  name="account-hard-hat"
                  size={20}
                  color={jobMode === 'daily' ? G.primary : '#4B5563'}
                />
              </View>
              <View style={styles.tabTextWrap}>
                <Text style={[styles.tabTitle, jobMode === 'daily' && styles.tabTitleActive]}>
                  {hi ? 'दैनिक ड्राइवर' : 'Daily Driver'}
                </Text>
                <Text style={[styles.tabSub, jobMode === 'daily' && styles.tabSubActive]}>
                  (Daily Driver)
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabCard, jobMode === 'permanent' && styles.tabCardActive]}
              onPress={() => handleJobModeChange('permanent')}
              activeOpacity={0.8}
            >
              <View style={[styles.tabIconCircle, jobMode === 'permanent' && styles.tabIconCircleActive]}>
                <MaterialCommunityIcons
                  name="account-tie"
                  size={20}
                  color={jobMode === 'permanent' ? G.primary : '#4B5563'}
                />
              </View>
              <View style={styles.tabTextWrap}>
                <Text style={[styles.tabTitle, jobMode === 'permanent' && styles.tabTitleActive]}>
                  {hi ? 'स्थायी ड्राइवर' : 'Permanent Driver'}
                </Text>
                <Text style={[styles.tabSub, jobMode === 'permanent' && styles.tabSubActive]}>
                  (Permanent Driver)
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* ── Field 1: Driver Type ── */}
          <View style={styles.cardSection}>
            <StepHeader
              stepNumber={1}
              iconName="account-badge-outline"
              titleHi="ड्राइवर का प्रकार चुनें"
              titleEn="Type of Driver"
            />
            <DropdownPicker
              value={driverType}
              options={driverTypes}
              onSelect={setDriverType}
              placeholder={hi ? 'चुनें' : 'Select'}
              sheetTitle={hi ? 'ड्राइवर का प्रकार' : 'Driver Type'}
            />
          </View>

          {/* ── Field 2: Vehicle Type ── */}
          <View style={styles.cardSection}>
            <StepHeader
              stepNumber={2}
              iconName="car"
              titleHi="वाहन का प्रकार चुनें"
              titleEn="Vehicle Type"
            />
            <DropdownPicker
              value={vehicleType}
              options={vehicleTypes}
              onSelect={setVehicleType}
              placeholder={hi ? 'वाहन का प्रकार चुनें' : 'Select Vehicle Type'}
              sheetTitle={hi ? 'वाहन का प्रकार' : 'Vehicle Type'}
            />
          </View>

          {/* ── Field 3: Work/Trip Details ── */}
          <View style={styles.cardSection}>
            <StepHeader
              stepNumber={3}
              iconName="format-list-bulleted-square"
              titleHi="कार्य / यात्रा का विवरण"
              titleEn="Work / Trip Details"
            />
            <View style={styles.inputWithMicBox}>
              <TextInput
                mode="flat"
                placeholder={hi ? 'यात्रा या कार्य का विवरण लिखें...' : 'Write trip or work details...'}
                value={description}
                onChangeText={setDescription}
                multiline
                style={styles.multilineInput}
                underlineColor="transparent"
                activeUnderlineColor="transparent"
              />
              <TouchableOpacity style={styles.micCircleBtn} activeOpacity={0.7}>
                <Ionicons name="mic" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Field 4: Number of Drivers ── */}
          <View style={styles.cardSection}>
            <StepHeader
              stepNumber={4}
              iconName="account-group-outline"
              titleHi="ड्राइवरों की संख्या"
              titleEn="Number of Drivers"
            />
            <View style={styles.counterRow}>
              <TouchableOpacity
                onPress={() => setNumDrivers(c => Math.max(1, c - 1))}
                style={styles.counterBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="remove" size={20} color="#1F2937" />
              </TouchableOpacity>
              <View style={styles.counterValueBox}>
                <Text style={styles.counterText}>{numDrivers.toString().padStart(2, '0')}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setNumDrivers(c => Math.min(20, c + 1))}
                style={styles.counterBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={20} color="#1F2937" />
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Field 5: Proposed Payment ── */}
          <View style={styles.cardSection}>
            <StepHeader
              stepNumber={5}
              iconName="currency-inr"
              titleHi="प्रस्तावित भुगतान / रेट"
              titleEn="Proposed Payment / Rate"
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

            <View style={styles.wageInputContainer}>
              <View style={styles.rupeeCircle}>
                <Text style={styles.rupeeCircleText}>₹</Text>
              </View>
              <TextInput
                mode="flat"
                keyboardType="numeric"
                value={wage}
                onChangeText={setWage}
                placeholder={hi ? 'रेट लिखें' : 'Enter rate'}
                style={styles.wageInputInline}
                underlineColor="transparent"
                activeUnderlineColor="transparent"
                dense
              />
              <Text style={styles.wageSuffixText}>
                {rateUnit === 'monthly'
                  ? (hi ? 'प्रति माह / ड्राइवर' : 'Per Month / Driver')
                  : rateUnit === 'hourly'
                  ? (hi ? 'प्रति घंटा / ड्राइवर' : 'Per Hour / Driver')
                  : (hi ? 'प्रति दिन / ड्राइवर' : 'Per Day / Driver')}
              </Text>
            </View>
            <Text style={{ fontSize: 11, color: G.sub, marginTop: 6, fontStyle: 'italic' }}>
              {hi
                ? 'ℹ️ आपसी बातचीत व सहमति के आधार पर दर तय होगी (कोई अनिवार्य न्यूनतम सीमा नहीं)।'
                : 'ℹ️ Rate is mutually agreed via direct negotiation (no mandatory minimum).'}
            </Text>
          </View>

          {/* ── Field 6: Pickup / Work Location ── */}
          <View style={styles.cardSection}>
            <StepHeader
              stepNumber={6}
              iconName="target"
              titleHi="कार्य / पिकअप का स्थान"
              titleEn="Pickup / Work Location"
            />
            <TouchableOpacity
              style={styles.gpsAutoBtn}
              onPress={handleGetLocation}
              disabled={locating}
              activeOpacity={0.8}
            >
              <View style={styles.gpsTargetCircle}>
                {locating ? (
                  <ActivityIndicator size={14} color="#15803D" />
                ) : (
                  <Ionicons name="navigate" size={14} color="#15803D" />
                )}
              </View>
              <Text style={styles.gpsAutoBtnText}>
                {locating
                  ? hi ? 'लोकेशन मिल रही है...' : 'Getting location...'
                  : hi ? 'मेरी वर्तमान लोकेशन लें (Auto GPS)' : 'Get My Current Location (Auto GPS)'}
              </Text>
            </TouchableOpacity>

            <TextInput
              mode="flat"
              placeholder={hi ? 'मैनुअल पता: गली, मोहल्ला, शहर...' : 'Manual address: Street, Area, City...'}
              value={address}
              onChangeText={setAddress}
              multiline
              numberOfLines={2}
              style={styles.manualAddressInput}
              underlineColor="transparent"
              activeUnderlineColor="transparent"
            />

            {/* Nearest Place Free-Text Input (Task 10) */}
            <View style={{ marginTop: 8 }}>
              <TextInput
                mode="flat"
                placeholder={hi ? 'निकटतम स्थान / लैंडमार्क / चौराहा / गाँव (वैकल्पिक)' : 'Nearest Landmark / Crossing / Village (Optional)'}
                value={nearestPlace}
                onChangeText={setNearestPlace}
                style={styles.manualAddressInput}
                underlineColor="transparent"
                activeUnderlineColor="transparent"
              />
            </View>
          </View>

          {/* ── Field 7: Select Date ── */}
          <View style={styles.cardSection}>
            <StepHeader
              stepNumber={7}
              iconName="calendar-month-outline"
              titleHi="तिथि चुनें"
              titleEn="Select Date"
            />
            <TouchableOpacity style={styles.datePickerBox} onPress={showDatePicker} activeOpacity={0.7}>
              <Text style={styles.datePickerText}>{getFormattedDateObj(startDate)}</Text>
              <Ionicons name="calendar-outline" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* ── Field 8: Select Time ── */}
          <View style={styles.cardSection}>
            <StepHeader
              stepNumber={8}
              iconName="clock-outline"
              titleHi="समय चुनें"
              titleEn="Select Time"
            />
            <View style={styles.timeRadioRow}>
              {[
                { value: 'morning', title: hi ? 'सुबह' : 'Morning', sub: '(6 AM - 12 PM)' },
                { value: 'afternoon', title: hi ? 'दोपहर' : 'Afternoon', sub: '(12 PM - 6 PM)' },
                { value: 'night', title: hi ? 'रात' : 'Night', sub: '(6 PM - 12 AM)' },
              ].map(opt => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.timeRadioCard, startTime === opt.value && styles.timeRadioCardActive]}
                  onPress={() => setStartTime(opt.value)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.customRadioCircle, startTime === opt.value && styles.customRadioCircleActive]}>
                    {startTime === opt.value && <View style={styles.customRadioDot} />}
                  </View>
                  <Text style={[styles.timeRadioMain, startTime === opt.value && styles.timeRadioMainActive]}>
                    {opt.title}
                  </Text>
                  <Text style={styles.timeRadioSub}>{opt.sub}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.specificTimeBox}
              onPress={() => {
                setStartTime('specific');
                showTimePicker();
              }}
              activeOpacity={0.7}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="time-outline" size={18} color={G.primary} style={{ marginRight: 8 }} />
                <Text style={styles.specificTimeText}>
                  {hi ? 'विशिष्ट समय चुनें' : 'Select Specific Time'}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {startTime === 'specific' && (
                  <Text style={styles.specificTimeValue}>
                    {specificTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                )}
                <Ionicons name="chevron-forward" size={18} color="#6B7280" />
              </View>
            </TouchableOpacity>
          </View>

          {/* ── Live Notification Chat Banner ── */}
          <View style={styles.liveChatBanner}>
            <View style={styles.liveChatLeft}>
              <View style={styles.liveChatIconBadge}>
                <Ionicons name="chatbubbles" size={20} color="#15803D" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.liveChatTitle}>Live Notification Chat</Text>
                <Text style={styles.liveChatSubText}>
                  {hi
                    ? 'आपको रिक्वेस्ट पास के ड्राइवरों को भेजी जाएगी। यदि कोई ड्राइवर accept करता है या cross offer करता है तो आपको सूचित किया जाएगा।'
                    : 'Your request will be sent to nearby drivers. You will be notified when a driver accepts or cross offers.'}
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.liveChatBtnDark} activeOpacity={0.8}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                <MaterialCommunityIcons name="comment-text-multiple" size={16} color="#FFFFFF" style={{ marginRight: 5 }} />
                <Text style={styles.liveChatBtnTitle}>Live Chat खोलें</Text>
              </View>
              <Text style={styles.liveChatBtnSub}>Click करें, आप live chat start करें</Text>
            </TouchableOpacity>
          </View>

          {/* ── Send Request Button ── */}
          <TouchableOpacity
            style={[styles.sendRequestBtn, submitting && { opacity: 0.7 }]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" size={22} />
            ) : (
              <>
                <Ionicons name="paper-plane" size={22} color="#FFFFFF" style={{ marginRight: 10 }} />
                <View style={{ alignItems: 'center' }}>
                  <Text style={styles.sendRequestText}>
                    {hi ? 'काम की रिक्वेस्ट भेजें' : 'Send Driver Request'}
                  </Text>
                  <Text style={styles.sendRequestSub}>
                    (Send Driver Request)
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

  // Top App Bar
  topAppBar: {
    backgroundColor: G.white,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E3A8A',
    lineHeight: 20,
  },
  brandSub: {
    fontSize: 9,
    fontWeight: '700',
    color: '#1E40AF',
    letterSpacing: 0.5,
  },
  headerRightControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  distancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#86EFAC',
    marginRight: 10,
  },
  distanceText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  bellBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    position: 'relative',
  },
  bellBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#DC2626',
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bellBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },

  // Page Header Box
  pageHeaderBox: {
    backgroundColor: G.white,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  pageTitleEn: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4B5563',
  },
  pageSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center',
  },

  // Mode Tabs
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 14,
    marginTop: 14,
    marginBottom: 8,
    gap: 10,
  },
  tabCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: G.white,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  tabCardActive: {
    borderColor: G.primary,
    backgroundColor: G.primaryLight,
  },
  tabIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  tabIconCircleActive: {
    backgroundColor: '#C8E6C9',
  },
  tabTextWrap: {
    flex: 1,
  },
  tabTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1F2937',
  },
  tabTitleActive: {
    color: G.primary,
  },
  tabSub: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 1,
  },
  tabSubActive: {
    color: '#2E7D32',
  },

  // Section Card
  cardSection: {
    backgroundColor: G.white,
    marginHorizontal: 14,
    marginBottom: 10,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
  },

  // Step Header
  stepHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#15803D',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  stepBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  stepIconWrap: {
    marginRight: 8,
  },
  stepTitleHi: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
  },
  stepTitleEn: {
    fontSize: 12,
    fontWeight: '500',
    color: '#4B5563',
  },

  // Dropdown Component
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: G.border,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: G.white,
  },
  dropdownText: {
    fontSize: 14,
    color: '#111827',
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalSheet: {
    backgroundColor: G.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingBottom: 32,
    maxHeight: '60%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#D1D5DB',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 10,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalOptionActive: {
    backgroundColor: G.primaryLight,
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  modalOptionText: {
    fontSize: 14,
    color: '#111827',
  },

  // Input with Mic (Field 3)
  inputWithMicBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: G.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: G.border,
    paddingRight: 6,
  },
  multilineInput: {
    flex: 1,
    backgroundColor: 'transparent',
    fontSize: 13,
    paddingHorizontal: 12,
    minHeight: 46,
  },
  micCircleBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#15803D',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Counter (Field 4)
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  counterBtn: {
    width: 44,
    height: 40,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: G.border,
  },
  counterValueBox: {
    width: 70,
    height: 40,
    borderWidth: 1,
    borderColor: G.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
    borderRadius: 6,
    backgroundColor: G.white,
  },
  counterText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },

  // Wage (Field 5)
  wageInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: G.border,
    borderRadius: 8,
    backgroundColor: G.white,
    paddingHorizontal: 10,
    height: 48,
  },
  rupeeCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#15803D',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  rupeeCircleText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  wageInputInline: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    height: 44,
  },
  wageSuffixText: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '600',
    paddingLeft: 8,
    borderLeftWidth: 1,
    borderLeftColor: '#E5E7EB',
  },

  // Location (Field 6)
  gpsAutoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  gpsTargetCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  gpsAutoBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#15803D',
    flex: 1,
  },
  manualAddressInput: {
    backgroundColor: G.white,
    borderWidth: 1,
    borderColor: G.border,
    borderRadius: 8,
    fontSize: 13,
    paddingHorizontal: 12,
    marginBottom: 4,
  },

  // Date (Field 7)
  datePickerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: G.border,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: G.white,
  },
  datePickerText: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
  },

  // Time (Field 8)
  timeRadioRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  timeRadioCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: G.border,
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
    backgroundColor: G.white,
  },
  timeRadioCardActive: {
    borderColor: G.primary,
    backgroundColor: G.primaryLight,
  },
  customRadioCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#9CA3AF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  customRadioCircleActive: {
    borderColor: G.primary,
  },
  customRadioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: G.primary,
  },
  timeRadioMain: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
  },
  timeRadioMainActive: {
    color: G.primary,
  },
  timeRadioSub: {
    fontSize: 9,
    color: '#6B7280',
    marginTop: 2,
    textAlign: 'center',
  },
  specificTimeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: G.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: G.white,
  },
  specificTimeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  specificTimeValue: {
    fontSize: 12,
    fontWeight: '700',
    color: G.primary,
    marginRight: 6,
  },

  // Live Chat Banner
  liveChatBanner: {
    backgroundColor: G.chatBg,
    marginHorizontal: 14,
    marginTop: 4,
    marginBottom: 14,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: G.chatBorder,
  },
  liveChatLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  liveChatIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    marginTop: 2,
  },
  liveChatTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },
  liveChatSubText: {
    fontSize: 11,
    color: '#374151',
    marginTop: 2,
    lineHeight: 16,
  },
  liveChatBtnDark: {
    backgroundColor: G.chatBtnDark,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  liveChatBtnTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  liveChatBtnSub: {
    fontSize: 10,
    color: '#A5D6A7',
  },

  // Send Request Button
  sendRequestBtn: {
    backgroundColor: G.primary,
    marginHorizontal: 14,
    marginBottom: 16,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: G.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  sendRequestText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  sendRequestSub: {
    fontSize: 11,
    color: '#A5D6A7',
    marginTop: 1,
  },
});

