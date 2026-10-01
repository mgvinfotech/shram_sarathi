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
  navigation: any;
}

export default function ForgotPasswordScreen({ navigation }: Props) {
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { t, lang } = useLanguage();

  const handleSendOTP = async () => {
    Keyboard.dismiss();
    if (phone.length !== 10) {
      Alert.alert(t('invalidPhone'), t('invalidPhoneMsg'));
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.post('/api/auth/forgot-password', { phone });
      Alert.alert(
        lang === 'hi' ? 'OTP भेजा गया' : 'OTP Sent',
        res.data.message || (lang === 'hi'
          ? `${phone} पर 6 अंकों का OTP भेजा गया`
          : `A 6-digit OTP has been sent to ${phone}`),
        [{ text: 'OK', onPress: () => navigation.navigate('ResetPassword', { phone }) }]
      );
    } catch (err: any) {
      const detail = err.response?.data?.detail || (lang === 'hi' ? 'OTP भेजने में विफल' : 'Failed to send OTP');
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
              {lang === 'hi' ? 'पासवर्ड भूल गए?' : 'Forgot Password?'}
            </Text>
            <Text style={styles.subtitle}>
              {lang === 'hi'
                ? 'अपना पंजीकृत मोबाइल नंबर दर्ज करें। हम आपको पासवर्ड रीसेट करने के लिए एक OTP भेजेंगे।'
                : 'Enter your registered mobile number. We will send you an OTP to reset your password.'}
            </Text>
          </View>

          <TextInput
            mode="outlined"
            label={t('mobileNumber')}
            placeholder={t('enterPhone')}
            keyboardType="phone-pad"
            maxLength={10}
            value={phone}
            onChangeText={setPhone}
            left={<TextInput.Affix text="🇮🇳 +91 " />}
            activeOutlineColor="#FF6B00"
            style={styles.input}
            returnKeyType="done"
            onSubmitEditing={handleSendOTP}
          />

          <Button
            mode="contained"
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleSendOTP}
            disabled={isLoading}
            loading={isLoading}
            buttonColor="#FF6B00"
            labelStyle={styles.buttonText}
          >
            {lang === 'hi' ? 'OTP भेजें' : 'Send OTP'}
          </Button>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#fff' },
  scrollContent: { flexGrow: 1, padding: 24, paddingTop: 60, paddingBottom: 120 },
  back: { marginBottom: 24 },
  backText: { color: '#FF6B00', fontSize: 16 },
  header: { marginBottom: 32 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#666', lineHeight: 20 },
  input: { backgroundColor: '#fff', marginBottom: 24 },
  button: {
    borderRadius: 12,
    paddingVertical: 4,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});
