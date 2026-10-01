import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Alert,
  ScrollView, Keyboard, TouchableWithoutFeedback,
} from 'react-native';
import { TextInput, Button, ActivityIndicator } from 'react-native-paper';
import { useLanguage } from '../../i18n/LanguageContext';
import { api } from '../../services/api';

interface Props {
  route: any;
  navigation: any;
}

export default function ResetPasswordScreen({ route, navigation }: Props) {
  const phone = route.params?.phone || '';
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { lang } = useLanguage();

  const handleResetPassword = async () => {
    Keyboard.dismiss();
    
    if (otp.length !== 6) {
      Alert.alert('', lang === 'hi' ? '6-अंकों का OTP दर्ज करें' : 'Please enter 6-digit OTP');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('', lang === 'hi' ? 'नया पासवर्ड कम से कम 6 अक्षर का होना चाहिए' : 'New password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('', lang === 'hi' ? 'पासवर्ड मेल नहीं खाते' : 'Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.post('/api/auth/reset-password', {
        phone,
        otp,
        new_password: newPassword
      });
      
      Alert.alert(
        lang === 'hi' ? 'सफलता' : 'Success',
        res.data.message || (lang === 'hi' ? 'पासवर्ड सफलतापूर्वक रीसेट किया गया' : 'Password reset successfully'),
        [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
      );
    } catch (err: any) {
      const detail = err.response?.data?.detail || (lang === 'hi' ? 'पासवर्ड रीसेट विफल' : 'Password reset failed');
      Alert.alert('Error', detail);
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
        >
          <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>← {lang === 'hi' ? 'वापस' : 'Back'}</Text>
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.title}>
              {lang === 'hi' ? 'पासवर्ड रीसेट करें' : 'Reset Password'}
            </Text>
            <Text style={styles.subtitle}>
              {lang === 'hi'
                ? `${phone} पर भेजा गया 6-अंकों का OTP दर्ज करें और अपना नया पासवर्ड सेट करें।`
                : `Enter the 6-digit OTP sent to ${phone} and set your new password.`}
            </Text>
          </View>

          {/* OTP */}
          <TextInput
            mode="outlined"
            label={lang === 'hi' ? 'OTP दर्ज करें' : 'Enter OTP'}
            placeholder="000000"
            keyboardType="number-pad"
            maxLength={6}
            value={otp}
            onChangeText={setOtp}
            activeOutlineColor="#FF6B00"
            style={[styles.input, { textAlign: 'center', letterSpacing: 8 }]}
            contentStyle={{ textAlign: 'center', letterSpacing: 8 }}
          />

          {/* New Password */}
          <TextInput
            mode="outlined"
            label={lang === 'hi' ? 'नया पासवर्ड' : 'New Password'}
            placeholder={lang === 'hi' ? 'कम से कम 6 अक्षर' : 'At least 6 characters'}
            secureTextEntry={!showPassword}
            value={newPassword}
            onChangeText={setNewPassword}
            activeOutlineColor="#FF6B00"
            style={styles.input}
            right={
              <TextInput.Icon
                icon={showPassword ? 'eye-off' : 'eye'}
                onPress={() => setShowPassword(!showPassword)}
              />
            }
          />

          {/* Confirm Password */}
          <View style={styles.fieldContainer}>
            <TextInput
              mode="outlined"
              label={lang === 'hi' ? 'पासवर्ड दोबारा दर्ज करें' : 'Confirm Password'}
              placeholder={lang === 'hi' ? 'पासवर्ड दोबारा लिखें' : 'Re-enter password'}
              secureTextEntry={!showPassword}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              activeOutlineColor="#FF6B00"
              error={Boolean(confirmPassword && newPassword !== confirmPassword)}
              style={styles.input}
            />
            {confirmPassword && newPassword !== confirmPassword && (
              <Text style={styles.errorText}>
                {lang === 'hi' ? 'पासवर्ड मेल नहीं खाते' : 'Passwords do not match'}
              </Text>
            )}
          </View>

          <Button
            mode="contained"
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleResetPassword}
            disabled={isLoading}
            loading={isLoading}
            buttonColor="#FF6B00"
            labelStyle={styles.buttonText}
          >
            {lang === 'hi' ? 'पासवर्ड रीसेट करें' : 'Reset Password'}
          </Button>
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
  header: { marginBottom: 32 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#666', lineHeight: 20 },
  fieldContainer: { marginBottom: 16 },
  input: { backgroundColor: '#fff', marginBottom: 16 },
  errorText: { color: '#e53e3e', fontSize: 12, marginTop: 4 },
  button: {
    borderRadius: 12,
    paddingVertical: 4, marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});
