import React, { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View, ScrollView, StyleSheet, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Text, TextInput, Button, Chip, ProgressBar } from 'react-native-paper';
import { api } from '../../services/api';
import { useLanguage } from '../../i18n/LanguageContext';
import { validatePan, validateIfsc, validateBankAccount } from '../../utils/idValidation';

const RATE_CATEGORIES = [
  { slug: 'catering',     labelEn: 'Catering 🍽️',          labelHi: 'खानपान 🍽️' },
  { slug: 'construction', labelEn: 'Construction 🏗️',        labelHi: 'निर्माण 🏗️' },
  { slug: 'wiring',       labelEn: 'Wiring / Electrical ⚡',  labelHi: 'बिजली / वायरिंग ⚡' },
  { slug: 'plumbing',     labelEn: 'Plumbing 🔧',             labelHi: 'प्लंबिंग 🔧' },
  { slug: 'painting',     labelEn: 'Painting 🖌️',            labelHi: 'पेंटिंग 🖌️' },
  { slug: 'other',        labelEn: 'Other',                   labelHi: 'अन्य' },
];

interface Props { navigation: any; }

export default function ContractorKycScreen({ navigation }: Props) {
  const { t, lang } = useLanguage();
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);

  // KYC fields
  const [firmName, setFirmName] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [bankIfsc, setBankIfsc] = useState('');
  const [bankName, setBankName] = useState('');

  // Rate fields
  const [baseRate, setBaseRate] = useState('');
  const [rateUnit, setRateUnit] = useState('');
  const [rateCategory, setRateCategory] = useState('');

  useFocusEffect(
    useCallback(() => {
      fetchExisting();
    }, [])
  );

  const fetchExisting = async () => {
    try {
      const res = await api.get('/api/contractor/profile');
      const p = res.data;
      if (p.firm_name) setFirmName(p.firm_name);
      if (p.pan_number) setPanNumber(p.pan_number);
      if (p.bank_account_number) setBankAccount(p.bank_account_number);
      if (p.bank_ifsc) setBankIfsc(p.bank_ifsc);
      if (p.bank_name) setBankName(p.bank_name);
      if (p.base_rate) setBaseRate(String(p.base_rate));
      if (p.base_rate_unit) setRateUnit(p.base_rate_unit);
      if (p.rate_category) setRateCategory(p.rate_category);
    } catch { /* no existing profile yet */ }
  };

  const validateStep1Fields = (): boolean => {
    if (panNumber.trim()) {
      const res = validatePan(panNumber.trim());
      if (!res.isValid) {
        Alert.alert(lang === 'hi' ? 'अमान्य पैन नंबर' : 'Invalid PAN Number', lang === 'hi' ? res.errorHi : res.error);
        return false;
      }
    }
    if (bankIfsc.trim()) {
      const res = validateIfsc(bankIfsc.trim());
      if (!res.isValid) {
        Alert.alert(lang === 'hi' ? 'अमान्य IFSC कोड' : 'Invalid IFSC Code', lang === 'hi' ? res.errorHi : res.error);
        return false;
      }
    }
    if (bankAccount.trim()) {
      const res = validateBankAccount(bankAccount.trim());
      if (!res.isValid) {
        Alert.alert(lang === 'hi' ? 'अमान्य बैंक खाता' : 'Invalid Bank Account', lang === 'hi' ? res.errorHi : res.error);
        return false;
      }
    }
    return true;
  };

  const handleStep1Next = () => {
    if (!validateStep1Fields()) return;
    setStep(2);
  };

  const handleSubmit = async () => {
    if (!validateStep1Fields()) return;
    if (!baseRate || !rateUnit || !rateCategory) {
      Alert.alert('', t('kycError'));
      return;
    }
    setLoading(true);
    try {
      await api.post('/api/contractor/kyc', {
        firm_name: firmName || undefined,
        pan_number: panNumber ? panNumber.trim().toUpperCase() : undefined,
        bank_account_number: bankAccount ? bankAccount.trim() : undefined,
        bank_ifsc: bankIfsc ? bankIfsc.trim().toUpperCase() : undefined,
        bank_name: bankName || undefined,
        base_rate: parseFloat(baseRate),
        base_rate_unit: rateUnit,
        rate_category: rateCategory,
      });
      Alert.alert(
        t('kycSavedTitle'),
        t('kycSavedMsg'),
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (err: any) {
      const status = err.response?.status;
      const detail = err.response?.data?.detail;
      const msg =
        status === 404 ? 'Provider profile nahi mili. Pehle profile setup karo (district select karke Save Profile dabao).' :
        status === 422 ? 'Kuch fields galat hain: ' + (detail || 'Validation error') :
        detail || err.message || 'Submit failed';
      Alert.alert('KYC Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const stepProgress = step === 1 ? 0.5 : 1;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* Header */}
          <Text style={styles.title}>🏗️ {t('contractorTitle')}</Text>
          <Text style={styles.subtitle}>{t('contractorSubtitle')}</Text>

          {/* Progress */}
          <ProgressBar progress={stepProgress} color="#FF6B00" style={styles.progress} />
          <Text style={styles.stepLabel}>
            {lang === 'hi' ? `चरण ${step} / 2` : `Step ${step} / 2`}
          </Text>

          {step === 1 && (
            <View>
              <Text style={styles.sectionTitle}>{t('step1Label')}</Text>

              <TextInput
                label={t('firmName')}
                value={firmName}
                onChangeText={setFirmName}
                mode="outlined"
                style={styles.input}
                activeOutlineColor="#FF6B00"
                placeholder={t('firmNamePlaceholder')}
              />
              <TextInput
                label={t('panNumber')}
                value={panNumber}
                onChangeText={(v) => setPanNumber(v.toUpperCase())}
                mode="outlined"
                style={styles.input}
                activeOutlineColor="#FF6B00"
                autoCapitalize="characters"
                placeholder="ABCDE1234F"
              />
              <TextInput
                label={t('bankAccount')}
                value={bankAccount}
                onChangeText={setBankAccount}
                mode="outlined"
                style={styles.input}
                activeOutlineColor="#FF6B00"
                keyboardType="numeric"
              />
              <TextInput
                label={t('bankIfsc')}
                value={bankIfsc}
                onChangeText={(v) => setBankIfsc(v.toUpperCase())}
                mode="outlined"
                style={styles.input}
                activeOutlineColor="#FF6B00"
                autoCapitalize="characters"
              />
              <TextInput
                label={t('bankName')}
                value={bankName}
                onChangeText={setBankName}
                mode="outlined"
                style={styles.input}
                activeOutlineColor="#FF6B00"
              />

              <Button
                mode="contained"
                onPress={handleStep1Next}
                buttonColor="#FF6B00"
                style={styles.btn}
                labelStyle={styles.btnLabel}
              >
                {t('nextBtn')}
              </Button>
            </View>
          )}

          {step === 2 && (
            <View>
              <Text style={styles.sectionTitle}>{t('step2Label')}</Text>

              <TextInput
                label={t('baseRate')}
                value={baseRate}
                onChangeText={setBaseRate}
                mode="outlined"
                style={styles.input}
                activeOutlineColor="#FF6B00"
                keyboardType="numeric"
                placeholder={t('baseRatePlaceholder')}
              />
              <TextInput
                label={t('rateUnit')}
                value={rateUnit}
                onChangeText={setRateUnit}
                mode="outlined"
                style={styles.input}
                activeOutlineColor="#FF6B00"
                placeholder={t('rateUnitPlaceholder')}
              />

              <Text style={styles.sectionTitle}>{t('selectCategory')}</Text>
              <View style={styles.chipRow}>
                {RATE_CATEGORIES.map((c) => (
                  <Chip
                    key={c.slug}
                    selected={rateCategory === c.slug}
                    onPress={() => setRateCategory(c.slug)}
                    style={[styles.chip, rateCategory === c.slug && styles.chipSelected]}
                    textStyle={rateCategory === c.slug ? styles.chipTextSelected : undefined}
                  >
                    {lang === 'hi' ? c.labelHi : c.labelEn}
                  </Chip>
                ))}
              </View>

              {/* Rate Preview */}
              {baseRate && rateUnit && (
                <View style={styles.preview}>
                  <Text style={styles.previewLabel}>{t('ratePreviewLabel')}</Text>
                  <Text style={styles.previewValue}>₹{baseRate} {rateUnit}</Text>
                </View>
              )}

              <View style={styles.rowBtns}>
                <Button
                  mode="outlined"
                  onPress={() => setStep(1)}
                  style={[styles.btn, { flex: 1, marginRight: 8 }]}
                  textColor="#FF6B00"
                >
                  {t('backBtn')}
                </Button>
                <Button
                  mode="contained"
                  onPress={handleSubmit}
                  loading={loading}
                  disabled={loading}
                  buttonColor="#FF6B00"
                  style={[styles.btn, { flex: 2 }]}
                  labelStyle={styles.btnLabel}
                >
                  {t('saveKyc')}
                </Button>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  content: { padding: 20, paddingBottom: 140 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#1a1a1a', textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 16 },
  progress: { height: 6, borderRadius: 3, marginBottom: 4 },
  stepLabel: { fontSize: 12, color: '#999', textAlign: 'right', marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 12, marginTop: 8 },
  input: { marginBottom: 12, backgroundColor: '#fff' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  chip: { backgroundColor: '#eee' },
  chipSelected: { backgroundColor: '#FF6B00' },
  chipTextSelected: { color: '#fff', fontWeight: '700' },
  preview: {
    backgroundColor: '#FFF5EE', borderWidth: 1.5, borderColor: '#FF6B00',
    borderRadius: 12, padding: 16, marginBottom: 20, alignItems: 'center',
  },
  previewLabel: { fontSize: 13, color: '#FF6B00', fontWeight: '600' },
  previewValue: { fontSize: 22, fontWeight: 'bold', color: '#1a1a1a', marginTop: 4 },
  btn: { borderRadius: 10, marginTop: 8, paddingVertical: 4 },
  btnLabel: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  rowBtns: { flexDirection: 'row', alignItems: 'center' },
});
