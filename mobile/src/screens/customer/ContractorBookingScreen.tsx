import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View, ScrollView, StyleSheet, Alert, Linking, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Text, TextInput, Button, Surface, Divider } from 'react-native-paper';
import { api } from '../../services/api';
import { useLanguage } from '../../i18n/LanguageContext';

interface Props {
  navigation: any;
  route: { params: { provider: any } };
}

export default function ContractorBookingScreen({ navigation, route }: Props) {
  const { provider } = route.params;
  const { t, lang } = useLanguage();

  const [quantity, setQuantity] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [billData, setBillData] = useState<any>(null);
  const [pin, setPin] = useState<string | null>(null);
  const [bookingId, setBookingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCalculate = async () => {
    const qty = parseInt(quantity);
    if (!qty || qty < 1) {
      Alert.alert('', lang === 'hi' ? 'सही संख्या लिखें (कम से कम 1)' : 'Enter a valid quantity (min 1)');
      return;
    }
    if (!customerAddress || customerAddress.trim().length < 5) {
      Alert.alert('', lang === 'hi' ? 'सटीक कार्यस्थल का स्थायी पता लिखें' : 'Enter a valid fixed deployment address');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/api/contractor/calculate-bill', {
        provider_id: provider.user_id,
        quantity: qty,
      });
      setBillData(res.data);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.detail || 'Calculation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCallPress = async () => {
    if (!billData) return;
    setLoading(true);
    try {
      // Wallet check
      const checkRes = await api.post('/api/contractor/wallet-check', {
        provider_id: provider.user_id,
        advance_amount: billData.advance_10pct,
      });

      if (!checkRes.data.can_call) {
        const shortage = checkRes.data.shortage ?? '';
        const msg = t('walletShortMsg').replace('{amount}', String(shortage));
        Alert.alert(t('walletShortTitle'), msg, [{ text: 'OK' }]);
        return;
      }

      // Initiate call — create booking + PIN
      const callRes = await api.post('/api/contractor/initiate-call', {
        provider_id: provider.user_id,
        quantity: billData.quantity,
        customer_address: customerAddress,
      });

      setPin(callRes.data.secret_pin);
      setBookingId(callRes.data.booking_id);

      // Open native dialer
      const phone = callRes.data.provider_phone || provider.phone;
      if (phone) {
        await Linking.openURL(`tel:${phone}`);
      }
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.detail || 'Call initiation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {/* Provider Card */}
        <Surface style={styles.providerCard} elevation={2}>
          <Text style={styles.providerName}>{provider.name}</Text>
          <Text style={styles.providerCat}>🏗️ {t('thekedar')}</Text>
          {provider.firm_name && (
            <Text style={styles.firmName}>{provider.firm_name}</Text>
          )}
        </Surface>

        {/* Quantity Section */}
        {!pin && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('howManyWorkers')}</Text>
            <Text style={styles.sectionSub}>
              {t('basedOnRate')}: ₹{provider.base_rate || '—'} {provider.base_rate_unit || ''}
            </Text>

            <Text style={styles.fieldLabel}>{lang === 'hi' ? 'सटीक कार्यस्थल का पता (Fixed Address) *' : 'Deployment Address *'}</Text>
            <TextInput
              value={customerAddress}
              onChangeText={setCustomerAddress}
              mode="outlined"
              style={[styles.input, { marginBottom: 16 }]}
              activeOutlineColor="#FF6B00"
              placeholder={lang === 'hi' ? 'पूरा पता जहाँ काम होना है' : 'Full address where work will happen'}
              multiline
              numberOfLines={2}
            />

            <Text style={styles.fieldLabel}>{lang === 'hi' ? 'मजदूरों / मात्रा की आवश्यकता *' : 'Quantity / Workers needed *'}</Text>
            <TextInput
              label={t('quantityLabel')}
              value={quantity}
              onChangeText={setQuantity}
              mode="outlined"
              keyboardType="numeric"
              style={styles.input}
              activeOutlineColor="#FF6B00"
              placeholder={t('quantityPlaceholder')}
            />

            <Button
              mode="contained"
              onPress={handleCalculate}
              loading={loading}
              disabled={loading || !quantity}
              buttonColor="#FF6B00"
              style={styles.btn}
              labelStyle={styles.btnLabel}
            >
              {t('calculateBill')}
            </Button>
          </View>
        )}

        {/* Bill Summary */}
        {billData && !pin && (
          <Surface style={styles.billCard} elevation={2}>
            <Text style={styles.billTitle}>{t('billSummary')}</Text>
            <Divider style={{ marginVertical: 10 }} />

            <View style={styles.billRow}>
              <Text style={styles.billKey}>{t('quantity')}</Text>
              <Text style={styles.billVal}>
                {billData.quantity} {lang === 'hi' ? 'लोग' : 'workers'}
              </Text>
            </View>
            <View style={styles.billRow}>
              <Text style={styles.billKey}>{t('rate')}</Text>
              <Text style={styles.billVal}>₹{billData.base_rate} {billData.base_rate_unit}</Text>
            </View>
            <Divider style={{ marginVertical: 8 }} />
            <View style={styles.billRow}>
              <Text style={[styles.billKey, { fontWeight: '700' }]}>{t('totalBill')}</Text>
              <Text style={[styles.billVal, styles.totalAmt]}>₹{billData.total_bill?.toLocaleString()}</Text>
            </View>
            <View style={styles.billRow}>
              <Text style={styles.billKey}>{t('advance10')}</Text>
              <Text style={[styles.billVal, { color: '#E53E3E', fontWeight: '700' }]}>
                ₹{billData.advance_10pct}
              </Text>
            </View>

            <Text style={styles.advanceNote}>
              {t('advanceNote').replace('{amount}', String(billData.advance_10pct))}
            </Text>

            <Button
              mode="contained"
              onPress={handleCallPress}
              loading={loading}
              disabled={loading}
              buttonColor="#38A169"
              style={[styles.btn, { marginTop: 16 }]}
              labelStyle={styles.btnLabel}
            >
              {t('callContractor')}
            </Button>
          </Surface>
        )}

        {/* PIN display after call */}
        {pin && (
          <Surface style={styles.pinCard} elevation={3}>
            <Text style={styles.pinTitle}>{t('callInitiated')}</Text>
            <Text style={styles.pinSub}>{t('pinInstruction')}</Text>

            {/* Booking ID for provider */}
            {bookingId && (
              <View style={styles.bookingIdBadge}>
                <Text style={styles.bookingIdLabel}>
                  {lang === 'hi' ? 'बुकिंग ID:' : 'Booking ID:'}
                </Text>
                <Text style={styles.bookingIdValue}>#{bookingId}</Text>
              </View>
            )}

            <View style={styles.pinBox}>
              {pin.toString().split('').map((digit, i) => (
                <View key={i} style={styles.pinDigitBox}>
                  <Text style={styles.pinDigit}>{digit}</Text>
                </View>
              ))}
            </View>

            <Text style={styles.pinNote}>{t('pinWarning')}</Text>

            <Button
              mode="outlined"
              onPress={() => navigation.goBack()}
              style={{ marginTop: 16, borderColor: '#FF6B00' }}
              textColor="#FF6B00"
            >
              {t('goHome')}
            </Button>
          </Surface>
        )}
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  content: { padding: 16, paddingBottom: 140 },
  providerCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 20,
    marginBottom: 16, alignItems: 'center',
  },
  providerName: { fontSize: 22, fontWeight: 'bold', color: '#1a1a1a' },
  providerCat: { fontSize: 14, color: '#666', marginTop: 4 },
  firmName: { fontSize: 13, color: '#FF6B00', fontWeight: '600', marginTop: 4 },
  section: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 4 },
  sectionSub: { fontSize: 13, color: '#666', marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#444', marginBottom: 4 },
  input: { backgroundColor: '#fff', marginBottom: 12 },
  btn: { borderRadius: 10, paddingVertical: 4 },
  btnLabel: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  billCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 16 },
  billTitle: { fontSize: 18, fontWeight: 'bold', color: '#1a1a1a' },
  billRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  billKey: { fontSize: 14, color: '#555' },
  billVal: { fontSize: 14, color: '#1a1a1a' },
  totalAmt: { fontSize: 18, fontWeight: 'bold', color: '#FF6B00' },
  advanceNote: { fontSize: 12, color: '#888', marginTop: 8, lineHeight: 18 },
  pinCard: {
    backgroundColor: '#F0FFF4', borderRadius: 20, padding: 24,
    marginBottom: 16, alignItems: 'center',
    borderWidth: 2, borderColor: '#38A169',
  },
  pinTitle: { fontSize: 22, fontWeight: 'bold', color: '#276749', marginBottom: 8 },
  pinSub: { fontSize: 13, color: '#2F855A', textAlign: 'center', marginBottom: 12 },
  bookingIdBadge: {
    flexDirection: 'row', gap: 6, backgroundColor: '#C6F6D5',
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, marginBottom: 16,
  },
  bookingIdLabel: { fontSize: 13, color: '#276749' },
  bookingIdValue: { fontSize: 14, fontWeight: 'bold', color: '#276749' },
  pinBox: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  pinDigitBox: {
    width: 56, height: 64, borderRadius: 12,
    backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#38A169',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
  },
  pinDigit: { fontSize: 30, fontWeight: 'bold', color: '#276749' },
  pinNote: { fontSize: 12, color: '#285E61', textAlign: 'center', lineHeight: 18 },
});
