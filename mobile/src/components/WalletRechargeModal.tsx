import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Alert,
    ScrollView,
    Platform,
    KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import { api, getErrorMessage } from '../services/api';
import { openRazorpay } from '../services/razorpay';
import { useSelector } from 'react-redux';
import { RootState } from '../store';

const ORANGE = '#F26333';
const GREEN = '#2E7D32';

interface Props {
    visible: boolean;
    onClose: () => void;
    onSuccess?: (newBalance: number) => void;
    initialAmount?: number;
    title?: string;
    description?: string;
}

const QUICK_AMOUNTS = [50, 100, 200, 500, 1000, 2000];

export default function WalletRechargeModal({
    visible,
    onClose,
    onSuccess,
    initialAmount,
    title = 'वॉलेट में पैसे जोड़ें',
    description,
}: Props) {
    const { name: userName, phone: userPhone } = useSelector((s: RootState) => s.auth);
    const insets = useSafeAreaInsets();
    const modalBottomPadding = Math.max(insets.bottom, Platform.OS === 'android' ? 34 : 16);
    const [amount, setAmount] = useState<string>(initialAmount ? String(initialAmount) : '200');
    const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card'>('upi');
    const [loading, setLoading] = useState(false);
    const [upiVpa, setUpiVpa] = useState('shramsarathi@upi');
    const [merchantName, setMerchantName] = useState('Shram Sarathi');

    useEffect(() => {
        if (visible) {
            if (initialAmount) {
                setAmount(String(initialAmount));
            }
            fetchUpiConfig();
        }
    }, [visible, initialAmount]);

    const fetchUpiConfig = async () => {
        try {
            const res = await api.get('/api/wallet');
            if (res.data?.upi_vpa) setUpiVpa(res.data.upi_vpa);
            if (res.data?.merchant_name) setMerchantName(res.data.merchant_name);
        } catch {
            // Keep default
        }
    };

    const handleQuickSelect = (amt: number) => {
        setAmount(String(amt));
    };

    const handleRecharge = async () => {
        const numAmt = parseFloat(amount);
        if (isNaN(numAmt) || numAmt < 1) {
            Alert.alert('अमान्य राशि', 'कृपया कम से कम ₹1 दर्ज करें।');
            return;
        }

        setLoading(true);

        try {
            // ── 1. Create Razorpay order on backend ─────────────────────────
            const orderRes = await api.post('/api/wallet/create-order', { amount: numAmt });
            const data = orderRes.data;

            // ── Verify order_id was created by Razorpay ─────────────────────
            if (!data?.order_id) {
                throw new Error(data?.detail || data?.message || 'पेमेंट आर्डर नहीं बन सका। कृपया पुनः प्रयास करें।');
            }

            // Close recharge input sheet first so full-screen Razorpay Modal has 100% focus
            onClose();

            // ── 3. Real Razorpay Flow ────
            const paymentData = await openRazorpay({
                description: `वॉलेट रिचार्ज (₹${numAmt}) - Shram Sarathi`,
                currency: data.currency || 'INR',
                key: data.key_id,
                amount: String(data.amount),
                order_id: data.order_id,
                name: 'Shram Sarathi Network',
                prefill: {
                    name: userName || '',
                    contact: userPhone || '',
                },
                theme: { color: '#FF6B00' },
                method: paymentMethod,
            });

            // ── 4. Verify Payment with backend signature check ──────────────
            const verifyRes = await api.post('/api/wallet/verify-order', {
                amount: numAmt,
                razorpay_order_id: data.order_id,
                razorpay_payment_id: paymentData.razorpay_payment_id,
                razorpay_signature: paymentData.razorpay_signature,
            });

            Alert.alert(
                'सफलता! 🎉',
                verifyRes.data?.message || `₹${numAmt} आपके वॉलेट में जुड़ चुके हैं।`,
                [
                    {
                        text: 'ठीक है',
                        onPress: () => {
                            if (onSuccess && verifyRes.data?.balance !== undefined) {
                                onSuccess(verifyRes.data.balance);
                            }
                        },
                    },
                ]
            );
        } catch (err: any) {
            if (err?.code === 'PAYMENT_CANCELLED') {
                // User cancelled Razorpay checkout modal
            } else {
                Alert.alert('भुगतान असफल', getErrorMessage(err));
            }
        } finally {
            setLoading(false);
        }
    };


    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.overlay}
            >
                <View style={[styles.modalCard, { paddingBottom: modalBottomPadding + 16 }]}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>{title}</Text>
                        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                            <Text style={styles.closeBtnText}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    {description && (
                        <Text style={styles.descriptionText}>{description}</Text>
                    )}

                    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={styles.body}>
                        {/* Amount Input */}
                        <Text style={styles.sectionLabel}>राशि दर्ज करें (Amount in ₹)</Text>
                        <View style={styles.inputRow}>
                            <Text style={styles.currencySymbol}>₹</Text>
                            <TextInput
                                style={styles.amountInput}
                                keyboardType="numeric"
                                value={amount}
                                onChangeText={setAmount}
                                placeholder="0"
                                placeholderTextColor="#AAA"
                            />
                        </View>

                        {/* Quick Amount Chips */}
                        <Text style={styles.quickLabel}>त्वरित चयन (Quick Select):</Text>
                        <View style={styles.chipsRow}>
                            {QUICK_AMOUNTS.map((amt) => {
                                const isSelected = amount === String(amt);
                                return (
                                    <TouchableOpacity
                                        key={amt}
                                        style={[styles.chip, isSelected && styles.chipActive]}
                                        onPress={() => handleQuickSelect(amt)}
                                    >
                                        <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                                            ₹{amt}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* Payment Method Selector */}
                        <Text style={styles.sectionLabel}>भुगतान का माध्यम चुनें (Payment Mode)</Text>

                        {/* Option 1: UPI */}
                        <TouchableOpacity
                            style={[
                                styles.methodCard,
                                paymentMethod === 'upi' && styles.methodCardActive,
                            ]}
                            onPress={() => setPaymentMethod('upi')}
                        >
                            <View style={styles.methodIconContainer}>
                                <Text style={styles.methodIcon}>🟢</Text>
                            </View>
                            <View style={styles.methodDetails}>
                                <Text style={styles.methodTitle}>UPI (PhonePe / GPay / Paytm / BHIM)</Text>
                                <Text style={styles.methodSubtitle}>सुरक्षित ऑनलाइन पेमेंट गेटवे</Text>
                            </View>
                            <View style={styles.radio}>
                                {paymentMethod === 'upi' && <View style={styles.radioInner} />}
                            </View>
                        </TouchableOpacity>

                        {/* Option 2: Card / NetBanking */}
                        <TouchableOpacity
                            style={[
                                styles.methodCard,
                                paymentMethod === 'card' && styles.methodCardActive,
                            ]}
                            onPress={() => setPaymentMethod('card')}
                        >
                            <View style={styles.methodIconContainer}>
                                <Text style={styles.methodIcon}>💳</Text>
                            </View>
                            <View style={styles.methodDetails}>
                                <Text style={styles.methodTitle}>डेबिट / क्रेडिट कार्ड / नेटबैंकिंग</Text>
                                <Text style={styles.methodSubtitle}>Visa, MasterCard, RuPay, All Banks</Text>
                            </View>
                            <View style={styles.radio}>
                                {paymentMethod === 'card' && <View style={styles.radioInner} />}
                            </View>
                        </TouchableOpacity>
                    </ScrollView>

                    {/* Pay Button */}
                    <TouchableOpacity
                        style={[styles.payBtn, loading && styles.payBtnDisabled]}
                        onPress={handleRecharge}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#FFF" />
                        ) : (
                            <Text style={styles.payBtnText}>
                                ₹{amount || 0} भुगतान एवं रिचार्ज करें ➔
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.55)',
        justifyContent: 'flex-end',
    },
    modalCard: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
        maxHeight: '90%',
        elevation: 10,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '800',
        color: '#1A1A1A',
    },
    closeBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#F0F0F0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    closeBtnText: {
        fontSize: 16,
        color: '#666',
        fontWeight: 'bold',
    },
    descriptionText: {
        fontSize: 13,
        color: '#E65100',
        backgroundColor: '#FFF3E0',
        padding: 10,
        borderRadius: 8,
        marginBottom: 12,
    },
    body: {
        marginBottom: 16,
    },
    sectionLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: '#555',
        marginTop: 10,
        marginBottom: 8,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: ORANGE,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: '#FFF9F6',
    },
    currencySymbol: {
        fontSize: 26,
        fontWeight: '800',
        color: ORANGE,
        marginRight: 8,
    },
    amountInput: {
        flex: 1,
        fontSize: 26,
        fontWeight: '800',
        color: '#1A1A1A',
    },
    quickLabel: {
        fontSize: 11,
        color: '#888',
        marginTop: 12,
        marginBottom: 6,
    },
    chipsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 14,
    },
    chip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#F0F4F8',
        borderWidth: 1,
        borderColor: '#D0D7DE',
    },
    chipActive: {
        backgroundColor: ORANGE,
        borderColor: ORANGE,
    },
    chipText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#444',
    },
    chipTextActive: {
        color: '#FFF',
    },
    methodCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: '#E0E0E0',
        backgroundColor: '#FAFAFA',
        marginBottom: 8,
    },
    methodCardActive: {
        borderColor: GREEN,
        backgroundColor: '#E8F5E9',
    },
    methodIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#FFF',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
        elevation: 1,
    },
    methodIcon: {
        fontSize: 18,
    },
    methodDetails: {
        flex: 1,
    },
    methodTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#222',
    },
    methodSubtitle: {
        fontSize: 11,
        color: '#777',
        marginTop: 2,
    },
    radio: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: '#999',
        alignItems: 'center',
        justifyContent: 'center',
    },
    radioInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: GREEN,
    },
    payBtn: {
        backgroundColor: ORANGE,
        borderRadius: 14,
        paddingVertical: 15,
        alignItems: 'center',
        elevation: 3,
    },
    payBtnDisabled: {
        opacity: 0.7,
    },
    payBtnText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '800',
    },
});
