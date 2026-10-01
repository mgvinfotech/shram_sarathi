import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
  StatusBar,
} from 'react-native';
import { TextInput } from 'react-native-paper';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api, getErrorMessage } from '../../services/api';
import { useLanguage } from '../../i18n/LanguageContext';
import { STATES_AND_DISTRICTS } from '../../utils/locations';

type MemberType = 'labour' | 'karigar' | 'driver' | 'vehicle' | 'contractor';

const MEMBER_TYPES: { type: MemberType; labelHi: string; labelEn: string; icon: string; bonusText: string }[] = [
  { type: 'labour',     labelHi: 'श्रमिक\n(लेबर)',     labelEn: 'Labour',     icon: 'construct', bonusText: '₹10 बोनस' },
  { type: 'karigar',    labelHi: 'कारीगर',            labelEn: 'Karigar',    icon: 'hammer',    bonusText: '₹10 बोनस' },
  { type: 'driver',     labelHi: 'ड्राइवर',            labelEn: 'Driver',     icon: 'car-sport', bonusText: '₹10 बोनस' },
  { type: 'vehicle',    labelHi: 'गाड़ी\n(Vehicle)',  labelEn: 'Vehicle',    icon: 'bus',       bonusText: '₹20 FRC तुरंत' },
  { type: 'contractor', labelHi: 'ठेकेदार\n(Contractor)', labelEn: 'Contractor', icon: 'business', bonusText: '₹20 FRC तुरंत' },
];

export default function AgentAddLaborScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { lang } = useLanguage();

  const [selectedType, setSelectedType] = useState<MemberType>('labour');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male');
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['जनरल मजदूरी']);
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleType, setVehicleType] = useState('पिकअप / लोडर');
  const [companyName, setCompanyName] = useState('');

  // Location Fields
  const [selectedState, setSelectedState] = useState('Uttar Pradesh');
  const [district, setDistrict] = useState('Lucknow');
  const [block, setBlock] = useState('');
  const [village, setVillage] = useState('');
  const [pincode, setPincode] = useState('');
  const [address, setAddress] = useState('');

  const [showStateModal, setShowStateModal] = useState(false);
  const [showDistrictModal, setShowDistrictModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const selectedStateObj = STATES_AND_DISTRICTS.find((s) => s.name === selectedState) || STATES_AND_DISTRICTS[0];
  const availableDistricts = selectedStateObj ? selectedStateObj.districts.map((d) => d.name) : [];

  const handleSelectMemberType = (type: MemberType) => {
    setSelectedType(type);
    if (type === 'karigar') {
      setSelectedCategories(['इलेक्ट्रीशियन']);
    } else if (type === 'driver') {
      setSelectedCategories(['कमर्शियल ड्राइवर']);
    } else if (type === 'labour') {
      setSelectedCategories(['जनरल मजदूरी']);
    }
  };

  const toggleCategory = (cat: string) => {
    setSelectedCategories(prev => {
      if (prev.includes(cat)) {
        if (prev.length > 1) {
          return prev.filter(c => c !== cat);
        }
        return prev;
      }
      return [...prev, cat];
    });
  };

  const getTradeOptions = () => {
    if (selectedType === 'karigar') {
      return ['इलेक्ट्रीशियन', 'प्लम्बर', 'बढ़ई / कारपेंटर', 'राजमिस्त्री', 'पेंटर', 'वेल्डर'];
    }
    if (selectedType === 'driver') {
      return ['कमर्शियल ड्राइवर', 'पर्सनल ड्राइवर', 'हेवी ड्राइवर'];
    }
    return ['जनरल मजदूरी', 'भवन निर्माण', 'कृषि मजदूरी', 'लोडिंग / अनलोडिंग'];
  };

  const handleRegister = async () => {
    if (!name.trim()) {
      Alert.alert('त्रुटि', 'कृपया सदस्य का नाम दर्ज करें।');
      return;
    }
    if (phone.trim().length !== 10 || isNaN(Number(phone))) {
      Alert.alert('त्रुटि', 'कृपया 10 अंकों का वैध मोबाइल नंबर दर्ज करें।');
      return;
    }
    if (selectedType === 'vehicle' && !vehicleNumber.trim()) {
      Alert.alert('त्रुटि', 'कृपया गाड़ी का नंबर दर्ज करें।');
      return;
    }
    if (selectedType === 'contractor' && !companyName.trim()) {
      Alert.alert('त्रुटि', 'कृपया कंपनी / फर्म का नाम दर्ज करें।');
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        name: name.trim(),
        phone: phone.trim(),
        gender,
        member_type: selectedType,
        category: selectedType === 'vehicle' ? vehicleType : (selectedType === 'contractor' ? 'ठेकेदारी' : selectedCategories.join(', ')),
        sub_categories: selectedType === 'vehicle' ? [vehicleType] : (selectedType === 'contractor' ? ['ठेकेदारी'] : selectedCategories),
        vehicle_number: vehicleNumber.trim() || null,
        vehicle_type: vehicleType || null,
        company_name: companyName.trim() || null,
        state: selectedState,
        district: district.trim(),
        block: block.trim() || null,
        village: village.trim() || null,
        pincode: pincode.trim() || null,
        address: address.trim() || null,
      };

      const res = await api.post('/api/agent/add-member', payload);

      Alert.alert(
        '✅ पंजीकरण सफल!',
        res.data.message || `${name} को सफलतापूर्वक जोड़ दिया गया है।`,
        [
          {
            text: 'ठीक है',
            onPress: () => {
              setName('');
              setPhone('');
              setVehicleNumber('');
              setCompanyName('');
              setAddress('');
              navigation.navigate('AgentNetworkScreen');
            },
          },
        ]
      );
    } catch (err: any) {
      Alert.alert('त्रुटि', getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const topPadding = Math.max(insets.top, Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0);

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#0D253F" translucent={false} />

      {/* ── Top Header (Padded for Status Bar) ── */}
      <View style={[styles.header, { paddingTop: topPadding + 6 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>+ नया रजिस्ट्रेशन करें</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: '#F4F6F9' }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.content}
          contentContainerStyle={{ paddingBottom: 160 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Subtitle */}
          <Text style={styles.sectionSubtitle}>किस प्रकार का रजिस्ट्रेशन करना चाहते हैं?</Text>

          {/* ── 5 Category Selection Cards (PDF Page 1 UI) ── */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.typeScroll}>
            {MEMBER_TYPES.map((item) => {
              const isSelected = selectedType === item.type;
              return (
                <TouchableOpacity
                  key={item.type}
                  style={[styles.typeCard, isSelected && styles.typeCardSelected]}
                  activeOpacity={0.8}
                  onPress={() => handleSelectMemberType(item.type)}
                >
                  <View style={[styles.typeIconBox, isSelected && styles.typeIconBoxSelected]}>
                    <Ionicons
                      name={item.icon as any}
                      size={24}
                      color={isSelected ? '#0D253F' : '#666'}
                    />
                  </View>
                  <Text style={[styles.typeLabel, isSelected && styles.typeLabelSelected]}>
                    {item.labelHi}
                  </Text>
                  <View style={[styles.typeBonusBadge, isSelected && styles.typeBonusBadgeSelected]}>
                    <Text style={[styles.typeBonusText, isSelected && { color: '#0D253F' }]}>
                      {item.type === 'vehicle' || item.type === 'contractor' ? '₹20' : '₹10'}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* ── Incentive Info Card for chosen type ── */}
          <View style={styles.bonusInfoBox}>
            <Ionicons name="gift" size={20} color="#E65100" style={{ marginRight: 8 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.bonusInfoTitle}>
                {selectedType === 'vehicle' || selectedType === 'contractor'
                  ? 'तत्काल ₹20 FRC बोनस + 0.20% आजीवन कमीशन'
                  : '₹10 पेंडिंग बोनस + ₹1 प्रति बुकिंग कमीशन'}
              </Text>
              <Text style={styles.bonusInfoDesc}>
                {selectedType === 'vehicle' || selectedType === 'contractor'
                  ? 'जैसे ही इनका रजिस्ट्रेशन और सत्यापन (FRC) पूरा होगा, ₹20 तुरंत निकालने योग्य बैलेंस में जुड़ेगा।'
                  : 'यह सदस्य जैसे ही पहला काम स्वीकार करेंगे, ₹10 का बोनस तुरंत अनलॉक हो जाएगा।'}
              </Text>
            </View>
          </View>

          {/* ── Form Inputs ── */}
          <View style={styles.formCard}>
            <Text style={styles.formSectionTitle}>व्यक्तिगत विवरण (Personal Details)</Text>

            {/* Name */}
            <TextInput
              label="नाम (Name) *"
              value={name}
              onChangeText={setName}
              mode="outlined"
              style={styles.input}
              outlineColor="#DDD"
              activeOutlineColor="#0D253F"
              placeholder="उदा. राजेश कुमार"
            />

            {/* Phone */}
            <TextInput
              label="मोबाइल नंबर (Mobile Number) *"
              value={phone}
              onChangeText={setPhone}
              mode="outlined"
              keyboardType="phone-pad"
              maxLength={10}
              style={styles.input}
              outlineColor="#DDD"
              activeOutlineColor="#0D253F"
              placeholder="10 अंकों का मोबाइल नंबर"
              left={<TextInput.Affix text="+91 " />}
            />

            {/* Gender Selection */}
            <Text style={styles.genderLabel}>लिंग (Gender):</Text>
            <View style={styles.genderRow}>
              {[
                { key: 'male', label: 'पुरुष (Male)' },
                { key: 'female', label: 'महिला (Female)' },
                { key: 'other', label: 'अन्य (Other)' },
              ].map((g) => (
                <TouchableOpacity
                  key={g.key}
                  style={[styles.genderChip, gender === g.key && styles.genderChipActive]}
                  onPress={() => setGender(g.key as any)}
                >
                  <Text style={[styles.genderChipText, gender === g.key && styles.genderChipTextActive]}>
                    {g.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Type Specific Fields */}
            {selectedType === 'vehicle' && (
              <>
                <Text style={[styles.formSectionTitle, { marginTop: 14 }]}>गाड़ी का विवरण (Vehicle Info)</Text>
                <TextInput
                  label="गाड़ी नंबर (Vehicle Number) *"
                  value={vehicleNumber}
                  onChangeText={setVehicleNumber}
                  mode="outlined"
                  autoCapitalize="characters"
                  style={styles.input}
                  outlineColor="#DDD"
                  activeOutlineColor="#0D253F"
                  placeholder="उदा. UP14 AB 1234"
                />

                <Text style={styles.genderLabel}>गाड़ी का प्रकार:</Text>
                <View style={styles.genderRow}>
                  {['पिकअप / लोडर', 'छोटा हाथी', 'ऑटो / ई-रिक्शा', 'ट्रक', 'टैक्सी / कार'].map((vt) => (
                    <TouchableOpacity
                      key={vt}
                      style={[styles.genderChip, vehicleType === vt && styles.genderChipActive]}
                      onPress={() => setVehicleType(vt)}
                    >
                      <Text style={[styles.genderChipText, vehicleType === vt && styles.genderChipTextActive]}>
                        {vt}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {selectedType === 'contractor' && (
              <>
                <Text style={[styles.formSectionTitle, { marginTop: 14 }]}>कंपनी / फर्म विवरण (Contractor Info)</Text>
                <TextInput
                  label="कंपनी / फर्म का नाम *"
                  value={companyName}
                  onChangeText={setCompanyName}
                  mode="outlined"
                  style={styles.input}
                  outlineColor="#DDD"
                  activeOutlineColor="#0D253F"
                  placeholder="उदा. शक्ति कंस्ट्रक्शन"
                />
              </>
            )}

            {(selectedType === 'labour' || selectedType === 'karigar' || selectedType === 'driver') && (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
                  <Text style={styles.formSectionTitle}>काम का प्रकार (Category / Trade) *</Text>
                  <Text style={{ fontSize: 11.5, color: '#0D253F', fontWeight: '700' }}>
                    (एक से अधिक चुन सकते हैं)
                  </Text>
                </View>
                <View style={styles.genderRow}>
                  {getTradeOptions().map((cat) => {
                    const isSel = selectedCategories.includes(cat);
                    return (
                      <TouchableOpacity
                        key={cat}
                        style={[styles.genderChip, isSel && styles.genderChipActive]}
                        onPress={() => toggleCategory(cat)}
                      >
                        <Text style={[styles.genderChipText, isSel && styles.genderChipTextActive]}>
                          {isSel ? '✓ ' : ''}{cat}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}

            {/* Location Section */}
            <Text style={[styles.formSectionTitle, { marginTop: 16 }]}>कार्य क्षेत्र / पता (Location)</Text>

            {/* State Picker */}
            <TouchableOpacity style={styles.dropdownBtn} onPress={() => setShowStateModal(true)}>
              <Text style={styles.dropdownLabel}>राज्य (State):</Text>
              <Text style={styles.dropdownVal}>{selectedState}</Text>
              <Ionicons name="chevron-down" size={18} color="#666" />
            </TouchableOpacity>

            {/* District Picker */}
            <TouchableOpacity style={styles.dropdownBtn} onPress={() => setShowDistrictModal(true)}>
              <Text style={styles.dropdownLabel}>जिला (District):</Text>
              <Text style={styles.dropdownVal}>{district || 'जिला चुनें'}</Text>
              <Ionicons name="chevron-down" size={18} color="#666" />
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TextInput
                label="ब्लॉक / तहसील"
                value={block}
                onChangeText={setBlock}
                mode="outlined"
                style={[styles.input, { flex: 1 }]}
                outlineColor="#DDD"
                activeOutlineColor="#0D253F"
              />
              <TextInput
                label="पिनकोड"
                value={pincode}
                onChangeText={setPincode}
                keyboardType="numeric"
                maxLength={6}
                mode="outlined"
                style={[styles.input, { flex: 1 }]}
                outlineColor="#DDD"
                activeOutlineColor="#0D253F"
              />
            </View>

            <TextInput
              label="गली / मोहल्ला / पता"
              value={address}
              onChangeText={setAddress}
              mode="outlined"
              style={styles.input}
              outlineColor="#DDD"
              activeOutlineColor="#0D253F"
              placeholder="उदा. गली नं. 4, नया बाजार"
            />

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitBtn, isLoading && { opacity: 0.6 }]}
              disabled={isLoading}
              onPress={handleRegister}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="person-add" size={20} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.submitBtnText}>नया सदस्य जोड़ें</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* State Modal */}
      <Modal visible={showStateModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>राज्य चुनें</Text>
              <TouchableOpacity onPress={() => setShowStateModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={STATES_AND_DISTRICTS}
              keyExtractor={(item) => item.name}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    setSelectedState(item.name);
                    setDistrict(item.districts[0]?.name || '');
                    setShowStateModal(false);
                  }}
                >
                  <Text style={[styles.modalItemText, selectedState === item.name && { color: '#0D253F', fontWeight: 'bold' }]}>
                    {item.name} ({item.nameHi})
                  </Text>
                  {selectedState === item.name && <Ionicons name="checkmark" size={20} color="#0D253F" />}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* District Modal */}
      <Modal visible={showDistrictModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>जिला चुनें ({selectedState})</Text>
              <TouchableOpacity onPress={() => setShowDistrictModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={availableDistricts}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    setDistrict(item);
                    setShowDistrictModal(false);
                  }}
                >
                  <Text style={[styles.modalItemText, district === item && { color: '#0D253F', fontWeight: 'bold' }]}>
                    {item}
                  </Text>
                  {district === item && <Ionicons name="checkmark" size={20} color="#0D253F" />}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D253F',
  },
  header: {
    backgroundColor: '#0D253F',
    paddingHorizontal: 16,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 16,
    backgroundColor: '#F4F6F9',
  },
  sectionSubtitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  typeScroll: {
    gap: 10,
    paddingBottom: 4,
  },
  typeCard: {
    width: 90,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
  },
  typeCardSelected: {
    borderColor: '#0D253F',
    backgroundColor: '#E8F0FE',
  },
  typeIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  typeIconBoxSelected: {
    backgroundColor: '#fff',
  },
  typeLabel: {
    fontSize: 11,
    color: '#555',
    textAlign: 'center',
    fontWeight: '600',
    lineHeight: 14,
  },
  typeLabelSelected: {
    color: '#0D253F',
    fontWeight: 'bold',
  },
  typeBonusBadge: {
    marginTop: 6,
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  typeBonusBadgeSelected: {
    backgroundColor: '#FFF3E0',
  },
  typeBonusText: {
    fontSize: 10,
    color: '#777',
    fontWeight: 'bold',
  },
  bonusInfoBox: {
    flexDirection: 'row',
    backgroundColor: '#FFF8E1',
    borderRadius: 10,
    padding: 12,
    marginVertical: 14,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  bonusInfoTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#E65100',
    marginBottom: 2,
  },
  bonusInfoDesc: {
    fontSize: 11,
    color: '#6D4C41',
    lineHeight: 16,
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  formSectionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#0D253F',
    marginBottom: 10,
  },
  input: {
    marginBottom: 12,
    backgroundColor: '#fff',
    fontSize: 14,
  },
  genderLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#555',
    marginBottom: 6,
  },
  genderRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  genderChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  genderChipActive: {
    backgroundColor: '#0D253F',
    borderColor: '#0D253F',
  },
  genderChipText: {
    fontSize: 12,
    color: '#555',
  },
  genderChipTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  dropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  dropdownLabel: {
    fontSize: 12,
    color: '#777',
  },
  dropdownVal: {
    fontSize: 13,
    color: '#111',
    fontWeight: 'bold',
    flex: 1,
    marginLeft: 8,
  },
  submitBtn: {
    backgroundColor: '#0D253F',
    borderRadius: 10,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
    paddingBottom: 12,
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0D253F',
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  modalItemText: {
    fontSize: 14,
    color: '#333',
  },
});
