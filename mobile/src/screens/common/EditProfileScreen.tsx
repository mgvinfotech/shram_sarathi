import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Platform, Image,
  KeyboardAvoidingView, Modal, FlatList,
} from 'react-native';
import { TextInput, Button, Appbar, Chip, Avatar } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store';
import { updateProfileName } from '../../store/slices/authSlice';
import { useLanguage } from '../../i18n/LanguageContext';
import { api, getErrorMessage, getImageUrl } from '../../services/api';
import { STATES_AND_DISTRICTS } from '../../utils/locations';
import { SKILL_CATEGORIES, resolveCategorySlug } from '../../config/categories.config';
import { isProviderRole } from '../../utils/roleUtils';

interface SubCategory {
  id: number;
  name: string;
  name_hindi: string;
  slug: string;
}

interface Props {
  navigation: any;
  route?: any;
}

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

async function appendFileToForm(form: FormData, fieldName: string, uri: string | null) {
  if (!uri) return;
  const ext = uri.split('.').pop()?.split('?')[0] ?? 'jpg';
  const fileName = `${fieldName}.${ext}`;
  const mimeType = `image/${ext === 'png' ? 'png' : 'jpeg'}`;

  if (Platform.OS === 'web' || uri.startsWith('blob:') || uri.startsWith('data:')) {
    try {
      const res = await fetch(uri);
      const blob = await res.blob();
      const file = new File([blob], fileName, { type: mimeType });
      form.append(fieldName, file);
      return;
    } catch (e) {
      console.warn('Error converting blob to file:', e);
    }
  }

  // Native fallback
  (form as any).append(fieldName, {
    uri,
    name: fileName,
    type: mimeType,
  });
}

export default function EditProfileScreen({ navigation, route }: Props) {
  const { t, lang } = useLanguage();
  const hi = lang === 'hi';
  const dispatch = useDispatch<AppDispatch>();
  const { name: currentName, phone, role, userId } = useSelector((s: RootState) => s.auth);

  const routeRole = (route?.params?.role || route?.params?.category || '').toLowerCase().trim();

  // Active Role detection
  const [activeRole, setActiveRole] = useState<string>(
    routeRole || (role || '').toLowerCase().trim()
  );

  const [name, setName] = useState(currentName || '');
  const [gender, setGender] = useState('');
  const [password, setPassword] = useState('');
  
  // Profile Photo
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [isNewPhotoPicked, setIsNewPhotoPicked] = useState(false);

  // Provider Specific States
  const [selectedCategory, setSelectedCategory] = useState('');
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [skillsLoading, setSkillsLoading] = useState(false);
  const [experience, setExperience] = useState('');
  const [expectedWage, setExpectedWage] = useState('');
  const [baseAddress, setBaseAddress] = useState('');
  const [firmName, setFirmName] = useState('');
  const [teamSize, setTeamSize] = useState('');
  const [dlNumber, setDlNumber] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [driverType, setDriverType] = useState<'commercial' | 'personal' | ''>('');

  // Transport Specific States
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [perKmRate, setPerKmRate] = useState('15');
  const [isPassenger, setIsPassenger] = useState(true);
  const [isGoods, setIsGoods] = useState(false);
  const [isDelivery, setIsDelivery] = useState(false);
  const [ownerName, setOwnerName] = useState('');
  const [expandVehicles, setExpandVehicles] = useState(false);

  // Location
  const [selectedState, setSelectedState] = useState('');
  const [district, setDistrict] = useState('');
  const [showStateModal, setShowStateModal] = useState(false);
  const [showDistrictModal, setShowDistrictModal] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(false);
  const [isImageViewerVisible, setIsImageViewerVisible] = useState(false);

  const insets = useSafeAreaInsets();

  // Role categorizations
  const isTransport =
    ['transport', 'vehicle', 'transporter', 'vehicle_owner'].includes(activeRole) ||
    ['transport', 'vehicle', 'transporter', 'vehicle_owner'].includes(selectedCategory.toLowerCase());

  const isDriver = !isTransport && (activeRole === 'driver' || selectedCategory.toLowerCase() === 'driver');
  const isContractor = !isTransport && !isDriver && (activeRole === 'contractor' || selectedCategory.toLowerCase() === 'contractor');
  const isLabourOrKarigar = !isTransport && !isDriver && !isContractor;

  useEffect(() => {
    fetchMe();
  }, []);

  const fetchMe = async () => {
    try {
      const res = await api.get('/api/auth/me');
      setGender(res.data.gender || '');
      if (res.data.name) {
        setName(res.data.name);
      }
      if (res.data.photo_url) {
        setPhotoUri(getImageUrl(res.data.photo_url));
      }

      const meRole = (res.data.role || '').toLowerCase().trim();
      if (meRole && !routeRole) {
        if (meRole !== 'provider') {
          setActiveRole(meRole);
        }
      }
      
      const uId = res.data.id || userId;
      if (uId && (isProviderRole(role) || isProviderRole(meRole) || isProviderRole(routeRole))) {
        fetchProviderProfile(uId);
      }
    } catch (err) {
      console.log('fetchMe error', err);
    }
  };

  // Fetch sub-categories when category changes (Labour / Karigar)
  useEffect(() => {
    if (!selectedCategory || isTransport || isDriver || isContractor) {
      setSubCategories([]);
      return;
    }
    fetchSubCategories(selectedCategory);
  }, [selectedCategory, isTransport, isDriver, isContractor]);

  const fetchProviderProfile = async (id: number) => {
    setIsPageLoading(true);
    try {
      const res = await api.get(`/api/provider/profile/${id}`);
      const data = res.data;

      if (data.photo_url) {
        setPhotoUri(getImageUrl(data.photo_url));
      }

      // Respect the role passed in route params or active redux role; do not overwrite it with data.category
      if (routeRole) {
        setActiveRole(routeRole);
        setSelectedCategory(resolveCategorySlug(routeRole));
      } else if (data.category) {
        const cat = data.category.toLowerCase().trim();
        setSelectedCategory(resolveCategorySlug(data.category));
        if (['transport', 'vehicle', 'driver', 'contractor', 'karigar', 'labour'].includes(cat)) {
          setActiveRole(cat);
        }
      }

      if (data.vehicle_number) {
        setVehicleNumber(data.vehicle_number);
      }
      if (data.vehicle_type) {
        setVehicleType(data.vehicle_type);
      }
      if (data.per_km_rate !== null && data.per_km_rate !== undefined) {
        setPerKmRate(String(data.per_km_rate));
      }
      if (data.is_passenger_vehicle !== undefined) {
        setIsPassenger(!!data.is_passenger_vehicle);
      }
      if (data.is_goods_vehicle !== undefined) {
        setIsGoods(!!data.is_goods_vehicle);
      }
      if (data.is_delivery_vehicle !== undefined) {
        setIsDelivery(!!data.is_delivery_vehicle);
      }
      if (data.owner_name) {
        setOwnerName(data.owner_name);
      }
      if (data.sub_categories) {
        // Filter out vehicle types if this is labour/karigar
        const currentTargetRole = routeRole || activeRole;
        if (['labour', 'karigar'].includes(currentTargetRole)) {
          const vehicleTokens = ['रिक्शा', 'rickshaw', 'taxi', 'टैक्सी', 'कार', 'car', 'ट्रक', 'truck', 'पिकअप', 'pickup', 'loader', 'लोडर', 'bike', 'बाइक', 'बस', 'bus'];
          const filtered = (Array.isArray(data.sub_categories) ? data.sub_categories : [data.sub_categories]).filter((s: string) => {
            const low = String(s).toLowerCase();
            return !vehicleTokens.some(vt => low.includes(vt));
          });
          setSelectedSkills(filtered);
        } else {
          setSelectedSkills(Array.isArray(data.sub_categories) ? data.sub_categories : [data.sub_categories]);
        }
      }
      if (data.experience_years) {
        setExperience(String(data.experience_years));
      }
      if (data.expected_daily_wage) {
        setExpectedWage(String(data.expected_daily_wage));
      }
      if (data.base_location_address) {
        setBaseAddress(data.base_location_address);
      }
      if (data.firm_name) {
        setFirmName(data.firm_name);
      }
      if (data.team_size) {
        setTeamSize(String(data.team_size));
      }
      if (data.dl_number) {
        setDlNumber(data.dl_number);
      }
      if (data.driver_license) {
        setDlNumber(data.driver_license);
      }
      if (data.contract_types) {
        const types = Array.isArray(data.contract_types) ? data.contract_types : [data.contract_types];
        if (types.includes('commercial')) setDriverType('commercial');
        else if (types.includes('personal')) setDriverType('personal');
      }
      
      if (data.working_locations && data.working_locations.length > 0) {
        const primaryLoc = data.working_locations[0];
        if (primaryLoc.state)    setSelectedState(primaryLoc.state);
        if (primaryLoc.district) setDistrict(primaryLoc.district);
      } else if (data.state || data.district) {
        if (data.state)    setSelectedState(data.state);
        if (data.district) setDistrict(data.district);
      }

      // ONLY fetch /api/transport/vehicle-profile if user is legitimately in transport mode
      const isTargetTransport = ['transport', 'vehicle', 'transporter'].includes(routeRole || activeRole);
      if (isTargetTransport) {
        try {
          const transRes = await api.get('/api/transport/vehicle-profile');
          if (transRes.data) {
            const td = transRes.data;
            if (td.vehicle_number) setVehicleNumber(td.vehicle_number);
            if (td.vehicle_type) setVehicleType(td.vehicle_type);
            if (td.per_km_rate) setPerKmRate(String(td.per_km_rate));
            if (td.is_passenger_vehicle !== undefined) setIsPassenger(!!td.is_passenger_vehicle);
            if (td.is_goods_vehicle !== undefined) setIsGoods(!!td.is_goods_vehicle);
            if (td.is_delivery_vehicle !== undefined) setIsDelivery(!!td.is_delivery_vehicle);
            if (td.owner_name) setOwnerName(td.owner_name);
            if (td.district && !district) setDistrict(td.district);
            if (td.state && !selectedState) setSelectedState(td.state);
          }
        } catch {
          // silent
        }
      }
    } catch (err: any) {
      if (err.response?.status !== 404) {
        console.error('Failed to fetch provider profile', err);
      }
    } finally {
      setIsPageLoading(false);
    }
  };

  const fetchSubCategories = async (catSlug: string) => {
    setSkillsLoading(true);
    try {
      const slugToFetch = resolveCategorySlug(catSlug);
      const res = await api.get(`/api/categories/${slugToFetch}/sub-categories`);
      setSubCategories(res.data || []);
    } catch (err: any) {
      setSubCategories([]);
    } finally {
      setSkillsLoading(false);
    }
  };

  const toggleSkill = (slug: string) => {
    setSelectedSkills((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  };

  const handlePickPhoto = async () => {
    Alert.alert(
      hi ? 'प्रोफाइल फोटो बदलें' : 'Change Profile Photo',
      hi ? 'फोटो कहाँ से चुनें?' : 'Choose photo source',
      [
        {
          text: hi ? '📸 कैमरा (Camera)' : 'Camera',
          onPress: async () => {
            const permission = await ImagePicker.requestCameraPermissionsAsync();
            if (!permission.granted) {
              Alert.alert('', hi ? 'कैमरा अनुमति की आवश्यकता है' : 'Camera permission required');
              return;
            }
            const res = await ImagePicker.launchCameraAsync({
              mediaTypes: ['images'],
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.8,
            });
            if (!res.canceled && res.assets[0]) {
              setPhotoUri(res.assets[0].uri);
              setIsNewPhotoPicked(true);
            }
          },
        },
        {
          text: hi ? '🖼️ गैलरी (Gallery)' : 'Gallery',
          onPress: async () => {
            const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permission.granted) {
              Alert.alert('', hi ? 'गैलरी अनुमति की आवश्यकता है' : 'Gallery permission required');
              return;
            }
            const res = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ['images'],
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.8,
            });
            if (!res.canceled && res.assets[0]) {
              setPhotoUri(res.assets[0].uri);
              setIsNewPhotoPicked(true);
            }
          },
        },
        { text: hi ? 'रद्द करें' : 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('', hi ? 'कृपया अपना नाम दर्ज करें' : 'Please enter your name');
      return;
    }

    if (isTransport) {
      if (!vehicleType) {
        Alert.alert('', hi ? 'कृपया गाड़ी का प्रकार चुनें।' : 'Please select vehicle type.');
        return;
      }
      if (!vehicleNumber.trim()) {
        Alert.alert('', hi ? 'कृपया गाड़ी रजिस्ट्रेशन नंबर दर्ज करें।' : 'Please enter vehicle registration number.');
        return;
      }
      if (!isPassenger && !isGoods && !isDelivery) {
        Alert.alert('', hi ? 'कृपया कम से कम एक सेवा उपयोग (सवारी / माल ढुलाई / पार्सल) चुनें।' : 'Please select at least one usage type (Passenger / Goods / Parcel).');
        return;
      }
    }

    setIsLoading(true);
    try {
      // 1. Update basic user profile (name, gender, optional password)
      await api.put('/api/auth/profile', {
        name: name.trim(),
        password: password ? password : null,
        gender: gender || null,
      });

      // Update Redux state name
      dispatch(updateProfileName(name.trim()));

      // 2. If provider or photo updated, save details via FormData
      const isProv = isProviderRole(activeRole) || isProviderRole(role);
      if (isProv || (isNewPhotoPicked && photoUri)) {
        const form = new FormData();

        if (isTransport) {
          form.append('category', 'transport');
          form.append('vehicle_type', vehicleType);
          form.append('vehicle_number', vehicleNumber.trim().toUpperCase());
          form.append('per_km_rate', perKmRate || '15');
          form.append('is_passenger_vehicle', isPassenger ? '1' : '0');
          form.append('is_goods_vehicle', isGoods ? '1' : '0');
          form.append('is_delivery_vehicle', isDelivery ? '1' : '0');
          if (dlNumber) {
            form.append('dl_number', dlNumber.trim().toUpperCase());
            form.append('driver_license', dlNumber.trim().toUpperCase());
          }
          if (ownerName || name) {
            form.append('owner_name', (ownerName || name).trim());
          }
          if (experience) form.append('experience_years', experience);
          if (baseAddress) form.append('base_location_address', baseAddress);
        } else if (isDriver) {
          form.append('category', 'driver');
          if (vehicleType) form.append('vehicle_type', vehicleType);
          if (dlNumber) {
            form.append('dl_number', dlNumber.trim().toUpperCase());
            form.append('driver_license', dlNumber.trim().toUpperCase());
          }
          if (driverType) form.append('driver_type', driverType);
          if (driverType) form.append('contract_types[]', driverType);
          if (experience) form.append('experience_years', experience);
          if (baseAddress) form.append('base_location_address', baseAddress);
        } else if (isContractor) {
          form.append('category', 'contractor');
          if (firmName) form.append('firm_name', firmName);
          if (teamSize) form.append('team_size', teamSize);
          if (experience) form.append('experience_years', experience);
          if (baseAddress) form.append('base_location_address', baseAddress);
        } else {
          // Labour / Karigar
          const catToSave = selectedCategory || (activeRole === 'karigar' ? 'karigar' : 'labour');
          form.append('category', catToSave);
          if (experience) form.append('experience_years', experience);
          if (expectedWage) form.append('expected_daily_wage', expectedWage);
          if (baseAddress) form.append('base_location_address', baseAddress);
          selectedSkills.forEach((skill) => {
            form.append('sub_categories[]', skill);
          });
        }

        if (district) {
          const stateToSave = selectedState || 'Madhya Pradesh';
          form.append('working_locations[0][district]', district);
          form.append('working_locations[0][state]', stateToSave);
        }

        if (isNewPhotoPicked && photoUri) {
          await appendFileToForm(form, 'photo', photoUri);
        }

        await api.post('/api/provider/setup', form, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        // If transport, also sync with transport vehicle-setup endpoint
        if (isTransport && vehicleNumber && vehicleType) {
          try {
            await api.post('/api/transport/vehicle-setup', {
              owner_name: (ownerName || name).trim(),
              vehicle_number: vehicleNumber.trim().toUpperCase(),
              vehicle_type: vehicleType,
              is_passenger_vehicle: isPassenger,
              is_goods_vehicle: isGoods,
              is_delivery_vehicle: isDelivery,
              per_km_rate: parseFloat(perKmRate) || 15,
              driver_license: dlNumber || undefined,
              district: district || 'Varanasi',
              state: selectedState || 'Uttar Pradesh',
            });
          } catch (vehErr) {
            console.log('Vehicle-setup sync notice:', vehErr);
          }
        }
      }

      Alert.alert(
        hi ? 'सफल' : 'Success',
        hi ? 'प्रोफ़ाइल सफलतापूर्वक अपडेट की गई' : 'Profile updated successfully',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (err: any) {
      Alert.alert('Error', getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  if (isPageLoading) {
    return (
      <View style={[styles.container, styles.loadingCenter]}>
        <ActivityIndicator size="large" color="#FF6B00" />
      </View>
    );
  }

  const isProv = isProviderRole(activeRole) || isProviderRole(role);

  return (
    <View style={styles.container}>
      {/* Custom Header */}
      <Appbar.Header style={styles.header}>
        <Appbar.BackAction onPress={() => navigation.goBack()} color="#333" />
        <Appbar.Content title={hi ? 'प्रोफाइल एडिट करें' : 'Edit Profile'} titleStyle={styles.headerTitle} />
      </Appbar.Header>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 140 }]}
        >
          
          {/* ── Profile Photo Section ── */}
          <View style={styles.photoSection}>
            <TouchableOpacity onPress={() => photoUri ? setIsImageViewerVisible(true) : handlePickPhoto()} activeOpacity={0.8} style={styles.photoContainer}>
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={styles.photoImg} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Text style={{ fontSize: 32 }}>👤</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={handlePickPhoto} style={{ marginTop: 8 }}>
              <Text style={styles.changePhotoText}>
                {hi ? 'प्रोफाइल फोटो बदलें' : 'Change Profile Photo'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── Basic Info ── */}
          <Text style={styles.sectionHeading}>
            {hi ? 'सामान्य जानकारी / Basic Info' : 'Basic Info'}
          </Text>

          <TextInput
            label="नाम / Name *"
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Name"
            mode="outlined"
            activeOutlineColor="#FF6B00"
          />

          <Text style={[styles.label, { marginTop: 14 }]}>{hi ? 'लिंग / Gender' : 'Gender'}</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {[
              { value: 'male',   labelHi: 'पुरुष / Male',   labelEn: 'Male'   },
              { value: 'female', labelHi: 'महिला / Female', labelEn: 'Female' },
            ].map((opt) => {
              const sel = gender === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.genderBtn, sel && styles.genderBtnSelected]}
                  onPress={() => setGender(opt.value)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.genderBtnText, sel && styles.genderBtnTextSelected]}>
                    {hi ? opt.labelHi : opt.labelEn}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TextInput
            label="मोबाइल नंबर / Mobile Number (Secure)"
            style={[styles.input, styles.inputDisabled]}
            value={phone || ''}
            editable={false}
            selectTextOnFocus={false}
            textColor="#718096"
            mode="outlined"
          />

          <TextInput
            label="नया पासवर्ड / New Password (optional)"
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder={hi ? 'नया पासवर्ड दर्ज करें' : 'Enter new password'}
            secureTextEntry
            mode="outlined"
            activeOutlineColor="#FF6B00"
          />

          {/* ── Provider Specific Fields ── */}
          {isProv && (
            <>
              <View style={styles.sectionDivider} />

              {/* ════════════════════════════════════════════
                1. TRANSPORT / VEHICLE ROLE — Dedicated Fields
              ═══════════════════════════════════════════════ */}
              {isTransport ? (
                <>
                  <Text style={styles.sectionHeading}>
                    🚛 {hi ? 'ट्रांसपोर्ट / वाहन विवरण (Transport Profile)' : 'Vehicle & Transport Profile'}
                  </Text>

                  {/* Vehicle Type Selection */}
                  <Text style={styles.label}>{hi ? 'गाड़ी का प्रकार चुनें *' : 'Select Vehicle Type *'}</Text>
                  <View style={styles.chipGrid}>
                    {(expandVehicles ? TRANSPORT_VEHICLES : TRANSPORT_VEHICLES.slice(0, 6)).map((v) => {
                      const vVal = hi ? v.hi : v.en;
                      const isSel =
                        vehicleType.toLowerCase() === vVal.toLowerCase() ||
                        vehicleType.toLowerCase() === v.id.toLowerCase() ||
                        vehicleType.toLowerCase() === v.hi.toLowerCase() ||
                        vehicleType.toLowerCase() === v.en.toLowerCase();
                      return (
                        <TouchableOpacity
                          key={v.id}
                          style={[styles.transportChip, isSel && styles.transportChipSel]}
                          onPress={() => setVehicleType(vVal)}
                          activeOpacity={0.75}
                        >
                          <Text style={[styles.transportChipText, isSel && styles.transportChipTextSel]}>
                            {isSel ? '✓ ' : ''}{vVal}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <TouchableOpacity
                    style={styles.showMoreBtn}
                    onPress={() => setExpandVehicles(!expandVehicles)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.showMoreBtnText}>
                      {expandVehicles
                        ? (hi ? '➖ कम गाड़ियां देखें (Show Less)' : '➖ Show Less')
                        : (hi ? `➕ और गाड़ियां देखें (+${TRANSPORT_VEHICLES.length - 6} और विकल्प)` : `➕ Show More (+${TRANSPORT_VEHICLES.length - 6})`)}
                    </Text>
                  </TouchableOpacity>

                  {/* Vehicle Registration Number */}
                  <TextInput
                    label={hi ? 'गाड़ी रजिस्ट्रेशन नंबर *' : 'Vehicle Registration Number *'}
                    style={styles.input}
                    value={vehicleNumber}
                    onChangeText={setVehicleNumber}
                    placeholder="MP 04 AB 1234"
                    autoCapitalize="characters"
                    mode="outlined"
                    activeOutlineColor="#FF6B00"
                    left={<TextInput.Affix text="🚘 " />}
                  />

                  {/* Per KM Rate */}
                  <TextInput
                    label={hi ? 'किराया (₹ प्रति किमी)' : 'Rate (₹ per km)'}
                    style={styles.input}
                    value={perKmRate}
                    onChangeText={setPerKmRate}
                    keyboardType="numeric"
                    placeholder="15"
                    mode="outlined"
                    activeOutlineColor="#FF6B00"
                    left={<TextInput.Affix text="₹ " />}
                    right={<TextInput.Affix text={hi ? '/ किमी' : '/ km'} />}
                  />

                  {/* Usage Types */}
                  <Text style={[styles.label, { marginTop: 6 }]}>
                    {hi ? 'सेवा का प्रकार (Service Use) *' : 'Usage Type *'}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
                    <TouchableOpacity
                      style={[styles.usageBtn, isPassenger && styles.usageBtnSel]}
                      onPress={() => setIsPassenger(!isPassenger)}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.usageBtnText, isPassenger && styles.usageBtnTextSel]}>
                        👥 {hi ? 'सवारी' : 'Passenger'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.usageBtn, isGoods && styles.usageBtnSel]}
                      onPress={() => setIsGoods(!isGoods)}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.usageBtnText, isGoods && styles.usageBtnTextSel]}>
                        📦 {hi ? 'माल ढुलाई' : 'Goods'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.usageBtn, isDelivery && styles.usageBtnSel]}
                      onPress={() => setIsDelivery(!isDelivery)}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.usageBtnText, isDelivery && styles.usageBtnTextSel]}>
                        🛵 {hi ? 'पार्सल / डिलीवरी' : 'Parcel'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Driving License */}
                  <TextInput
                    label={hi ? 'ड्राइविंग लाइसेंस नं. (वैकल्पिक)' : 'Driving License No. (Optional)'}
                    style={styles.input}
                    value={dlNumber}
                    onChangeText={setDlNumber}
                    mode="outlined"
                    activeOutlineColor="#FF6B00"
                    autoCapitalize="characters"
                    placeholder="UP65 20180001234"
                    left={<TextInput.Affix text="🪪 " />}
                  />

                  {/* Experience */}
                  <TextInput
                    label={hi ? 'ड्राइविंग अनुभव (वर्ष) / Exp (Years)' : 'Exp (Years)'}
                    style={styles.input}
                    value={experience}
                    onChangeText={setExperience}
                    keyboardType="numeric"
                    mode="outlined"
                    activeOutlineColor="#FF6B00"
                  />

                  {/* Base Location Address */}
                  <TextInput
                    label={hi ? 'गाँव / क्षेत्र / बेस लोकेशन' : 'Base Address / Location'}
                    style={styles.input}
                    value={baseAddress}
                    onChangeText={setBaseAddress}
                    placeholder={hi ? 'जैसे: रामपुर, मुख्य स्टैंड' : 'e.g. Rampur, Main Stand'}
                    mode="outlined"
                    activeOutlineColor="#FF6B00"
                  />
                </>
              ) : isDriver ? (
                /* ════════════════════════════════════════════
                  2. DRIVER ROLE — Dedicated Fields
                ═══════════════════════════════════════════════ */
                <>
                  <Text style={styles.sectionHeading}>
                    🚗 {hi ? 'ड्राइवर प्रोफाइल विवरण / Driver Profile' : 'Driver Profile'}
                  </Text>

                  {/* Driver Type Toggle */}
                  <Text style={styles.label}>{hi ? 'ड्राइविंग का प्रकार' : 'Employment Type'}</Text>
                  <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
                    {[
                      { val: 'commercial', hi: '🏢 कमर्शियल', en: '🏢 Commercial' },
                      { val: 'personal',   hi: '🏠 पर्सनल',    en: '🏠 Personal'   },
                    ].map((opt) => {
                      const sel = driverType === opt.val;
                      return (
                        <TouchableOpacity
                          key={opt.val}
                          style={[
                            styles.toggleBtn,
                            sel && styles.toggleBtnSel,
                          ]}
                          onPress={() => setDriverType(opt.val as 'commercial' | 'personal')}
                        >
                          <Text style={[styles.toggleBtnText, sel && styles.toggleBtnTextSel]}>
                            {hi ? opt.hi : opt.en}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Vehicle Type Chips */}
                  <Text style={styles.label}>{hi ? 'वाहन का प्रकार *' : 'Vehicle Type *'}</Text>
                  <View style={styles.chipGrid}>
                    {[
                      { hi: 'हैचबैक', en: 'Hatchback' },
                      { hi: 'सेडान', en: 'Sedan' },
                      { hi: 'SUV', en: 'SUV' },
                      { hi: 'ट्रैक्टर / ट्रक', en: 'Tractor / Truck' },
                      { hi: 'बस', en: 'Bus' },
                      { hi: 'ऑटो रिक्शा', en: 'Auto Rickshaw' },
                    ].map((opt) => {
                      const val = hi ? opt.hi : opt.en;
                      const sel = vehicleType === val;
                      return (
                        <TouchableOpacity
                          key={val}
                          style={[styles.chip, sel && styles.chipSel]}
                          onPress={() => setVehicleType(val)}
                          activeOpacity={0.75}
                        >
                          <Text style={[styles.chipText, sel && styles.chipTextSel]}>{val}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <TextInput
                    label={hi ? 'ड्राइविंग लाइसेंस नं. *' : 'Driving License No. *'}
                    style={styles.input}
                    value={dlNumber}
                    onChangeText={setDlNumber}
                    mode="outlined"
                    activeOutlineColor="#FF6B00"
                    autoCapitalize="characters"
                  />

                  <TextInput
                    label={hi ? 'अनुभव (वर्ष) / Exp (Years)' : 'Exp (Years)'}
                    style={styles.input}
                    value={experience}
                    onChangeText={setExperience}
                    keyboardType="numeric"
                    mode="outlined"
                    activeOutlineColor="#FF6B00"
                  />

                  <TextInput
                    label={hi ? 'गाँव / क्षेत्र / पता' : 'Base Address / Location'}
                    style={styles.input}
                    value={baseAddress}
                    onChangeText={setBaseAddress}
                    placeholder={hi ? 'जैसे: रामपुर, वार्ड 5' : 'e.g. Village, Ward 5'}
                    mode="outlined"
                    activeOutlineColor="#FF6B00"
                  />
                </>
              ) : isContractor ? (
                /* ════════════════════════════════════════════
                  3. CONTRACTOR ROLE — Dedicated Fields
                ═══════════════════════════════════════════════ */
                <>
                  <Text style={styles.sectionHeading}>
                    🏗️ {hi ? 'ठेकेदार विवरण / Contractor Profile' : 'Contractor Profile'}
                  </Text>
                  <TextInput
                    label={hi ? 'फर्म / व्यापार का नाम *' : 'Firm Name *'}
                    style={styles.input}
                    value={firmName}
                    onChangeText={setFirmName}
                    mode="outlined"
                    activeOutlineColor="#FF6B00"
                  />
                  <TextInput
                    label={hi ? 'टीम का आकार (संख्या)' : 'Team Size'}
                    style={styles.input}
                    value={teamSize}
                    onChangeText={setTeamSize}
                    keyboardType="numeric"
                    mode="outlined"
                    activeOutlineColor="#FF6B00"
                  />
                  <TextInput
                    label={hi ? 'अनुभव (वर्ष) / Exp' : 'Exp (Years)'}
                    style={styles.input}
                    value={experience}
                    onChangeText={setExperience}
                    keyboardType="numeric"
                    mode="outlined"
                    activeOutlineColor="#FF6B00"
                  />
                  <TextInput
                    label={hi ? 'गाँव / क्षेत्र / पता' : 'Base Address / Location'}
                    style={styles.input}
                    value={baseAddress}
                    onChangeText={setBaseAddress}
                    placeholder={hi ? 'जैसे: रामपुर, वार्ड 5' : 'e.g. Village, Ward 5'}
                    mode="outlined"
                    activeOutlineColor="#FF6B00"
                  />
                </>
              ) : (
                /* ════════════════════════════════════════════
                  4. LABOUR / KARIGAR ROLE — Skills & Wage
                ═══════════════════════════════════════════════ */
                <>
                  <Text style={styles.sectionHeading}>
                    🛠️ {hi ? 'काम और कौशल विवरण / Work & Skills' : 'Work & Skills'}
                  </Text>

                  {/* Work Category Picker */}
                  <Text style={styles.label}>{hi ? 'मुख्य श्रेणी / Category' : 'Primary Category'}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {SKILL_CATEGORIES.map((cat) => {
                        const selected = selectedCategory.toLowerCase() === cat.slug.toLowerCase();
                        return (
                          <Chip
                            key={cat.slug}
                            selected={selected}
                            onPress={() => setSelectedCategory(cat.slug)}
                            style={[styles.catChip, selected && styles.catChipSelected]}
                            selectedColor="#FF6B00"
                          >
                            {cat.emoji} {hi ? cat.labelHi : cat.label}
                          </Chip>
                        );
                      })}
                    </View>
                  </ScrollView>

                  {/* Sub-Categories / Skills */}
                  {selectedCategory ? (
                    <>
                      <Text style={styles.label}>{hi ? 'विशिष्ट कौशल / Specific Skills' : 'Specific Skills'}</Text>
                      {skillsLoading ? (
                        <ActivityIndicator size="small" color="#FF6B00" style={{ marginVertical: 12 }} />
                      ) : subCategories.length > 0 ? (
                        <View style={styles.skillsGrid}>
                          {subCategories.map((sk) => {
                            const isSel = selectedSkills.includes(sk.slug);
                            return (
                              <TouchableOpacity
                                key={sk.slug}
                                style={[styles.skillTag, isSel && styles.skillTagSelected]}
                                onPress={() => toggleSkill(sk.slug)}
                                activeOpacity={0.7}
                              >
                                <Text style={[styles.skillTagText, isSel && styles.skillTagTextSelected]}>
                                  {isSel ? '✓ ' : '+ '}
                                  {hi ? sk.name_hindi : sk.name}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      ) : (
                        <Text style={styles.noSkillsText}>
                          {hi ? 'इस श्रेणी में कोई विशेष कौशल उपलब्ध नहीं हैं' : 'No specific skills listed'}
                        </Text>
                      )}
                    </>
                  ) : null}

                  {/* Experience & Daily Wage */}
                  <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
                    <TextInput
                      label={hi ? 'अनुभव (वर्ष) / Exp' : 'Exp (Years)'}
                      style={[styles.input, { flex: 1 }]}
                      value={experience}
                      onChangeText={setExperience}
                      keyboardType="numeric"
                      mode="outlined"
                      activeOutlineColor="#FF6B00"
                    />
                    <TextInput
                      label={hi ? 'दैनिक दिहाड़ी (₹)' : 'Daily Wage (₹)'}
                      style={[styles.input, { flex: 1 }]}
                      value={expectedWage}
                      onChangeText={setExpectedWage}
                      keyboardType="numeric"
                      mode="outlined"
                      activeOutlineColor="#FF6B00"
                    />
                  </View>

                  {/* Base Location Address */}
                  <TextInput
                    label={hi ? 'गाँव / क्षेत्र / पता' : 'Base Address / Location'}
                    style={styles.input}
                    value={baseAddress}
                    onChangeText={setBaseAddress}
                    placeholder={hi ? 'जैसे: रामपुर, वार्ड 5' : 'e.g. Village, Ward 5'}
                    mode="outlined"
                    activeOutlineColor="#FF6B00"
                  />
                </>
              )}

              {/* ── Location Setup ── */}
              <View style={styles.sectionDivider} />
              <Text style={styles.sectionHeading}>
                📍 {hi ? 'कार्य क्षेत्र (जिला एवं राज्य)' : 'Working Location'}
              </Text>

              {/* State Picker */}
              <TouchableOpacity style={styles.dropdownBtn} onPress={() => setShowStateModal(true)}>
                <Text style={styles.dropdownBtnLabel}>{hi ? 'राज्य / State' : 'State'}</Text>
                <Text style={styles.dropdownBtnVal}>{selectedState || (hi ? 'राज्य चुनें' : 'Select State')}</Text>
              </TouchableOpacity>

              {/* District Picker */}
              <TouchableOpacity style={styles.dropdownBtn} onPress={() => setShowDistrictModal(true)}>
                <Text style={styles.dropdownBtnLabel}>{hi ? 'जिला / District' : 'District'}</Text>
                <Text style={styles.dropdownBtnVal}>{district || (hi ? 'जिला चुनें' : 'Select District')}</Text>
              </TouchableOpacity>
            </>
          )}

          {/* Submit Button */}
          <Button
            mode="contained"
            style={styles.saveButton}
            contentStyle={{ paddingVertical: 6 }}
            onPress={handleSubmit}
            loading={isLoading}
            disabled={isLoading}
            buttonColor="#FF6B00"
          >
            💾 {hi ? 'प्रोफ़ाइल सहेजें' : 'Save Changes'}
          </Button>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── State Modal ── */}
      <Modal visible={showStateModal} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{hi ? 'राज्य चुनें' : 'Select State'}</Text>
            <FlatList
              data={STATES_AND_DISTRICTS.map((s) => s.name)}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    setSelectedState(item);
                    setDistrict('');
                    setShowStateModal(false);
                  }}
                >
                  <Text style={styles.modalItemText}>{item}</Text>
                </TouchableOpacity>
              )}
            />
            <Button onPress={() => setShowStateModal(false)} textColor="#FF6B00">
              {hi ? 'बंद करें' : 'Close'}
            </Button>
          </View>
        </View>
      </Modal>

      {/* ── District Modal ── */}
      <Modal visible={showDistrictModal} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{hi ? 'जिला चुनें' : 'Select District'}</Text>
            <FlatList
              data={
                (STATES_AND_DISTRICTS.find((s) => s.name === selectedState)?.districts || []).map((d) => d.name)
              }
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    setDistrict(item);
                    setShowDistrictModal(false);
                  }}
                >
                  <Text style={styles.modalItemText}>{item}</Text>
                </TouchableOpacity>
              )}
            />
            <Button onPress={() => setShowDistrictModal(false)} textColor="#FF6B00">
              {hi ? 'बंद करें' : 'Close'}
            </Button>
          </View>
        </View>
      </Modal>

      {/* ── Full Screen Image Viewer ── */}
      <Modal visible={isImageViewerVisible} transparent={true} animationType="fade" onRequestClose={() => setIsImageViewerVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' }}>
          <TouchableOpacity 
            style={{ position: 'absolute', top: Math.max(insets.top, 20) + 10, right: 20, zIndex: 10, padding: 10, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20 }} 
            onPress={() => setIsImageViewerVisible(false)}
          >
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>✕ {hi ? 'बंद करें' : 'Close'}</Text>
          </TouchableOpacity>
          {photoUri && <Image source={{ uri: photoUri }} style={{ width: '100%', height: '80%', resizeMode: 'contain' }} />}
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  loadingCenter: { justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: '#fff', elevation: 2 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#333' },
  content: { padding: 16, paddingBottom: 40 },

  photoSection: { alignItems: 'center', marginBottom: 20 },
  photoContainer: { position: 'relative' },
  photoImg: { width: 96, height: 96, borderRadius: 48, borderWidth: 3, borderColor: '#FF6B00' },
  photoPlaceholder: {
    width: 96, height: 96, borderRadius: 48, backgroundColor: '#FFF3E8',
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FF6B00',
  },
  photoBadge: {
    position: 'absolute', bottom: 0, right: 0,
    backgroundColor: '#FF6B00', width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff',
  },
  changePhotoText: { color: '#FF6B00', fontSize: 13, fontWeight: '700' },

  sectionHeading: { fontSize: 15, fontWeight: '700', color: '#2D3748', marginBottom: 12 },
  sectionDivider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 20 },
  label: { fontSize: 13, fontWeight: '600', color: '#4A5568', marginBottom: 6 },
  input: { marginBottom: 12, backgroundColor: '#fff' },
  inputDisabled: { backgroundColor: '#EDF2F7' },

  genderBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0',
    alignItems: 'center', backgroundColor: '#fff',
  },
  genderBtnSelected: { borderColor: '#FF6B00', backgroundColor: '#FFF3E8' },
  genderBtnText: { fontSize: 13, color: '#4A5568', fontWeight: '600' },
  genderBtnTextSelected: { color: '#FF6B00' },

  catChip: { marginRight: 6, backgroundColor: '#EDF2F7' },
  catChipSelected: { backgroundColor: '#FFEDD5' },

  skillsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 8 },
  skillTag: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    backgroundColor: '#EDF2F7', borderWidth: 1, borderColor: '#CBD5E0',
  },
  skillTagSelected: { backgroundColor: '#FFEDD5', borderColor: '#FF6B00' },
  skillTagText: { fontSize: 12, color: '#4A5568', fontWeight: '500' },
  skillTagTextSelected: { color: '#FF6B00', fontWeight: '700' },
  noSkillsText: { fontSize: 12, color: '#A0AEC0', fontStyle: 'italic', marginVertical: 8 },

  dropdownBtn: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#CBD5E0', borderRadius: 8,
    padding: 12, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  dropdownBtnLabel: { fontSize: 12, color: '#718096' },
  dropdownBtnVal: { fontSize: 14, fontWeight: '600', color: '#2D3748' },

  saveButton: { marginTop: 24, borderRadius: 12 },

  // Driver toggle buttons
  toggleBtn: {
    flex: 1, height: 48, borderWidth: 1.5, borderColor: '#E2E8F0',
    borderRadius: 10, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#fff',
  },
  toggleBtnSel: { borderColor: '#FF6B00', backgroundColor: '#FFF3E8' },
  toggleBtnText: { fontSize: 14, color: '#718096', fontWeight: '600' },
  toggleBtnTextSel: { color: '#FF6B00', fontWeight: '700' },

  // Vehicle type chips (Driver)
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1.5, borderColor: '#E2E8F0', backgroundColor: '#fff',
  },
  chipSel: { borderColor: '#673AB7', backgroundColor: '#EDE7F6' },
  chipText: { fontSize: 12, color: '#718096', fontWeight: '600' },
  chipTextSel: { color: '#673AB7', fontWeight: '700' },

  // Transport chips & buttons
  transportChip: {
    paddingHorizontal: 13, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1.5, borderColor: '#E2E8F0', backgroundColor: '#fff',
  },
  transportChipSel: { borderColor: '#00838F', backgroundColor: '#E0F7FA' },
  transportChipText: { fontSize: 12.5, color: '#4A5568', fontWeight: '600' },
  transportChipTextSel: { color: '#00695C', fontWeight: '700' },

  showMoreBtn: {
    paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8,
    backgroundColor: '#F3F4F6', alignSelf: 'flex-start',
    marginBottom: 14, borderWidth: 1, borderColor: '#E5E7EB',
  },
  showMoreBtnText: { fontSize: 12, color: '#374151', fontWeight: '700' },

  usageBtn: {
    flex: 1, minWidth: 95, paddingVertical: 10, paddingHorizontal: 8,
    borderRadius: 10, borderWidth: 1.5, borderColor: '#E2E8F0',
    alignItems: 'center', backgroundColor: '#fff',
  },
  usageBtnSel: { borderColor: '#00838F', backgroundColor: '#E0F7FA' },
  usageBtnText: { fontSize: 13, color: '#4A5568', fontWeight: '600' },
  usageBtnTextSel: { color: '#00695C', fontWeight: '700' },

  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '60%' },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#2D3748', marginBottom: 12 },
  modalItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#EDF2F7' },
  modalItemText: { fontSize: 14, color: '#2D3748' },
});
