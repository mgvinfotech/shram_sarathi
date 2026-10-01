import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View, ScrollView, StyleSheet, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Text, TextInput, Button, Surface, Divider } from 'react-native-paper';
import { api } from '../../services/api';
import { useLanguage } from '../../i18n/LanguageContext';

interface Props { navigation: any; route?: any; }

export default function ContractorDealScreen({ navigation, route }: Props) {
  const { t, lang } = useLanguage();

  const [bookingId, setBookingId] = useState(route?.params?.bookingId ? String(route.params.bookingId) : '');
  const [pin, setPin] = useState('');
  const [workDate, setWorkDate] = useState('');
  const [workTime, setWorkTime] = useState('');
  const [workTerms, setWorkTerms] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingDetails, setFetchingDetails] = useState(false);
  const [bookingDetails, setBookingDetails] = useState<any>(null);
  const [confirmed, setConfirmed] = useState<any>(null);

  const fetchDetails = async () => {
    if (!bookingId) {
      Alert.alert('', lang === 'hi' ? 'पहले बुकिंग ID भरें' : 'Enter Booking ID first');
      return;
    }
    setFetchingDetails(true);
    try {
      const res = await api.get(`/api/contractor/booking/${bookingId}`);
      setBookingDetails(res.data);
    } catch (err: any) {
      setBookingDetails(null);
      Alert.alert('❌', err.response?.data?.detail || 'Booking not found');
    } finally {
      setFetchingDetails(false);
    }
  };

  const handleConfirm = async () => {
    if (!bookingId || !pin || pin.length !== 4) {
      Alert.alert('', lang === 'hi'
        ? 'बुकिंग ID और 4 अंकों का PIN जरूरी है।'
        : 'Booking ID and 4-digit PIN are required.');
      return;
    }
    if (!workDate || !workTime) {
      Alert.alert('', lang === 'hi'
        ? 'काम की तारीख और समय भी भरें।'
        : 'Work date and time are required.');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/api/contractor/confirm-deal', {
        booking_id: parseInt(bookingId),
        secret_pin: pin,
        work_date: workDate,
        work_time: workTime,
        work_terms: workTerms || undefined,
      });
      setConfirmed(res.data);
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Confirm failed';
      // Show localized error if it matches known messages
      const isWrongPin = msg.toLowerCase().includes('pin') || msg.toLowerCase().includes('galat');
      Alert.alert('❌', isWrongPin ? t('wrongPin') : msg);
    } finally {
      setLoading(false);
    }
  };

  // ── Success Screen ──────────────────────────────────────────────────────────
  if (confirmed) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.successContainer}>
          <Text style={styles.successIcon}>🎉</Text>
          <Text style={styles.successTitle}>{t('dealSuccess')}</Text>
          <Surface style={styles.successCard} elevation={2}>
            <View style={styles.row}>
              <Text style={styles.rowKey}>{t('bookingNumber')}</Text>
              <Text style={styles.rowVal}>{confirmed.booking_id}</Text>
            </View>
            <Divider style={{ marginVertical: 8 }} />
            <View style={styles.row}>
              <Text style={styles.rowKey}>{t('workDate')}</Text>
              <Text style={styles.rowVal}>{confirmed.work_date}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowKey}>{t('workTime')}</Text>
              <Text style={styles.rowVal}>{confirmed.work_time}</Text>
            </View>
            <Divider style={{ marginVertical: 8 }} />
            <View style={styles.row}>
              <Text style={styles.rowKey}>{t('advancePaid')}</Text>
              <Text style={[styles.rowVal, { color: '#E53E3E', fontWeight: '700' }]}>
                ₹{confirmed.advance_paid}
              </Text>
            </View>
          </Surface>

          <Button
            mode="contained"
            onPress={() => navigation.goBack()}
            buttonColor="#FF6B00"
            style={styles.btn}
            labelStyle={styles.btnLabel}
          >
            {t('goToDashboard')}
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  // ── Main Form ───────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          <Text style={styles.title}>{t('dealTitle')}</Text>
          <Text style={styles.subtitle}>{t('dealSubtitle')}</Text>

          {/* Booking ID + PIN */}
          <Surface style={styles.card} elevation={2}>
            <Text style={styles.fieldLabel}>{t('bookingIdLabel')}</Text>
            <View style={styles.bookingIdRow}>
              <TextInput
                value={bookingId}
                onChangeText={(v) => { setBookingId(v); setBookingDetails(null); }}
                mode="outlined"
                keyboardType="numeric"
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                activeOutlineColor="#FF6B00"
                placeholder={t('bookingIdPlaceholder')}
              />
              <Button 
                mode="contained" 
                onPress={fetchDetails} 
                loading={fetchingDetails}
                disabled={!bookingId || fetchingDetails}
                style={styles.fetchBtn}
                buttonColor="#FF6B00"
              >
                {lang === 'hi' ? 'विवरण देखें' : 'View'}
              </Button>
            </View>

            {bookingDetails && (
              <View style={styles.fixedDataCard}>
                <Text style={styles.fixedDataTitle}>{lang === 'hi' ? '🔒 पूर्व-निर्धारित विवरण (Fixed Data)' : '🔒 Fixed Data'}</Text>
                
                <Text style={styles.fixedLabel}>{lang === 'hi' ? 'ग्राहक का नाम' : 'Customer Name'}</Text>
                <Text style={styles.fixedValue}>{bookingDetails.customer_name}</Text>
                
                <Text style={styles.fixedLabel}>{lang === 'hi' ? 'मोबाइल नंबर' : 'Mobile Number'}</Text>
                <Text style={styles.fixedValue}>{bookingDetails.customer_phone}</Text>

                <Text style={styles.fixedLabel}>{lang === 'hi' ? 'स्थायी कार्यस्थल का पता' : 'Fixed Deployment Address'}</Text>
                <Text style={styles.fixedValue}>{bookingDetails.customer_address}</Text>

                <View style={styles.fixedRow}>
                  <View>
                    <Text style={styles.fixedLabel}>{lang === 'hi' ? 'मात्रा / मजदूर' : 'Quantity'}</Text>
                    <Text style={styles.fixedValue}>{bookingDetails.quantity}</Text>
                  </View>
                  <View>
                    <Text style={styles.fixedLabel}>{lang === 'hi' ? 'कुल बिल' : 'Total Bill'}</Text>
                    <Text style={styles.fixedValue}>₹{bookingDetails.total_bill}</Text>
                  </View>
                </View>
              </View>
            )}

            <Text style={[styles.fieldLabel, { marginTop: 16 }]}>{t('pinLabel')}</Text>
            <TextInput
              value={pin}
              onChangeText={(v) => setPin(v.replace(/[^0-9]/g, '').slice(0, 4))}
              mode="outlined"
              keyboardType="numeric"
              style={styles.input}
              activeOutlineColor="#FF6B00"
              placeholder="----"
              maxLength={4}
            />

            {/* PIN dot display */}
            <View style={styles.pinDisplay}>
              {Array.from({ length: 4 }).map((_, i) => (
                <View key={i} style={[styles.pinDot, pin[i] ? styles.pinDotFilled : {}]}>
                  <Text style={styles.pinDotText}>{pin[i] || ''}</Text>
                </View>
              ))}
            </View>
          </Surface>

          {/* Work Details */}
          <Surface style={styles.card} elevation={2}>
            <Text style={styles.fieldLabel}>{t('workDateLabel')}</Text>
            <TextInput
              value={workDate}
              onChangeText={setWorkDate}
              mode="outlined"
              style={styles.input}
              activeOutlineColor="#FF6B00"
              placeholder={t('workDatePlaceholder')}
            />

            <Text style={styles.fieldLabel}>{t('workTimeLabel')}</Text>
            <TextInput
              value={workTime}
              onChangeText={setWorkTime}
              mode="outlined"
              style={styles.input}
              activeOutlineColor="#FF6B00"
              placeholder={t('workTimePlaceholder')}
            />

            <Text style={styles.fieldLabel}>{t('workTermsLabel')}</Text>
            <TextInput
              value={workTerms}
              onChangeText={setWorkTerms}
              mode="outlined"
              style={styles.input}
              activeOutlineColor="#FF6B00"
              multiline
              numberOfLines={3}
              placeholder={t('workTermsPlaceholder')}
            />
          </Surface>

          {/* Warning */}
          <Surface style={styles.warningCard} elevation={1}>
            <Text style={styles.warningText}>{t('dealWarning')}</Text>
          </Surface>

          <Button
            mode="contained"
            onPress={handleConfirm}
            loading={loading}
            disabled={loading}
            buttonColor="#276749"
            style={styles.btn}
            labelStyle={styles.btnLabel}
          >
            {t('confirmDealBtn')}
          </Button>

          <Button
            mode="outlined"
            onPress={() => navigation.goBack()}
            style={[styles.btn, { marginTop: 8 }]}
            textColor="#666"
          >
            {t('cancel')}
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  content: { padding: 16, paddingBottom: 140 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1a1a1a', textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 13, color: '#666', textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#444', marginBottom: 4, marginTop: 8 },
  input: { backgroundColor: '#fff', marginBottom: 4 },
  bookingIdRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  fetchBtn: { borderRadius: 8, justifyContent: 'center' },
  fixedDataCard: {
    backgroundColor: '#F8F9FA', borderRadius: 12, padding: 16,
    marginTop: 12, borderWidth: 1, borderColor: '#E2E8F0',
  },
  fixedDataTitle: { fontSize: 14, fontWeight: 'bold', color: '#2D3748', marginBottom: 12 },
  fixedLabel: { fontSize: 11, color: '#718096', marginTop: 8 },
  fixedValue: { fontSize: 14, fontWeight: '600', color: '#1A202C', marginTop: 2 },
  fixedRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  pinDisplay: { flexDirection: 'row', gap: 10, justifyContent: 'center', marginTop: 12 },
  pinDot: {
    width: 48, height: 52, borderRadius: 10,
    borderWidth: 2, borderColor: '#ddd', backgroundColor: '#F8F9FA',
    justifyContent: 'center', alignItems: 'center',
  },
  pinDotFilled: { borderColor: '#FF6B00', backgroundColor: '#FFF5EE' },
  pinDotText: { fontSize: 24, fontWeight: 'bold', color: '#FF6B00' },
  warningCard: {
    backgroundColor: '#FFFAF0', borderRadius: 12, padding: 16,
    marginBottom: 16, borderWidth: 1, borderColor: '#F6AD55',
  },
  warningText: { fontSize: 13, color: '#744210', lineHeight: 20 },
  btn: { borderRadius: 10, paddingVertical: 4, marginTop: 4 },
  btnLabel: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  // Success screen
  successContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  successIcon: { fontSize: 64, marginBottom: 12 },
  successTitle: { fontSize: 26, fontWeight: 'bold', color: '#276749', marginBottom: 20 },
  successCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 20,
    width: '100%', marginBottom: 24,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  rowKey: { fontSize: 14, color: '#555' },
  rowVal: { fontSize: 14, fontWeight: '600', color: '#1a1a1a' },
  bypassNote: { fontSize: 11, color: '#888', marginTop: 10, textAlign: 'center', fontStyle: 'italic' },
});
