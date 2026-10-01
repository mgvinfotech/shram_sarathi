import { SafeAreaView } from 'react-native-safe-area-context';
/**
 * Step 6 of 6 — Consent & Completion
 * FIXED: Correct 2-step backend flow:
 *   Step A: POST /api/auth/complete-signup  → creates user, returns JWT
 *   Step B: POST /api/onboarding/complete-profile (multipart) → saves profile + photos
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert, StatusBar, ActivityIndicator, Platform,
} from 'react-native';
import SignupProgressBar from '../../components/SignupProgressBar';
import { useLanguage } from '../../i18n/LanguageContext';
import { api } from '../../services/api';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../../store';
import { completeSignup } from '../../store/slices/authSlice';
import { isProviderRole, isAgentRole } from '../../utils/roleUtils';

declare const window: any;
declare const SpeechSynthesisUtterance: any;

const G = {
  primary: '#FF6B00',
  green:   '#2E7D32',
  bg:      '#FAFAFA',
  white:   '#FFFFFF',
  text:    '#1A1A1A',
  sub:     '#666666',
  border:  '#E0E0E0',
  error:   '#C62828',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Helper to append files to FormData working seamlessly on both Web & Native */
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

/** Build a multipart FormData body from profile + location + kyc data */
async function buildFormData(params: {
  roles:        string[];
  profileData:  Record<string, any>;
  locationData: Record<string, any>;
  kycData:      Record<string, any>;
  name?:        string;
}): Promise<FormData> {
  const { roles, profileData, locationData, kycData, name } = params;

  // Normalize roles to uppercase for consistent comparison
  const normalizedRoles = (roles || []).map((r: string) => r.toUpperCase());
  const primaryRole = normalizedRoles[0] ?? 'CUSTOMER';

  const form = new FormData();

  if (name) form.append('name', name);

  // ── Location ──────────────────────────────────────────────────────────────
  // Accept both 'address' (new LocationSetupScreen) and 'village' (old format)
  const addressStr = locationData.address || locationData.village || 'Not specified';
  form.append('lat',                   String(locationData.lat    ?? 0));
  form.append('lng',                   String(locationData.lng    ?? 0));
  form.append('base_location_address', addressStr);
  form.append('radius_km',             String(locationData.radiusKm ?? 10));
  if (locationData.district) form.append('district', locationData.district);
  if (locationData.state)    form.append('state',    locationData.state);

  // ── KYC ───────────────────────────────────────────────────────────────────
  if (kycData.idNumber) {
    if (kycData.idType === 'pan') {
      form.append('pan_number',      kycData.idNumber);
    } else if (kycData.idType === 'dl') {
      form.append('dl_number',       kycData.idNumber);
    } else if (kycData.idType === 'voter') {
      form.append('voter_id_number', kycData.idNumber);
      form.append('owner_id_number', kycData.idNumber);
    } else {
      form.append('aadhaar_number',  kycData.idNumber);
      form.append('owner_id_number', kycData.idNumber);
    }
  }
  if (kycData.referralCode) form.append('agent_referral_code', kycData.referralCode);

  // ── Profile Photo ─────────────────────────────────────────────────────────
  const photoUri = profileData.profilePhoto || kycData.selfieUri;
  await appendFileToForm(form, 'photo', photoUri);

  if (kycData.idFrontUri) {
    if (kycData.idType === 'pan') {
      await appendFileToForm(form, 'pan_photo',     kycData.idFrontUri);
    } else {
      await appendFileToForm(form, 'aadhaar_photo', kycData.idFrontUri);
    }
  }

  // ── Role-specific fields — iterate ALL selected roles ─────────────────────
  // This ensures multi-role signups (e.g. CUSTOMER+DRIVER) send ALL fields.

  const hasLabour     = normalizedRoles.includes('LABOUR');
  const hasKarigar    = normalizedRoles.includes('KARIGAR');
  const hasDriver     = normalizedRoles.includes('DRIVER');
  const hasTransport  = normalizedRoles.includes('TRANSPORT');
  const hasContractor = normalizedRoles.includes('CONTRACTOR');
  const hasAgent      = normalizedRoles.includes('AGENT');
  const hasCustomer   = normalizedRoles.includes('CUSTOMER');

  // LABOUR fields
  if (hasLabour) {
    form.append('category',            profileData.workCategory  || 'Construction');
    form.append('experience_years',    profileData.experience    || '0');
    form.append('expected_daily_wage', profileData.expectedWage  || '0');
  }

  // KARIGAR fields
  if (hasKarigar) {
    form.append('category',            profileData.workCategory  || 'Other');
    form.append('experience_years',    profileData.experience    || '0');
    form.append('expected_daily_wage', profileData.expectedWage  || '0');
  }

  // DRIVER fields
  if (hasDriver) {
    if (!hasLabour && !hasKarigar) {
      // Only set category to 'driver' if no labour/karigar role already set it
      form.append('category',       'driver');
    }
    form.append('vehicle_type',     profileData.vehicleType    || 'Sedan');
    form.append('experience_years', profileData.experience     || '0');
    form.append('dl_number',        profileData.licenseNo      || '');
    form.append('dl_category',      'LMV');
    if (profileData.driverType) {
      form.append('contract_types[]', profileData.driverType);
    }
  }

  // TRANSPORT fields
  if (hasTransport) {
    if (!hasLabour && !hasKarigar && !hasDriver) {
      form.append('category', 'transport');
    }
    form.append('vehicle_type',          profileData.transportVehicleType || profileData.vehicleType || 'WagonR / Dzire');
    form.append('vehicle_number',        profileData.vehicleNumber  || '');
    form.append('per_km_rate',           profileData.perKmRate      || '15');
    form.append('is_passenger_vehicle',  profileData.usePassenger   ? '1' : '0');
    form.append('is_goods_vehicle',      profileData.useGoods       ? '1' : '0');
    form.append('is_delivery_vehicle',   profileData.useDelivery    ? '1' : '0');
    form.append('dl_number',             profileData.licenseNo      || '');
    form.append('dl_category',           'LMV');
  }

  // CONTRACTOR fields
  if (hasContractor) {
    form.append('firm_name',        profileData.businessName         || '');
    form.append('category',         profileData.contractorCategory   || 'Civil Work');
    form.append('team_size',        profileData.teamSize             || '1');
    form.append('contract_types[]', 'Labour Only');
  }

  // Multi-Select Sub-Categories (Task 7)
  const allSubCategories: string[] = [
    ...(profileData.workCategories || (profileData.workCategory ? [profileData.workCategory] : [])),
    ...(profileData.driverVehicleTypes || (profileData.vehicleType ? [profileData.vehicleType] : [])),
    ...(profileData.contractorCategories || (profileData.contractorCategory ? [profileData.contractorCategory] : [])),
  ];
  allSubCategories.forEach((subCat) => {
    form.append('sub_categories[]', subCat);
  });
  if (allSubCategories.length > 0) {
    form.append('skills_description', allSubCategories.join(', '));
  }

  // CUSTOMER fields (only when purely customer with no provider roles)
  if (hasCustomer && !hasLabour && !hasKarigar && !hasDriver && !hasTransport && !hasContractor) {
    form.append('customer_type', 'Individual');
    form.append('location_type', 'Home');
  }

  // AGENT fields
  if (hasAgent) {
    form.append('payout_type', 'UPI');
  }

  return form;
}

// ─── Checkbox Item ────────────────────────────────────────────────────────────
function CheckItem({ label, checked, onToggle }: { label: string; checked: boolean; onToggle: () => void }) {
  return (
    <TouchableOpacity style={styles.checkItem} onPress={onToggle} activeOpacity={0.8}>
      <View style={[styles.checkBox, checked && styles.checkBoxChecked]}>
        {checked && <Text style={styles.checkMark}>✓</Text>}
      </View>
      <Text style={styles.checkLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ConsentAndCompletionScreen({ navigation, route }: any) {
  const { lang } = useLanguage();
  const hi = lang === 'hi';
  const dispatch = useDispatch<AppDispatch>();

  const {
    roles        = [],
    profileData  = {},
    locationData = {},
    kycData      = {},
    phone        = '',
    name: prefillName = '',
  } = route.params || {};

  const name:        string = profileData?.fullName ?? prefillName;
  const primaryRole: string = roles[0] ?? 'CUSTOMER';

  const [termsAccepted, setTermsAccepted] = useState(false);
  const [ageConsent,    setAgeConsent]    = useState(false);
  const [dataConsent,   setDataConsent]   = useState(false);
  const [loading,       setLoading]       = useState(false);
  const [isSpeaking,    setIsSpeaking]    = useState(false);
  const [status,        setStatus]        = useState('');

  const allConsented = termsAccepted && ageConsent && dataConsent;

  // ── Audio Consent Playback ─────────────────────────────────────────────────
  const speakConsent = () => {
    const text = hi
      ? 'मैं श्रम सारथी की सभी नियम व शर्तों से सहमत हूँ। मैं 18 वर्ष से अधिक आयु का हूँ और अपनी जानकारी साझा करने के लिए सहमत हूँ।'
      : 'I accept all terms and conditions of Shram Sarthi. I am above 18 years of age and consent to share my details.';

    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const synth = window.speechSynthesis;
        if (isSpeaking) {
          synth.cancel();
          setIsSpeaking(false);
          return;
        }
        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = hi ? 'hi-IN' : 'en-US';
        utter.onend  = () => setIsSpeaking(false);
        utter.onerror = () => setIsSpeaking(false);
        setIsSpeaking(true);
        synth.speak(utter);
      } else {
        Alert.alert(
          hi ? 'ऑडियो सहमति' : 'Audio Consent',
          text
        );
      }
    } catch {
      Alert.alert(
        hi ? 'ऑडियो सहमति' : 'Audio Consent',
        text
      );
    }
  };

  // ── Main Registration Flow ─────────────────────────────────────────────────
  const handleComplete = async () => {
    if (!allConsented) {
      Alert.alert('', hi ? 'कृपया सभी सहमतियां दें।' : 'Please accept all consent items.');
      return;
    }
    if (!phone) {
      Alert.alert('', hi ? 'मोबाइल नंबर नहीं मिला। कृपया दोबारा साइनअप करें।' : 'Phone not found. Please restart signup.');
      return;
    }

    setLoading(true);

    try {
      // ── STEP A: complete-signup → creates user + returns JWT ──────────────
      setStatus(hi ? 'अकाउंट बन रहा है...' : 'Creating account...');

      // Map wizard roles to lowercase DB ENUM values
      const roleMap: Record<string, string> = {
        'LABOUR':     'labour',
        'KARIGAR':    'karigar',
        'DRIVER':     'driver',
        'TRANSPORT':  'driver',
        'CONTRACTOR': 'contractor',
        'AGENT':      'agent',
        'CUSTOMER':   'customer',
      };
      const backendRole = roleMap[primaryRole] ?? 'customer';
      const lowercaseRoles = (roles && roles.length > 0)
        ? roles.map((r: string) => (roleMap[r] || r.toLowerCase()))
        : [backendRole];

      const result = await dispatch(completeSignup({ phone, role: backendRole as any, roles: lowercaseRoles }));

      if (completeSignup.rejected.match(result)) {
        const errMsg = result.payload as string;
        if (errMsg?.toLowerCase().includes('already')) {
          Alert.alert(
            hi ? 'अकाउंट मौजूद है' : 'Account Exists',
            hi ? 'यह नंबर पहले से रजिस्टर्ड है। लॉगिन करें।' : 'This number is already registered. Please login.',
            [{ text: hi ? 'लॉगिन करें' : 'Login', onPress: () => navigation.replace('Login') }]
          );
        } else {
          Alert.alert('', errMsg || (hi ? 'रजिस्ट्रेशन विफल।' : 'Registration failed.'));
        }
        setLoading(false);
        setStatus('');
        return;
      }

      const { token: accessToken, role: serverRole } = (result as any).payload;

      // ── STEP B: onboarding/complete-profile (multipart, with JWT) ─────────
      setStatus(hi ? 'प्रोफाइल सेव हो रही है...' : 'Saving profile...');

      try {
        const form = await buildFormData({ roles, profileData, locationData, kycData, name });
        await api.post('/api/onboarding/complete-profile', form, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'multipart/form-data',
          },
        });
      } catch (profileErr: any) {
        // Profile save failed but user created — not fatal, continue
        console.warn('Profile save warning:', profileErr?.response?.data);
      }

      // ── SUCCESS ───────────────────────────────────────────────────────────
      setStatus('');
      Alert.alert(
        hi ? '🎉 रजिस्ट्रेशन सफल!' : '🎉 Registration Successful!',
        hi
          ? `${name ? `${name}, आ` : 'आ'}पका अकाउंट बन गया है! अब आप ऐप का उपयोग कर सकते हैं।`
          : `${name ? `${name}, your` : 'Your'} account is ready! You can now use the app.`,
        [{
          text: hi ? 'ऐप में जाएं 🚀' : 'Go to App 🚀',
          onPress: () => {
            const dest = isProviderRole(backendRole)
              ? 'ProviderApp'
              : isAgentRole(backendRole)
              ? 'AgentApp'
              : 'CustomerApp';
            navigation.reset({ index: 0, routes: [{ name: dest }] });
          },
        }]
      );
    } catch (err: any) {
      setStatus('');
      const detail = err.response?.data?.detail ?? err.response?.data?.message;
      const msg = typeof detail === 'string'
        ? detail
        : (hi ? 'रजिस्ट्रेशन पूरा नहीं हुआ। कृपया दोबारा कोशिश करें।' : 'Registration failed. Please try again.');
      Alert.alert('', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={G.white} />
      <SignupProgressBar currentStep={6} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Text style={styles.backText}>← {hi ? 'वापस' : 'Back'}</Text>
        </TouchableOpacity>

        {/* Success Illustration */}
        <View style={styles.successIllus}>
          <View style={styles.successCircle}>
            <Text style={styles.successEmoji}>🎉</Text>
          </View>
          <Text style={styles.successTitle}>{hi ? 'लगभग हो गया!' : 'Almost Done!'}</Text>
          <Text style={styles.successSub}>
            {hi ? 'सहमति दें और रजिस्ट्रेशन पूरा करें।' : 'Give your consent and complete registration.'}
          </Text>
        </View>

        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>{hi ? '📋 आपकी जानकारी:' : '📋 Your Details:'}</Text>
          {[
            { key: hi ? 'नाम:' : 'Name:',     val: name || '—' },
            { key: hi ? 'मोबाइल:' : 'Mobile:', val: `+91 ${phone || '—'}` },
            { key: hi ? 'भूमिका:' : 'Role(s):', val: roles.join(', ') || '—' },
            ...(locationData?.district ? [{ key: hi ? 'जिला:' : 'District:', val: locationData.district }] : []),
          ].map((row) => (
            <View key={row.key} style={styles.summaryRow}>
              <Text style={styles.summaryKey}>{row.key}</Text>
              <Text style={styles.summaryVal}>{row.val}</Text>
            </View>
          ))}
        </View>

        {/* Audio Consent */}
        <View style={styles.voiceBox}>
          <Text style={styles.voiceTitle}>{hi ? '🔊 ऑडियो सहमति' : '🔊 Audio Consent'}</Text>
          <Text style={styles.voiceText}>
            {hi ? 'नीचे बटन दबाएं और सुनें।' : 'Press the button below and listen.'}
          </Text>
          <TouchableOpacity
            style={[styles.speakBtn, isSpeaking && styles.speakBtnActive]}
            onPress={speakConsent}
          >
            <Text style={styles.speakBtnIcon}>{isSpeaking ? '🔊' : '▶️'}</Text>
            <Text style={styles.speakBtnText}>
              {isSpeaking ? (hi ? 'सुन रहे हैं...' : 'Playing...') : (hi ? 'सहमति सुनें' : 'Play Consent')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Consent Checkboxes */}
        <View style={styles.consentBox}>
          <Text style={styles.consentTitle}>{hi ? '✅ सहमति दें:' : '✅ Give Your Consent:'}</Text>
          <CheckItem
            label={hi
              ? 'मैंने श्रम सारथी की नियम व शर्तें और प्राइवेसी पॉलिसी पढ़ ली है और मैं सहमत हूं।'
              : 'I have read and accept the Shram Sarthi Terms & Conditions and Privacy Policy.'}
            checked={termsAccepted}
            onToggle={() => setTermsAccepted(!termsAccepted)}
          />
          <CheckItem
            label={hi ? 'मैं 18 वर्ष से अधिक आयु का/की हूं।' : 'I am 18 years of age or older.'}
            checked={ageConsent}
            onToggle={() => setAgeConsent(!ageConsent)}
          />
          <CheckItem
            label={hi
              ? 'मैं अपनी व्यक्तिगत जानकारी और दस्तावेज का उपयोग सत्यापन के लिए करने की अनुमति देता/देती हूं।'
              : 'I allow my personal data and documents to be used for verification.'}
            checked={dataConsent}
            onToggle={() => setDataConsent(!dataConsent)}
          />
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        {status ? (
          <View style={styles.statusRow}>
            <ActivityIndicator color={G.green} size="small" />
            <Text style={styles.statusText}>{status}</Text>
          </View>
        ) : null}
        <TouchableOpacity
          style={[styles.completeBtn, (!allConsented || loading) && styles.completeBtnDisabled]}
          onPress={handleComplete}
          disabled={!allConsented || loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Text style={styles.completeBtnIcon}>🚀</Text>
              <Text style={styles.completeBtnText}>
                {hi ? 'रजिस्ट्रेशन पूरा करें!' : 'Complete Registration!'}
              </Text>
            </>
          )}
        </TouchableOpacity>
        <Text style={styles.footerNote}>
          {hi ? '✅ आपकी जानकारी 256-bit एन्क्रिप्शन से सुरक्षित है।' : '✅ Your data is secured with 256-bit encryption.'}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: G.white },
  scroll: { flex: 1, backgroundColor: G.bg },
  scrollContent: { padding: 20, paddingBottom: 120 },

  back: { marginBottom: 16 },
  backText: { color: G.primary, fontSize: 15, fontWeight: '600' },

  successIllus: { alignItems: 'center', marginBottom: 24 },
  successCircle: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: '#FFF3E8', alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: G.primary, marginBottom: 12,
  },
  successEmoji: { fontSize: 40 },
  successTitle: { fontSize: 24, fontWeight: '800', color: G.text, marginBottom: 4 },
  successSub: { fontSize: 13, color: G.sub, textAlign: 'center' },

  summaryCard: {
    backgroundColor: G.white, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: G.border, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  summaryTitle: { fontSize: 14, fontWeight: '700', color: G.text, marginBottom: 10 },
  summaryRow: { flexDirection: 'row', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  summaryKey: { fontSize: 13, color: G.sub, width: 80, fontWeight: '600' },
  summaryVal: { fontSize: 13, color: G.text, flex: 1, fontWeight: '500' },

  voiceBox: {
    backgroundColor: '#E8F4FD', borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: '#90CAF9', marginBottom: 16,
  },
  voiceTitle: { fontSize: 14, fontWeight: '700', color: '#1565C0', marginBottom: 6 },
  voiceText: { fontSize: 12, color: '#1976D2', marginBottom: 12, lineHeight: 18 },
  speakBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#1565C0', borderRadius: 10,
    paddingVertical: 10, paddingHorizontal: 20, gap: 8,
  },
  speakBtnActive: { backgroundColor: '#0D47A1' },
  speakBtnIcon: { fontSize: 18 },
  speakBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  consentBox: {
    backgroundColor: G.white, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: G.border,
  },
  consentTitle: { fontSize: 14, fontWeight: '700', color: G.text, marginBottom: 12 },
  checkItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14, gap: 12 },
  checkBox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: G.border,
    alignItems: 'center', justifyContent: 'center', marginTop: 1, flexShrink: 0,
  },
  checkBoxChecked: { backgroundColor: G.green, borderColor: G.green },
  checkMark: { color: '#fff', fontSize: 13, fontWeight: '900' },
  checkLabel: { flex: 1, fontSize: 13, color: G.text, lineHeight: 19 },

  footer: {
    backgroundColor: G.white, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 20,
    borderTopWidth: 1, borderTopColor: '#F0F0F0',
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  statusText: { fontSize: 13, color: G.green, fontWeight: '600' },
  completeBtn: {
    backgroundColor: G.green, borderRadius: 14, paddingVertical: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, marginBottom: 8,
    shadowColor: G.green, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35, shadowRadius: 6, elevation: 4,
  },
  completeBtnDisabled: { backgroundColor: '#BDBDBD', shadowOpacity: 0 },
  completeBtnIcon: { fontSize: 20 },
  completeBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  footerNote: { textAlign: 'center', fontSize: 11, color: G.sub },
});
