import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Alert, TextInput as RNTextInput, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { Button, ActivityIndicator } from 'react-native-paper';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../../store';
import { useLanguage } from '../../i18n/LanguageContext';
import { api } from '../../services/api';
import { verifyOTP, verifySignupOTP } from '../../store/slices/authSlice';
import { isProviderRole, isAgentRole } from '../../utils/roleUtils';

interface Props {
  navigation: any;
  // mode: 'login' (default) | 'signup'
  route: { params: { phone: string; mode?: 'login' | 'signup' } };
}

export default function OTPScreen({ navigation, route }: Props) {
  const { phone, mode = 'login' } = route.params;
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(60);
  const [isLoading, setIsLoading] = useState(false);
  const inputs = useRef<RNTextInput[]>([]);
  const dispatch = useDispatch<AppDispatch>();
  const { t, lang } = useLanguage();

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleChange = (text: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = text.slice(-1);
    setOtp(newOtp);
    if (text && index < 5) inputs.current[index + 1]?.focus();
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const clearOtp = () => {
    setOtp(['', '', '', '', '', '']);
    setTimeout(() => {
      inputs.current[0]?.focus();
    }, 100);
  };

  const handleVerify = async () => {
    const otpString = otp.join('');
    if (otpString.length !== 6) {
      Alert.alert(t('incompleteOtp'), t('incompleteOtpMsg'));
      return;
    }

    setIsLoading(true);
    try {
      if (mode === 'signup') {
        // ── Signup: Only verify OTP. User NOT created in DB yet. ──────────────
        const result = await dispatch(verifySignupOTP({ phone, otp: otpString }));
        if (verifySignupOTP.fulfilled.match(result)) {
          // Navigate to Dynamic Profile (Step 3 of wizard)
          const roles = (route.params as any)?.roles ?? [];
          const name  = (route.params as any)?.name  ?? '';
          navigation.replace('DynamicProfileScreen', { phone, roles, name });
        } else {
          Alert.alert('Error', (result.payload as string) || 'Invalid OTP');
          clearOtp();
        }
      } else {
        // ── Login: Verify OTP → get JWT → navigate to app ────────────────────
        const result = await dispatch(verifyOTP({ phone, otp: otpString, mode }));
        if (verifyOTP.fulfilled.match(result)) {
          const role = result.payload.role;
          const dest = isProviderRole(role)
            ? 'ProviderApp'
            : isAgentRole(role)
            ? 'AgentApp'
            : 'CustomerApp';
          navigation.reset({ index: 0, routes: [{ name: dest }] });
        } else {
          Alert.alert('Error', (result.payload as string) || 'Invalid OTP');
          clearOtp();
        }
      }
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      Alert.alert('Error', typeof detail === 'string' ? detail : 'OTP verification failed');
      clearOtp();
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (timer > 0) return;
    try {
      if (mode === 'signup') {
        // Can't resend signup OTP without re-entering password — go back
        Alert.alert(
          '',
          lang === 'hi' ? 'कृपया दोबारा साइनअप करें' : 'Please restart signup',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        // For login, we can't resend without password either
        Alert.alert(
          '',
          lang === 'hi' ? 'कृपया दोबारा लॉगिन करें' : 'Please restart login',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    } catch {
      Alert.alert('Error', 'Failed to resend OTP');
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#fff' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>{t('goBack')}</Text>
        </TouchableOpacity>

        <Text style={styles.title}>{t('enterOtp')}</Text>
        <Text style={styles.subtitle}>
          +91 {phone} {t('otpSentTo')}
        </Text>

        {/* OTP Boxes */}
        <View style={styles.otpRow}>
          {otp.map((digit, index) => (
            <RNTextInput
              key={index}
              ref={(ref) => { if (ref) inputs.current[index] = ref; }}
              style={[styles.otpBox, digit ? styles.otpBoxFilled : null]}
              value={digit}
              onChangeText={(text) => handleChange(text, index)}
              onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
              keyboardType="number-pad"
              maxLength={1}
              cursorColor="#FF6B00"
              selectionColor="rgba(255, 107, 0, 0.3)"
              accessibilityLabel={`OTP digit ${index + 1}`}
            />
          ))}
        </View>

        <Button
          mode="contained"
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleVerify}
          disabled={isLoading}
          loading={isLoading}
          buttonColor="#FF6B00"
          labelStyle={styles.buttonText}
        >
          {t('verify')}
        </Button>

        <TouchableOpacity
          onPress={handleResend}
          disabled={timer > 0}
          style={styles.resendContainer}
        >
          <Text style={[styles.resendText, timer > 0 && styles.resendDisabled]}>
            {timer > 0 ? `${t('resendIn')} (${timer}s)` : t('resendOtp')}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#fff', padding: 24, paddingTop: 60, paddingBottom: 120 },
  back: { marginBottom: 32 },
  backText: { fontSize: 16, color: '#FF6B00' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 40 },
  otpRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 32 },
  otpBox: {
    width: 48, height: 56, borderWidth: 1.5, borderColor: '#ddd',
    borderRadius: 12, fontSize: 24, fontWeight: 'bold', backgroundColor: 'transparent',
    textAlign: 'center', color: '#333'
  },
  otpBoxFilled: { borderColor: '#FF6B00', backgroundColor: '#FFF5EE' },
  button: {
    borderRadius: 12,
    paddingVertical: 4, marginBottom: 16,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  resendContainer: { alignItems: 'center' },
  resendText: { color: '#FF6B00', fontSize: 14 },
  resendDisabled: { color: '#999' },
});
