import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Platform,
  KeyboardAvoidingView, Modal, FlatList, TextInput,
} from 'react-native';
import { Button, Chip } from 'react-native-paper';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../../store';
import { updateRole, completeProfile } from '../../store/slices/authSlice';
import { useLanguage } from '../../i18n/LanguageContext';
import { api } from '../../services/api';
import { STATES_AND_DISTRICTS } from '../../utils/locations';
import {
  CATEGORY_CONFIG,
  SKILL_CATEGORIES,
  getCategoryConfig,
  type CategoryConfig,
} from '../../config/categories.config';

interface SubCategory {
  id: number;
  name: string;
  name_hindi: string;
  slug: string;
}

interface Props {
  navigation: any;
  route: any;
}

export default function ProviderSetupScreen({ navigation, route }: Props) {
  const { t, lang } = useLanguage();
  const dispatch = useDispatch<AppDispatch>();

  // If coming from RoleSelectorScreen, category is already known — skip the chip selection
  const preSelectedCategory: string = route.params?.initialCategory || '';

  const [selectedCategory, setSelectedCategory] = useState(preSelectedCategory);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [skillsLoading, setSkillsLoading] = useState(false);
  const [expectedWage, setExpectedWage] = useState('500');
  const [experience, setExperience] = useState('1-2 वर्ष');
  const [selectedState, setSelectedState] = useState('Madhya Pradesh');
  const [district, setDistrict] = useState('');
  const [showStateModal, setShowStateModal] = useState(false);
  const [showDistrictModal, setShowDistrictModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const categoryMeta: CategoryConfig | undefined = getCategoryConfig(selectedCategory);
  const isDedicatedCategory = !!categoryMeta?.dedicatedScreen;
  const isPreSelected = !!preSelectedCategory;

  // Fetch sub-categories when skill-based category is selected
  useEffect(() => {
    if (!selectedCategory || isDedicatedCategory) {
      setSubCategories([]);
      setSelectedSkills([]);
      return;
    }
    fetchSubCategories(selectedCategory);
  }, [selectedCategory]);

  const fetchSubCategories = async (slug: string) => {
    setSkillsLoading(true);
    setSelectedSkills([]);
    try {
      const res = await api.get(`/api/categories/${slug}/sub-categories`);
      setSubCategories(res.data || []);
    } catch {
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

  const handleSubmit = async () => {
    if (!selectedCategory) {
      Alert.alert('', lang === 'hi' ? 'कृपया एक श्रेणी चुनें' : 'Please select a category');
      return;
    }
    setIsLoading(true);
    try {
      let lat: number | undefined;
      let lng: number | undefined;
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
          lat = loc.coords.latitude;
          lng = loc.coords.longitude;
        }
      } catch {
        // Location optional
      }

      // Map category to standard role
      let targetRole: any = 'labour';
      if (selectedCategory === 'majdoor' || selectedCategory === 'labour') {
        targetRole = 'labour';
      } else if (selectedCategory === 'karigar') {
        targetRole = 'karigar';
      } else if (selectedCategory === 'taxi' || selectedCategory === 'driver') {
        targetRole = 'driver';
      } else if (selectedCategory === 'transport') {
        targetRole = 'transport';
      } else if (selectedCategory === 'thekedar' || selectedCategory === 'contractor') {
        targetRole = 'contractor';
      }

      // Save basic provider profile
      await api.post('/api/provider/setup', {
        category: targetRole,
        sub_categories: isDedicatedCategory ? [] : selectedSkills,
        skills_description: isDedicatedCategory ? '' : selectedSkills.join(', '),
        expected_daily_wage: parseFloat(expectedWage) || 500,
        experience_years: experience,
        lat,
        lng,
        working_locations: district ? [{ district, state: selectedState }] : [],
      });

      await dispatch(updateRole(targetRole));
      dispatch(completeProfile());

      // Redirect: dedicated-screen categories go to their own screen
      if (categoryMeta?.dedicatedScreen) {
        navigation.replace(categoryMeta.dedicatedScreen);
      } else {
        navigation.replace('ProviderApp');
      }
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.detail || (lang === 'hi' ? 'सेटअप विफल, पुनः प्रयास करें' : 'Setup failed'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>

          {/* ── Header ── */}
          <Text style={styles.title}>
            {lang === 'hi' ? 'अपनी प्रोफाइल बनाएं' : 'Set Up Your Profile'}
          </Text>
          <Text style={styles.subtitle}>
            {lang === 'hi' ? 'Saarthi पर आपका स्वागत है 🙏' : 'Welcome to Saarthi 🙏'}
          </Text>

          {/* ── Category Chips (only when NOT pre-selected from role screen) ── */}
          {!isPreSelected && (
            <>
              <Text style={styles.label}>
                {lang === 'hi' ? 'श्रेणी चुनें / Select Category *' : 'Select Category *'}
              </Text>
              <View style={styles.categoryGrid}>
                {CATEGORY_CONFIG.map((cat) => (
                  <Chip
                    key={cat.slug}
                    selected={selectedCategory === cat.slug}
                    onPress={() => setSelectedCategory(cat.slug)}
                    style={[
                      styles.categoryChip,
                      selectedCategory === cat.slug && styles.categoryChipSelected,
                    ]}
                    textStyle={[
                      styles.categoryChipText,
                      selectedCategory === cat.slug && styles.categoryChipTextSelected,
                    ]}
                  >
                    {cat.emoji} {lang === 'hi' ? cat.labelHi : cat.label}
                  </Chip>
                ))}
              </View>
            </>
          )}

          {/* ── Pre-selected: show category badge ── */}
          {isPreSelected && categoryMeta && (
            <View style={styles.selectedBadge}>
              <Text style={styles.selectedBadgeEmoji}>{categoryMeta.emoji}</Text>
              <View>
                <Text style={styles.selectedBadgeLabel}>
                  {lang === 'hi' ? categoryMeta.labelHi : categoryMeta.label}
                </Text>
                <Text style={styles.selectedBadgeSub}>
                  {lang === 'hi' ? 'आपकी चुनी हुई भूमिका' : 'Your selected role'}
                </Text>
              </View>
            </View>
          )}

          {/* ── Skills (only for skill-based categories) ── */}
          {selectedCategory && !isDedicatedCategory && (
            <>
              <Text style={[styles.label, { marginTop: 20 }]}>
                {lang === 'hi' ? 'हुनर / Skills' : 'Skills'}{' '}
                <Text style={styles.labelHint}>
                  {lang === 'hi' ? '(एक से ज़्यादा चुन सकते हैं)' : '(select one or more)'}
                </Text>
              </Text>

              {skillsLoading ? (
                <ActivityIndicator color="#FF6B00" style={{ marginVertical: 12 }} />
              ) : subCategories.length === 0 ? (
                <Text style={styles.noSkills}>
                  {lang === 'hi' ? 'इस श्रेणी में कोई skill नहीं है' : 'No skills available for this category'}
                </Text>
              ) : (
                <View style={styles.skillsGrid}>
                  {subCategories.map((sub) => {
                    const isSelected = selectedSkills.includes(sub.slug);
                    return (
                      <Chip
                        key={sub.slug}
                        selected={isSelected}
                        onPress={() => toggleSkill(sub.slug)}
                        style={[styles.skillChip, isSelected && styles.skillChipSelected]}
                      >
                        <Text style={[styles.skillChipText, isSelected && styles.skillChipTextSelected]}>
                          {sub.name_hindi}
                        </Text>
                        <Text style={[styles.skillChipSub, isSelected && styles.skillChipSubSelected]}>
                          {' '}/ {sub.name}
                        </Text>
                      </Chip>
                    );
                  })}
                </View>
              )}

              {selectedSkills.length > 0 && (
                <Text style={styles.selectedCount}>
                  ✅ {selectedSkills.length} skill{selectedSkills.length > 1 ? 's' : ''}{' '}
                  {lang === 'hi' ? 'चुनी गई' : 'selected'}
                </Text>
              )}

              {/* ── Expected Daily Wage ── */}
              <Text style={[styles.label, { marginTop: 20 }]}>
                {lang === 'hi' ? 'अपेक्षित दैनिक दिहाड़ी (₹ प्रति दिन) *' : 'Expected Daily Wage (₹ / day) *'}
              </Text>
              <View style={styles.categoryGrid}>
                {['400', '500', '600', '700', '800', '1000'].map(w => (
                  <Chip
                    key={w}
                    selected={expectedWage === w}
                    onPress={() => setExpectedWage(w)}
                    style={[styles.categoryChip, expectedWage === w && styles.categoryChipSelected]}
                    textStyle={[styles.categoryChipText, expectedWage === w && styles.categoryChipTextSelected]}
                  >
                    ₹{w}
                  </Chip>
                ))}
              </View>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                borderWidth: 1.5,
                borderColor: '#ddd',
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 4,
                marginTop: 8,
                backgroundColor: '#fff',
              }}>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#FF6B00', marginRight: 6 }}>₹</Text>
                <TextInput
                  style={{ flex: 1, fontSize: 15, color: '#333', paddingVertical: 8 }}
                  value={expectedWage}
                  onChangeText={setExpectedWage}
                  keyboardType="numeric"
                  placeholder="500"
                  placeholderTextColor="#999"
                />
                <Text style={{ fontSize: 13, color: '#888' }}>{lang === 'hi' ? '/ दिन' : '/ day'}</Text>
              </View>

              {/* ── Experience ── */}
              <Text style={[styles.label, { marginTop: 18 }]}>
                {lang === 'hi' ? 'कार्य अनुभव (Experience)' : 'Experience'}
              </Text>
              <View style={styles.categoryGrid}>
                {['< 1 वर्ष', '1-2 वर्ष', '3-5 वर्ष', '5+ वर्ष'].map(exp => (
                  <Chip
                    key={exp}
                    selected={experience === exp}
                    onPress={() => setExperience(exp)}
                    style={[styles.categoryChip, experience === exp && styles.categoryChipSelected]}
                    textStyle={[styles.categoryChipText, experience === exp && styles.categoryChipTextSelected]}
                  >
                    ⏳ {exp}
                  </Chip>
                ))}
              </View>
            </>
          )}

          {/* ── Info card for dedicated-screen categories ── */}
          {selectedCategory && isDedicatedCategory && categoryMeta && (
            <View style={styles.infoBanner}>
              <Text style={styles.infoBannerIcon}>ℹ️</Text>
              <Text style={styles.infoBannerText}>
                {lang === 'hi'
                  ? 'प्रोफाइल सेव के बाद आपको अपना विस्तृत सेटअप पूरा करना होगा।'
                  : 'After saving, you will complete your detailed profile setup on the next screen.'}
              </Text>
            </View>
          )}

          {/* ── Location (State + District) ── */}
          <Text style={[styles.label, { marginTop: 24 }]}>
            {lang === 'hi' ? 'राज्य / State' : 'State'}
          </Text>
          <TouchableOpacity style={styles.pickerButton} onPress={() => setShowStateModal(true)}>
            <Text style={styles.pickerButtonText}>
              {lang === 'hi'
                ? STATES_AND_DISTRICTS.find((s) => s.name === selectedState)?.nameHi
                : selectedState}
            </Text>
            <Text style={styles.pickerArrow}>▼</Text>
          </TouchableOpacity>

          <Text style={styles.label}>{lang === 'hi' ? 'जिला / District' : 'District'}</Text>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => setShowDistrictModal(true)}
            disabled={!selectedState}
          >
            <Text style={styles.pickerButtonText}>
              {district
                ? (lang === 'hi'
                    ? STATES_AND_DISTRICTS.find((s) => s.name === selectedState)?.districts.find(
                        (d) => d.name === district
                      )?.nameHi
                    : district)
                : lang === 'hi' ? 'चुनें' : 'Select'}
            </Text>
            <Text style={styles.pickerArrow}>▼</Text>
          </TouchableOpacity>

          {/* ── Save Button ── */}
          <Button
            mode="contained"
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={isLoading}
            loading={isLoading}
            buttonColor="#FF6B00"
            labelStyle={styles.buttonText}
          >
            {lang === 'hi' ? 'प्रोफाइल सेव करें' : 'Save Profile'}
          </Button>

          <TouchableOpacity style={styles.skipButton} onPress={() => navigation.replace('MainApp')}>
            <Text style={styles.skipText}>
              {lang === 'hi' ? 'बाद में करें' : 'Skip for now'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* State Modal */}
      <Modal visible={showStateModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {lang === 'hi' ? 'राज्य चुनें' : 'Select State'}
            </Text>
            <FlatList
              data={STATES_AND_DISTRICTS}
              keyExtractor={(item) => item.name}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => { setSelectedState(item.name); setDistrict(''); setShowStateModal(false); }}
                >
                  <Text style={styles.modalItemText}>
                    {lang === 'hi' ? item.nameHi : item.name}
                  </Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.closeButton} onPress={() => setShowStateModal(false)}>
              <Text style={styles.closeButtonText}>
                {lang === 'hi' ? 'बंद करें' : 'Close'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* District Modal */}
      <Modal visible={showDistrictModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {lang === 'hi' ? 'जिला चुनें' : 'Select District'}
            </Text>
            <FlatList
              data={STATES_AND_DISTRICTS.find((s) => s.name === selectedState)?.districts || []}
              keyExtractor={(item) => item.name}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => { setDistrict(item.name); setShowDistrictModal(false); }}
                >
                  <Text style={styles.modalItemText}>
                    {lang === 'hi' ? item.nameHi : item.name}
                  </Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.closeButton} onPress={() => setShowDistrictModal(false)}>
              <Text style={styles.closeButtonText}>
                {lang === 'hi' ? 'बंद करें' : 'Close'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 24, paddingBottom: 140 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 24 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 10, marginTop: 16 },
  labelHint: { fontSize: 12, color: '#999', fontWeight: '400' },
  // Pre-selected badge
  selectedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#FFF5EE', borderRadius: 14,
    borderWidth: 2, borderColor: '#FF6B00',
    padding: 16, marginBottom: 8,
  },
  selectedBadgeEmoji: { fontSize: 36 },
  selectedBadgeLabel: { fontSize: 18, fontWeight: 'bold', color: '#FF6B00' },
  selectedBadgeSub: { fontSize: 12, color: '#888', marginTop: 2 },
  // Info banner for dedicated-screen categories
  infoBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: '#EBF8FF', borderRadius: 10,
    borderWidth: 1, borderColor: '#90CDF4',
    padding: 12, marginTop: 12,
  },
  infoBannerIcon: { fontSize: 18 },
  infoBannerText: { flex: 1, fontSize: 13, color: '#2C5282', lineHeight: 20 },
  // Category chips (shown only when no pre-selection)
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryChip: { borderWidth: 1.5, borderColor: '#ddd', borderRadius: 20, backgroundColor: '#fff' },
  categoryChipSelected: { borderColor: '#FF6B00', backgroundColor: '#FFF5EE' },
  categoryChipText: { fontSize: 12, color: '#666' },
  categoryChipTextSelected: { color: '#FF6B00', fontWeight: '600' },
  // Skills chips
  skillsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  skillChip: { borderWidth: 1.5, borderColor: '#ddd', borderRadius: 20, backgroundColor: '#fafafa' },
  skillChipSelected: { borderColor: '#FF6B00', backgroundColor: '#FFF5EE' },
  skillChipText: { fontSize: 12, color: '#444', fontWeight: '600' },
  skillChipTextSelected: { color: '#FF6B00' },
  skillChipSub: { fontSize: 11, color: '#999' },
  skillChipSubSelected: { color: '#FF6B00', opacity: 0.7 },
  selectedCount: { fontSize: 12, color: '#38A169', marginTop: 8, fontWeight: '600' },
  noSkills: { fontSize: 13, color: '#999', marginTop: 4, fontStyle: 'italic' },
  // Buttons
  button: { borderRadius: 12, paddingVertical: 4, marginTop: 32 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  skipButton: { alignItems: 'center', marginTop: 16 },
  skipText: { color: '#999', fontSize: 14 },
  // Picker
  pickerButton: {
    borderWidth: 1.5, borderColor: '#ddd', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    backgroundColor: '#fff', flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'center',
  },
  pickerButtonText: { fontSize: 14, color: '#333' },
  pickerArrow: { fontSize: 11, color: '#999' },
  // Modals
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  modalContent: {
    width: '100%', maxHeight: '80%', backgroundColor: '#fff',
    borderRadius: 16, padding: 20, elevation: 5,
  },
  modalTitle: {
    fontSize: 16, fontWeight: 'bold', color: '#2D3748',
    marginBottom: 16, textAlign: 'center',
  },
  modalItem: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#EDF2F7' },
  modalItemText: { fontSize: 15, color: '#2D3748' },
  closeButton: {
    marginTop: 16, paddingVertical: 12,
    backgroundColor: '#EDF2F7', borderRadius: 8, alignItems: 'center',
  },
  closeButtonText: { fontSize: 14, fontWeight: 'bold', color: '#4A5568' },
});
