import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Alert,
  ScrollView, Keyboard, TouchableWithoutFeedback, Image,
  StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { TextInput, Button, ActivityIndicator } from 'react-native-paper';
import { useLanguage } from '../../i18n/LanguageContext';
import { api } from '../../services/api';

interface Props {
  navigation: any;
}

type LoginMode = 'password' | 'otp';

export default function LoginScreen({ navigation }: Props) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loginMode, setLoginMode] = useState<LoginMode>('password');
  const { t, lang, toggle } = useLanguage();
  const insets = useSafeAreaInsets();
  const androidStatusBar = Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0;
  const effectiveTopPadding = Math.max(insets.top > 0 ? 8 : (androidStatusBar + 8), 16);

  // ── Password mode → verify password → OTP sent (2FA) ──────────────────────
  const handlePasswordLogin = async () => {
    Keyboard.dismiss();
    if (phone.length !== 10) {
      Alert.alert(t('invalidPhone'), t('invalidPhoneMsg'));
      return;
    }
    if (!password) {
      Alert.alert('', lang === 'hi' ? 'पासवर्ड दर्ज करें' : 'Please enter password');
      return;
    }

    setIsLoading(true);
    try {
      await api.post('/api/auth/login', { phone, password });
      Alert.alert(
        lang === 'hi' ? 'OTP भेजा गया' : 'OTP Sent',
        lang === 'hi'
          ? `आपके नंबर ${phone} पर 6 अंकों का OTP भेजा गया है।`
          : `A 6-digit OTP has been sent to ${phone}`,
        [{ text: 'OK', onPress: () => navigation.navigate('OTPVerify', { phone, mode: 'login' }) }]
      );
    } catch (err: any) {
      Alert.alert(
        lang === 'hi' ? 'लॉगिन विफल' : 'Login Failed',
        _parseError(err)
      );
    } finally {
      setIsLoading(false);
    }
  };

  // ── Direct OTP mode (No password) ─────────────────────────────────────────
  const handleOtpLogin = async () => {
    Keyboard.dismiss();
    if (phone.length !== 10) {
      Alert.alert(t('invalidPhone'), t('invalidPhoneMsg'));
      return;
    }

    setIsLoading(true);
    try {
      await api.post('/api/auth/login-with-otp', { phone });
      Alert.alert(
        lang === 'hi' ? 'OTP भेजा गया' : 'OTP Sent',
        lang === 'hi'
          ? `आपके नंबर ${phone} पर 6 अंकों का लॉगिन OTP भेजा गया है।`
          : `A 6-digit Login OTP has been sent to ${phone}`,
        [{ text: 'OK', onPress: () => navigation.navigate('OTPVerify', { phone, mode: 'login' }) }]
      );
    } catch (err: any) {
      Alert.alert(
        lang === 'hi' ? 'त्रुटि' : 'Error',
        _parseError(err)
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = () =>
    loginMode === 'password' ? handlePasswordLogin() : handleOtpLogin();

  const _parseError = (err: any): string => {
    const detail = err.response?.data?.detail;
    if (!err.response) return `Cannot reach server.\nCheck your network.\n\nServer: ${process.env.EXPO_PUBLIC_API_URL}`;
    if (Array.isArray(detail)) return detail.map((d: any) => d.msg || JSON.stringify(d)).join('\n');
    if (typeof detail === 'string') return detail;
    return 'Login failed';
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              { paddingTop: effectiveTopPadding }
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Language Toggle Row (With safe area margin from status bar) */}
            <View style={styles.langToggleRow}>
              <TouchableOpacity
                style={styles.langToggle}
                onPress={toggle}
                activeOpacity={0.7}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Text style={styles.langToggleText}>🌐</Text>
                <Text style={[styles.langOption, lang === 'hi' && styles.langActive]}>हिं</Text>
                <Text style={styles.langSep}>|</Text>
                <Text style={[styles.langOption, lang === 'en' && styles.langActive]}>EN</Text>
              </TouchableOpacity>
            </View>

            {/* Logo */}
            <View style={styles.logoContainer}>
            <Image
              source={require('../../../assets/logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <Text style={styles.logoText}>{t('appName')}</Text>
            <Text style={styles.logoSubText}>Shram Sarathi Network</Text>
            <Text style={styles.tagline}>{t('tagline')}</Text>
            {/* Unified Single Login Badge */}
            <View style={{
              backgroundColor: '#E8F5E9',
              borderColor: '#A5D6A7',
              borderWidth: 1,
              borderRadius: 20,
              paddingHorizontal: 12,
              paddingVertical: 5,
              marginTop: 10,
              alignItems: 'center',
            }}>
              <Text style={{ fontSize: 11, color: '#1B5E20', fontWeight: '600', textAlign: 'center' }}>
                {lang === 'hi'
                  ? '👤 ग्राहक • मजदूर • कारीगर • ड्राइवर • ठेकेदार • गाड़ी मालिक — एक ही लॉगिन'
                  : '👤 Customer • Majdoor • Karigar • Driver • Thekedar • Vehicle Owner — Single Login'}
              </Text>
            </View>
          </View>

          {/* Mode Toggle — Password | OTP */}
          <View style={styles.modeToggleContainer}>
            <TouchableOpacity
              style={[styles.modeBtn, loginMode === 'password' && styles.modeBtnActive]}
              onPress={() => setLoginMode('password')}
            >
              <Text style={[styles.modeBtnText, loginMode === 'password' && styles.modeBtnTextActive]}>
                {lang === 'hi' ? '🔑 पासवर्ड' : '🔑 Password'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeBtn, loginMode === 'otp' && styles.modeBtnActive]}
              onPress={() => setLoginMode('otp')}
            >
              <Text style={[styles.modeBtnText, loginMode === 'otp' && styles.modeBtnTextActive]}>
                {lang === 'hi' ? '📱 OTP से' : '📱 With OTP'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Phone */}
          <TextInput
            label={t('mobileNumber')}
            placeholder={t('enterPhone')}
            keyboardType="phone-pad"
            maxLength={10}
            value={phone}
            onChangeText={setPhone}
            mode="outlined"
            activeOutlineColor="#FF6B00"
            left={<TextInput.Affix text="+91 " />}
            style={styles.input}
            returnKeyType={loginMode === 'password' ? 'next' : 'done'}
            onSubmitEditing={loginMode === 'otp' ? handleSubmit : undefined}
          />

          {/* Password Field — only in password mode */}
          {loginMode === 'password' && (
            <View style={{ marginBottom: 20 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 4 }}>
                <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
                  <Text style={styles.forgotPasswordText}>
                    {lang === 'hi' ? 'पासवर्ड भूल गए?' : 'Forgot Password?'}
                  </Text>
                </TouchableOpacity>
              </View>
              <TextInput
                label={lang === 'hi' ? 'पासवर्ड' : 'Password'}
                placeholder={lang === 'hi' ? 'पासवर्ड दर्ज करें' : 'Enter password'}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                mode="outlined"
                activeOutlineColor="#FF6B00"
                style={styles.input}
                right={
                  <TextInput.Icon
                    icon={showPassword ? "eye-off" : "eye"}
                    onPress={() => setShowPassword(!showPassword)}
                  />
                }
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
              />
            </View>
          )}

          {/* OTP mode helper text */}
          {loginMode === 'otp' && (
            <View style={styles.otpHintBox}>
              <Text style={styles.otpHintText}>
                {lang === 'hi'
                  ? 'आपके रजिस्टर्ड नंबर पर OTP भेजा जाएगा'
                  : 'An OTP will be sent to your registered mobile number'}
              </Text>
            </View>
          )}

          {/* Submit Button */}
          <Button
            mode="contained"
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={isLoading}
            loading={isLoading}
            buttonColor="#FF6B00"
            labelStyle={styles.buttonText}
          >
            {loginMode === 'otp'
              ? (lang === 'hi' ? 'OTP भेजें' : 'Send OTP')
              : (lang === 'hi' ? 'लॉगिन करें' : 'Login')}
          </Button>

          {/* Signup Link */}
          <View style={styles.signupRow}>
            <Text style={styles.signupText}>
              {lang === 'hi' ? 'नया अकाउंट? ' : 'New user? '}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('RoleSelection')}>
              <Text style={styles.signupLink}>
                {lang === 'hi' ? 'साइनअप करें' : 'Sign Up'}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.disclaimer}>
            {loginMode === 'password'
              ? (lang === 'hi' ? 'लॉगिन पर OTP से 2FA सत्यापन होगा' : 'Login requires OTP verification (2FA)')
              : (lang === 'hi' ? 'पासवर्ड की जरूरत नहीं — सिर्फ OTP से लॉगिन' : 'No password needed — login with OTP only')}
          </Text>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  flex: { flex: 1, backgroundColor: '#FFFFFF' },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 140,
  },
  langToggleRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  langToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  langToggleText: { fontSize: 13 },
  langOption: { fontSize: 12, color: '#64748B', fontWeight: '700' },
  langActive: { color: '#FF6B00', fontWeight: '800' },
  langSep: { fontSize: 12, color: '#CBD5E1' },
  logoContainer: { alignItems: 'center', marginBottom: 28 },
  logoImage: { width: 95, height: 95, marginBottom: 8 },
  logoEmoji: { fontSize: 56 },
  logoText: { fontSize: 26, fontWeight: 'bold', color: '#FF6B00', marginTop: 4, textAlign: 'center' },
  logoSubText: { fontSize: 13, fontWeight: '700', color: '#374151', letterSpacing: 0.5, marginTop: 2, textAlign: 'center' },
  tagline: { fontSize: 13, color: '#666', marginTop: 4, textAlign: 'center' },

  // Mode toggle
  modeToggleContainer: {
    flexDirection: 'row',
    borderWidth: 1.5,
    borderColor: '#FF6B00',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 28,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 11,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  modeBtnActive: { backgroundColor: '#FF6B00' },
  modeBtnText: { fontSize: 14, fontWeight: '600', color: '#FF6B00' },
  modeBtnTextActive: { color: '#fff' },

  // Fields
  fieldContainer: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8 },
  input: { backgroundColor: '#fff', marginBottom: 20 },

  // OTP hint
  otpHintBox: {
    backgroundColor: '#FFF3E8',
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FFD4B0',
  },
  otpHintText: { fontSize: 13, color: '#CC5500', textAlign: 'center' },

  // Buttons
  button: {
    borderRadius: 12,
    paddingVertical: 4, marginTop: 4,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  signupRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  signupText: { color: '#666', fontSize: 14 },
  signupLink: { color: '#FF6B00', fontSize: 14, fontWeight: '600' },
  disclaimer: { marginTop: 16, textAlign: 'center', color: '#999', fontSize: 12 },
  forgotPasswordText: { color: '#FF6B00', fontSize: 13, fontWeight: '500' },
});

