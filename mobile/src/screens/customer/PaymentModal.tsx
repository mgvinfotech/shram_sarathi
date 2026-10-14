import React, { useState, useEffect } from 'react';
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
  name?: string;
  category?: string;
  distance_km?: number | string;
  rating?: number | string;
  phone?: string;
}

interface Props {
  visible: boolean;
  provider: Provider;
  amount?: number;
  onClose: () => void;
  onSuccess: (bookingId: number) => void;
}

export default function PaymentModal({ visible, provider, amount, onClose, onSuccess }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [providerPhone, setProviderPhone] = useState<string | null>(null);
  const [bookingDone, setBookingDone] = useState(false);
  const [completedBookingId, setCompletedBookingId] = useState<number | null>(null);
  const [feeAmount, setFeeAmount] = useState<number>(amount ?? 10);
  const { t } = useLanguage();
  const { name, phone } = useSelector((s: RootState) => s.auth);

  useEffect(() => {
    if (visible) {
      if (amount !== undefined) {
        setFeeAmount(amount);
      } else {
        api.get('/api/payment/fee')
          .then((res) => {
            if (res.data?.fee !== undefined) {
              setFeeAmount(Number(res.data.fee));
            }
          })
          .catch(() => {});
      }
    }
  }, [visible, amount]);

  const handleClose = () => {
    if (bookingDone && completedBookingId) {
      onSuccess(completedBookingId);
    }
    setProviderPhone(null);
    setBookingDone(false);
    setCompletedBookingId(null);
    onClose();
  };

  const handlePayment = async () => {
    if (!provider?.user_id) {
      Alert.alert('Error', 'सारथी की जानकारी अधूरी है।');
      return;
    }

    setIsLoading(true);
    try {
      // Create order / booking on backend
      const res = await api.post('/api/payment/create-order', {
        provider_id: provider.user_id,
        category: provider.category || '',
      });

      const data = res.data;
      if (data?.amount) {
        setFeeAmount(Number(data.amount) / 100);
      }

      // ── Real Razorpay payment flow ─────────────────────────────────────────
      const paymentData = await openRazorpay({
        description: `${t('appName')} - ${provider.name || 'Provider'}`,
        currency: data.currency || 'INR',
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

      const returnedBookingId = verifyRes.data.booking_id;
      const returnedPhone = verifyRes.data.provider_phone || provider?.phone;

      if (returnedPhone) {
        setCompletedBookingId(returnedBookingId);
        setProviderPhone(returnedPhone);
        setBookingDone(true);
      } else {
        onSuccess(returnedBookingId);
      }
    } catch (error: any) {
      if (error?.code === 'PAYMENT_CANCELLED') {
        // User cancelled — do nothing
      } else {
        Alert.alert('Error', error?.response?.data?.detail || error?.message || t('paymentFailed'));
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

  if (!visible || !provider) return null;

  const displayName = provider?.name?.trim() || 'सारथी';
  const avatarChar = displayName.charAt(0).toUpperCase() || 'S';
  const displayRating = provider?.rating != null && !isNaN(Number(provider.rating))
    ? Number(provider.rating).toFixed(1)
    : '5.0';
  const displayDistance = provider?.distance_km != null && !isNaN(Number(provider.distance_km))
    ? `${Number(provider.distance_km).toFixed(2)} ${t('kmAway')}`
    : '';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Provider Info */}
          <View style={styles.providerRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{avatarChar}</Text>
            </View>
            <View style={styles.providerInfo}>
              <Text style={styles.providerName}>{displayName}</Text>
              {provider.category ? (
                <Text style={styles.providerCategory}>{provider.category}</Text>
              ) : null}
              {displayDistance ? (
                <Text style={styles.distance}>📍 {displayDistance}</Text>
              ) : null}
            </View>
            <Text style={styles.ratingText}>⭐ {displayRating}</Text>
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
                <Text style={styles.feeAmount}>₹{feeAmount}</Text>
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
