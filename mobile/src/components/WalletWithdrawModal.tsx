import React, { useState, useEffect, useRef } from 'react';
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
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { api, getErrorMessage } from '../services/api';

const ORANGE = '#F26333';
const GREEN = '#16A34A';
const DARK = '#0B192C';
const BORDER = '#E2E8F0';
const WITHDRAWAL_FEE = 2.0; // ₹2.00 bank charge
const QUICK_WITHDRAW_AMOUNTS = [50, 100, 200, 500, 1000];

interface BankDetails {
    account_number: string;
    masked_account?: string;
    ifsc: string;
    holder_name: string;
}

interface PayoutData {
    payout_type: 'upi' | 'bank' | null;
    upi_id: string | null;
    bank_details: BankDetails | null;
    payout_verified_at: string | null;
    is_cooling: boolean;
    cooling_hours_remaining: number;
    payout_cooling_until: string | null;
    phone_masked: string;
    has_password?: boolean;
}

interface Props {
    visible: boolean;
    onClose: () => void;
    currentBalance: number;
    onSuccess?: (newBalance: number) => void;
}

export default function WalletWithdrawModal({
    visible,
    onClose,
    currentBalance,
    onSuccess,
}: Props) {
    const [mode, setMode] = useState<'withdraw' | 'link_payout'>('withdraw');
    
    // Withdrawal Form State
    const [amount, setAmount] = useState<string>('100');
    const [password, setPassword] = useState<string>('');
    const [showPassword, setShowPassword] = useState<boolean>(false);
    const [loadingWithdraw, setLoadingWithdraw] = useState<boolean>(false);

    // Payout Profile State
    const [loadingPayout, setLoadingPayout] = useState<boolean>(false);
    const [payoutData, setPayoutData] = useState<PayoutData | null>(null);

    // Link / Change Payout Form State
    const [payoutType, setPayoutType] = useState<'upi' | 'bank'>('upi');
    const [upiId, setUpiId] = useState<string>('');
    const [holderName, setHolderName] = useState<string>('');
    const [accountNumber, setAccountNumber] = useState<string>('');
    const [confirmAccountNumber, setConfirmAccountNumber] = useState<string>('');
    const [ifsc, setIfsc] = useState<string>('');

    // OTP State
    const [otp, setOtp] = useState<string>('');
    const [otpSent, setOtpSent] = useState<boolean>(false);
    const [otpSending, setOtpSending] = useState<boolean>(false);
    const [savingPayout, setSavingPayout] = useState<boolean>(false);
    const [timer, setTimer] = useState<number>(0);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Load payout methods when modal opens
    useEffect(() => {
        if (visible) {
            fetchPayoutMethods();
            setMode('withdraw');
            setPassword('');
            setShowPassword(false);
            setOtp('');
            setOtpSent(false);

            // Default amount suggestion
            if (currentBalance >= 100) {
                setAmount('100');
            } else if (currentBalance >= 52) {
                setAmount('50');
            } else {
                setAmount('');
            }
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [visible, currentBalance]);

    // Countdown timer for OTP
    useEffect(() => {
        if (timer > 0) {
            timerRef.current = setTimeout(() => setTimer(timer - 1), 1000);
        } else if (timerRef.current) {
            clearTimeout(timerRef.current);
        }
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [timer]);

    const fetchPayoutMethods = async () => {
        setLoadingPayout(true);
        try {
            const res = await api.get('/api/wallet/payout-methods');
            if (res.data) {
                setPayoutData(res.data);
                // Pre-fill edit fields if existing
                if (res.data.payout_type === 'upi' && res.data.upi_id) {
                    setPayoutType('upi');
                    setUpiId(res.data.upi_id);
                } else if (res.data.payout_type === 'bank' && res.data.bank_details) {
                    setPayoutType('bank');
                    setHolderName(res.data.bank_details.holder_name || '');
                    setIfsc(res.data.bank_details.ifsc || '');
                }
            }
        } catch (err) {
            console.log('Error fetching payout methods:', err);
        } finally {
            setLoadingPayout(false);
        }
    };

    const numAmt = parseFloat(amount) || 0;
    const totalDebit = numAmt > 0 ? numAmt + WITHDRAWAL_FEE : 0;
    const remainingBalance = Math.max(0, currentBalance - totalDebit);
    const isInsufficient = totalDebit > currentBalance;
    const isCoolingActive = payoutData?.is_cooling ?? false;
    const hasPayoutLinked = !!payoutData?.payout_type;
    const requiresPassword = payoutData?.has_password === true;

    // Quick selection chips
    const handleQuickSelect = (amt: number) => {
        setAmount(String(amt));
    };

    const handleSelectAll = () => {
        const maxWithdrawable = Math.max(0, Math.floor((currentBalance - WITHDRAWAL_FEE) * 100) / 100);
        if (maxWithdrawable >= 50) {
            setAmount(String(maxWithdrawable));
        } else {
            setAmount(String(Math.floor(currentBalance)));
        }
    };

    // Send OTP for updating payout method
    const handleSendOtp = async () => {
        if (payoutType === 'upi') {
            const cleanUpi = upiId.trim();
            if (!cleanUpi || !cleanUpi.includes('@')) {
                Alert.alert('अमान्य UPI ID', 'कृपया सही UPI ID दर्ज करें (उदा. username@upi या 9876543210@paytm)');
                return;
            }
        } else {
            if (!holderName.trim()) {
                Alert.alert('अधूरा विवरण', 'खाताधारक का नाम दर्ज करें।');
                return;
            }
            if (!accountNumber.trim() || accountNumber.trim().length < 8) {
                Alert.alert('अमान्य खाता नंबर', 'कृपया सही बैंक खाता संख्या दर्ज करें।');
                return;
            }
            if (accountNumber.trim() !== confirmAccountNumber.trim()) {
                Alert.alert('खाता संख्या बेमेल', 'दोनों बॉक्स में दर्ज किया गया खाता नंबर समान होना चाहिए।');
                return;
            }
            if (!ifsc.trim() || ifsc.trim().length !== 11) {
                Alert.alert('अमान्य IFSC', 'कृपया 11 अक्षरों का सही बैंक IFSC कोड दर्ज करें (उदा. HDFC0001234)');
                return;
            }
        }

        setOtpSending(true);
        try {
            const res = await api.post('/api/wallet/payout-methods/send-otp');
            setOtpSent(true);
            setTimer(60);
            Alert.alert(
                'OTP भेजा गया 📲',
                res.data?.message || `आपके रजिस्टर्ड मोबाइल नंबर (${payoutData?.phone_masked || 'नंबर'}) पर 6-अंकों का OTP भेजा गया है।`
            );
        } catch (err) {
            Alert.alert('OTP त्रुटि', getErrorMessage(err));
        } finally {
            setOtpSending(false);
        }
    };

    // Save Payout Method with OTP verification
    const handleSavePayoutMethod = async () => {
        if (!otpSent || otp.trim().length < 6) {
            Alert.alert('OTP आवश्यक', 'कृपया 6 अंकों का OTP दर्ज करें जो आपके फोन पर भेजा गया है।');
            return;
        }

        setSavingPayout(true);
        try {
            const payload: any = {
                otp: otp.trim(),
                payout_type: payoutType,
            };

            if (payoutType === 'upi') {
                payload.upi_id = upiId.trim().toLowerCase();
            } else {
                payload.bank_details = {
                    account_number: accountNumber.trim(),
                    ifsc: ifsc.trim().toUpperCase(),
                    holder_name: holderName.trim(),
                };
            }

            const res = await api.post('/api/wallet/payout-methods', payload);

            Alert.alert(
                'सफलतापूर्वक लिंक हुआ ✅',
                res.data?.message || 'आपका विड्रॉल खाता सफलतापूर्वक अपडेट हो गया है।'
            );

            await fetchPayoutMethods();
            setMode('withdraw');
            setOtp('');
            setOtpSent(false);
        } catch (err) {
            Alert.alert('सत्यापन विफल', getErrorMessage(err));
        } finally {
            setSavingPayout(false);
        }
    };

    // Handle final withdrawal request
    const handleWithdraw = async () => {
        if (!hasPayoutLinked) {
            Alert.alert('खाता लिंक करें', 'निकासी से पहले कृपया अपना UPI या बैंक खाता लिंक करें।');
            setMode('link_payout');
            return;
        }

        if (isCoolingActive) {
            Alert.alert(
                'सुरक्षा लॉक सक्रिय ⏳',
                `धोखाधड़ी रोकथाम के लिए नया खाता जोड़ने के बाद 24 घंटे का कूलिंग लॉक रहता है। कृपया ${payoutData?.cooling_hours_remaining ?? 24} घंटे बाद निकासी का प्रयास करें।`
            );
            return;
        }

        if (isNaN(numAmt) || numAmt < 50) {
            Alert.alert('न्यूनतम सीमा', 'निकासी के लिए न्यूनतम राशि ₹50 आवश्यक है।');
            return;
        }

        if (totalDebit > currentBalance) {
            Alert.alert(
                'अपर्याप्त बैलेंस',
                `आपके वॉलेट में पर्याप्त बैलेंस नहीं है।\n\nअनुरोध: ₹${numAmt}\nशुल्क: ₹${WITHDRAWAL_FEE}\nकुल आवश्यकता: ₹${totalDebit}\nवर्तमान बैलेंस: ₹${currentBalance.toFixed(2)}`
            );
            return;
        }

        if (requiresPassword && !password.trim()) {
            Alert.alert('पासवर्ड आवश्यक 🔒', 'सुरक्षा कारणों से निकासी करने के लिए अपना लॉगिन पासवर्ड दर्ज करना अनिवार्य है।');
            return;
        }

        setLoadingWithdraw(true);

        try {
            const payload: any = {
                amount: numAmt,
            };
            if (password.trim()) {
                payload.password = password.trim();
            }

            const res = await api.post('/api/wallet/withdraw', payload);

            const newBal = res.data?.balance !== undefined ? res.data.balance : remainingBalance;
            const successMsg = res.data?.message || `₹${numAmt} की निकासी प्रक्रिया सफलतापूर्वक शुरू हो गई है।`;

            Alert.alert(
                'निकासी अनुरोध स्वीकृत! 🎉',
                `${successMsg}\n\nखाता: ${res.data?.destination || (payoutData?.payout_type === 'upi' ? payoutData.upi_id : 'बैंक खाता')}`,
                [
                    {
                        text: 'ठीक है',
                        onPress: () => {
                            if (onSuccess) {
                                onSuccess(newBal);
                            }
                            onClose();
                        },
                    },
                ]
            );
        } catch (err: any) {
            const errorMsg = getErrorMessage(err);
            if (err?.response?.status === 401 || errorMsg.includes('लॉगिन सत्र समाप्त') || errorMsg.toLowerCase().includes('authenticate')) {
                Alert.alert(
                    'लॉगिन सत्र समाप्त 🔒',
                    'सुरक्षा कारणों से आपका लॉगिन सत्र समाप्त हो चुका है। कृपया ऐप में पुनः लॉगिन करें।',
                    [
                        { text: 'ठीक है', onPress: onClose }
                    ]
                );
            } else {
                Alert.alert('निकासी अस्वीकार ❌', errorMsg);
            }
        } finally {
            setLoadingWithdraw(false);
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
                <View style={styles.sheet}>
                    {/* Header */}
                    <View style={styles.header}>
                        {mode === 'link_payout' ? (
                            <TouchableOpacity
                                onPress={() => setMode('withdraw')}
                                style={styles.backBtn}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.backBtnText}>← वापस</Text>
                            </TouchableOpacity>
                        ) : (
                            <View style={{ flex: 1 }}>
                                <Text style={styles.title}>वॉलेट से पैसे निकालें</Text>
                                <Text style={styles.subtitle}>सुरक्षित बैंक / UPI ट्रांसफर</Text>
                            </View>
                        )}

                        {mode === 'link_payout' && (
                            <View style={{ flex: 1, alignItems: 'center' }}>
                                <Text style={styles.title}>विड्रॉल खाता विवरण</Text>
                            </View>
                        )}

                        <TouchableOpacity
                            onPress={onClose}
                            style={styles.closeBtn}
                            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                        >
                            <Text style={styles.closeText}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.scrollContainer}
                        keyboardShouldPersistTaps="handled"
                    >
                        {mode === 'withdraw' ? (
                            <>
                                {/* ── Available Balance Card ── */}
                                <View style={styles.balanceCard}>
                                    <View style={styles.balanceInfo}>
                                        <Text style={styles.balanceLabel}>उपलब्ध वॉलेट बैलेंस (Available)</Text>
                                        <Text style={styles.balanceValue}>₹{currentBalance.toFixed(2)}</Text>
                                    </View>
                                    <View style={styles.badge}>
                                        <Text style={styles.badgeText}>न्यूनतम ₹50</Text>
                                    </View>
                                </View>

                                {/* ── Linked Payout Destination Card ── */}
                                <View style={styles.destinationSection}>
                                    <Text style={styles.sectionLabel}>भुगतान प्राप्त करने का खाता (Payout Account)</Text>
                                    
                                    {loadingPayout ? (
                                        <View style={styles.loadingBox}>
                                            <ActivityIndicator size="small" color={ORANGE} />
                                            <Text style={styles.loadingTxt}>खाता विवरण लोड हो रहा है...</Text>
                                        </View>
                                    ) : hasPayoutLinked ? (
                                        <View style={styles.payoutCard}>
                                            <View style={styles.payoutCardLeft}>
                                                <View style={styles.payoutIconCircle}>
                                                    <Text style={styles.payoutIcon}>
                                                        {payoutData?.payout_type === 'upi' ? '⚡' : '🏦'}
                                                    </Text>
                                                </View>
                                                <View style={{ flex: 1 }}>
                                                    <View style={styles.verifiedRow}>
                                                        <Text style={styles.payoutTypeTitle}>
                                                            {payoutData?.payout_type === 'upi' ? 'UPI आईडी' : 'बैंक खाता'}
                                                        </Text>
                                                        <View style={styles.verifiedTag}>
                                                            <Text style={styles.verifiedTagText}>🛡️ वेरिफाइड</Text>
                                                        </View>
                                                    </View>
                                                    <Text style={styles.payoutAccountText} numberOfLines={1}>
                                                        {payoutData?.payout_type === 'upi'
                                                            ? payoutData.upi_id
                                                            : `${payoutData?.bank_details?.holder_name} • A/C ${payoutData?.bank_details?.masked_account || '****'} (${payoutData?.bank_details?.ifsc})`}
                                                    </Text>
                                                </View>
                                            </View>

                                            <TouchableOpacity
                                                onPress={() => setMode('link_payout')}
                                                style={styles.changeBtn}
                                                activeOpacity={0.7}
                                            >
                                                <Text style={styles.changeBtnText}>बदलें</Text>
                                            </TouchableOpacity>
                                        </View>
                                    ) : (
                                        <View style={styles.unlinkedCard}>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.unlinkedTitle}>⚠️ कोई खाता लिंक नहीं है</Text>
                                                <Text style={styles.unlinkedSubtitle}>
                                                    पैसे निकालने के लिए अपना UPI ID या बैंक खाता लिंक करें।
                                                </Text>
                                            </View>
                                            <TouchableOpacity
                                                style={styles.linkNowBtn}
                                                onPress={() => setMode('link_payout')}
                                                activeOpacity={0.8}
                                            >
                                                <Text style={styles.linkNowBtnText}>+ लिंक करें</Text>
                                            </TouchableOpacity>
                                        </View>
                                    )}

                                    {/* 24-Hour Cooling Lock Warning Banner */}
                                    {isCoolingActive && (
                                        <View style={styles.coolingBanner}>
                                            <Text style={styles.coolingIcon}>⏳</Text>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.coolingTitle}>
                                                    सुरक्षा कूलिंग लॉक सक्रिय ({payoutData?.cooling_hours_remaining} घंटे शेष)
                                                </Text>
                                                <Text style={styles.coolingSubtitle}>
                                                    खाता सुरक्षा नीति: विड्रॉल विवरण बदलने के 24 घंटे तक अनधिकृत निकासी रोकने के लिए विड्रॉल लॉक रहता है।
                                                </Text>
                                            </View>
                                        </View>
                                    )}
                                </View>

                                {/* ── Amount Input Section ── */}
                                <Text style={styles.sectionLabel}>निकासी राशि दर्ज करें (Enter Amount)</Text>
                                <View style={[styles.inputRow, isInsufficient && styles.inputRowError]}>
                                    <Text style={styles.currencySymbol}>₹</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={amount}
                                        onChangeText={setAmount}
                                        keyboardType="numeric"
                                        placeholder="जैसे 100, 200, 500"
                                        placeholderTextColor="#94A3B8"
                                        maxLength={7}
                                        editable={!isCoolingActive}
                                    />
                                    {amount.length > 0 && !isCoolingActive && (
                                        <TouchableOpacity onPress={() => setAmount('')} style={styles.clearBtn}>
                                            <Text style={styles.clearText}>✕</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>

                                {/* Quick Selection Chips */}
                                <View style={styles.chipsContainer}>
                                    {QUICK_WITHDRAW_AMOUNTS.map((amt) => {
                                        const isSelected = amount === String(amt);
                                        const isAffordable = currentBalance >= (amt + WITHDRAWAL_FEE);
                                        return (
                                            <TouchableOpacity
                                                key={amt}
                                                style={[
                                                    styles.chip,
                                                    isSelected && styles.chipSelected,
                                                    (!isAffordable || isCoolingActive) && styles.chipDisabled,
                                                ]}
                                                onPress={() => !isCoolingActive && handleQuickSelect(amt)}
                                                disabled={!isAffordable || isCoolingActive}
                                            >
                                                <Text
                                                    style={[
                                                        styles.chipText,
                                                        isSelected && styles.chipTextSelected,
                                                        (!isAffordable || isCoolingActive) && styles.chipTextDisabled,
                                                    ]}
                                                >
                                                    ₹{amt}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                    <TouchableOpacity
                                        style={[styles.chip, styles.chipAll, isCoolingActive && styles.chipDisabled]}
                                        onPress={() => !isCoolingActive && handleSelectAll()}
                                        disabled={isCoolingActive}
                                    >
                                        <Text style={styles.chipTextAll}>पूरा निकालें (All)</Text>
                                    </TouchableOpacity>
                                </View>

                                {/* Breakdown Summary */}
                                {numAmt >= 50 && (
                                    <View style={styles.breakdownCard}>
                                        <Text style={styles.breakdownTitle}>लेनदेन विवरण (Transaction Breakdown)</Text>

                                        <View style={styles.breakdownRow}>
                                            <Text style={styles.breakdownLabel}>निकासी राशि (Payout Amount):</Text>
                                            <Text style={styles.breakdownVal}>₹{numAmt.toFixed(2)}</Text>
                                        </View>

                                        <View style={styles.breakdownRow}>
                                            <Text style={styles.breakdownLabel}>बैंक व हैंडलिंग चार्ज (Fee):</Text>
                                            <Text style={styles.breakdownVal}>+ ₹{WITHDRAWAL_FEE.toFixed(2)}</Text>
                                        </View>

                                        <View style={[styles.breakdownRow, styles.breakdownDivider]}>
                                            <Text style={styles.breakdownTotalLabel}>कुल कटेगा (Total Debited):</Text>
                                            <Text style={[styles.breakdownTotalVal, isInsufficient && { color: '#DC2626' }]}>
                                                ₹{totalDebit.toFixed(2)}
                                            </Text>
                                        </View>

                                        <View style={styles.breakdownRow}>
                                            <Text style={styles.breakdownLabel}>वॉलेट में शेष (Remaining):</Text>
                                            <Text style={[styles.breakdownVal, { color: GREEN, fontWeight: '700' }]}>
                                                ₹{remainingBalance.toFixed(2)}
                                            </Text>
                                        </View>
                                    </View>
                                )}

                                {/* Insufficient balance warning */}
                                {isInsufficient && (
                                    <View style={styles.warningBox}>
                                        <Text style={styles.warningText}>
                                            ⚠️ अपर्याप्त बैलेंस: आपके वॉलेट में ₹{currentBalance.toFixed(2)} हैं, जबकि ₹{WITHDRAWAL_FEE} शुल्क सहित कुल ₹{totalDebit.toFixed(2)} की आवश्यकता है।
                                        </Text>
                                    </View>
                                )}

                                {/* ── Password Authentication (Anti-Theft Protection) ── */}
                                {hasPayoutLinked && !isCoolingActive && requiresPassword && (
                                    <View style={styles.passwordSection}>
                                        <View style={styles.passwordLabelRow}>
                                            <Text style={styles.passwordSectionLabel}>
                                                🔒 सुरक्षा पुष्टि: अपना लॉगिन पासवर्ड दर्ज करें
                                            </Text>
                                        </View>
                                        <View style={styles.passwordInputWrapper}>
                                            <TextInput
                                                style={styles.passwordInput}
                                                secureTextEntry={!showPassword}
                                                value={password}
                                                onChangeText={setPassword}
                                                placeholder="अपना अकाउंट पासवर्ड दर्ज करें"
                                                placeholderTextColor="#94A3B8"
                                            />
                                            <TouchableOpacity
                                                onPress={() => setShowPassword(!showPassword)}
                                                style={styles.eyeBtn}
                                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                            >
                                                <Text style={styles.eyeIcon}>{showPassword ? '👁️' : '🙈'}</Text>
                                            </TouchableOpacity>
                                        </View>
                                        <Text style={styles.passwordHelpText}>
                                            किसी अन्य व्यक्ति द्वारा अनधिकृत निकासी रोकने के लिए पासवर्ड आवश्यक है।
                                        </Text>
                                    </View>
                                )}

                                {/* Settlement Notice */}
                                <View style={styles.infoBox}>
                                    <Text style={styles.infoIcon}>⏱️</Text>
                                    <Text style={styles.infoText}>
                                        राशि आपके वेरिफाइड खाते में 24 से 48 घंटे में सीधे क्रेडिट कर दी जाएगी।
                                    </Text>
                                </View>

                                {/* Submit Button */}
                                <TouchableOpacity
                                    style={[
                                        styles.submitBtn,
                                        (loadingWithdraw || isInsufficient || numAmt < 50 || isCoolingActive || !hasPayoutLinked || (requiresPassword && !password.trim())) &&
                                            styles.submitBtnDisabled,
                                    ]}
                                    onPress={handleWithdraw}
                                    disabled={
                                        loadingWithdraw ||
                                        isInsufficient ||
                                        numAmt < 50 ||
                                        isCoolingActive ||
                                        !hasPayoutLinked ||
                                        (requiresPassword && !password.trim())
                                    }
                                >
                                    {loadingWithdraw ? (
                                        <ActivityIndicator color="#FFFFFF" />
                                    ) : (
                                        <Text style={styles.submitBtnText}>
                                            {!hasPayoutLinked
                                                ? 'विड्रॉल खाता लिंक करें'
                                                : isCoolingActive
                                                ? `सुरक्षा लॉक (${payoutData?.cooling_hours_remaining}h शेष)`
                                                : isInsufficient
                                                ? 'अपर्याप्त वॉलेट बैलेंस'
                                                : numAmt < 50
                                                ? 'न्यूनतम ₹50 दर्ज करें'
                                                : (requiresPassword && !password.trim())
                                                ? 'पासवर्ड दर्ज करें'
                                                : `₹${numAmt} सुरक्षित निकासी करें 🔒`}
                                        </Text>
                                    )}
                                </TouchableOpacity>
                            </>
                        ) : (
                            /* ── LINK / CHANGE PAYOUT ACCOUNT MODE ── */
                            <View style={styles.linkModeContainer}>
                                {/* Security explanation notice */}
                                <View style={styles.securityNoticeCard}>
                                    <Text style={styles.securityNoticeIcon}>🛡️</Text>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.securityNoticeTitle}>सुरक्षा व एंटी-फ्रॉड नीति</Text>
                                        <Text style={styles.securityNoticeDesc}>
                                            विड्रॉल खाता जोड़ने या बदलने के लिए आपके श्रम सारथी ऐप में रजिस्टर्ड मोबाइल नंबर ({payoutData?.phone_masked || '****'}) पर सुरक्षा OTP सत्यापन अनिवार्य है।
                                        </Text>
                                        {currentBalance > 0 && (
                                            <Text style={styles.securityNoticeCoolingDesc}>
                                                ⚠️ यदि आपके वॉलेट में बैलेंस है, तो खाता बदलने पर 24 घंटे का सुरक्षा लॉक सक्रिय रहेगा।
                                            </Text>
                                        )}
                                    </View>
                                </View>

                                {/* Tab Selector: UPI vs Bank Account */}
                                <View style={styles.tabContainer}>
                                    <TouchableOpacity
                                        style={[styles.tabBtn, payoutType === 'upi' && styles.tabBtnActive]}
                                        onPress={() => setPayoutType('upi')}
                                    >
                                        <Text style={[styles.tabBtnText, payoutType === 'upi' && styles.tabBtnTextActive]}>
                                            ⚡ UPI आईडी
                                        </Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[styles.tabBtn, payoutType === 'bank' && styles.tabBtnActive]}
                                        onPress={() => setPayoutType('bank')}
                                    >
                                        <Text style={[styles.tabBtnText, payoutType === 'bank' && styles.tabBtnTextActive]}>
                                            🏦 बैंक खाता (Bank A/C)
                                        </Text>
                                    </TouchableOpacity>
                                </View>

                                {payoutType === 'upi' ? (
                                    /* UPI Input Form */
                                    <View style={styles.formCard}>
                                        <Text style={styles.fieldLabel}>UPI ID दर्ज करें</Text>
                                        <TextInput
                                            style={styles.fieldInput}
                                            value={upiId}
                                            onChangeText={setUpiId}
                                            placeholder="उदा. mobile@paytm या name@okhdfcbank"
                                            placeholderTextColor="#94A3B8"
                                            autoCapitalize="none"
                                            autoCorrect={false}
                                        />
                                        <Text style={styles.fieldHint}>
                                            Google Pay, PhonePe, Paytm, BHIM आदि की UPI ID दर्ज करें।
                                        </Text>
                                    </View>
                                ) : (
                                    /* Bank Account Input Form */
                                    <View style={styles.formCard}>
                                        <Text style={styles.fieldLabel}>खाताधारक का पूरा नाम (Account Holder Name)</Text>
                                        <TextInput
                                            style={styles.fieldInput}
                                            value={holderName}
                                            onChangeText={setHolderName}
                                            placeholder="पासबुक के अनुसार नाम"
                                            placeholderTextColor="#94A3B8"
                                        />

                                        <Text style={[styles.fieldLabel, { marginTop: 14 }]}>बैंक खाता संख्या (Account Number)</Text>
                                        <TextInput
                                            style={styles.fieldInput}
                                            value={accountNumber}
                                            onChangeText={setAccountNumber}
                                            placeholder="खाता नंबर दर्ज करें"
                                            placeholderTextColor="#94A3B8"
                                            keyboardType="numeric"
                                            secureTextEntry
                                        />

                                        <Text style={[styles.fieldLabel, { marginTop: 14 }]}>खाता संख्या पुनः दर्ज करें (Confirm A/C)</Text>
                                        <TextInput
                                            style={styles.fieldInput}
                                            value={confirmAccountNumber}
                                            onChangeText={setConfirmAccountNumber}
                                            placeholder="खाता नंबर दोबारा दर्ज करें"
                                            placeholderTextColor="#94A3B8"
                                            keyboardType="numeric"
                                        />

                                        <Text style={[styles.fieldLabel, { marginTop: 14 }]}>बैंक IFSC कोड</Text>
                                        <TextInput
                                            style={styles.fieldInput}
                                            value={ifsc}
                                            onChangeText={(t) => setIfsc(t.toUpperCase())}
                                            placeholder="उदा. SBIN0001234"
                                            placeholderTextColor="#94A3B8"
                                            maxLength={11}
                                            autoCapitalize="characters"
                                        />
                                    </View>
                                )}

                                {/* OTP Section */}
                                <View style={styles.otpCard}>
                                    <View style={styles.otpHeaderRow}>
                                        <Text style={styles.otpTitle}>मोबाइल OTP सत्यापन</Text>
                                        <TouchableOpacity
                                            style={[styles.sendOtpBtn, (otpSending || timer > 0) && styles.sendOtpBtnDisabled]}
                                            onPress={handleSendOtp}
                                            disabled={otpSending || timer > 0}
                                        >
                                            {otpSending ? (
                                                <ActivityIndicator size="small" color="#FFFFFF" />
                                            ) : (
                                                <Text style={styles.sendOtpBtnText}>
                                                    {timer > 0 ? `पुनः भेजें (${timer}s)` : otpSent ? 'OTP पुनः भेजें' : 'OTP भेजें 📲'}
                                                </Text>
                                            )}
                                        </TouchableOpacity>
                                    </View>

                                    {otpSent && (
                                        <View style={styles.otpInputRow}>
                                            <TextInput
                                                style={styles.otpInput}
                                                value={otp}
                                                onChangeText={setOtp}
                                                placeholder="6 अंकों का OTP दर्ज करें"
                                                placeholderTextColor="#94A3B8"
                                                keyboardType="numeric"
                                                maxLength={6}
                                            />
                                        </View>
                                    )}

                                    <Text style={styles.otpHelperText}>
                                        सुरक्षा सत्यापन: OTP आपके श्रम सारथी ऐप में रजिस्टर्ड मोबाइल नंबर {payoutData?.phone_masked || ''} पर भेजा गया है।
                                    </Text>
                                </View>

                                {/* Save Button */}
                                <TouchableOpacity
                                    style={[
                                        styles.submitBtn,
                                        (!otpSent || otp.trim().length < 6 || savingPayout) && styles.submitBtnDisabled,
                                    ]}
                                    onPress={handleSavePayoutMethod}
                                    disabled={!otpSent || otp.trim().length < 6 || savingPayout}
                                >
                                    {savingPayout ? (
                                        <ActivityIndicator color="#FFFFFF" />
                                    ) : (
                                        <Text style={styles.submitBtnText}>
                                            सत्यापित करें और सुरक्षित सेव करें 🛡️
                                        </Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        )}
                    </ScrollView>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(11, 25, 44, 0.70)',
        justifyContent: 'flex-end',
    },
    sheet: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 20,
        paddingTop: 18,
        maxHeight: '92%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    title: {
        fontSize: 18,
        fontWeight: '800',
        color: DARK,
    },
    subtitle: {
        fontSize: 12,
        color: '#64748B',
        marginTop: 2,
    },
    closeBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    closeText: {
        fontSize: 16,
        color: '#64748B',
        fontWeight: '600',
    },
    backBtn: {
        paddingVertical: 6,
        paddingHorizontal: 10,
        backgroundColor: '#F1F5F9',
        borderRadius: 10,
    },
    backBtnText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#334155',
    },
    scrollContainer: {
        paddingBottom: 140,
    },
    balanceCard: {
        backgroundColor: '#F8FAFC',
        borderRadius: 16,
        padding: 16,
        marginTop: 14,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: BORDER,
    },
    balanceInfo: {
        flex: 1,
    },
    balanceLabel: {
        fontSize: 12,
        color: '#64748B',
        fontWeight: '600',
    },
    balanceValue: {
        fontSize: 22,
        fontWeight: '800',
        color: DARK,
        marginTop: 4,
    },
    badge: {
        backgroundColor: '#EFF6FF',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#BFDBFE',
    },
    badgeText: {
        fontSize: 11,
        color: '#1D4ED8',
        fontWeight: '700',
    },
    destinationSection: {
        marginTop: 14,
    },
    sectionLabel: {
        fontSize: 13,
        fontWeight: '700',
        color: '#334155',
        marginBottom: 8,
        marginTop: 14,
    },
    loadingBox: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: BORDER,
        gap: 10,
    },
    loadingTxt: {
        fontSize: 12,
        color: '#64748B',
    },
    payoutCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#F0FDF4',
        borderWidth: 1.5,
        borderColor: '#BBF7D0',
        borderRadius: 14,
        padding: 12,
    },
    payoutCardLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: 12,
    },
    payoutIconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#DCFCE7',
        alignItems: 'center',
        justifyContent: 'center',
    },
    payoutIcon: {
        fontSize: 20,
    },
    verifiedRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    payoutTypeTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: '#166534',
    },
    verifiedTag: {
        backgroundColor: '#DCFCE7',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    verifiedTagText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#15803D',
    },
    payoutAccountText: {
        fontSize: 13.5,
        fontWeight: '800',
        color: DARK,
        marginTop: 2,
    },
    changeBtn: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#86EFAC',
        marginLeft: 8,
    },
    changeBtnText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#15803D',
    },
    unlinkedCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFBEB',
        borderWidth: 1.5,
        borderColor: '#FDE68A',
        borderRadius: 14,
        padding: 14,
        gap: 12,
    },
    unlinkedTitle: {
        fontSize: 13.5,
        fontWeight: '700',
        color: '#92400E',
    },
    unlinkedSubtitle: {
        fontSize: 11.5,
        color: '#B45309',
        marginTop: 2,
        lineHeight: 16,
    },
    linkNowBtn: {
        backgroundColor: '#F59E0B',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
    },
    linkNowBtnText: {
        color: '#FFFFFF',
        fontWeight: '800',
        fontSize: 12,
    },
    coolingBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF7ED',
        borderWidth: 1.5,
        borderColor: '#FED7AA',
        borderRadius: 14,
        padding: 12,
        marginTop: 10,
        gap: 10,
    },
    coolingIcon: {
        fontSize: 22,
    },
    coolingTitle: {
        fontSize: 12.5,
        fontWeight: '800',
        color: '#C2410C',
    },
    coolingSubtitle: {
        fontSize: 11,
        color: '#9A3412',
        marginTop: 2,
        lineHeight: 15,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#CBD5E1',
        borderRadius: 14,
        paddingHorizontal: 16,
        backgroundColor: '#F8FAFC',
        height: 54,
    },
    inputRowError: {
        borderColor: '#EF4444',
        backgroundColor: '#FEF2F2',
    },
    currencySymbol: {
        fontSize: 22,
        fontWeight: '800',
        color: DARK,
        marginRight: 8,
    },
    input: {
        flex: 1,
        fontSize: 20,
        fontWeight: '700',
        color: DARK,
    },
    clearBtn: {
        padding: 6,
    },
    clearText: {
        fontSize: 14,
        color: '#94A3B8',
        fontWeight: '700',
    },
    chipsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 10,
    },
    chip: {
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: BORDER,
        backgroundColor: '#FFFFFF',
    },
    chipSelected: {
        backgroundColor: '#FFF7ED',
        borderColor: ORANGE,
    },
    chipDisabled: {
        opacity: 0.4,
    },
    chipText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#475569',
    },
    chipTextSelected: {
        color: ORANGE,
    },
    chipTextDisabled: {
        color: '#94A3B8',
    },
    chipAll: {
        backgroundColor: '#F1F5F9',
        borderColor: '#CBD5E1',
    },
    chipTextAll: {
        fontSize: 13,
        fontWeight: '700',
        color: '#1E293B',
    },
    breakdownCard: {
        backgroundColor: '#FAFAFA',
        borderRadius: 14,
        padding: 14,
        marginTop: 14,
        borderWidth: 1,
        borderColor: BORDER,
    },
    breakdownTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: '#475569',
        marginBottom: 8,
    },
    breakdownRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 4,
    },
    breakdownLabel: {
        fontSize: 13,
        color: '#64748B',
    },
    breakdownVal: {
        fontSize: 13,
        color: '#1E293B',
        fontWeight: '600',
    },
    breakdownDivider: {
        borderTopWidth: 1,
        borderTopColor: BORDER,
        paddingTop: 8,
        marginTop: 6,
    },
    breakdownTotalLabel: {
        fontSize: 13,
        fontWeight: '800',
        color: DARK,
    },
    breakdownTotalVal: {
        fontSize: 15,
        fontWeight: '800',
        color: DARK,
    },
    warningBox: {
        backgroundColor: '#FEF2F2',
        borderWidth: 1,
        borderColor: '#FECACA',
        borderRadius: 12,
        padding: 12,
        marginTop: 12,
    },
    warningText: {
        fontSize: 12,
        color: '#B91C1C',
        lineHeight: 18,
    },
    passwordSection: {
        marginTop: 14,
        backgroundColor: '#F8FAFC',
        padding: 14,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: BORDER,
    },
    passwordLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    passwordSectionLabel: {
        fontSize: 13,
        fontWeight: '700',
        color: '#1E293B',
    },
    passwordInputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#CBD5E1',
        borderRadius: 12,
        backgroundColor: '#FFFFFF',
        height: 50,
        paddingHorizontal: 14,
    },
    passwordInput: {
        flex: 1,
        fontSize: 15,
        color: DARK,
        fontWeight: '600',
    },
    eyeBtn: {
        padding: 6,
    },
    eyeIcon: {
        fontSize: 16,
    },
    passwordHelpText: {
        fontSize: 11,
        color: '#64748B',
        marginTop: 6,
        lineHeight: 15,
    },
    infoBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F0FDF4',
        borderRadius: 12,
        padding: 12,
        marginTop: 14,
        borderWidth: 1,
        borderColor: '#BBF7D0',
        gap: 10,
    },
    infoIcon: {
        fontSize: 18,
    },
    infoText: {
        fontSize: 11.5,
        color: '#166534',
        flex: 1,
        lineHeight: 16,
    },
    submitBtn: {
        backgroundColor: ORANGE,
        height: 52,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 18,
        shadowColor: ORANGE,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    submitBtnDisabled: {
        backgroundColor: '#CBD5E1',
        shadowOpacity: 0,
        elevation: 0,
    },
    submitBtnText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '800',
    },
    // Link mode styles
    linkModeContainer: {
        marginTop: 10,
    },
    securityNoticeCard: {
        flexDirection: 'row',
        backgroundColor: '#F8FAFC',
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: BORDER,
        gap: 10,
    },
    securityNoticeIcon: {
        fontSize: 22,
    },
    securityNoticeTitle: {
        fontSize: 13,
        fontWeight: '800',
        color: DARK,
    },
    securityNoticeDesc: {
        fontSize: 11.5,
        color: '#64748B',
        marginTop: 2,
        lineHeight: 16,
    },
    securityNoticeCoolingDesc: {
        fontSize: 11.5,
        color: '#D97706',
        marginTop: 4,
        fontWeight: '600',
        lineHeight: 16,
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: '#F1F5F9',
        borderRadius: 12,
        padding: 4,
        marginTop: 16,
        gap: 4,
    },
    tabBtn: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 10,
    },
    tabBtnActive: {
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    tabBtnText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#64748B',
    },
    tabBtnTextActive: {
        color: DARK,
    },
    formCard: {
        backgroundColor: '#FFFFFF',
        marginTop: 14,
    },
    fieldLabel: {
        fontSize: 12.5,
        fontWeight: '700',
        color: '#334155',
        marginBottom: 6,
    },
    fieldInput: {
        borderWidth: 1.5,
        borderColor: '#CBD5E1',
        borderRadius: 12,
        paddingHorizontal: 14,
        height: 48,
        fontSize: 14,
        color: DARK,
        backgroundColor: '#F8FAFC',
        fontWeight: '600',
    },
    fieldHint: {
        fontSize: 11,
        color: '#94A3B8',
        marginTop: 4,
    },
    otpCard: {
        backgroundColor: '#F8FAFC',
        borderRadius: 14,
        padding: 14,
        marginTop: 16,
        borderWidth: 1,
        borderColor: BORDER,
    },
    otpHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    otpTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: DARK,
    },
    sendOtpBtn: {
        backgroundColor: ORANGE,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    sendOtpBtnDisabled: {
        backgroundColor: '#94A3B8',
    },
    sendOtpBtnText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
    },
    otpInputRow: {
        marginTop: 10,
    },
    otpInput: {
        borderWidth: 1.5,
        borderColor: ORANGE,
        borderRadius: 10,
        height: 48,
        paddingHorizontal: 14,
        fontSize: 18,
        fontWeight: '800',
        color: DARK,
        backgroundColor: '#FFFFFF',
        textAlign: 'center',
        letterSpacing: 4,
    },
    otpHelperText: {
        fontSize: 11,
        color: '#64748B',
        marginTop: 6,
    },
});
