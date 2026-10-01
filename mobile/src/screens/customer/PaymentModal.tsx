import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal,
  ActivityIndicator, Alert, Linking,
} from 'react-native';
import { Button } from 'react-native-paper';
import { api } from '../../services/api';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { useLanguage } from '../../i18n/LanguageContext';
import { openRazorpay } from '../../services/razorpay';

interface Provider {
  user_id: number;
  name: string;
  category: string;
  distance_km: number;
  rating: number;
}

interface Props {
  visible: boolean;
  provider: Provider;
  onClose: () => void;
  onSuccess: (bookingId: number) => void;
}

export default function PaymentModal({ visible, provider, onClose, onSuccess }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [providerPhone, setProviderPhone] = useState<string | null>(null);
  const [bookingDone, setBookingDone] = useState(false);
  const { t } = useLanguage();
  const { name, phone } = useSelector((s: RootState) => s.auth);

  const handleClose = () => {
    // Reset state when closing
    setProviderPhone(null);
    setBookingDone(false);
    onClose();
  };

  const handlePayment = async () => {
    setIsLoading(true);
    try {
      // Create order / booking on backend
      const res = await api.post('/api/payment/create-order', {
        provider_id: provider.user_id,
        category: provider.category,
      });

      const data = res.data;

      // ── Real Razorpay payment flow ─────────────────────────────────────────
      const paymentData = await openRazorpay({
        description: `${t('appName')} - ${provider.name}`,
        currency: data.currency,
        key: data.key_id,
        amount: String(data.amount),
        order_id: data.order_id,
        name: t('appName'),
        prefill: { name: name || '', contact: phone || '' },
        theme: { color: '#FF6B00' },
      });

      const verifyRes = await api.post('/api/payment/verify', {
        razorpay_order_id: data.order_id,
        razorpay_payment_id: paymentData.razorpay_payment_id,
        razorpay_signature: paymentData.razorpay_signature,
        payment_db_id: data.payment_db_id,
      });

      onSuccess(verifyRes.data.booking_id);
    } catch (error: any) {
      if (error?.code === 'PAYMENT_CANCELLED') {
        // User cancelled — do nothing
      } else {
        Alert.alert('Error', t('paymentFailed'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCallNow = () => {
    if (!providerPhone) return;
    // Open phone dialer directly with the number
    Linking.openURL(`tel:${providerPhone}`);
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Provider Info */}
          <View style={styles.providerRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{provider.name[0]}</Text>
            </View>
            <View style={styles.providerInfo}>
              <Text style={styles.providerName}>{provider.name}</Text>
              <Text style={styles.providerCategory}>{provider.category}</Text>
              <Text style={styles.distance}>
                📍 {Number(provider.distance_km).toFixed(2)} {t('kmAway')}
              </Text>
            </View>
            <Text style={styles.ratingText}>⭐ {provider.rating.toFixed(1)}</Text>
          </View>

          <View style={styles.divider} />

          {/* ── After booking: show phone number ── */}
          {bookingDone && providerPhone ? (
            <View style={styles.phoneSection}>
              <Text style={styles.phoneLabel}>📞 सारथी का नंबर / Provider Number</Text>
              <TouchableOpacity
                style={styles.phoneButton}
                onPress={handleCallNow}
                accessibilityLabel={`Call ${providerPhone}`}
                accessibilityRole="button"
              >
                <Text style={styles.phoneNumber}>{providerPhone}</Text>
                <Text style={styles.tapToCall}>👆 टैप करके कॉल करें / Tap to Call</Text>
              </TouchableOpacity>
              <Text style={styles.phoneNote}>
                ✅ बुकिंग हो गई। सीधे सारथी को कॉल करें।
              </Text>
              <Button
                mode="contained"
                style={styles.doneButton}
                onPress={handleClose}
                buttonColor="#FF6B00"
                labelStyle={styles.doneButtonText}
              >
                Done
              </Button>
            </View>
          ) : (
            /* ── Before payment: show fee and pay button ── */
            <>
              <View style={styles.feeContainer}>
                <Text style={styles.feeLabel}>{t('contactFee')}</Text>
                <Text style={styles.feeAmount}>₹10</Text>
              </View>

              <Text style={styles.feeNote}>✅ {t('feeNote1')}</Text>
              <Text style={styles.feeNote}>🔄 {t('feeNote2')}</Text>

              <Button
                mode="contained"
                style={[styles.payButton, isLoading && styles.payButtonDisabled]}
                onPress={handlePayment}
                disabled={isLoading}
                loading={isLoading}
                buttonColor="#FF6B00"
                labelStyle={styles.payButtonText}
              >
                {t('payNow')}
              </Button>

              <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
                <Text style={styles.cancelText}>{t('cancel')}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
  },
  providerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  avatar: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#FF6B00', justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { color: '#fff', fontWeight: 'bold', fontSize: 24 },
  providerInfo: { flex: 1, marginLeft: 12 },
  providerName: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  providerCategory: { fontSize: 13, color: '#666', marginTop: 2 },
  distance: { fontSize: 12, color: '#FF6B00', marginTop: 2 },
  ratingText: { fontSize: 16, fontWeight: 'bold' },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 16 },
  feeContainer: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 12,
  },
  feeLabel: { fontSize: 16, color: '#333' },
  feeAmount: { fontSize: 28, fontWeight: 'bold', color: '#FF6B00' },
  feeNote: { fontSize: 12, color: '#666', marginBottom: 6, lineHeight: 18 },
  payButton: {
    borderRadius: 12,
    paddingVertical: 4, marginTop: 20,
  },
  payButtonDisabled: { opacity: 0.6 },
  payButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  cancelButton: { alignItems: 'center', marginTop: 12 },
  cancelText: { color: '#999', fontSize: 14 },
  // ── Phone number section ──
  phoneSection: { alignItems: 'center', paddingVertical: 8 },
  phoneLabel: { fontSize: 14, color: '#666', marginBottom: 12 },
  phoneButton: {
    backgroundColor: '#F0FFF4', borderWidth: 2, borderColor: '#38A169',
    borderRadius: 16, paddingVertical: 16, paddingHorizontal: 32,
    alignItems: 'center', marginBottom: 12, width: '100%',
  },
  phoneNumber: { fontSize: 28, fontWeight: 'bold', color: '#276749', letterSpacing: 2 },
  tapToCall: { fontSize: 12, color: '#38A169', marginTop: 4 },
  phoneNote: { fontSize: 12, color: '#2F855A', textAlign: 'center', marginBottom: 20 },
  doneButton: {
    borderRadius: 12,
    paddingVertical: 2, paddingHorizontal: 48,
  },
  doneButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
