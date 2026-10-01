import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Alert,
  ScrollView, Keyboard, TouchableWithoutFeedback,
} from 'react-native';
import { TextInput, Button, ActivityIndicator } from 'react-native-paper';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../../store';
import { useLanguage } from '../../i18n/LanguageContext';
import { api } from '../../services/api';

interface Props {
  navigation: any;
  route?: any;
}

const SIGNUP_ROLES = [
  { id: 'CUSTOMER', labelHi: '🏠 ग्राहक (Customer)', labelEn: '🏠 Customer', key: 'customer' },
  { id: 'LABOUR', labelHi: '👷 मजदूर (Labour)', labelEn: '👷 Labour', key: 'labour' },
  { id: 'KARIGAR', labelHi: '🛠️ कारीगर (Karigar)', labelEn: '🛠️ Karigar', key: 'karigar' },
  { id: 'DRIVER', labelHi: '🚗 चालक (Driver)', labelEn: '🚗 Driver', key: 'driver' },
  { id: 'TRANSPORT', labelHi: '🚛 वाहन / ट्रांसपोर्ट (Vehicle/Transport)', labelEn: '🚛 Vehicle / Transport', key: 'transport' },
  { id: 'CONTRACTOR', labelHi: '🏗️ ठेकेदार (Contractor)', labelEn: '🏗️ Contractor', key: 'contractor' },
  { id: 'AGENT', labelHi: '💼 एजेंट (Agent)', labelEn: '💼 Agent', key: 'agent' },
];

export default function SignupScreen({ navigation, route }: Props) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [gender, setGender] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { t, lang } = useLanguage();

  const passedRoles: string[] = (route?.params?.roles as string[]) || [];
  // Customer role is always fixed & mandatory
  const initialRoles = Array.from(new Set(['CUSTOMER', ...passedRoles.map(r => r.toUpperCase())]));
  const [selectedRoles, setSelectedRoles] = useState<string[]>(initialRoles);

  const toggleRole = (roleId: string) => {
    if (roleId.toUpperCase() === 'CUSTOMER') {
      Alert.alert(
        lang === 'hi' ? 'सूचना' : 'Notice',
        lang === 'hi'
          ? 'ग्राहक (Customer) भूमिका सभी खातों के लिए अनिवार्य है।'
          : 'Customer role is mandatory for all accounts.'
      );
      return;
    }
    setSelectedRoles((prev) => {
      // Normalize comparison
      const hasRole = prev.some(r => r.toUpperCase() === roleId.toUpperCase());
      if (hasRole) {
        return prev.filter(r => r.toUpperCase() !== roleId.toUpperCase());
      }
      return [...prev, roleId];
    });
  };

  const handleSignup = async () => {
    Keyboard.dismiss();

    if (!name.trim()) {
      Alert.alert('', lang === 'hi' ? 'नाम दर्ज करें' : 'Please enter your name');
      return;
    }
    if (phone.length !== 10) {
      Alert.alert(t('invalidPhone'), t('invalidPhoneMsg'));
      return;
    }
    if (password.length < 6) {
      Alert.alert('', lang === 'hi' ? 'पासवर्ड कम से कम 6 अक्षर का होना चाहिए' : 'Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('', lang === 'hi' ? 'पासवर्ड मेल नहीं खाते' : 'Passwords do not match');
      return;
    }
    if (selectedRoles.length === 0) {
      Alert.alert('', lang === 'hi' ? 'कम से कम 1 भूमिका अवश्य चुनें' : 'Please select at least 1 role');
      return;
    }

    const finalRoles = Array.from(new Set(['customer', ...selectedRoles.map(r => r.toLowerCase())]));

    setIsLoading(true);
    try {
      await api.post('/api/auth/signup', {
        name,
        phone,
        password,
        gender,
        roles: finalRoles,
      });
      // OTP is in backend logs (dev mode)
      Alert.alert(
        lang === 'hi' ? 'OTP भेजा गया' : 'OTP Sent',
        lang === 'hi'
          ? `${phone} पर 6 अंकों का OTP भेजा गया`
          : `A 6-digit OTP has been sent to ${phone}`,
        [{ text: 'OK', onPress: () => navigation.navigate('VerifySignup', { phone, mode: 'signup', roles: finalRoles, name }) }]
      );
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      let errorMsg: string;
      if (!err.response) {
        errorMsg = lang === 'hi'
          ? 'सर्वर से कनेक्ट नहीं हो सका'
          : 'Cannot reach server. Check your network.';
      } else if (Array.isArray(detail)) {
        // Pydantic validation error — extract first message
        errorMsg = detail.map((d: any) => d.msg || JSON.stringify(d)).join('\n');
      } else if (typeof detail === 'string') {
        errorMsg = detail;
      } else {
        errorMsg = lang === 'hi' ? 'साइनअप विफल' : 'Signup failed';
      }
      Alert.alert('Error', errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>← {lang === 'hi' ? 'वापस' : 'Back'}</Text>
          </TouchableOpacity>

          <Text style={styles.title}>
            {lang === 'hi' ? 'नया अकाउंट बनाएं' : 'Create Account'}
          </Text>
          <Text style={styles.subtitle}>
            {lang === 'hi' ? 'श्रम सारथी से जुड़ें' : 'Join Shram Sarathi'}
          </Text>

          {/* Name */}
          <TextInput
            label={lang === 'hi' ? 'पूरा नाम' : 'Full Name'}
            style={styles.input}
            placeholder={lang === 'hi' ? 'अपना नाम दर्ज करें' : 'Enter your name'}
            value={name}
            onChangeText={setName}
            mode="outlined"
            activeOutlineColor="#FF6B00"
            autoCapitalize="words"
          />

          {/* Phone */}
          <TextInput
            label={t('mobileNumber')}
            style={styles.input}
            placeholder={t('enterPhone')}
            keyboardType="phone-pad"
            maxLength={10}
            value={phone}
            onChangeText={setPhone}
            mode="outlined"
            activeOutlineColor="#FF6B00"
            left={<TextInput.Affix text="+91 " />}
          />

          {/* Gender */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>{lang === 'hi' ? 'लिंग / Gender' : 'Gender'}</Text>
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
                      {lang === 'hi' ? opt.labelHi : opt.labelEn}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Role Selection (Multi-select) */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>
              {lang === 'hi'
                ? 'खाते की भूमिकाएं चुनें (Choose Roles — एक से अधिक चुन सकते हैं)'
                : 'Choose Account Roles (Multi-select)'}
            </Text>
            <Text style={styles.roleSubtext}>
              {lang === 'hi'
                ? '📌 नोट: आप बाद में केवल इन्हीं चुनी हुई भूमिकाओं में अकाउंट स्विच कर सकेंगे।'
                : '📌 Note: You will only be able to switch between these selected roles.'}
            </Text>
            <View style={styles.roleChipsWrap}>
              {SIGNUP_ROLES.map((opt) => {
                const isCustomer = opt.id === 'CUSTOMER';
                const isSel = isCustomer || selectedRoles.some(
                  r => r.toUpperCase() === opt.id.toUpperCase() || r.toLowerCase() === opt.key.toLowerCase()
                );
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[
                      styles.roleSelectChip,
                      isSel && styles.roleSelectChipSelected,
                      isCustomer && styles.roleSelectChipMandatory,
                    ]}
                    onPress={() => toggleRole(opt.id)}
                    activeOpacity={0.75}
                  >
                    <Text style={[
                      styles.roleSelectText,
                      isSel && styles.roleSelectTextSelected,
                      isCustomer && styles.roleSelectTextMandatory,
                    ]}>
                      {isCustomer ? '🔒 ✓ ' : isSel ? '✓ ' : '+ '}
                      {lang === 'hi' ? opt.labelHi : opt.labelEn}
                      {isCustomer ? (lang === 'hi' ? ' (अनिवार्य)' : ' (Mandatory)') : ''}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Password */}
          <TextInput
            label={lang === 'hi' ? 'पासवर्ड' : 'Password'}
            style={styles.input}
            placeholder={lang === 'hi' ? 'कम से कम 6 अक्षर' : 'At least 6 characters'}
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
            mode="outlined"
            activeOutlineColor="#FF6B00"
            right={
              <TextInput.Icon 
                icon={showPassword ? "eye-off" : "eye"} 
                onPress={() => setShowPassword(!showPassword)} 
              />
            }
          />

          {/* Confirm Password */}
          <View style={{ marginBottom: 20 }}>
            <TextInput
              label={lang === 'hi' ? 'पासवर्ड दोबारा दर्ज करें' : 'Confirm Password'}
              style={[
                styles.input,
                { marginBottom: 0 } // error text needs to be close
              ]}
              placeholder={lang === 'hi' ? 'पासवर्ड दोबारा लिखें' : 'Re-enter password'}
              secureTextEntry={!showPassword}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              mode="outlined"
              activeOutlineColor="#FF6B00"
              error={Boolean(confirmPassword && password !== confirmPassword)}
            />
            {confirmPassword && password !== confirmPassword && (
              <Text style={styles.errorText}>
                {lang === 'hi' ? 'पासवर्ड मेल नहीं खाते' : 'Passwords do not match'}
              </Text>
            )}
          </View>

          {/* Signup Button */}
          <Button
            mode="contained"
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleSignup}
            disabled={isLoading}
            loading={isLoading}
            buttonColor="#FF6B00"
            labelStyle={styles.buttonText}
          >
            {lang === 'hi' ? 'OTP भेजें' : 'Send OTP'}
          </Button>

          {/* Login Link */}
          <View style={styles.loginRow}>
            <Text style={styles.loginText}>
              {lang === 'hi' ? 'पहले से अकाउंट है? ' : 'Already have an account? '}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>
                {lang === 'hi' ? 'लॉगिन करें' : 'Login'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#fff' },
  scrollContent: { flexGrow: 1, padding: 24, paddingTop: 60, paddingBottom: 140 },
  back: { marginBottom: 24 },
  backText: { color: '#FF6B00', fontSize: 16 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#333', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 32 },
  fieldContainer: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 6 },
  roleSubtext: { fontSize: 12, color: '#C2410C', marginBottom: 8, fontStyle: 'italic' },
  roleChipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  roleSelectChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
  },
  roleSelectChipSelected: {
    backgroundColor: '#FFF3E0',
    borderColor: '#FF6B00',
  },
  roleSelectChipMandatory: {
    backgroundColor: '#E8F5E9',
    borderColor: '#2E7D32',
  },
  roleSelectText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
  },
  roleSelectTextSelected: {
    color: '#E65100',
    fontWeight: '700',
  },
  roleSelectTextMandatory: {
    color: '#1B5E20',
    fontWeight: '700',
  },
  input: { backgroundColor: '#fff', marginBottom: 20 },
  inputError: { borderColor: '#e53e3e' },
  errorText: { color: '#e53e3e', fontSize: 12, marginTop: 4 },
  // Gender buttons — outlined Material-style
  genderBtn: {
    flex: 1,
    height: 56,
    borderWidth: 1,
    borderColor: '#79747E',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  genderBtnSelected: {
    borderWidth: 2,
    borderColor: '#FF6B00',
    backgroundColor: '#FFF5EE',
  },
  genderBtnText: {
    fontSize: 15,
    color: '#49454F',
    fontWeight: '500',
  },
  genderBtnTextSelected: {
    color: '#FF6B00',
    fontWeight: '700',
  },
  button: {
    borderRadius: 12,
    paddingVertical: 4, marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  loginRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  loginText: { color: '#666', fontSize: 14 },
  loginLink: { color: '#FF6B00', fontSize: 14, fontWeight: '600' },
});
