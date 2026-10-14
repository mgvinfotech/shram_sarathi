import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  FlatList,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store';
import { updateRole, addUserRole, completeProfile } from '../store/slices/authSlice';
import { useLanguage } from '../i18n/LanguageContext';
import { api } from '../services/api';
import { STATES_AND_DISTRICTS } from '../utils/locations';

export interface RoleOption {
  id: string;
  roleKey: string;
  icon: string;
  titleHi: string;
  titleEn: string;
  descHi: string;
  descEn: string;
  badgeColor: string;
  badgeBg: string;
}

export const ROLE_OPTIONS: RoleOption[] = [
  {
    id: 'customer',
    roleKey: 'customer',
    icon: '🏠',
    titleHi: 'ग्राहक (Customer Mode)',
    titleEn: 'Customer Mode',
    descHi: 'काम करवाने के लिए — मजदूर, कारीगर, ड्राइवर या गाड़ी बुक करें',
    descEn: 'Hire workers, book karigars, drivers or transport',
    badgeColor: '#1565C0',
    badgeBg: '#E3F2FD',
  },
  {
    id: 'labour',
    roleKey: 'labour',
    icon: '👷',
    titleHi: 'दैनिक मजदूर (Labour Mode)',
    titleEn: 'Labour Worker Mode',
    descHi: 'दैनिक मजदूरी काम के लिए — निर्माण, लोडिंग, खेत मजदूरी',
    descEn: 'Daily wage worker — Construction, loading, farm work',
    badgeColor: '#2E7D32',
    badgeBg: '#E8F5E9',
  },
  {
    id: 'karigar',
    roleKey: 'karigar',
    icon: '🛠️',
    titleHi: 'कारीगर / मिस्त्री (Karigar Mode)',
    titleEn: 'Karigar / Skilled Worker Mode',
    descHi: 'कुशल काम — इलेक्ट्रीशियन, प्लम्बर, बढ़ई, टाइल्स, राजमिस्त्री',
    descEn: 'Skilled trades — Electrician, Plumber, Carpenter, Mason',
    badgeColor: '#E65100',
    badgeBg: '#FFF3E0',
  },
  {
    id: 'driver',
    roleKey: 'driver',
    icon: '🚗',
    titleHi: 'चालक / ड्राइवर (Driver Mode)',
    titleEn: 'Driver Mode',
    descHi: 'गाड़ी चलाने के लिए — पर्सनल या कमर्शियल वाहन ड्राइवर',
    descEn: 'Personal or commercial trip/salary driver',
    badgeColor: '#7B1FA2',
    badgeBg: '#F3E5F5',
  },
  {
    id: 'transport',
    roleKey: 'transport',
    icon: '🚛',
    titleHi: 'वाहन मालिक / परिवहन (Vehicle & Transport)',
    titleEn: 'Vehicle Owner / Transport Mode',
    descHi: 'टैक्सी, ऑटो, लोडर या गाड़ी से सवारी/माल ढुलाई करें',
    descEn: 'Taxi, Auto, Loader or vehicle for rides & logistics',
    badgeColor: '#00838F',
    badgeBg: '#E0F7FA',
  },
  {
    id: 'contractor',
    roleKey: 'contractor',
    icon: '🏗️',
    titleHi: 'ठेकेदार (Contractor Mode)',
    titleEn: 'Contractor Mode',
    descHi: 'प्रोजेक्ट और लेबर सप्लाई — टीम के साथ ठेके पर काम करें',
    descEn: 'Contract works & labour supply projects',
    badgeColor: '#C2185B',
    badgeBg: '#FCE4EC',
  },
  {
    id: 'agent',
    roleKey: 'agent',
    icon: '💼',
    titleHi: 'एजेंट / पार्टनर (Agent Mode)',
    titleEn: 'Agent / Partner Mode',
    descHi: 'रेफरल और कमीशन — नए कामगार/गाड़ियां जोड़ें और कमाएं',
    descEn: 'Referral & commission — Add workers/vehicles, earn commission',
    badgeColor: '#3949AB',
    badgeBg: '#E8EAF6',
  },
];

// Role-specific configuration options
const LABOUR_WORK_TYPES = [
  { id: 'construction', hi: 'निर्माण / कंस्ट्रक्शन', en: 'Construction' },
  { id: 'loading_unloading', hi: 'लोडिंग / अनलोडिंग', en: 'Loading / Unloading' },
  { id: 'agriculture', hi: 'खेती / कृषि मजदूरी', en: 'Agriculture / Farm' },
  { id: 'cleaning', hi: 'सफाई / हाउसकीपिंग', en: 'Cleaning' },
  { id: 'digging', hi: 'खुदाई / गड्ढा काम', en: 'Digging' },
  { id: 'general_labor', hi: 'सामान्य मजदूरी', en: 'General Labor' },
  { id: 'other', hi: 'अन्य मजदूरी', en: 'Other Labor' },
];

const KARIGAR_WORK_TYPES = [
  { id: 'electrician', hi: '⚡ इलेक्ट्रीशियन', en: 'Electrician' },
  { id: 'plumber', hi: '🚰 प्लम्बर', en: 'Plumber' },
  { id: 'carpenter', hi: '🪚 बढ़ई / कारपेंटर', en: 'Carpenter' },
  { id: 'painter', hi: '🎨 पेंटर', en: 'Painter' },
  { id: 'mason', hi: '🧱 राजमिस्त्री / मेसन', en: 'Mason' },
  { id: 'tile_work', hi: '◻️ टाइल काम', en: 'Tile Work' },
  { id: 'welder', hi: '🔥 वेल्डर', en: 'Welder' },
  { id: 'ac_mechanic', hi: '❄️ AC / फ्रिज मैकेनिक', en: 'AC Mechanic' },
  { id: 'other', hi: '🛠️ अन्य कुशल काम', en: 'Other' },
];

const DRIVER_VEHICLES = [
  { id: 'car', hi: 'कार / हैचबैक / सेडान', en: 'Car / Sedan' },
  { id: 'suv', hi: 'SUV (Scorpio, Bolero)', en: 'SUV' },
  { id: 'auto', hi: 'ऑटो रिक्शा', en: 'Auto Rickshaw' },
  { id: 'bus', hi: 'बस / वैन / मिनीबस', en: 'Bus / Van' },
  { id: 'truck', hi: 'ट्रक / लोडर / ट्रैक्टर', en: 'Truck / Loader' },
];

const TRANSPORT_VEHICLES = [
  { id: 'auto', hi: 'ऑटो रिक्शा 🛺', en: 'Auto Rickshaw 🛺' },
  { id: 'erickshaw', hi: 'ई-रिक्शा ⚡', en: 'E-Rickshaw ⚡' },
  { id: 'taxi', hi: 'कार / टैक्सी 🚗', en: 'Car / Taxi 🚗' },
  { id: 'suv', hi: 'Scorpio / Bolero 🚙', en: 'Scorpio / Bolero 🚙' },
  { id: 'pickup', hi: 'पिकअप 🛻', en: 'Pickup 🛻' },
  { id: 'chota_hathi', hi: 'छोटा हाथी / Ace 🚚', en: 'Chota Hathi 🚚' },
  { id: 'loader', hi: 'लोडर / ट्रैक्टर 🏗️', en: 'Loader / Tractor 🏗️' },
  { id: 'bike', hi: 'डिलीवरी बाइक 🏍️', en: 'Delivery Bike 🏍️' },
  { id: 'truck', hi: 'ट्रक (6-10 चक्का) 🚛', en: 'Truck 🚛' },
  { id: 'minibus', hi: 'मिनी बस / ट्रैवलर 🚐', en: 'Mini Bus 🚐' },
  { id: 'bus', hi: 'बस 🚌', en: 'Bus 🚌' },
  { id: 'jcb', hi: 'जेसीबी / हाइड्रा 🚜', en: 'JCB / Hydra 🚜' },
  { id: 'other', hi: 'अन्य वाहन 🚘', en: 'Other Vehicle 🚘' },
];

const CONTRACTOR_TYPES = [
  { id: 'civil', hi: 'भवन / सिविल निर्माण', en: 'Building / Civil' },
  { id: 'labor_supply', hi: 'मजदूर सप्लायर', en: 'Labor Supply' },
  { id: 'painting', hi: 'पेंटिंग ठेकेदार', en: 'Painting' },
  { id: 'electrical', hi: 'इलेक्ट्रिकल वर्क', en: 'Electrical' },
  { id: 'plumbing', hi: 'प्लम्बिंग प्रोजेक्ट्स', en: 'Plumbing' },
  { id: 'road', hi: 'सड़क ठेकेदार', en: 'Road Contractor' },
];

const LABOUR_WAGE_CHIPS = ['400', '500', '600', '700', '800'];
const KARIGAR_WAGE_CHIPS = ['600', '700', '800', '1000', '1200'];
const EXPERIENCE_CHIPS = ['< 1 वर्ष', '1-2 वर्ष', '3-5 वर्ष', '5+ वर्ष'];

interface Props {
  visible: boolean;
  onClose: () => void;
  navigation?: any;
}

export default function RoleSwitchModal({ visible, onClose, navigation }: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const currentRole = useSelector((s: RootState) => s.auth.role);
  const selectedRoles = useSelector((s: RootState) => s.auth.selectedRoles);
  const { lang } = useLanguage();
  const hi = lang === 'hi';

  const [switchingTo, setSwitchingTo] = useState<string | null>(null);
  const [addingRoleKey, setAddingRoleKey] = useState<string | null>(null);

  // ── Setup Form State ────────────────────────────────────────────────────────
  const [setupRole, setSetupRole] = useState<RoleOption | null>(null);
  const [setupSkills, setSetupSkills] = useState<string[]>([]);
  const [setupWage, setSetupWage] = useState('500');
  const [setupExperience, setSetupExperience] = useState('1-2 वर्ष');
  const [setupVehicleType, setSetupVehicleType] = useState('');
  const [setupDlNumber, setSetupDlNumber] = useState('');
  const [setupDriverType, setSetupDriverType] = useState<'commercial' | 'personal'>('commercial');
  const [setupVehicleNumber, setSetupVehicleNumber] = useState('');
  const [setupPerKmRate, setSetupPerKmRate] = useState('15');
  const [setupUsePassenger, setSetupUsePassenger] = useState(true);
  const [setupUseGoods, setSetupUseGoods] = useState(false);
  const [setupUseDelivery, setSetupUseDelivery] = useState(false);
  const [setupFirmName, setSetupFirmName] = useState('');
  const [setupTeamSize, setSetupTeamSize] = useState('5');
  const [setupContractorCategory, setSetupContractorCategory] = useState('भवन / सिविल निर्माण');

  // Location selection
  const [setupState, setSetupState] = useState('Madhya Pradesh');
  const [setupDistrict, setSetupDistrict] = useState('');
  const [showStateModal, setShowStateModal] = useState(false);
  const [showDistrictModal, setShowDistrictModal] = useState(false);
  const [isSubmittingSetup, setIsSubmittingSetup] = useState(false);
  const [expandTransportInModal, setExpandTransportInModal] = useState(false);

  const normalizeRole = (r?: string | null) => {
    if (!r) return 'customer';
    const lower = r.toLowerCase();
    if (lower === 'provider') return 'labour';
    return lower;
  };

  const activeNormalizedRole = normalizeRole(currentRole);

  const userAllowedKeys = (selectedRoles && selectedRoles.length > 0)
    ? selectedRoles.map(r => normalizeRole(r))
    : [activeNormalizedRole, 'customer'];

  if (!userAllowedKeys.includes(activeNormalizedRole)) {
    userAllowedKeys.push(activeNormalizedRole);
  }
  if (!userAllowedKeys.includes('customer')) {
    userAllowedKeys.push('customer');
  }

  const registeredOptions = ROLE_OPTIONS.filter(opt => userAllowedKeys.includes(opt.roleKey));
  const unregisteredOptions = ROLE_OPTIONS.filter(opt => !userAllowedKeys.includes(opt.roleKey));

  // Initialize setup form for a chosen role
  const startRoleSetup = (targetOption: RoleOption) => {
    setSetupRole(targetOption);
    if (targetOption.roleKey === 'labour') {
      setSetupSkills(['construction']);
      setSetupWage('500');
      setSetupExperience('1-2 वर्ष');
    } else if (targetOption.roleKey === 'karigar') {
      setSetupSkills(['electrician']);
      setSetupWage('800');
      setSetupExperience('2-3 वर्ष');
    } else if (targetOption.roleKey === 'driver') {
      setSetupVehicleType('कार / हैचबैक / सेडान');
      setSetupDlNumber('');
      setSetupDriverType('commercial');
      setSetupExperience('2-3 वर्ष');
    } else if (targetOption.roleKey === 'transport') {
      setSetupVehicleType('ऑटो रिक्शा 🛺');
      setSetupVehicleNumber('');
      setSetupPerKmRate('15');
      setSetupUsePassenger(true);
      setSetupUseGoods(false);
      setSetupUseDelivery(false);
      setSetupExperience('2-3 वर्ष');
    } else if (targetOption.roleKey === 'contractor') {
      setSetupFirmName('');
      setSetupTeamSize('5');
      setSetupContractorCategory('भवन / सिविल निर्माण');
      setSetupExperience('3-5 वर्ष');
    }
  };

  const toggleSkill = (id: string) => {
    setSetupSkills(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const handleSelectRole = async (targetOption: RoleOption) => {
    if (activeNormalizedRole === targetOption.roleKey) {
      onClose();
      return;
    }

    setSwitchingTo(targetOption.roleKey);
    try {
      const resultAction = await dispatch(updateRole(targetOption.roleKey));
      if (updateRole.fulfilled.match(resultAction)) {
        const roleTitle = hi ? targetOption.titleHi : targetOption.titleEn;
        onClose();
        Alert.alert(
          hi ? '🎉 भूमिका बदली गई!' : '🎉 Role Switched!',
          hi
            ? `आपका अकाउंट अब "${roleTitle}" में बदल गया है।`
            : `Your account is now active in "${roleTitle}".`
        );
      } else {
        const errorMsg = (resultAction.payload as string) || 'Failed to switch role';
        Alert.alert(hi ? 'त्रुटि' : 'Error', errorMsg);
      }
    } catch (e: any) {
      Alert.alert(hi ? 'त्रुटि' : 'Error', e?.message || 'Failed to switch role');
    } finally {
      setSwitchingTo(null);
    }
  };

  // When clicking "+ साइन अप" on an unregistered role
  const handleAddNewRole = async (targetOption: RoleOption) => {
    // Non-provider roles (customer, agent) can be activated immediately
    if (['customer', 'agent'].includes(targetOption.roleKey)) {
      setAddingRoleKey(targetOption.roleKey);
      try {
        await dispatch(addUserRole(targetOption.roleKey));
        await dispatch(updateRole(targetOption.roleKey));
        onClose();
        Alert.alert(
          hi ? '🎉 भूमिका सक्रिय!' : '🎉 Role Activated!',
          hi ? `आपका खाता अब "${targetOption.titleHi}" में सक्रिय हो गया है।` : `Activated "${targetOption.titleEn}".`
        );
      } catch (err: any) {
        Alert.alert(hi ? 'त्रुटि' : 'Error', err?.message || 'Failed');
      } finally {
        setAddingRoleKey(null);
      }
      return;
    }

    // Provider roles: open the role-specific details form!
    startRoleSetup(targetOption);
  };

  // Submit the role setup details
  const handleSaveRoleSetup = async () => {
    if (!setupRole) return;
    const roleKey = setupRole.roleKey;

    // ── Validations ──
    if (roleKey === 'labour' || roleKey === 'karigar') {
      if (setupSkills.length === 0) {
        Alert.alert(hi ? 'जानकारी अधूरी है' : 'Incomplete', hi ? 'कृपया कम से कम एक काम का प्रकार या हुनर चुनें।' : 'Please select at least one skill.');
        return;
      }
      if (!setupWage || isNaN(Number(setupWage)) || Number(setupWage) <= 0) {
        Alert.alert(hi ? 'जानकारी अधूरी है' : 'Incomplete', hi ? 'कृपया अपनी अपेक्षित दैनिक दिहाड़ी (₹) दर्ज करें।' : 'Please enter expected daily wage.');
        return;
      }
    } else if (roleKey === 'driver') {
      if (!setupVehicleType) {
        Alert.alert(hi ? 'जानकारी अधूरी है' : 'Incomplete', hi ? 'कृपया वाहन का प्रकार चुनें।' : 'Please select vehicle type.');
        return;
      }
      if (!setupDlNumber.trim()) {
        Alert.alert(hi ? 'जानकारी अधूरी है' : 'Incomplete', hi ? 'कृपया ड्राइविंग लाइसेंस (DL) नंबर दर्ज करें।' : 'Please enter driving license number.');
        return;
      }
    } else if (roleKey === 'transport') {
      if (!setupVehicleType) {
        Alert.alert(hi ? 'जानकारी अधूरी है' : 'Incomplete', hi ? 'कृपया गाड़ी का प्रकार चुनें।' : 'Please select vehicle type.');
        return;
      }
      if (!setupVehicleNumber.trim()) {
        Alert.alert(hi ? 'जानकारी अधूरी है' : 'Incomplete', hi ? 'कृपया अपनी गाड़ी का नंबर दर्ज करें।' : 'Please enter vehicle registration number.');
        return;
      }
      if (!setupUsePassenger && !setupUseGoods && !setupUseDelivery) {
        Alert.alert(hi ? 'जानकारी अधूरी है' : 'Incomplete', hi ? 'कृपया कम से कम एक सेवा उपयोग (सवारी / माल ढुलाई / पार्सल) चुनें।' : 'Please select at least one service usage (Passenger / Goods / Parcel).');
        return;
      }
    } else if (roleKey === 'contractor') {
      if (!setupFirmName.trim()) {
        Alert.alert(hi ? 'जानकारी अधूरी है' : 'Incomplete', hi ? 'कृपया अपनी फर्म या व्यापार का नाम दर्ज करें।' : 'Please enter firm name.');
        return;
      }
    }

    setIsSubmittingSetup(true);
    try {
      // 1. Add role to selected_roles if not present
      if (!userAllowedKeys.includes(roleKey)) {
        const addAction = await dispatch(addUserRole(roleKey));
        if (!addUserRole.fulfilled.match(addAction)) {
          throw new Error((addAction.payload as string) || 'Failed to add role');
        }
      }

      // 2. Save provider setup details to /api/provider/setup first
      const payload: any = {
        category: roleKey,
        experience_years: setupExperience,
        working_locations: setupDistrict ? [{ district: setupDistrict, state: setupState }] : [],
      };

      if (roleKey === 'labour' || roleKey === 'karigar') {
        payload.sub_categories = setupSkills;
        payload.skills_description = setupSkills.join(', ');
        payload.expected_daily_wage = parseFloat(setupWage);
      } else if (roleKey === 'driver') {
        payload.vehicle_type = setupVehicleType;
        payload.dl_number = setupDlNumber.trim();
        payload.contract_types = [setupDriverType];
      } else if (roleKey === 'transport') {
        payload.vehicle_type = setupVehicleType;
        payload.vehicle_number = setupVehicleNumber.trim();
        payload.per_km_rate = parseFloat(setupPerKmRate) || 15;
        payload.is_passenger_vehicle = setupUsePassenger;
        payload.is_goods_vehicle = setupUseGoods;
        payload.is_delivery_vehicle = setupUseDelivery;
      } else if (roleKey === 'contractor') {
        payload.firm_name = setupFirmName.trim();
        payload.team_size = setupTeamSize.trim() || '5';
        payload.category = setupContractorCategory;
      }

      await api.post('/api/provider/setup', payload);
      dispatch(completeProfile());

      // 3. Switch role on backend
      const switchAction = await dispatch(updateRole(roleKey));
      if (!updateRole.fulfilled.match(switchAction)) {
        throw new Error((switchAction.payload as string) || 'Failed to switch role');
      }

      const roleTitle = hi ? setupRole.titleHi : setupRole.titleEn;
      Alert.alert(
        hi ? '🎉 प्रोफाइल तैयार!' : '🎉 Profile Ready!',
        hi
          ? `आपकी "${roleTitle}" प्रोफाइल सफलतापूर्वक बन गई है।`
          : `Your profile for "${roleTitle}" has been created successfully.`
      );

      setSetupRole(null);
      onClose();
    } catch (err: any) {
      Alert.alert(hi ? 'त्रुटि' : 'Error', err?.message || 'Failed to save profile');
    } finally {
      setIsSubmittingSetup(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={() => {
        if (setupRole) {
          setSetupRole(null);
        } else {
          onClose();
        }
      }}
    >
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.sheet}
        >
          {/* ══════════════════════════════════════════════════════════════════════ */}
          {/* VIEW A: Role Setup Form (When a role was chosen for signup/setup)     */}
          {/* ══════════════════════════════════════════════════════════════════════ */}
          {setupRole ? (
            <View style={{ flex: 1 }}>
              {/* Setup Form Header */}
              <View style={styles.setupHeader}>
                <TouchableOpacity
                  onPress={() => setSetupRole(null)}
                  style={styles.backBtn}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={styles.backBtnText}>← {hi ? 'पीछे' : 'Back'}</Text>
                </TouchableOpacity>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.setupTitle}>
                    {setupRole.icon} {hi ? setupRole.titleHi : setupRole.titleEn}
                  </Text>
                  <Text style={styles.setupSub}>
                    {hi ? 'काम शुरू करने के लिए अपना विवरण भरें' : 'Fill details to start receiving jobs'}
                  </Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <Text style={styles.closeText}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingBottom: 30 }}
              >
                {/* ── 1. Labour Setup Fields ── */}
                {setupRole.roleKey === 'labour' && (
                  <>
                    <Text style={styles.fieldLabel}>
                      {hi ? 'कार्य का प्रकार / हुनर (एक या अधिक चुनें) *' : 'Work Category / Skills *'}
                    </Text>
                    <View style={styles.chipWrap}>
                      {LABOUR_WORK_TYPES.map(item => {
                        const isSel = setupSkills.includes(item.id);
                        return (
                          <TouchableOpacity
                            key={item.id}
                            style={[styles.skillChip, isSel && styles.skillChipSel]}
                            onPress={() => toggleSkill(item.id)}
                            activeOpacity={0.75}
                          >
                            <Text style={[styles.skillChipText, isSel && styles.skillChipTextSel]}>
                              {isSel ? '✓ ' : ''}{hi ? item.hi : item.en}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    <Text style={styles.fieldLabel}>
                      {hi ? 'अपेक्षित दैनिक दिहाड़ी (₹ प्रति दिन) *' : 'Expected Daily Wage (₹ / day) *'}
                    </Text>
                    <View style={styles.wageChipRow}>
                      {LABOUR_WAGE_CHIPS.map(w => (
                        <TouchableOpacity
                          key={w}
                          style={[styles.wageChip, setupWage === w && styles.wageChipSel]}
                          onPress={() => setSetupWage(w)}
                        >
                          <Text style={[styles.wageChipText, setupWage === w && styles.wageChipTextSel]}>
                            ₹{w}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <View style={styles.inputBox}>
                      <Text style={styles.inputPrefix}>₹</Text>
                      <TextInput
                        style={styles.textInput}
                        value={setupWage}
                        onChangeText={setSetupWage}
                        keyboardType="numeric"
                        placeholder="500"
                        placeholderTextColor="#999"
                      />
                      <Text style={styles.inputSuffix}>{hi ? '/ दिन' : '/ day'}</Text>
                    </View>
                  </>
                )}

                {/* ── 2. Karigar Setup Fields ── */}
                {setupRole.roleKey === 'karigar' && (
                  <>
                    <Text style={styles.fieldLabel}>
                      {hi ? 'कारीगरी विशेषज्ञता / हुनर चुनें *' : 'Karigar Specialization *'}
                    </Text>
                    <View style={styles.chipWrap}>
                      {KARIGAR_WORK_TYPES.map(item => {
                        const isSel = setupSkills.includes(item.id);
                        return (
                          <TouchableOpacity
                            key={item.id}
                            style={[styles.skillChip, isSel && styles.skillChipSel]}
                            onPress={() => toggleSkill(item.id)}
                            activeOpacity={0.75}
                          >
                            <Text style={[styles.skillChipText, isSel && styles.skillChipTextSel]}>
                              {isSel ? '✓ ' : ''}{hi ? item.hi : item.en}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    <Text style={styles.fieldLabel}>
                      {hi ? 'अपेक्षित दैनिक दिहाड़ी (₹ प्रति दिन) *' : 'Expected Daily Wage (₹ / day) *'}
                    </Text>
                    <View style={styles.wageChipRow}>
                      {KARIGAR_WAGE_CHIPS.map(w => (
                        <TouchableOpacity
                          key={w}
                          style={[styles.wageChip, setupWage === w && styles.wageChipSel]}
                          onPress={() => setSetupWage(w)}
                        >
                          <Text style={[styles.wageChipText, setupWage === w && styles.wageChipTextSel]}>
                            ₹{w}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <View style={styles.inputBox}>
                      <Text style={styles.inputPrefix}>₹</Text>
                      <TextInput
                        style={styles.textInput}
                        value={setupWage}
                        onChangeText={setSetupWage}
                        keyboardType="numeric"
                        placeholder="800"
                        placeholderTextColor="#999"
                      />
                      <Text style={styles.inputSuffix}>{hi ? '/ दिन' : '/ day'}</Text>
                    </View>
                  </>
                )}

                {/* ── 3. Driver Setup Fields ── */}
                {setupRole.roleKey === 'driver' && (
                  <>
                    <Text style={styles.fieldLabel}>
                      {hi ? 'चलाए जाने वाले वाहन का प्रकार *' : 'Vehicle Type You Drive *'}
                    </Text>
                    <View style={styles.chipWrap}>
                      {DRIVER_VEHICLES.map(v => {
                        const isSel = setupVehicleType === (hi ? v.hi : v.en);
                        return (
                          <TouchableOpacity
                            key={v.id}
                            style={[styles.skillChip, isSel && styles.skillChipSel]}
                            onPress={() => setSetupVehicleType(hi ? v.hi : v.en)}
                          >
                            <Text style={[styles.skillChipText, isSel && styles.skillChipTextSel]}>
                              {hi ? v.hi : v.en}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    <Text style={styles.fieldLabel}>
                      {hi ? 'ड्राइविंग लाइसेंस (DL) नंबर *' : 'Driving License (DL) Number *'}
                    </Text>
                    <View style={styles.inputBox}>
                      <Text style={{ fontSize: 16, marginRight: 8 }}>🪪</Text>
                      <TextInput
                        style={styles.textInput}
                        value={setupDlNumber}
                        onChangeText={setSetupDlNumber}
                        autoCapitalize="characters"
                        placeholder="MP04 20220012345"
                        placeholderTextColor="#999"
                      />
                    </View>

                    <Text style={styles.fieldLabel}>
                      {hi ? 'ड्राइविंग प्रकार (Driving Type)' : 'Driver Type'}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
                      <TouchableOpacity
                        style={[styles.wageChip, { flex: 1 }, setupDriverType === 'commercial' && styles.wageChipSel]}
                        onPress={() => setSetupDriverType('commercial')}
                      >
                        <Text style={[styles.wageChipText, setupDriverType === 'commercial' && styles.wageChipTextSel]}>
                          💼 {hi ? 'कमर्शियल चालक' : 'Commercial'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.wageChip, { flex: 1 }, setupDriverType === 'personal' && styles.wageChipSel]}
                        onPress={() => setSetupDriverType('personal')}
                      >
                        <Text style={[styles.wageChipText, setupDriverType === 'personal' && styles.wageChipTextSel]}>
                          👤 {hi ? 'पर्सनल चालक' : 'Personal'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}

                {/* ── 4. Transport Setup Fields ── */}
                {setupRole.roleKey === 'transport' && (
                  <>
                    <Text style={styles.fieldLabel}>
                      {hi ? 'गाड़ी का प्रकार चुनें *' : 'Select Vehicle Type *'}
                    </Text>
                    <View style={{ marginBottom: 12 }}>
                      <ScrollView
                        nestedScrollEnabled={true}
                        style={expandTransportInModal ? { maxHeight: 180, borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 10, padding: 8, backgroundColor: '#F9FAFB' } : undefined}
                        contentContainerStyle={styles.chipWrap}
                        showsVerticalScrollIndicator={expandTransportInModal}
                      >
                        {(expandTransportInModal ? TRANSPORT_VEHICLES : TRANSPORT_VEHICLES.slice(0, 6)).map(v => {
                          const isSel = setupVehicleType === (hi ? v.hi : v.en);
                          return (
                            <TouchableOpacity
                              key={v.id}
                              style={[styles.skillChip, isSel && styles.skillChipSel]}
                              onPress={() => setSetupVehicleType(hi ? v.hi : v.en)}
                            >
                              <Text style={[styles.skillChipText, isSel && styles.skillChipTextSel]}>
                                {isSel ? '✓ ' : ''}{hi ? v.hi : v.en}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>

                      <TouchableOpacity
                        style={{
                          paddingVertical: 6,
                          paddingHorizontal: 12,
                          borderRadius: 8,
                          backgroundColor: '#F3F4F6',
                          alignSelf: 'flex-start',
                          marginTop: 6,
                          borderWidth: 1,
                          borderColor: '#E5E7EB',
                        }}
                        onPress={() => setExpandTransportInModal(!expandTransportInModal)}
                        activeOpacity={0.8}
                      >
                        <Text style={{ fontSize: 11.5, color: '#374151', fontWeight: '700' }}>
                          {expandTransportInModal
                            ? (hi ? '➖ कम गाड़ियां देखें (Show Less)' : '➖ Show Less')
                            : (hi ? `➕ और गाड़ियां देखें (+${TRANSPORT_VEHICLES.length - 6} और विकल्प)` : `➕ Show More (+${TRANSPORT_VEHICLES.length - 6})`)}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    <Text style={styles.fieldLabel}>
                      {hi ? 'गाड़ी रजिस्ट्रेशन नंबर *' : 'Vehicle Registration Number *'}
                    </Text>
                    <View style={styles.inputBox}>
                      <Text style={{ fontSize: 16, marginRight: 8 }}>🚘</Text>
                      <TextInput
                        style={styles.textInput}
                        value={setupVehicleNumber}
                        onChangeText={setSetupVehicleNumber}
                        autoCapitalize="characters"
                        placeholder="MP 04 AB 1234"
                        placeholderTextColor="#999"
                      />
                    </View>

                    <Text style={styles.fieldLabel}>
                      {hi ? 'किराया (₹ प्रति किमी)' : 'Rate (₹ per km)'}
                    </Text>
                    <View style={styles.inputBox}>
                      <Text style={styles.inputPrefix}>₹</Text>
                      <TextInput
                        style={styles.textInput}
                        value={setupPerKmRate}
                        onChangeText={setSetupPerKmRate}
                        keyboardType="numeric"
                        placeholder="15"
                        placeholderTextColor="#999"
                      />
                      <Text style={styles.inputSuffix}>{hi ? '/ किमी' : '/ km'}</Text>
                    </View>

                    <Text style={styles.fieldLabel}>
                      {hi ? 'सेवा का प्रकार (Service Use) *' : 'Usage Type *'}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                      <TouchableOpacity
                        style={[styles.wageChip, { flex: 1, minWidth: 95 }, setupUsePassenger && styles.wageChipSel]}
                        onPress={() => setSetupUsePassenger(!setupUsePassenger)}
                      >
                        <Text style={[styles.wageChipText, setupUsePassenger && styles.wageChipTextSel]}>
                          👥 {hi ? 'सवारी' : 'Passenger'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.wageChip, { flex: 1, minWidth: 95 }, setupUseGoods && styles.wageChipSel]}
                        onPress={() => setSetupUseGoods(!setupUseGoods)}
                      >
                        <Text style={[styles.wageChipText, setupUseGoods && styles.wageChipTextSel]}>
                          📦 {hi ? 'माल ढुलाई' : 'Goods'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.wageChip, { flex: 1, minWidth: 95 }, setupUseDelivery && styles.wageChipSel]}
                        onPress={() => setSetupUseDelivery(!setupUseDelivery)}
                      >
                        <Text style={[styles.wageChipText, setupUseDelivery && styles.wageChipTextSel]}>
                          🛵 {hi ? 'पार्सल / डिलीवरी' : 'Parcel'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}

                {/* ── 5. Contractor Setup Fields ── */}
                {setupRole.roleKey === 'contractor' && (
                  <>
                    <Text style={styles.fieldLabel}>
                      {hi ? 'फर्म / व्यापार का नाम *' : 'Business / Firm Name *'}
                    </Text>
                    <View style={styles.inputBox}>
                      <Text style={{ fontSize: 16, marginRight: 8 }}>🏢</Text>
                      <TextInput
                        style={styles.textInput}
                        value={setupFirmName}
                        onChangeText={setSetupFirmName}
                        placeholder={hi ? 'उदा. शर्मा कंस्ट्रक्शन' : 'e.g. Sharma Constructions'}
                        placeholderTextColor="#999"
                      />
                    </View>

                    <Text style={styles.fieldLabel}>
                      {hi ? 'टीम का आकार (कितने मजदूर / कारीगर हैं)' : 'Team Size (Workers)'}
                    </Text>
                    <View style={styles.inputBox}>
                      <Text style={{ fontSize: 16, marginRight: 8 }}>👥</Text>
                      <TextInput
                        style={styles.textInput}
                        value={setupTeamSize}
                        onChangeText={setSetupTeamSize}
                        keyboardType="numeric"
                        placeholder="5"
                        placeholderTextColor="#999"
                      />
                      <Text style={styles.inputSuffix}>{hi ? 'सदस्य' : 'workers'}</Text>
                    </View>

                    <Text style={styles.fieldLabel}>
                      {hi ? 'मुख्य ठेकेदारी श्रेणी' : 'Contractor Category'}
                    </Text>
                    <View style={styles.chipWrap}>
                      {CONTRACTOR_TYPES.map(c => {
                        const isSel = setupContractorCategory === (hi ? c.hi : c.en);
                        return (
                          <TouchableOpacity
                            key={c.id}
                            style={[styles.skillChip, isSel && styles.skillChipSel]}
                            onPress={() => setSetupContractorCategory(hi ? c.hi : c.en)}
                          >
                            <Text style={[styles.skillChipText, isSel && styles.skillChipTextSel]}>
                              {hi ? c.hi : c.en}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </>
                )}

                {/* ── Common: Experience ── */}
                <Text style={styles.fieldLabel}>
                  {hi ? 'कार्य अनुभव (Experience)' : 'Experience'}
                </Text>
                <View style={styles.chipWrap}>
                  {EXPERIENCE_CHIPS.map(exp => {
                    const isSel = setupExperience === exp;
                    return (
                      <TouchableOpacity
                        key={exp}
                        style={[styles.skillChip, isSel && styles.skillChipSel]}
                        onPress={() => setSetupExperience(exp)}
                      >
                        <Text style={[styles.skillChipText, isSel && styles.skillChipTextSel]}>
                          ⏳ {exp}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* ── Common: Location (State & District) ── */}
                <Text style={styles.fieldLabel}>
                  {hi ? 'कार्य क्षेत्र / जिला (Working District)' : 'Working District'}
                </Text>
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                  {/* State Picker Button */}
                  <TouchableOpacity
                    style={[styles.pickerBtn, { flex: 1 }]}
                    onPress={() => setShowStateModal(true)}
                  >
                    <Text style={styles.pickerBtnLabel}>{hi ? 'राज्य' : 'State'}</Text>
                    <Text style={styles.pickerBtnVal} numberOfLines={1}>
                      {hi ? STATES_AND_DISTRICTS.find(s => s.name === setupState)?.nameHi || setupState : setupState}
                    </Text>
                  </TouchableOpacity>

                  {/* District Picker Button */}
                  <TouchableOpacity
                    style={[styles.pickerBtn, { flex: 1.2 }]}
                    onPress={() => setShowDistrictModal(true)}
                  >
                    <Text style={styles.pickerBtnLabel}>{hi ? 'जिला' : 'District'}</Text>
                    <Text style={styles.pickerBtnVal} numberOfLines={1}>
                      {setupDistrict
                        ? (hi
                            ? STATES_AND_DISTRICTS.find(s => s.name === setupState)?.districts.find(d => d.name === setupDistrict)?.nameHi || setupDistrict
                            : setupDistrict)
                        : (hi ? 'जिला चुनें ▼' : 'Select District ▼')}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Submit Setup Button */}
                <TouchableOpacity
                  style={[styles.submitSetupBtn, isSubmittingSetup && { opacity: 0.6 }]}
                  onPress={handleSaveRoleSetup}
                  disabled={isSubmittingSetup}
                  activeOpacity={0.8}
                >
                  {isSubmittingSetup ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.submitSetupText}>
                      {hi ? 'साइन अप करें और प्रोफाइल बनाएं →' : 'Save Details & Complete Profile →'}
                    </Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cancelSetupBtn}
                  onPress={() => setSetupRole(null)}
                >
                  <Text style={styles.cancelSetupText}>{hi ? 'रद्द करें' : 'Cancel'}</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          ) : (
            /* ══════════════════════════════════════════════════════════════════ */
            /* VIEW B: Normal Role Switch & Unregistered Roles List               */
            /* ══════════════════════════════════════════════════════════════════ */
            <View style={{ flex: 1 }}>
              {/* Header */}
              <View style={styles.header}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>
                    {hi ? '🔄 भूमिका / खाता बदलें' : '🔄 Switch Account Role'}
                  </Text>
                  <Text style={styles.subtitle}>
                    {hi
                      ? 'आप केवल अपनी चुनी हुई भूमिकाओं में अकाउंट स्विच कर सकते हैं'
                      : 'You can switch between your registered account roles'}
                  </Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Text style={styles.closeText}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Helper Badge */}
              <View style={styles.sharedInfoBox}>
                <Text style={styles.sharedInfoIcon}>ℹ️</Text>
                <Text style={styles.sharedInfoText}>
                  {hi
                    ? 'आपका मोबाइल नंबर, लॉगिन पासवर्ड एवं वॉलेट बैलेंस सभी चुनी हुई भूमिकाओं में एक समान रहेगा।'
                    : 'Your mobile number, password, and wallet balance remain identical in all chosen modes.'}
                </Text>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 28 }}
              >
                {/* Registered Roles Section */}
                <View style={styles.sectionTitleRow}>
                  <Text style={styles.sectionHeaderTitle}>
                    {hi ? '✅ आपकी चुनी हुई भूमिकाएं' : '✅ Your Registered Roles'}
                  </Text>
                  <Text style={styles.sectionHeaderCount}>
                    {registeredOptions.length} {hi ? 'उपलब्ध' : 'Available'}
                  </Text>
                </View>

                {registeredOptions.map((item) => {
                  const isActive = activeNormalizedRole === item.roleKey;
                  const isSwitchingThis = switchingTo === item.roleKey;

                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.roleCard,
                        isActive && styles.roleCardActive,
                        { borderColor: isActive ? '#FF6B00' : '#E2E8F0' },
                      ]}
                      onPress={() => handleSelectRole(item)}
                      disabled={switchingTo !== null}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.iconBox, { backgroundColor: item.badgeBg }]}>
                        <Text style={styles.iconText}>{item.icon}</Text>
                      </View>

                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <View style={styles.titleRow}>
                          <Text style={[styles.roleTitle, isActive && { color: '#FF6B00' }]}>
                            {hi ? item.titleHi : item.titleEn}
                          </Text>
                          {isActive && (
                            <View style={styles.activePill}>
                              <Text style={styles.activePillText}>
                                {hi ? '● वर्तमान में सक्रिय' : '● Active'}
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.roleDesc}>
                          {hi ? item.descHi : item.descEn}
                        </Text>
                      </View>

                      {isSwitchingThis ? (
                        <ActivityIndicator size="small" color="#FF6B00" style={{ marginLeft: 8 }} />
                      ) : isActive ? (
                        <View style={styles.checkCircle}>
                          <Text style={styles.checkMark}>✓</Text>
                        </View>
                      ) : (
                        <Text style={styles.arrowIcon}>→</Text>
                      )}
                    </TouchableOpacity>
                  );
                })}

                {/* Unregistered Roles Section (Sign up / Activate) */}
                {unregisteredOptions.length > 0 && (
                  <View style={styles.otherSection}>
                    <View style={styles.sectionTitleRow}>
                      <Text style={[styles.sectionHeaderTitle, { color: '#C2410C' }]}>
                        {hi ? '➕ अन्य भूमिकाएं जोड़ें (साइन अप करें)' : '➕ Add More Roles (Sign Up)'}
                      </Text>
                      <Text style={[styles.sectionHeaderCount, { backgroundColor: '#FFF7ED', color: '#C2410C' }]}>
                        {unregisteredOptions.length} {hi ? 'उपलब्ध' : 'Available'}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 11.5, color: '#718096', marginBottom: 12, lineHeight: 16 }}>
                      {hi
                        ? 'आप अपने इसी खाते में नीचे दी गई किसी भी अन्य श्रेणी में साइन अप कर सकते हैं:'
                        : 'You can activate/sign up for any of the following roles under your existing account:'}
                    </Text>

                    {unregisteredOptions.map((item) => {
                      const isAddingThis = addingRoleKey === item.roleKey;
                      return (
                        <View key={item.id} style={styles.unregisteredCard}>
                          <View style={[styles.iconBox, { backgroundColor: item.badgeBg, width: 40, height: 40, borderRadius: 20 }]}>
                            <Text style={{ fontSize: 20 }}>{item.icon}</Text>
                          </View>

                          <View style={{ flex: 1, marginLeft: 10 }}>
                            <Text style={styles.roleTitleSmall}>
                              {hi ? item.titleHi : item.titleEn}
                            </Text>
                            <Text style={styles.roleDescSmall} numberOfLines={2}>
                              {hi ? item.descHi : item.descEn}
                            </Text>
                          </View>

                          <TouchableOpacity
                            style={styles.addRoleBtn}
                            onPress={() => handleAddNewRole(item)}
                            disabled={addingRoleKey !== null || switchingTo !== null}
                            activeOpacity={0.8}
                          >
                            {isAddingThis ? (
                              <ActivityIndicator size="small" color="#FF6B00" />
                            ) : (
                              <Text style={styles.addRoleBtnText}>
                                {hi ? '+ साइन अप' : '+ Sign Up'}
                              </Text>
                            )}
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </View>
                )}

              </ScrollView>
            </View>
          )}

          {/* ── State Modal ── */}
          <Modal visible={showStateModal} transparent animationType="fade">
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>{hi ? 'राज्य चुनें' : 'Select State'}</Text>
                <FlatList
                  data={STATES_AND_DISTRICTS}
                  keyExtractor={item => item.name}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.modalItem}
                      onPress={() => {
                        setSetupState(item.name);
                        setSetupDistrict('');
                        setShowStateModal(false);
                      }}
                    >
                      <Text style={styles.modalItemText}>
                        {hi ? item.nameHi : item.name}
                      </Text>
                    </TouchableOpacity>
                  )}
                />
                <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowStateModal(false)}>
                  <Text style={styles.modalCloseBtnText}>{hi ? 'बंद करें' : 'Close'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          {/* ── District Modal ── */}
          <Modal visible={showDistrictModal} transparent animationType="fade">
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>{hi ? 'जिला चुनें' : 'Select District'}</Text>
                <FlatList
                  data={STATES_AND_DISTRICTS.find(s => s.name === setupState)?.districts || []}
                  keyExtractor={item => item.name}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.modalItem}
                      onPress={() => {
                        setSetupDistrict(item.name);
                        setShowDistrictModal(false);
                      }}
                    >
                      <Text style={styles.modalItemText}>
                        {hi ? item.nameHi : item.name}
                      </Text>
                    </TouchableOpacity>
                  )}
                />
                <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowDistrictModal(false)}>
                  <Text style={styles.modalCloseBtnText}>{hi ? 'बंद करें' : 'Close'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 20,
    maxHeight: '88%',
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A202C',
  },
  subtitle: {
    fontSize: 11.5,
    color: '#718096',
    marginTop: 2,
    lineHeight: 16,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F7FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  closeText: {
    fontSize: 15,
    color: '#718096',
    fontWeight: '700',
  },
  sharedInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#DCFCE7',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 14,
  },
  sharedInfoIcon: {
    fontSize: 15,
    marginRight: 8,
  },
  sharedInfoText: {
    fontSize: 11,
    color: '#166534',
    flex: 1,
    lineHeight: 15,
    fontWeight: '500',
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  roleCardActive: {
    backgroundColor: '#FFF7ED',
    borderWidth: 2,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 22,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  roleTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#1A202C',
    marginRight: 6,
  },
  activePill: {
    backgroundColor: '#FFEDD5',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  activePillText: {
    fontSize: 10,
    color: '#C2410C',
    fontWeight: '800',
  },
  roleDesc: {
    fontSize: 11.5,
    color: '#718096',
    marginTop: 3,
    lineHeight: 16,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FF6B00',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  checkMark: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '900',
  },
  arrowIcon: {
    fontSize: 18,
    color: '#A0AEC0',
    marginLeft: 8,
    fontWeight: '700',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    marginTop: 4,
  },
  sectionHeaderTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#4A5568',
  },
  sectionHeaderCount: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2E7D32',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  otherSection: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#EDF2F7',
  },
  unregisteredCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
  },
  roleTitleSmall: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2D3748',
  },
  roleDescSmall: {
    fontSize: 11,
    color: '#718096',
    marginTop: 1,
  },
  addRoleBtn: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FFD8A8',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    marginLeft: 8,
  },
  addRoleBtnText: {
    color: '#E65100',
    fontSize: 11.5,
    fontWeight: '800',
  },

  // ── Setup Form Specific Styles ──────────────────────────────────────────────
  setupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
  },
  backBtnText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '700',
  },
  setupTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
  },
  setupSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  fieldLabel: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#334155',
    marginBottom: 8,
    marginTop: 10,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  skillChip: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  skillChipSel: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FF6B00',
  },
  skillChipText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  skillChipTextSel: {
    color: '#C2410C',
    fontWeight: '800',
  },
  wageChipRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  wageChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  wageChipSel: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FF6B00',
  },
  wageChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  wageChipTextSel: {
    color: '#C2410C',
    fontWeight: '800',
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 10,
  },
  inputPrefix: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FF6B00',
    marginRight: 6,
  },
  inputSuffix: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '600',
    paddingVertical: 6,
  },
  pickerBtn: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 10,
  },
  pickerBtnLabel: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  pickerBtnVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 2,
  },
  submitSetupBtn: {
    backgroundColor: '#FF6B00',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  submitSetupText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  cancelSetupBtn: {
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 6,
  },
  cancelSetupText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },

  // ── Modal Styles ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '100%',
    maxHeight: '75%',
    padding: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalItemText: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '600',
  },
  modalCloseBtn: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  modalCloseBtnText: {
    color: '#475569',
    fontWeight: '700',
    fontSize: 13,
  },
});
