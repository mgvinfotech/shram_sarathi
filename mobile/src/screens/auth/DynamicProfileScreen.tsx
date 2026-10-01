import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert, StatusBar, Image,
  Platform, KeyboardAvoidingView,
} from 'react-native';
import { TextInput } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import SignupProgressBar from '../../components/SignupProgressBar';
import { useLanguage } from '../../i18n/LanguageContext';

// ─── Design Tokens ────────────────────────────────────────────────────────────
const G = {
  primary: '#FF6B00',
  purple:  '#673AB7',
  bg:      '#FAFAFA',
  white:   '#FFFFFF',
  text:    '#1A1A1A',
  sub:     '#666666',
  border:  '#E0E0E0',
  success: '#2E7D32',
};

// ─── Role-specific option lists ───────────────────────────────────────────────
const LABOUR_CATEGORIES = [
  { hi: 'निर्माण / कंस्ट्रक्शन', en: 'Construction' },
  { hi: 'लोडिंग / अनलोडिंग', en: 'Loading / Unloading' },
  { hi: 'खेती / कृषि', en: 'Agriculture / Farming' },
  { hi: 'घर सफाई / हाउसकीपिंग', en: 'Housekeeping / Cleaning' },
  { hi: 'रोड / सड़क काम', en: 'Road Work' },
  { hi: 'अन्य', en: 'Other' },
];

const KARIGAR_CATEGORIES = [
  { hi: 'इलेक्ट्रीशियन', en: 'Electrician' },
  { hi: 'प्लम्बर', en: 'Plumber' },
  { hi: 'कारपेंटर / बढ़ई', en: 'Carpenter' },
  { hi: 'टाइल्स / फ्लोरिंग', en: 'Tiles / Flooring' },
  { hi: 'पेंटर', en: 'Painter' },
  { hi: 'वेल्डर', en: 'Welder' },
  { hi: 'मेसन / राज मिस्त्री', en: 'Mason' },
  { hi: 'AC / रेफ्रिजरेटर', en: 'AC / Refrigerator' },
  { hi: 'अन्य', en: 'Other' },
];

const DRIVER_VEHICLE_TYPES = [
  { hi: 'हैचबैक (Hatchback)', en: 'Hatchback' },
  { hi: 'सेडान (Sedan)', en: 'Sedan' },
  { hi: 'SUV', en: 'SUV' },
  { hi: 'ट्रैक्टर / ट्रक', en: 'Tractor / Truck' },
  { hi: 'बस', en: 'Bus' },
  { hi: 'ऑटो रिक्शा', en: 'Auto Rickshaw' },
];

const TRANSPORT_VEHICLE_TYPES = [
  { hi: 'ऑटो रिक्शा 🛺', en: 'Auto Rickshaw 🛺' },
  { hi: 'ई-रिक्शा ⚡', en: 'E-Rickshaw ⚡' },
  { hi: 'WagonR / Dzire 🚗', en: 'WagonR / Dzire 🚗' },
  { hi: 'Scorpio / Bolero 🚙', en: 'Scorpio / Bolero 🚙' },
  { hi: 'पिकअप (Pickup) 🛻', en: 'Pickup 🛻' },
  { hi: 'छोटा हाथी / Ace 🚚', en: 'Chota Hathi / Ace 🚚' },
  { hi: 'लोडर / ट्रैक्टर 🏗️', en: 'Loader / Tractor 🏗️' },
  { hi: 'बाइक / दोपहिया 🏍️', en: 'Bike / Two-Wheeler 🏍️' },
  { hi: 'ट्रक (6-10 चक्का) 🚛', en: 'Truck (6-10 Wheeler) 🚛' },
  { hi: 'मिनी बस / ट्रैवलर 🚐', en: 'Mini Bus / Traveler 🚐' },
  { hi: 'बस 🚌', en: 'Bus 🚌' },
  { hi: 'जेसीबी / हाइड्रा 🚜', en: 'JCB / Hydra 🚜' },
  { hi: 'टिपर / डम्पर 🚜', en: 'Tipper / Dumper 🚜' },
  { hi: 'अन्य वाहन 🚘', en: 'Other Vehicle 🚘' },
];

const CONTRACTOR_CATEGORIES = [
  { hi: 'RCC / सिविल काम', en: 'RCC / Civil Work' },
  { hi: 'पेंटिंग', en: 'Painting' },
  { hi: 'प्लम्बिंग', en: 'Plumbing' },
  { hi: 'इलेक्ट्रिकल', en: 'Electrical' },
  { hi: 'इंटीरियर', en: 'Interior' },
  { hi: 'अन्य', en: 'Other' },
];

// ─── Single Chip Selector ─────────────────────────────────────────────────────
function ChipSelector({
  options,
  selected,
  onSelect,
  hi,
}: {
  options: { hi: string; en: string }[];
  selected: string;
  onSelect: (val: string) => void;
  hi: boolean;
}) {
  return (
    <View style={styles.chipWrap}>
      {options.map((opt) => {
        const val = hi ? opt.hi : opt.en;
        const isSel = selected === val;
        return (
          <TouchableOpacity
            key={val}
            style={[styles.chip, isSel && styles.chipSel]}
            onPress={() => onSelect(val)}
            activeOpacity={0.75}
          >
            <Text style={[styles.chipText, isSel && styles.chipTextSel]}>{val}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── Multi-Chip Selector (Task 7) ─────────────────────────────────────────────
function MultiChipSelector({
  options,
  selected,
  onToggle,
  hi,
}: {
  options: { hi: string; en: string }[];
  selected: string[];
  onToggle: (val: string) => void;
  hi: boolean;
}) {
  return (
    <View style={styles.chipWrap}>
      {options.map((opt) => {
        const val = hi ? opt.hi : opt.en;
        const isSel = selected.includes(val);
        return (
          <TouchableOpacity
            key={val}
            style={[styles.chip, isSel && styles.chipSelMulti]}
            onPress={() => onToggle(val)}
            activeOpacity={0.75}
          >
            <Text style={[styles.chipText, isSel && styles.chipTextSelMulti]}>
              {isSel ? '✓ ' : ''}{val}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── Expandable & Scrollable Vehicle Selector (Task 9) ─────────────────────────
function ExpandableVehicleSelector({
  options,
  selected,
  onSelect,
  hi,
}: {
  options: { hi: string; en: string }[];
  selected: string;
  onSelect: (val: string) => void;
  hi: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const initialCount = 6;
  const displayedOptions = expanded ? options : options.slice(0, initialCount);

  return (
    <View style={styles.vehicleSelectorWrapper}>
      <ScrollView
        nestedScrollEnabled={true}
        style={expanded ? styles.vehicleScrollExpanded : undefined}
        contentContainerStyle={styles.chipWrap}
        showsVerticalScrollIndicator={expanded}
      >
        {displayedOptions.map((opt) => {
          const val = hi ? opt.hi : opt.en;
          const isSel = selected === val;
          return (
            <TouchableOpacity
              key={val}
              style={[styles.chip, isSel && styles.chipSel]}
              onPress={() => onSelect(val)}
              activeOpacity={0.75}
            >
              <Text style={[styles.chipText, isSel && styles.chipTextSel]}>
                {isSel ? '✓ ' : ''}{val}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {options.length > initialCount && (
        <TouchableOpacity
          style={styles.expandToggleBtn}
          onPress={() => setExpanded(!expanded)}
          activeOpacity={0.8}
        >
          <Text style={styles.expandToggleBtnText}>
            {expanded
              ? (hi ? '➖ कम गाड़ियां देखें (Show Less)' : '➖ Show Less')
              : (hi ? `➕ और गाड़ियां देखें (+${options.length - initialCount} और विकल्प)` : `➕ Show More (+${options.length - initialCount})`)}
          </Text>
        </TouchableOpacity>
      )}
    </View>
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

// ─── Main Component ──────────────────────────────────────────────────────────
export default function DynamicProfileScreen({ navigation, route }: any) {
  const { lang } = useLanguage();
  const hi = lang === 'hi';

  const { roles = [], name: prefill = '' } = route.params || {};
  // Normalize all roles to uppercase for consistent checking
  const normalizedRoles: string[] = (roles as string[]).map((r: string) => r.toUpperCase());
  // Convenience flags — show a section if ANY selected role needs it
  const hasLabour    = normalizedRoles.includes('LABOUR');
  const hasKarigar   = normalizedRoles.includes('KARIGAR');
  const hasDriver    = normalizedRoles.includes('DRIVER');
  const hasTransport = normalizedRoles.includes('TRANSPORT');
  const hasContractor = normalizedRoles.includes('CONTRACTOR');
  const isOnlyCustomer = normalizedRoles.length === 1 && normalizedRoles.includes('CUSTOMER');

  // ── Common ──────────────────────────────────────────────────────────────────
  const [fullName, setFullName] = useState(prefill);
  const [age, setAge] = useState('');
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);

  // ── Labour / Karigar (Multi-Select) ─────────────────────────────────────────
  const [workCategories, setWorkCategories] = useState<string[]>([]);
  const [experience, setExperience] = useState('');
  const [expectedWage, setExpectedWage] = useState('');

  // ── Driver (Multi-Select vehicles driven) ───────────────────────────────────
  const [driverVehicleTypes, setDriverVehicleTypes] = useState<string[]>([]);
  const [licenseNo, setLicenseNo] = useState('');
  const [driverType, setDriverType] = useState<'commercial' | 'personal' | ''>('');

  // ── Transport (Vehicle Owner) ───────────────────────────────────────────────
  const [transportVehicleType, setTransportVehicleType] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [perKmRate, setPerKmRate] = useState('15');
  const [usePassenger, setUsePassenger] = useState(true);
  const [useGoods, setUseGoods] = useState(false);
  const [useDelivery, setUseDelivery] = useState(false);

  // ── Contractor (Multi-Select) ───────────────────────────────────────────────
  const [businessName, setBusinessName] = useState('');
  const [contractorCategories, setContractorCategories] = useState<string[]>([]);
  const [teamSize, setTeamSize] = useState('');

  // Toggle handlers for multi-select
  const toggleWorkCategory = (cat: string) => {
    setWorkCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const toggleDriverVehicleType = (v: string) => {
    setDriverVehicleTypes(prev =>
      prev.includes(v) ? prev.filter(item => item !== v) : [...prev, v]
    );
  };

  const toggleContractorCategory = (c: string) => {
    setContractorCategories(prev =>
      prev.includes(c) ? prev.filter(item => item !== c) : [...prev, c]
    );
  };

  const handlePickPhoto = async () => {
    if (Platform.OS === 'web') {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      if (!result.canceled && result.assets.length > 0) {
        setProfilePhoto(result.assets[0].uri);
      }
      return;
    }
    Alert.alert(
      hi ? 'फोटो चुनें' : 'Choose Photo',
      hi ? 'फोटो कहाँ से लें?' : 'Pick from where?',
      [
        { text: hi ? 'रद्द करें' : 'Cancel', style: 'cancel' },
        {
          text: hi ? 'कैमरा' : 'Camera',
          onPress: async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') { Alert.alert('', 'Camera permission denied.'); return; }
            const result = await ImagePicker.launchCameraAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true, aspect: [1, 1], quality: 0.7,
            });
            if (!result.canceled && result.assets.length > 0) setProfilePhoto(result.assets[0].uri);
          },
        },
        {
          text: hi ? 'गैलरी' : 'Gallery',
          onPress: async () => {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') { Alert.alert('', 'Gallery permission denied.'); return; }
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true, aspect: [1, 1], quality: 0.7,
            });
            if (!result.canceled && result.assets.length > 0) setProfilePhoto(result.assets[0].uri);
          },
        },
      ]
    );
  };

  const handleNext = () => {
    if (!fullName.trim()) {
      Alert.alert('', hi ? 'कृपया अपना नाम दर्ज करें।' : 'Please enter your name.');
      return;
    }

    // ── Validation for provider roles ─────────────────────────────────────────
    if (hasLabour && workCategories.length === 0) {
      Alert.alert('', hi ? 'कृपया कम से कम एक मजदूरी कार्य श्रेणी चुनें।' : 'Please select at least one labour work category.');
      return;
    }
    if (hasKarigar && workCategories.length === 0) {
      Alert.alert('', hi ? 'कृपया कम से कम एक कारीगरी विशेषज्ञता चुनें।' : 'Please select at least one karigar specialization.');
      return;
    }
    if (hasDriver && driverVehicleTypes.length === 0) {
      Alert.alert('', hi ? 'कृपया चलाई जाने वाली कम से कम एक गाड़ी का प्रकार चुनें।' : 'Please select at least one vehicle type you drive.');
      return;
    }
    if (hasDriver && !licenseNo.trim()) {
      Alert.alert('', hi ? 'कृपया अपना ड्राइविंग लाइसेंस नंबर दर्ज करें।' : 'Driving License Number is required for Driver role.');
      return;
    }
    if (hasTransport && !transportVehicleType) {
      Alert.alert('', hi ? 'कृपया अपनी गाड़ी का प्रकार चुनें।' : 'Please select your vehicle type.');
      return;
    }
    if (hasTransport && !vehicleNumber.trim()) {
      Alert.alert('', hi ? 'कृपया गाड़ी का नंबर दर्ज करें।' : 'Vehicle Registration Number is required.');
      return;
    }
    if (hasContractor && contractorCategories.length === 0) {
      Alert.alert('', hi ? 'कृपया कम से कम एक ठेकेदारी कार्य श्रेणी चुनें।' : 'Please select at least one contractor work category.');
      return;
    }
    // ─────────────────────────────────────────────────────────────────────────

    const profileData = {
      fullName,
      age,
      profilePhoto,
      workCategory: workCategories[0] || '',
      workCategories,
      sub_categories: workCategories,
      experience,
      expectedWage,
      vehicleType: driverVehicleTypes[0] || '',
      driverVehicleTypes,
      licenseNo,
      driverType,
      transportVehicleType,
      vehicleNumber,
      perKmRate,
      usePassenger,
      useGoods,
      useDelivery,
      businessName,
      contractorCategory: contractorCategories[0] || '',
      contractorCategories,
      teamSize,
    };
    navigation.navigate('LocationSetupScreen', { roles, profileData, ...route.params });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={G.white} />
      <SignupProgressBar currentStep={3} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
        {/* Back */}
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Text style={styles.backText}>← {hi ? 'वापस' : 'Back'}</Text>
        </TouchableOpacity>

        <Text style={styles.title}>{hi ? '👤 व्यक्तिगत एवं व्यावसायिक जानकारी' : '👤 Profile Details'}</Text>
        <Text style={styles.subtitle}>
          {hi
            ? `चुनी गई भूमिकाएं: ${normalizedRoles.join(' + ')}`
            : `Selected Roles: ${normalizedRoles.join(' + ')}`}
        </Text>

        {/* ── Profile Photo ── */}
        <View style={styles.photoSection}>
          <TouchableOpacity style={styles.photoBtn} onPress={handlePickPhoto} activeOpacity={0.8}>
            {profilePhoto ? (
              <Image source={{ uri: profilePhoto }} style={styles.photoImg} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Text style={styles.photoIcon}>📷</Text>
                <Text style={styles.photoHint}>
                  {hi ? 'प्रोफाइल फोटो जोड़ें' : 'Add Profile Photo'}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Common Fields ── */}
        <SectionHeader icon="📝" title={hi ? 'बेसिक जानकारी' : 'Basic Details'} />

        <TextInput
          label={hi ? 'पूरा नाम *' : 'Full Name *'}
          value={fullName}
          onChangeText={setFullName}
          mode="outlined"
          activeOutlineColor={G.primary}
          style={styles.input}
          autoCapitalize="words"
        />

        <TextInput
          label={hi ? 'उम्र (वर्षों में)' : 'Age (years)'}
          value={age}
          onChangeText={setAge}
          mode="outlined"
          activeOutlineColor={G.primary}
          style={styles.input}
          keyboardType="number-pad"
        />


        {/* ── Customer-Only Banner ── */}
        {isOnlyCustomer && (
          <View style={styles.customerOnlyBanner}>
            <Text style={styles.customerOnlyIcon}>✅</Text>
            <Text style={styles.customerOnlyText}>
              {hi
                ? 'ग्राहक के रूप में आपको कोई अतिरिक्त जानकारी नहीं भरनी है।'
                : 'As a Customer, no additional details are required.'}
            </Text>
          </View>
        )}

        {/* ════════════════════════════════════════════
          LABOUR — Dynamic Fields
        ═══════════════════════════════════════════════ */}
        {/* ════════════════════════════════════════════
          LABOUR — Dynamic Fields
        ═══════════════════════════════════════════════ */}
        {hasLabour && (
          <>
            <SectionHeader icon="👷" title={hi ? 'मजदूरी कार्य की जानकारी' : 'Labour Details'} />
            <Text style={styles.fieldLabel}>
              {hi ? 'कार्य श्रेणी चुनें (एक से अधिक चुन सकते हैं) *' : 'Select Work Categories (Multi-select) *'}
            </Text>
            <MultiChipSelector
              options={LABOUR_CATEGORIES}
              selected={workCategories}
              onToggle={toggleWorkCategory}
              hi={hi}
            />
            <TextInput
              label={hi ? 'अनुभव (वर्षों में)' : 'Experience (in years)'}
              value={experience}
              onChangeText={setExperience}
              mode="outlined"
              activeOutlineColor={G.primary}
              style={styles.input}
              keyboardType="number-pad"
            />
            <TextInput
              label={hi ? 'अपेक्षित दैनिक मजदूरी (₹)' : 'Expected Daily Wage (₹)'}
              value={expectedWage}
              onChangeText={setExpectedWage}
              mode="outlined"
              activeOutlineColor={G.primary}
              style={styles.input}
              keyboardType="number-pad"
              left={<TextInput.Affix text="₹ " />}
            />
          </>
        )}

        {/* ════════════════════════════════════════════
          KARIGAR — Dynamic Fields
        ═══════════════════════════════════════════════ */}
        {hasKarigar && (
          <>
            <SectionHeader icon="🛠️" title={hi ? 'कारीगरी की जानकारी' : 'Karigar Details'} />
            <Text style={styles.fieldLabel}>
              {hi ? 'विशेषज्ञता चुनें (एक से अधिक चुन सकते हैं) *' : 'Select Specializations (Multi-select) *'}
            </Text>
            <MultiChipSelector
              options={KARIGAR_CATEGORIES}
              selected={workCategories}
              onToggle={toggleWorkCategory}
              hi={hi}
            />
            <TextInput
              label={hi ? 'अनुभव (वर्षों में)' : 'Experience (in years)'}
              value={experience}
              onChangeText={setExperience}
              mode="outlined"
              activeOutlineColor={G.primary}
              style={styles.input}
              keyboardType="number-pad"
            />
            <TextInput
              label={hi ? 'अपेक्षित दर (₹/दिन)' : 'Expected Rate (₹/day)'}
              value={expectedWage}
              onChangeText={setExpectedWage}
              mode="outlined"
              activeOutlineColor={G.primary}
              style={styles.input}
              keyboardType="number-pad"
              left={<TextInput.Affix text="₹ " />}
            />
          </>
        )}

        {/* ════════════════════════════════════════════
          DRIVER — Dynamic Fields (Personal / Commercial)
        ═══════════════════════════════════════════════ */}
        {hasDriver && (
          <>
            <SectionHeader icon="🚗" title={hi ? 'व्यक्तिगत चालक विवरण' : 'Driver Details'} />

            <Text style={styles.fieldLabel}>
              {hi ? 'ड्राइविंग का प्रकार' : 'Employment Type'}
            </Text>
            <View style={styles.toggleRow}>
              {[
                { val: 'commercial', hi: '🏢 कमर्शियल', en: '🏢 Commercial' },
                { val: 'personal',   hi: '🏠 पर्सनल',    en: '🏠 Personal'    },
              ].map((opt) => {
                const sel = driverType === opt.val;
                return (
                  <TouchableOpacity
                    key={opt.val}
                    style={[styles.toggleBtn, sel && styles.toggleBtnSel]}
                    onPress={() => setDriverType(opt.val as 'commercial' | 'personal')}
                  >
                    <Text style={[styles.toggleBtnText, sel && styles.toggleBtnTextSel]}>
                      {hi ? opt.hi : opt.en}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.fieldLabel}>
              {hi ? 'चलाई जाने वाली गाड़ियों के प्रकार (एक या अधिक चुनें) *' : 'Vehicle Types Driven (Multi-select) *'}
            </Text>
            <MultiChipSelector
              options={DRIVER_VEHICLE_TYPES}
              selected={driverVehicleTypes}
              onToggle={toggleDriverVehicleType}
              hi={hi}
            />

            <TextInput
              label={hi ? 'ड्राइविंग लाइसेंस नंबर' : 'Driving License Number'}
              value={licenseNo}
              onChangeText={setLicenseNo}
              mode="outlined"
              activeOutlineColor={G.primary}
              style={styles.input}
              autoCapitalize="characters"
            />
          </>
        )}

        {/* ════════════════════════════════════════════
          TRANSPORT — Dynamic Fields (Vehicle Owner / Commercial Parivahan)
        ═══════════════════════════════════════════════ */}
        {hasTransport && (
          <>
            <SectionHeader icon="🚛" title={hi ? 'वाहन एवं परिवहन विवरण' : 'Vehicle & Transport Details'} />

            <Text style={styles.fieldLabel}>
              {hi ? 'अपनी गाड़ी का प्रकार चुनें *' : 'Select Vehicle Type *'}
            </Text>
            <ExpandableVehicleSelector
              options={TRANSPORT_VEHICLE_TYPES}
              selected={transportVehicleType}
              onSelect={setTransportVehicleType}
              hi={hi}
            />

            <TextInput
              label={hi ? 'गाड़ी का नंबर * (उदा. UP65-AB-1234)' : 'Vehicle Registration No. *'}
              value={vehicleNumber}
              onChangeText={setVehicleNumber}
              mode="outlined"
              activeOutlineColor={G.purple}
              style={styles.input}
              autoCapitalize="characters"
            />

            <TextInput
              label={hi ? 'प्रति किलोमीटर दर (₹/KM) *' : 'Per KM Rate (₹/KM) *'}
              value={perKmRate}
              onChangeText={setPerKmRate}
              mode="outlined"
              activeOutlineColor={G.purple}
              style={styles.input}
              keyboardType="number-pad"
              left={<TextInput.Affix text="₹ " />}
            />

            <TextInput
              label={hi ? 'ड्राइविंग लाइसेंस (DL) नंबर' : 'Driving License (DL) Number'}
              value={licenseNo}
              onChangeText={setLicenseNo}
              mode="outlined"
              activeOutlineColor={G.purple}
              style={styles.input}
              autoCapitalize="characters"
            />

            <Text style={styles.fieldLabel}>
              {hi ? 'गाड़ी का उपयोग (एक या अधिक चुनें):' : 'Vehicle Service Types:'}
            </Text>
            <View style={styles.usageRow}>
              <TouchableOpacity
                style={[styles.usageChip, usePassenger && styles.usageChipActive]}
                onPress={() => setUsePassenger(!usePassenger)}
                activeOpacity={0.8}
              >
                <Text style={[styles.usageText, usePassenger && styles.usageTextActive]}>
                  {usePassenger ? '✓ ' : ''}👨‍👩‍👦 {hi ? 'सवारी (Passenger)' : 'Passenger'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.usageChip, useGoods && styles.usageChipActive]}
                onPress={() => setUseGoods(!useGoods)}
                activeOpacity={0.8}
              >
                <Text style={[styles.usageText, useGoods && styles.usageTextActive]}>
                  {useGoods ? '✓ ' : ''}📦 {hi ? 'माल ढुलाई (Goods)' : 'Goods / Logistics'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.usageChip, useDelivery && styles.usageChipActive]}
                onPress={() => setUseDelivery(!useDelivery)}
                activeOpacity={0.8}
              >
                <Text style={[styles.usageText, useDelivery && styles.usageTextActive]}>
                  {useDelivery ? '✓ ' : ''}🛵 {hi ? 'पार्सल डिलीवरी' : 'Parcel Delivery'}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* ════════════════════════════════════════════
          CONTRACTOR — Dynamic Fields
        ═══════════════════════════════════════════════ */}
        {hasContractor && (
          <>
            <SectionHeader icon="🏗️" title={hi ? 'ठेकेदार की जानकारी' : 'Contractor Details'} />
            <TextInput
              label={hi ? 'व्यापार का नाम (Business Name)' : 'Business Name'}
              value={businessName}
              onChangeText={setBusinessName}
              mode="outlined"
              activeOutlineColor={G.primary}
              style={styles.input}
              autoCapitalize="words"
            />
            <Text style={styles.fieldLabel}>
              {hi ? 'काम का प्रकार चुनें (एक या अधिक चुन सकते हैं) *' : 'Work Categories (Multi-select) *'}
            </Text>
            <MultiChipSelector
              options={CONTRACTOR_CATEGORIES}
              selected={contractorCategories}
              onToggle={toggleContractorCategory}
              hi={hi}
            />
            <TextInput
              label={hi ? 'टीम की संख्या (Team Size)' : 'Team Size (No. of workers)'}
              value={teamSize}
              onChangeText={setTeamSize}
              mode="outlined"
              activeOutlineColor={G.primary}
              style={styles.input}
              keyboardType="number-pad"
            />
          </>
        )}

        {/* Spacer */}
        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.btn} onPress={handleNext} activeOpacity={0.85}>
          <Text style={styles.btnText}>{hi ? 'आगे बढ़ें →' : 'Continue →'}</Text>
        </TouchableOpacity>
      </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: G.white },
  scroll: { flex: 1, backgroundColor: G.bg },
  scrollContent: { padding: 20, paddingBottom: 160 },

  back: { marginBottom: 16 },
  backText: { color: G.primary, fontSize: 15, fontWeight: '600' },
  title: { fontSize: 22, fontWeight: '800', color: G.text, marginBottom: 4 },
  subtitle: { fontSize: 13, color: G.sub, marginBottom: 20 },

  // Photo
  photoSection: { alignItems: 'center', marginBottom: 24 },
  photoBtn: { alignItems: 'center' },
  photoImg: { width: 96, height: 96, borderRadius: 48, borderWidth: 3, borderColor: G.primary },
  photoPlaceholder: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: '#FFF3E8',
    borderWidth: 2, borderColor: G.primary,
    alignItems: 'center', justifyContent: 'center',
    borderStyle: 'dashed',
  },
  photoIcon: { fontSize: 28 },
  photoHint: { fontSize: 10, color: G.primary, marginTop: 4, textAlign: 'center' },

  // Section Header
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginTop: 20, marginBottom: 12 },
  sectionIcon: { fontSize: 18, marginRight: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: G.text },

  // Input
  input: { backgroundColor: G.white, marginBottom: 14 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: G.text, marginBottom: 8 },

  // Customer-Only Banner
  customerOnlyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FFF4',
    borderWidth: 1.5,
    borderColor: '#C6F6D5',
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
    marginBottom: 8,
    gap: 10,
  },
  customerOnlyIcon: { fontSize: 20 },
  customerOnlyText: { flex: 1, fontSize: 13, color: '#276749', fontWeight: '600', lineHeight: 18 },


  // Chips
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1.5, borderColor: G.border,
    backgroundColor: G.white,
  },
  chipSel: { borderColor: G.purple, backgroundColor: '#EDE7F6' },
  chipSelMulti: { borderColor: G.primary, backgroundColor: '#FFF3E8' },
  chipText: { fontSize: 12, color: G.sub, fontWeight: '600' },
  chipTextSel: { color: G.purple, fontWeight: '700' },
  chipTextSelMulti: { color: G.primary, fontWeight: '700' },

  // Vehicle Expandable & Scrollable Container
  vehicleSelectorWrapper: { marginBottom: 16 },
  vehicleScrollExpanded: {
    maxHeight: 220,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 10,
    backgroundColor: '#FAFAFA',
  },
  expandToggleBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignSelf: 'flex-start',
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  expandToggleBtnText: { fontSize: 12, color: '#374151', fontWeight: '700' },

  // Usage Row
  usageRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  usageChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: G.border,
    backgroundColor: G.white,
  },
  usageChipActive: {
    borderColor: G.purple,
    backgroundColor: '#EDE7F6',
  },
  usageText: { fontSize: 13, color: G.sub, fontWeight: '600' },
  usageTextActive: { color: G.purple, fontWeight: '800' },

  // Toggle
  toggleRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  toggleBtn: {
    flex: 1, height: 50, borderWidth: 1.5, borderColor: G.border,
    borderRadius: 10, alignItems: 'center', justifyContent: 'center',
  },
  toggleBtnSel: { borderColor: G.primary, backgroundColor: '#FFF3E8' },
  toggleBtnText: { fontSize: 14, color: G.sub, fontWeight: '600' },
  toggleBtnTextSel: { color: G.primary, fontWeight: '700' },

  // Footer
  footer: {
    backgroundColor: G.white,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  btn: {
    backgroundColor: G.primary,
    borderRadius: 14, paddingVertical: 15,
    alignItems: 'center',
    shadowColor: G.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '800', letterSpacing: 0.3 },
});
