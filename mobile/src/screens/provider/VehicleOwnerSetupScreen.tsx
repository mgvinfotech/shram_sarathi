import React, { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View, ScrollView, StyleSheet, Alert, KeyboardAvoidingView,
  Platform, TouchableOpacity,
} from 'react-native';
import { Text, TextInput, Button, Surface, Divider, Chip } from 'react-native-paper';
import * as Location from 'expo-location';
import { api } from '../../services/api';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  validateVehicleNumber,
  validateDrivingLicense,
  validateAadhaar,
  validateVoterId,
  validateIfsc,
  validateBankAccount,
} from '../../utils/idValidation';

// Supported vehicle types
const VEHICLE_TYPES = [
  { label: 'Bike 🏍️',           value: 'bike',         category: ['passenger', 'delivery'] },
  { label: 'E-Rickshaw ⚡',     value: 'e_rickshaw',   category: ['passenger', 'goods', 'delivery'] },
  { label: 'Auto 🛺',           value: 'auto',         category: ['passenger'] },
  { label: 'WagonR / Dzire 🚗', value: 'small_car',    category: ['passenger'] },
  { label: 'Scorpio / Bolero 🚙', value: 'suv',        category: ['passenger'] },
  { label: 'Pickup / Dala 🛻',   value: 'pickup',       category: ['goods', 'delivery'] },
  { label: 'Chota Hathi 🚚',    value: 'chota_hathi',  category: ['goods'] },
  { label: 'Loader 🏗️',         value: 'loader',       category: ['goods'] },
  { label: 'Tractor 🚜',        value: 'tractor',      category: ['goods'] },
  { label: 'Truck (6-10 Wheel) 🚛', value: 'truck',   category: ['goods'] },
  { label: 'Mini Bus / Traveler 🚐', value: 'minibus', category: ['passenger'] },
  { label: 'Bus 🚌',            value: 'bus',          category: ['passenger'] },
  { label: 'JCB / Excavator 🚜', value: 'jcb',         category: ['goods'] },
  { label: 'Tipper / Dumper 🚜', value: 'tipper',      category: ['goods'] },
  { label: 'Other Vehicle 🚘',  value: 'other',        category: ['passenger', 'goods'] },
];

interface Props { navigation: any; }

export default function VehicleOwnerSetupScreen({ navigation }: Props) {
  const { lang, t } = useLanguage();
  const [ownerName, setOwnerName]       = useState('');
  const [ownerIdNo, setOwnerIdNo]       = useState('');
  const [driverName, setDriverName]     = useState('');
  const [driverLicense, setDriverLicense] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [perKmRate, setPerKmRate]       = useState('');
  const [bankAccount, setBankAccount]   = useState('');
  const [bankIfsc, setBankIfsc]         = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [district, setDistrict]         = useState('');
  const [state, setState]               = useState('');
  const [sameAsOwner, setSameAsOwner]   = useState(false);

  // Usage checkboxes
  const [isPassenger, setIsPassenger]   = useState(false);
  const [isGoods, setIsGoods]           = useState(false);
  const [isDelivery, setIsDelivery]     = useState(false);
  const [expandVehicles, setExpandVehicles] = useState(false);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  // Driver's current GPS location — for distance sorting
  const [driverLat, setDriverLat] = useState<number | null>(null);
  const [driverLng, setDriverLng] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          setDriverLat(loc.coords.latitude);
          setDriverLng(loc.coords.longitude);
        }
      } catch {
        // GPS optional
      }
    })();
  }, []);

  useFocusEffect(
    useCallback(() => {
      // Fetch existing setup data if any
      api.get('/api/transport/vehicle-profile')
        .then(res => {
          const data = res.data;
          if (data && data.vehicle_number) {
            setOwnerName(data.owner_name || '');
            setOwnerIdNo(data.owner_id_number || '');
            setDriverName(data.driver_name || '');
            setDriverLicense(data.driver_license || '');
            setVehicleNumber(data.vehicle_number || '');
            setSelectedVehicle(data.vehicle_type || '');
            setPerKmRate(data.per_km_rate ? data.per_km_rate.toString() : '');
            setIsPassenger(!!data.is_passenger_vehicle);
            setIsGoods(!!data.is_goods_vehicle);
            setIsDelivery(!!data.is_delivery_vehicle);
            setBankAccount(data.bank_account_number || '');
            setBankIfsc(data.bank_ifsc || '');
            setReferralCode(data.referral_code || '');
            setDistrict(data.district || '');
            setState(data.state || '');
          }
        })
        .catch(err => {
          console.log('Error fetching vehicle profile', err);
        });
    }, [])
  );

  const handleSubmit = async () => {
    if (!ownerName || !vehicleNumber || !selectedVehicle || !perKmRate) {
      Alert.alert('', lang === 'hi' ? 'मालिक का नाम, गाड़ी नंबर, प्रकार और रेट आवश्यक हैं।' : 'Owner name, vehicle number, type, and rate are required.');
      return;
    }
    if (!isPassenger && !isGoods && !isDelivery) {
      Alert.alert('', lang === 'hi' ? 'कृपया कम से कम एक उपयोग चुनें (यात्री / माल / डिलीवरी)।' : 'Please select at least one usage category (Passenger / Goods / Delivery).');
      return;
    }
    if (!district || !state) {
      Alert.alert('', lang === 'hi' ? 'कृपया अपना जिला और राज्य दर्ज करें।' : 'Please enter your operating district and state.');
      return;
    }

    const rcCheck = validateVehicleNumber(vehicleNumber);
    if (!rcCheck.isValid) {
      Alert.alert(lang === 'hi' ? 'अमान्य गाड़ी नंबर' : 'Invalid Vehicle Number', lang === 'hi' ? rcCheck.errorHi : rcCheck.error);
      return;
    }

    if (ownerIdNo.trim()) {
      const cleanOwnerId = ownerIdNo.replace(/[\s-]/g, '');
      const isAadhaar = /^\d+$/.test(cleanOwnerId);
      const idCheck = isAadhaar ? validateAadhaar(cleanOwnerId) : validateVoterId(cleanOwnerId);
      if (!idCheck.isValid) {
        Alert.alert(lang === 'hi' ? 'अमान्य पहचान पत्र' : 'Invalid Owner ID', lang === 'hi' ? idCheck.errorHi : idCheck.error);
        return;
      }
    }

    if (driverLicense.trim()) {
      const dlCheck = validateDrivingLicense(driverLicense);
      if (!dlCheck.isValid) {
        Alert.alert(lang === 'hi' ? 'अमान्य ड्राइविंग लाइसेंस' : 'Invalid Driving License', lang === 'hi' ? dlCheck.errorHi : dlCheck.error);
        return;
      }
    }

    if (bankIfsc.trim()) {
      const ifscCheck = validateIfsc(bankIfsc);
      if (!ifscCheck.isValid) {
        Alert.alert(lang === 'hi' ? 'अमान्य IFSC कोड' : 'Invalid IFSC Code', lang === 'hi' ? ifscCheck.errorHi : ifscCheck.error);
        return;
      }
    }

    if (bankAccount.trim()) {
      const accCheck = validateBankAccount(bankAccount);
      if (!accCheck.isValid) {
        Alert.alert(lang === 'hi' ? 'अमान्य बैंक खाता' : 'Invalid Bank Account', lang === 'hi' ? accCheck.errorHi : accCheck.error);
        return;
      }
    }

    setLoading(true);
    try {
      await api.post('/api/transport/vehicle-setup', {
        owner_name:           ownerName,
        owner_id_number:      ownerIdNo || undefined,
        driver_name:          sameAsOwner ? ownerName : (driverName || ownerName),
        driver_license:       driverLicense || undefined,
        vehicle_number:       vehicleNumber.toUpperCase(),
        vehicle_type:         selectedVehicle,
        is_passenger_vehicle: isPassenger,
        is_goods_vehicle:     isGoods,
        is_delivery_vehicle:  isDelivery,
        per_km_rate:          parseFloat(perKmRate),
        bank_account_number:  bankAccount || undefined,
        bank_ifsc:            bankIfsc || undefined,
        referral_code:        referralCode || undefined,
        district,
        state,
        // Driver's GPS — used for distance sorting in vehicle search
        lat: driverLat ?? undefined,
        lng: driverLng ?? undefined,
      });
      setSuccess(true);
    } catch (err: any) {
      Alert.alert('❌', err.response?.data?.detail || err.response?.data?.message || (lang === 'hi' ? 'सेटअप विफल रहा। कृपया पुनः प्रयास करें।' : 'Setup failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.successContainer}>
          <Text style={styles.successIcon}>🎉</Text>
          <Text style={styles.successTitle}>{lang === 'hi' ? 'परिवहन प्रोफाइल तैयार!' : 'Parivahan Profile Ready!'}</Text>
          <Surface style={styles.successCard} elevation={2}>
            <Text style={styles.successInfo}>
              ✅ {lang === 'hi' ? 'आपका वाहन प्रोफाइल सेव हो गया है।' : 'Your vehicle profile is saved.'}{'\n\n'}
              {lang === 'hi' ? 'अब आपको ऑनलाइन होने पर बुकिंग रिक्वेस्ट्स मिलेंगी।' : 'You will now receive booking requests when Online.'}
            </Text>
          </Surface>
          <Button
            mode="contained"
            buttonColor="#FF6B00"
            style={styles.btn}
            labelStyle={styles.btnLabel}
            onPress={() => navigation.replace('ProviderApp')}
          >
            {lang === 'hi' ? 'डैशबोर्ड पर जाएं' : 'Go to Dashboard'}
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerEmoji}>🚗</Text>
            <Text style={styles.title}>{lang === 'hi' ? 'परिवहन सेवा सेटअप' : 'Parivahan Seva Setup'}</Text>
            <Text style={styles.subtitle}>
              {lang === 'hi' ? 'अपना वाहन प्रोफाइल बनाएं और प्रति-किमी रेट सेट करें' : 'Create your vehicle profile and set per-km rate'}
            </Text>
          </View>

          {/* Owner Details */}
          <Surface style={styles.card} elevation={2}>
            <Text style={styles.sectionTitle}>{lang === 'hi' ? '👤 मालिक / Owner Details' : '👤 Owner Details'}</Text>
            <Divider style={{ marginBottom: 12 }} />

            <Text style={styles.fieldLabel}>{lang === 'hi' ? 'मालिक का नाम (Owner Name) *' : 'Owner Name *'}</Text>
            <TextInput
              value={ownerName}
              onChangeText={setOwnerName}
              mode="outlined"
              style={styles.input}
              activeOutlineColor="#FF6B00"
              placeholder={lang === 'hi' ? 'पूरा नाम दर्ज करें' : 'Enter full name'}
            />

            <Text style={styles.fieldLabel}>{lang === 'hi' ? 'पहचान पत्र नंबर (Aadhaar / Voter ID)' : 'ID Number (Aadhaar / Voter ID)'}</Text>
            <TextInput
              value={ownerIdNo}
              onChangeText={setOwnerIdNo}
              mode="outlined"
              style={styles.input}
              activeOutlineColor="#FF6B00"
              placeholder="XXXX-XXXX-XXXX"
            />
          </Surface>

          {/* Driver Details */}
          <Surface style={styles.card} elevation={2}>
            <Text style={styles.sectionTitle}>{lang === 'hi' ? '🧑‍✈️ चालक / Driver Details' : '🧑‍✈️ Driver Details'}</Text>
            <Divider style={{ marginBottom: 12 }} />

            <TouchableOpacity
              style={styles.checkRow}
              onPress={() => {
                setSameAsOwner(!sameAsOwner);
                if (!sameAsOwner) setDriverName('');
              }}
            >
              <View style={[styles.checkbox, sameAsOwner && styles.checkboxChecked]}>
                {sameAsOwner && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.checkLabel}>{lang === 'hi' ? 'मालिक और चालक एक ही हैं (Same as Owner)' : 'Same as Owner'}</Text>
            </TouchableOpacity>

            {!sameAsOwner && (
              <>
                <Text style={styles.fieldLabel}>{lang === 'hi' ? 'चालक का नाम (Driver Name)' : 'Driver Name'}</Text>
                <TextInput
                  value={driverName}
                  onChangeText={setDriverName}
                  mode="outlined"
                  style={styles.input}
                  activeOutlineColor="#FF6B00"
                  placeholder={lang === 'hi' ? 'चालक का नाम दर्ज करें' : 'Enter driver name'}
                />
              </>
            )}

            <Text style={styles.fieldLabel}>Driving License Number</Text>
            <TextInput
              value={driverLicense}
              onChangeText={setDriverLicense}
              mode="outlined"
              style={styles.input}
              activeOutlineColor="#FF6B00"
              placeholder="UP44-XXXXXXX"
              autoCapitalize="characters"
            />
          </Surface>

          {/* Vehicle Details */}
          <Surface style={styles.card} elevation={2}>
            <Text style={styles.sectionTitle}>{lang === 'hi' ? '🚗 गाड़ी विवरण (Vehicle Details)' : '🚗 Vehicle Details'}</Text>
            <Divider style={{ marginBottom: 12 }} />

            <Text style={styles.fieldLabel}>{lang === 'hi' ? 'गाड़ी का नंबर (Registration) *' : 'Vehicle Number (Registration) *'}</Text>
            <TextInput
              value={vehicleNumber}
              onChangeText={setVehicleNumber}
              mode="outlined"
              style={styles.input}
              activeOutlineColor="#FF6B00"
              placeholder="UP44-XXXX"
              autoCapitalize="characters"
            />

            <Text style={styles.fieldLabel}>{lang === 'hi' ? 'गाड़ी का प्रकार (Vehicle Type) *' : 'Vehicle Type *'}</Text>
            <View style={{ marginBottom: 14 }}>
              <ScrollView
                nestedScrollEnabled={true}
                style={expandVehicles ? { maxHeight: 210, borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 10, padding: 8, backgroundColor: '#F9FAFB' } : undefined}
                contentContainerStyle={styles.chipGrid}
                showsVerticalScrollIndicator={expandVehicles}
              >
                {(expandVehicles ? VEHICLE_TYPES : VEHICLE_TYPES.slice(0, 6)).map(v => (
                  <Chip
                    key={v.value}
                    selected={selectedVehicle === v.value}
                    onPress={() => setSelectedVehicle(v.value)}
                    style={[styles.chip, selectedVehicle === v.value && styles.chipSelected]}
                    textStyle={selectedVehicle === v.value ? styles.chipTextSelected : styles.chipText}
                    mode="outlined"
                  >
                    {v.label}
                  </Chip>
                ))}
              </ScrollView>

              <TouchableOpacity
                style={{
                  paddingVertical: 7,
                  paddingHorizontal: 12,
                  borderRadius: 8,
                  backgroundColor: '#F3F4F6',
                  alignSelf: 'flex-start',
                  marginTop: 6,
                  borderWidth: 1,
                  borderColor: '#E5E7EB',
                }}
                onPress={() => setExpandVehicles(!expandVehicles)}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 12, color: '#374151', fontWeight: '700' }}>
                  {expandVehicles
                    ? (lang === 'hi' ? '➖ कम गाड़ियां देखें (Show Less)' : '➖ Show Less')
                    : (lang === 'hi' ? `➕ और गाड़ियां देखें (+${VEHICLE_TYPES.length - 6} और विकल्प)` : `➕ Show More (+${VEHICLE_TYPES.length - 6})`)}
                </Text>
              </TouchableOpacity>
            </View>
          </Surface>

          {/* Usage Category */}
          <Surface style={styles.card} elevation={2}>
            <Text style={styles.sectionTitle}>{lang === 'hi' ? '📋 सेवा प्रकार (Usage) *' : '📋 Usage Category *'}</Text>
            <Text style={styles.fieldHint}>{lang === 'hi' ? 'एक या अधिक चुनें' : 'Select one or more'}</Text>
            <Divider style={{ marginBottom: 12 }} />

            <TouchableOpacity style={styles.checkRow} onPress={() => setIsPassenger(!isPassenger)}>
              <View style={[styles.checkbox, isPassenger && styles.checkboxChecked]}>
                {isPassenger && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <View>
                <Text style={styles.checkLabel}>{lang === 'hi' ? '🧑‍🤝‍🧑 यात्री वाहन (Passenger Ride)' : '🧑‍🤝‍🧑 Passenger Ride'}</Text>
                <Text style={styles.checkSub}>{lang === 'hi' ? 'सवारी उठाने के लिए' : 'For passenger transport'}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.checkRow} onPress={() => setIsGoods(!isGoods)}>
              <View style={[styles.checkbox, isGoods && styles.checkboxChecked]}>
                {isGoods && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <View>
                <Text style={styles.checkLabel}>{lang === 'hi' ? '📦 मालवाहक वाहन (Goods / Logistics)' : '📦 Goods / Logistics'}</Text>
                <Text style={styles.checkSub}>{lang === 'hi' ? 'माल ढोने के लिए' : 'For commercial freight'}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.checkRow} onPress={() => setIsDelivery(!isDelivery)}>
              <View style={[styles.checkbox, isDelivery && styles.checkboxChecked]}>
                {isDelivery && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <View>
                <Text style={styles.checkLabel}>{lang === 'hi' ? '🚴 डिलीवरी वाहन (Parcel Delivery)' : '🚴 Parcel Delivery'}</Text>
                <Text style={styles.checkSub}>{lang === 'hi' ? 'लोकल कूरियर और पार्सल के लिए' : 'For local parcel delivery'}</Text>
              </View>
            </TouchableOpacity>
          </Surface>

          {/* Per-km Rate */}
          <Surface style={styles.card} elevation={2}>
            <Text style={styles.sectionTitle}>{lang === 'hi' ? '💰 किराया / Fare Rate' : '💰 Fare Rate'}</Text>
            <Divider style={{ marginBottom: 12 }} />
            <Text style={styles.fieldHint}>
              {lang === 'hi' ? 'यह रेट आपकी प्रोफाइल में सेव होगा। बुकिंग के समय ग्राहक को कुल किराया दिखेगा।' : 'This rate will be saved to your profile and used to calculate fare.'}
            </Text>

            <Text style={styles.fieldLabel}>{lang === 'hi' ? 'प्रति किलोमीटर रेट (₹/km) *' : 'Per Kilometer Rate (₹/km) *'}</Text>
            <TextInput
              value={perKmRate}
              onChangeText={setPerKmRate}
              mode="outlined"
              style={styles.input}
              activeOutlineColor="#FF6B00"
              keyboardType="numeric"
              placeholder={lang === 'hi' ? 'किराया दर्ज करें' : 'Enter rate'}
              right={<TextInput.Affix text="₹/km" />}
            />
          </Surface>

          {/* Bank Details */}
          <Surface style={styles.card} elevation={2}>
            <Text style={styles.sectionTitle}>{lang === 'hi' ? '🏦 बैंक विवरण (Bank Details)' : '🏦 Bank Details'}</Text>
            <Divider style={{ marginBottom: 12 }} />

            <Text style={styles.fieldLabel}>Bank Account Number</Text>
            <TextInput
              value={bankAccount}
              onChangeText={setBankAccount}
              mode="outlined"
              style={styles.input}
              activeOutlineColor="#FF6B00"
              keyboardType="numeric"
              placeholder="1234567890123456"
            />

            <Text style={styles.fieldLabel}>IFSC Code</Text>
            <TextInput
              value={bankIfsc}
              onChangeText={setBankIfsc}
              mode="outlined"
              style={styles.input}
              activeOutlineColor="#FF6B00"
              autoCapitalize="characters"
              placeholder="SBIN0001234"
            />
          </Surface>

          {/* Location */}
          <Surface style={styles.card} elevation={2}>
            <Text style={styles.sectionTitle}>{lang === 'hi' ? '📍 काम का क्षेत्र (Location)' : '📍 Operating Location'}</Text>
            <Divider style={{ marginBottom: 12 }} />

            <Text style={styles.fieldLabel}>{lang === 'hi' ? 'जिला (District) *' : 'District *'}</Text>
            <TextInput
              value={district}
              onChangeText={setDistrict}
              mode="outlined"
              style={styles.input}
              activeOutlineColor="#FF6B00"
              placeholder={lang === 'hi' ? 'अपना जिला दर्ज करें' : 'Enter your district'}
            />

            <Text style={styles.fieldLabel}>{lang === 'hi' ? 'राज्य (State) *' : 'State *'}</Text>
            <TextInput
              value={state}
              onChangeText={setState}
              mode="outlined"
              style={styles.input}
              activeOutlineColor="#FF6B00"
              placeholder={lang === 'hi' ? 'अपना राज्य दर्ज करें' : 'Enter your state'}
            />
          </Surface>

          {/* Agent Referral Code */}
          <Surface style={styles.card} elevation={2}>
            <Text style={styles.sectionTitle}>🎟️ Agent Referral Code (Optional)</Text>
            <TextInput
              value={referralCode}
              onChangeText={setReferralCode}
              mode="outlined"
              style={styles.input}
              activeOutlineColor="#FF6B00"
              autoCapitalize="characters"
              placeholder="REF-XXXXX"
            />
          </Surface>

          <Button
            mode="contained"
            onPress={handleSubmit}
            loading={loading}
            disabled={loading}
            buttonColor="#FF6B00"
            style={styles.btn}
            labelStyle={styles.btnLabel}
          >
            {lang === 'hi' ? 'प्रोफाइल सेव करें' : 'Save Profile'}
          </Button>

          <Button
            mode="outlined"
            onPress={() => navigation.goBack()}
            style={[styles.btn, { marginTop: 8 }]}
            textColor="#666"
          >
            Wapas Jao
          </Button>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:          { flex: 1, backgroundColor: '#F8F9FA' },
  content:            { padding: 16, paddingBottom: 140 },
  header:             { alignItems: 'center', marginBottom: 20 },
  headerEmoji:        { fontSize: 52, marginBottom: 8 },
  title:              { fontSize: 24, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 4 },
  subtitle:           { fontSize: 13, color: '#666', textAlign: 'center', lineHeight: 20 },
  card:               { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 16 },
  sectionTitle:       { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 8 },
  fieldLabel:         { fontSize: 13, fontWeight: '600', color: '#444', marginBottom: 4, marginTop: 12 },
  fieldHint:          { fontSize: 12, color: '#888', marginBottom: 8, lineHeight: 18 },
  input:              { backgroundColor: '#fff', marginBottom: 4 },
  chipGrid:           { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chip:               { marginBottom: 4 },
  chipSelected:       { backgroundColor: '#FFF5EE', borderColor: '#FF6B00' },
  chipText:           { fontSize: 12, color: '#555' },
  chipTextSelected:   { fontSize: 12, color: '#FF6B00', fontWeight: '600' },
  checkRow:           { flexDirection: 'row', alignItems: 'flex-start', marginVertical: 10, gap: 12 },
  checkbox:           {
    width: 24, height: 24, borderRadius: 6,
    borderWidth: 2, borderColor: '#ddd',
    justifyContent: 'center', alignItems: 'center',
    marginTop: 2,
  },
  checkboxChecked:    { borderColor: '#FF6B00', backgroundColor: '#FF6B00' },
  checkmark:          { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  checkLabel:         { fontSize: 14, fontWeight: '600', color: '#333' },
  checkSub:           { fontSize: 12, color: '#888', marginTop: 2 },
  btn:                { borderRadius: 10, paddingVertical: 4, marginTop: 8 },
  btnLabel:           { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  // Success
  successContainer:   { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  successIcon:        { fontSize: 64, marginBottom: 12 },
  successTitle:       { fontSize: 26, fontWeight: 'bold', color: '#276749', marginBottom: 20 },
  successCard:        { backgroundColor: '#fff', borderRadius: 16, padding: 20, width: '100%', marginBottom: 24 },
  successInfo:        { fontSize: 14, color: '#555', lineHeight: 22, textAlign: 'center' },
});
