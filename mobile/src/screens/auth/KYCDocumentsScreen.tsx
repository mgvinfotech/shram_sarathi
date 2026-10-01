import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert, StatusBar, Image, Platform, KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TextInput } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import SignupProgressBar from '../../components/SignupProgressBar';
import { useLanguage } from '../../i18n/LanguageContext';
import { validateIdByType, formatIdNumber } from '../../utils/idValidation';

// ─── Design Tokens ────────────────────────────────────────────────────────────
const G = {
  primary: '#FF6B00',
  green:   '#2E7D32',
  red:     '#D32F2F',
  bg:      '#FAFAFA',
  white:   '#FFFFFF',
  text:    '#1A1A1A',
  sub:     '#666666',
  border:  '#E0E0E0',
};

const ID_TYPES = [
  { val: 'aadhaar', hi: '🪪 आधार कार्ड',       en: '🪪 Aadhaar Card'     },
  { val: 'pan',     hi: '💳 पैन कार्ड',          en: '💳 PAN Card'         },
  { val: 'voter',   hi: '🗳️ वोटर आईडी',          en: '🗳️ Voter ID'         },
  { val: 'dl',      hi: '🚗 ड्राइविंग लाइसेंस',  en: '🚗 Driving License'  },
];

// ─── Image Picker Helper ──────────────────────────────────────────────────────
async function pickImage(source: 'camera' | 'gallery'): Promise<string | null> {
  try {
    if (source === 'camera') {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('', 'Camera permission denied.');
          return null;
        }
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });
      if (!result.canceled && result.assets.length > 0) return result.assets[0].uri;
    } else {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('', 'Gallery permission denied.');
          return null;
        }
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });
      if (!result.canceled && result.assets.length > 0) return result.assets[0].uri;
    }
  } catch (e) {
    console.warn('Image picker error:', e);
  }
  return null;
}

// ─── Pick with Alert (Camera / Gallery choice) ────────────────────────────────
function showPickerAlert(
  hi: boolean,
  label: string,
  onPicked: (uri: string) => void,
) {
  if (Platform.OS === 'web') {
    pickImage('gallery').then((uri) => { if (uri) onPicked(uri); });
    return;
  }
  Alert.alert(
    hi ? `${label} अपलोड करें` : `Upload ${label}`,
    hi ? 'फोटो कहाँ से लें?' : 'Choose photo source',
    [
      { text: hi ? 'रद्द करें' : 'Cancel', style: 'cancel' },
      {
        text: hi ? '📷 कैमरा' : '📷 Camera',
        onPress: () => pickImage('camera').then((uri) => { if (uri) onPicked(uri); }),
      },
      {
        text: hi ? '🖼️ गैलरी' : '🖼️ Gallery',
        onPress: () => pickImage('gallery').then((uri) => { if (uri) onPicked(uri); }),
      },
    ],
  );
}

// ─── Upload Card Component ────────────────────────────────────────────────────
function UploadCard({
  title, hint, uri, onPick,
}: { title: string; hint: string; uri: string | null; onPick: () => void }) {
  return (
    <TouchableOpacity style={styles.uploadCard} onPress={onPick} activeOpacity={0.8}>
      {uri ? (
        <>
          <Image source={{ uri }} style={styles.uploadPreview} />
          <View style={styles.uploadDoneTag}>
            <Text style={styles.uploadDoneText}>✓ {title}</Text>
          </View>
        </>
      ) : (
        <View style={styles.uploadPlaceholder}>
          <Text style={styles.uploadIcon}>📷</Text>
          <Text style={styles.uploadTitle}>{title}</Text>
          <Text style={styles.uploadHint}>{hint}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

function SectionHeader({ icon, title }: { icon: string; title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionIcon}>{icon}</Text>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function KYCDocumentsScreen({ navigation, route }: any) {
  const { lang } = useLanguage();
  const hi = lang === 'hi';

  const [idType,       setIdType]      = useState('aadhaar');
  const [idNumber,     setIdNumber]    = useState('');
  const [idFrontUri,   setIdFrontUri]  = useState<string | null>(null);
  const [idBackUri,    setIdBackUri]   = useState<string | null>(null);
  const [selfieUri,    setSelfieUri]   = useState<string | null>(null);
  const [referralCode, setReferralCode]= useState('');

  // Live validation on idNumber
  const validation = useMemo(() => {
    if (!idNumber.trim()) return null;
    return validateIdByType(idType, idNumber);
  }, [idType, idNumber]);

  const handleIdTypeChange = (newType: string) => {
    setIdType(newType);
    setIdNumber(''); // Reset ID number on type change to avoid format mismatch
  };

  const handleIdNumberChange = (text: string) => {
    const formatted = formatIdNumber(idType, text);
    setIdNumber(formatted);
  };

  const handleNext = () => {
    const trimmed = idNumber.trim();
    if (trimmed) {
      const res = validateIdByType(idType, trimmed);
      if (!res.isValid) {
        Alert.alert(
          hi ? 'अमान्य ID नंबर' : 'Invalid ID Number',
          hi ? (res.errorHi || res.error || 'कृपया वैध ID नंबर दर्ज करें।') : (res.error || 'Please enter a valid ID number.')
        );
        return;
      }
    } else if (idFrontUri || idBackUri) {
      Alert.alert(
        hi ? 'ID नंबर आवश्यक है' : 'ID Number Required',
        hi
          ? 'आपने दस्तावेज की फोटो अपलोड की है, कृपया ऊपर पहचान पत्र नंबर भी सही से भरें।'
          : 'Document photo is uploaded, please enter the valid ID number.'
      );
      return;
    }

    const cleanIdNumber = trimmed.replace(/[\s-]/g, '');
    const kycData = { idType, idNumber: cleanIdNumber, idFrontUri, idBackUri, selfieUri, referralCode };
    navigation.navigate('ConsentAndCompletionScreen', { ...route.params, kycData });
  };

  const handleSkip = () => {
    const kycData = { idType: '', idNumber: '', idFrontUri: null, idBackUri: null, selfieUri: null, referralCode };
    navigation.navigate('ConsentAndCompletionScreen', { ...route.params, kycData });
  };

  const selectedIdLabel = ID_TYPES.find(i => i.val === idType);

  const getPlaceholder = () => {
    if (idType === 'aadhaar') return 'XXXX XXXX XXXX (12 अंक)';
    if (idType === 'pan')     return 'ABCDE1234F (10 अक्षर)';
    if (idType === 'voter')   return 'ABC1234567';
    if (idType === 'dl')      return 'UP3220180012345';
    return '';
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={G.white} />
      <SignupProgressBar currentStep={5} />

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
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Text style={styles.backText}>← {hi ? 'वापस' : 'Back'}</Text>
        </TouchableOpacity>

        <Text style={styles.title}>{hi ? '🪪 पहचान पत्र (KYC)' : '🪪 Identity Verification (KYC)'}</Text>
        <Text style={styles.subtitle}>
          {hi ? 'पहचान पत्र और फोटो अपलोड करें (सत्यापन हेतु वैध ID अनिवार्य)' : 'Upload your ID documents (Valid ID required for verification)'}
        </Text>

        {/* ID Type */}
        <SectionHeader icon="📋" title={hi ? 'ID का प्रकार चुनें' : 'Select ID Type'} />
        <View style={styles.idTypeRow}>
          {ID_TYPES.map((opt) => {
            const isSel = idType === opt.val;
            return (
              <TouchableOpacity
                key={opt.val}
                style={[styles.idTypeBtn, isSel && styles.idTypeBtnSel]}
                onPress={() => handleIdTypeChange(opt.val)}
              >
                <Text style={[styles.idTypeBtnText, isSel && styles.idTypeBtnTextSel]}>
                  {hi ? opt.hi : opt.en}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ID Number */}
        <TextInput
          label={hi ? `${selectedIdLabel?.hi ?? 'ID'} नंबर` : `${selectedIdLabel?.en ?? 'ID'} Number`}
          value={idNumber}
          onChangeText={handleIdNumberChange}
          mode="outlined"
          activeOutlineColor={validation?.isValid ? G.green : (validation && !validation.isValid ? G.red : G.primary)}
          outlineColor={validation?.isValid ? G.green : (validation && !validation.isValid ? G.red : G.border)}
          style={styles.input}
          autoCapitalize="characters"
          keyboardType={idType === 'aadhaar' ? 'numeric' : 'default'}
          placeholder={getPlaceholder()}
        />

        {/* Live Validation Feedback */}
        {idNumber.trim().length > 0 && validation && (
          <View style={[styles.valBadge, validation.isValid ? styles.valBadgeSuccess : styles.valBadgeError]}>
            <Text style={[styles.valText, validation.isValid ? styles.valTextSuccess : styles.valTextError]}>
              {validation.isValid
                ? `✓ ${hi ? 'मान्य पहचान पत्र नंबर' : 'Valid ID Number'}`
                : `✗ ${hi ? validation.errorHi : validation.error}`}
            </Text>
          </View>
        )}

        {/* Upload Cards */}
        <SectionHeader icon="📸" title={hi ? 'दस्तावेज फोटो अपलोड करें' : 'Upload Document Photos'} />
        <View style={styles.uploadRow}>
          <UploadCard
            title={hi ? 'ID — आगे' : 'ID — Front'}
            hint={hi ? 'आगे की फोटो खींचें' : 'Front side photo'}
            uri={idFrontUri}
            onPick={() => showPickerAlert(hi, hi ? 'ID आगे' : 'ID Front', setIdFrontUri)}
          />
          <UploadCard
            title={hi ? 'ID — पीछे' : 'ID — Back'}
            hint={hi ? 'पीछे की फोटो खींचें' : 'Back side photo'}
            uri={idBackUri}
            onPick={() => showPickerAlert(hi, hi ? 'ID पीछे' : 'ID Back', setIdBackUri)}
          />
        </View>

        {/* Selfie */}
        <SectionHeader icon="🤳" title={hi ? 'अपनी फोटो (Selfie)' : 'Your Selfie'} />
        <UploadCard
          title={hi ? 'सेल्फी खींचें' : 'Take Selfie'}
          hint={hi ? 'चेहरा साफ दिखना चाहिए' : 'Face must be clearly visible'}
          uri={selfieUri}
          onPick={() => showPickerAlert(hi, 'Selfie', setSelfieUri)}
        />

        {/* Referral Code */}
        <SectionHeader icon="🎁" title={hi ? 'एजेंट रेफरल कोड (वैकल्पिक)' : 'Agent Referral Code (Optional)'} />
        <TextInput
          label={hi ? 'रेफरल कोड (यदि हो तो)' : 'Referral Code (if any)'}
          value={referralCode}
          onChangeText={setReferralCode}
          mode="outlined"
          activeOutlineColor={G.primary}
          style={styles.input}
          autoCapitalize="characters"
          placeholder="उदा. AG-1024"
        />

        {/* Security Note */}
        <View style={styles.infoCard}>
          <Text style={styles.infoText}>
            {hi
              ? '🔒 आपके दस्तावेज पूरी तरह सुरक्षित हैं। फर्जी या डमी पहचान पत्र स्वीकार नहीं किए जाएंगे।'
              : '🔒 Your documents are fully secure. Fake or dummy IDs will be rejected.'}
          </Text>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.btn} onPress={handleNext} activeOpacity={0.85}>
          <Text style={styles.btnText}>{hi ? 'आगे बढ़ें →' : 'Continue →'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
          <Text style={styles.skipBtnText}>
            {hi ? 'अभी छोड़ें, बाद में अपलोड करें' : 'Skip for now, upload later'}
          </Text>
        </TouchableOpacity>
      </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: G.white },
  scroll: { flex: 1, backgroundColor: G.bg },
  scrollContent: { padding: 20, paddingBottom: 160 },

  back: { marginBottom: 16 },
  backText: { color: G.primary, fontSize: 15, fontWeight: '600' },
  title: { fontSize: 22, fontWeight: '800', color: G.text, marginBottom: 4 },
  subtitle: { fontSize: 13, color: G.sub, marginBottom: 20, lineHeight: 18 },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginTop: 16, marginBottom: 10 },
  sectionIcon: { fontSize: 18, marginRight: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: G.text },

  idTypeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  idTypeBtn: {
    paddingHorizontal: 12, paddingVertical: 9,
    borderRadius: 10, borderWidth: 1.5, borderColor: G.border, backgroundColor: G.white,
  },
  idTypeBtnSel: { borderColor: G.primary, backgroundColor: '#FFF3E8' },
  idTypeBtnText: { fontSize: 12, color: G.sub, fontWeight: '600' },
  idTypeBtnTextSel: { color: G.primary, fontWeight: '700' },

  input: { backgroundColor: G.white, marginBottom: 8 },

  valBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 12,
  },
  valBadgeSuccess: {
    backgroundColor: '#E8F5E9',
    borderLeftWidth: 3,
    borderLeftColor: '#2E7D32',
  },
  valBadgeError: {
    backgroundColor: '#FFEBEE',
    borderLeftWidth: 3,
    borderLeftColor: '#D32F2F',
  },
  valText: {
    fontSize: 12,
  },
  valTextSuccess: {
    color: '#2E7D32',
    fontWeight: '700',
  },
  valTextError: {
    color: '#C62828',
    fontWeight: '600',
  },

  uploadRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  uploadCard: {
    flex: 1, height: 120, borderRadius: 12, borderWidth: 1.5,
    borderColor: G.border, borderStyle: 'dashed', backgroundColor: G.white,
    overflow: 'hidden', alignItems: 'center', justifyContent: 'center',
  },
  uploadPreview: { width: '100%', height: '100%', resizeMode: 'cover' },
  uploadDoneTag: {
    position: 'absolute', bottom: 6, left: 6, right: 6,
    backgroundColor: 'rgba(46,125,50,0.88)', borderRadius: 6,
    paddingVertical: 2, alignItems: 'center',
  },
  uploadDoneText: { color: G.white, fontSize: 11, fontWeight: '700' },
  uploadPlaceholder: { alignItems: 'center', padding: 8 },
  uploadIcon: { fontSize: 28, marginBottom: 4 },
  uploadTitle: { fontSize: 12, fontWeight: '700', color: G.text, textAlign: 'center' },
  uploadHint: { fontSize: 10, color: G.sub, textAlign: 'center', marginTop: 2 },

  infoCard: {
    backgroundColor: '#FFF8E1', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: '#FFE082', marginTop: 12,
  },
  infoText: { fontSize: 12, color: '#F57F17', lineHeight: 17 },

  footer: {
    padding: 16, backgroundColor: G.white,
    borderTopWidth: 1, borderTopColor: G.border,
  },
  btn: {
    backgroundColor: G.primary, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', marginBottom: 8,
  },
  btnText: { color: G.white, fontSize: 16, fontWeight: '700' },
  skipBtn: { alignItems: 'center', paddingVertical: 8 },
  skipBtnText: { color: G.sub, fontSize: 13, textDecorationLine: 'underline' },
});
