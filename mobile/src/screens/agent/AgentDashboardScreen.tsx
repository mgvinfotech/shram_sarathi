import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    RefreshControl,
    ActivityIndicator,
    Modal,
    TextInput,
    StatusBar,
    Platform,
    KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api, getErrorMessage } from '../../services/api';
import WalletRechargeModal from '../../components/WalletRechargeModal';

interface AgentStats {
    agent_id?: string;
    agent_name?: string;
    is_active?: boolean;
    balance: number;
    hold_balance: number;
    total_earned: number;
    total_withdrawn: number;
    total_network: number;
    total_registered: number;
    total_bookings: number;
    today_earnings: number;
    month_earnings: number;
    labour_count: number;
    vehicle_count: number;
    contractor_count: number;
    verified_count: number;
}

export default function AgentDashboardScreen({ navigation }: any) {
    const insets = useSafeAreaInsets();
    const [stats, setStats] = useState<AgentStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showRechargeModal, setShowRechargeModal] = useState(false);

    // Withdraw Modal State
    const [showWithdrawModal, setShowWithdrawModal] = useState(false);
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<'bank' | 'upi'>('bank');
    const [upiId, setUpiId] = useState('');
    const [bankAccount, setBankAccount] = useState('••••5678');
    const [withdrawing, setWithdrawing] = useState(false);

    // Notices and Support Modals
    const [showNoticeModal, setShowNoticeModal] = useState(false);
    const [showSupportModal, setShowSupportModal] = useState(false);

    const fetchStats = useCallback(async () => {
        try {
            const res = await api.get('/api/agent/stats');
            setStats(res.data);
        } catch (err) {
            try {
                const altRes = await api.get('/api/provider/agent/stats');
                setStats(altRes.data);
            } catch (altErr) {
                console.error('Agent stats error', altErr);
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchStats();
    };

    const handleExecuteWithdraw = async () => {
        const amt = parseFloat(withdrawAmount);
        if (isNaN(amt) || amt < 50) {
            Alert.alert('अमान्य राशि', 'न्यूनतम विड्रॉल सीमा ₹50 है।');
            return;
        }

        if (!stats || stats.balance < amt) {
            Alert.alert(
                'अपर्याप्त बैलेंस',
                `आपके पास केवल ₹${(stats?.balance ?? 0).toFixed(2)} निकालने योग्य राशि उपलब्ध है।`
            );
            return;
        }

        setWithdrawing(true);
        try {
            const res = await api.post('/api/agent/withdraw', {
                amount: amt,
                payment_method: paymentMethod,
                account: paymentMethod === 'upi' ? upiId : bankAccount,
            });

            Alert.alert(
                '✅ निकासी अनुरोध सफल!',
                res.data.message || `₹${amt} का विड्रॉल अनुरोध प्राप्त हुआ। 24 घंटे में आपके खाते में क्रेडिट कर दिया जाएगा।`
            );
            setShowWithdrawModal(false);
            setWithdrawAmount('');
            fetchStats();
        } catch (err: any) {
            Alert.alert('त्रुटि', getErrorMessage(err));
        } finally {
            setWithdrawing(false);
        }
    };

    const topPadding = Math.max(insets.top, Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0);

    if (loading) {
        return (
            <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
                <StatusBar barStyle="light-content" backgroundColor="#0D253F" translucent={false} />
                <View style={[styles.topHeader, { paddingTop: topPadding + 6 }]}>
                    <View style={styles.topHeaderLeft}>
                        <View style={styles.headerLogoBox}>
                            <Text style={{ fontSize: 20 }}>🤝</Text>
                        </View>
                        <View>
                            <Text style={styles.headerAppTitle}>श्रम सारथी नेटवर्क</Text>
                            <Text style={styles.headerAppSub}>एजेंट पार्टनर डैशबोर्ड</Text>
                        </View>
                    </View>
                </View>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#0D253F" />
                    <Text style={styles.loadingText}>एजेंट डैशबोर्ड लोड हो रहा है...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
            <StatusBar barStyle="light-content" backgroundColor="#0D253F" translucent={false} />

            {/* ── Top Blue Header (Safe Area Padded) ── */}
            <View style={[styles.topHeader, { paddingTop: topPadding + 6 }]}>
                <View style={styles.topHeaderLeft}>
                    <View style={styles.headerLogoBox}>
                        <Text style={{ fontSize: 20 }}>🤝</Text>
                    </View>
                    <View>
                        <Text style={styles.headerAppTitle}>श्रम सारथी नेटवर्क</Text>
                        <Text style={styles.headerAppSub}>एजेंट पार्टनर डैशबोर्ड</Text>
                    </View>
                </View>
                <TouchableOpacity
                    style={styles.headerBellBtn}
                    onPress={() => navigation.navigate('Notifications')}
                >
                    <Ionicons name="notifications-outline" size={20} color="#fff" />
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.content}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0D253F', '#2E7D32']} />}
            >
                {/* ── Agent Profile Bar ── */}
                <View style={styles.profileBar}>
                    <View style={styles.profileAvatarBox}>
                        <Ionicons name="person" size={24} color="#F26333" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={styles.agentGreeting}>नमस्ते, {stats?.agent_name || 'अमित कुमार'}</Text>
                        <Text style={styles.agentIdText}>एजेंट आईडी: {stats?.agent_id || 'AGT123456'}</Text>
                    </View>
                    <View style={styles.activeBadge}>
                        <Text style={styles.activeBadgeText}>सक्रिय</Text>
                    </View>
                </View>

                {/* ── 2 Balance Cards (Withdrawable vs Locked Bonus) ── */}
                <View style={styles.balanceCardsContainer}>
                    {/* Card 1: Withdrawable Balance (Green) */}
                    <View style={styles.withdrawableCard}>
                        <Text style={styles.cardSuperTitle}>कुल उपलब्ध बैलेंस</Text>
                        <Text style={styles.cardSubTitle}>(Withdrawable Balance)</Text>

                        <View style={styles.balanceRow}>
                            <Text style={styles.balanceRupeeSymbol}>₹</Text>
                            <Text style={styles.balanceBigAmount}>
                                {Math.floor(stats?.balance ?? 850)}
                            </Text>
                            <Ionicons name="wallet-outline" size={24} color="#fff" style={{ marginLeft: 'auto', opacity: 0.8 }} />
                        </View>

                        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                            <TouchableOpacity
                                style={[styles.withdrawActionBtn, { flex: 1, marginTop: 0 }]}
                                activeOpacity={0.85}
                                onPress={() => setShowWithdrawModal(true)}
                            >
                                <Ionicons name="cash-outline" size={15} color="#1B5E20" style={{ marginRight: 4 }} />
                                <Text style={styles.withdrawActionBtnText}>निकासी (Withdraw)</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={{
                                    backgroundColor: 'rgba(255,255,255,0.25)',
                                    paddingHorizontal: 12,
                                    borderRadius: 8,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                                activeOpacity={0.85}
                                onPress={() => navigation.navigate('WalletScreen')}
                            >
                                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>पासबुक ➔</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.limitWarningPill}>
                            <Ionicons name="warning" size={12} color="#fff" style={{ marginRight: 4 }} />
                            <Text style={styles.limitWarningText}>मिनिमम विड्रॉल सीमा: ₹500</Text>
                        </View>
                    </View>

                    {/* Card 2: Pending Locked Bonus (Orange) */}
                    <View style={styles.lockedBonusCard}>
                        <View style={styles.lockedHeaderRow}>
                            <View>
                                <Text style={styles.cardSuperTitle}>पेंडिंग बोनस</Text>
                                <Text style={styles.cardSubTitle}>(Locked Bonus)</Text>
                            </View>
                            <Ionicons name="lock-closed" size={22} color="#fff" style={{ opacity: 0.9 }} />
                        </View>

                        <View style={styles.balanceRow}>
                            <Text style={styles.balanceRupeeSymbol}>₹</Text>
                            <Text style={styles.balanceBigAmount}>
                                {Math.floor(stats?.hold_balance ?? 300)}
                            </Text>
                        </View>

                        <Text style={styles.lockedExplanationText}>
                            यह राशि तब विड्रॉएबल में जाएगी जब आपके द्वारा जोड़े गए व्यक्ति पहला काम स्वीकार करेंगे।
                        </Text>
                    </View>
                </View>

                {/* ── Today's Overview (आज की झलक) ── */}
                <View style={styles.overviewSection}>
                    <View style={styles.overviewHeaderRow}>
                        <Text style={styles.sectionHeadingText}>आज की झलक (Today's Overview)</Text>
                        <Text style={styles.overviewDateText}>
                            {new Date().toLocaleDateString('hi-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </Text>
                    </View>

                    <View style={styles.overviewGrid}>
                        {/* 1. Total Network */}
                        <View style={styles.overviewCard}>
                            <Text style={styles.overviewCardTitle}>कुल नेटवर्क</Text>
                            <Text style={styles.overviewCardValue}>{stats?.total_network ?? stats?.total_registered ?? 125}</Text>
                        </View>

                        {/* 2. Total Bookings */}
                        <View style={styles.overviewCard}>
                            <Text style={styles.overviewCardTitle}>कुल बुकिंग</Text>
                            <Text style={styles.overviewCardValue}>{stats?.total_bookings ?? 58}</Text>
                        </View>

                        {/* 3. Today Earnings */}
                        <View style={styles.overviewCard}>
                            <Text style={styles.overviewCardTitle}>आज की कमाई</Text>
                            <Text style={styles.overviewCardValue}>₹ {Math.round(stats?.today_earnings ?? 68)}</Text>
                        </View>

                        {/* 4. Total Lifetime Earnings */}
                        <View style={styles.overviewCard}>
                            <Text style={styles.overviewCardTitle}>कुल कमाई</Text>
                            <Text style={styles.overviewCardValue}>₹ {Math.round(stats?.total_earned ?? 2450)}</Text>
                        </View>
                    </View>
                </View>

                {/* ── Quick Actions Grid (त्वरित कार्रवाई - 4x2 Grid) ── */}
                <View style={styles.quickActionsSection}>
                    <Text style={styles.sectionHeadingText}>त्वरित कार्रवाई (Quick Actions)</Text>

                    <View style={styles.qaGrid}>
                        {/* 1. New Registration */}
                        <TouchableOpacity
                            style={styles.qaCard}
                            activeOpacity={0.8}
                            onPress={() => navigation.navigate('AgentAddLaborScreen')}
                        >
                            <View style={[styles.qaIconCircle, { backgroundColor: '#E3F2FD' }]}>
                                <Ionicons name="add-circle" size={24} color="#1565C0" />
                            </View>
                            <Text style={styles.qaLabel}>नया रजिस्ट्रेशन करें</Text>
                        </TouchableOpacity>

                        {/* 2. My Network */}
                        <TouchableOpacity
                            style={styles.qaCard}
                            activeOpacity={0.8}
                            onPress={() => navigation.navigate('AgentNetworkScreen')}
                        >
                            <View style={[styles.qaIconCircle, { backgroundColor: '#E8F5E9' }]}>
                                <Ionicons name="people" size={24} color="#2E7D32" />
                            </View>
                            <Text style={styles.qaLabel}>मेरा नेटवर्क</Text>
                        </TouchableOpacity>

                        {/* 3. Earnings & Passbook */}
                        <TouchableOpacity
                            style={styles.qaCard}
                            activeOpacity={0.8}
                            onPress={() => navigation.navigate('AgentEarningsScreen')}
                        >
                            <View style={[styles.qaIconCircle, { backgroundColor: '#FFF3E0' }]}>
                                <Ionicons name="receipt" size={24} color="#E65100" />
                            </View>
                            <Text style={styles.qaLabel}>अर्निंग्स एवं पासबुक</Text>
                        </TouchableOpacity>

                        {/* 4. Bonus Status */}
                        <TouchableOpacity
                            style={styles.qaCard}
                            activeOpacity={0.8}
                            onPress={() => navigation.navigate('AgentNetworkScreen', { filter: 'labour' })}
                        >
                            <View style={[styles.qaIconCircle, { backgroundColor: '#FCE4EC' }]}>
                                <Ionicons name="gift" size={24} color="#C2185B" />
                            </View>
                            <Text style={styles.qaLabel}>बोनस स्थिति</Text>
                        </TouchableOpacity>

                        {/* 5. My Network Bookings */}
                        <TouchableOpacity
                            style={styles.qaCard}
                            activeOpacity={0.8}
                            onPress={() => navigation.navigate('AgentEarningsScreen', { filter: 'booking' })}
                        >
                            <View style={[styles.qaIconCircle, { backgroundColor: '#EDE7F6' }]}>
                                <Ionicons name="clipboard" size={24} color="#512DA8" />
                            </View>
                            <Text style={styles.qaLabel}>मेरी बुकिंग्स</Text>
                        </TouchableOpacity>

                        {/* 6. Wallet & Withdraw */}
                        <TouchableOpacity
                            style={styles.qaCard}
                            activeOpacity={0.8}
                            onPress={() => setShowWithdrawModal(true)}
                        >
                            <View style={[styles.qaIconCircle, { backgroundColor: '#E0F2F1' }]}>
                                <Ionicons name="card" size={24} color="#00796B" />
                            </View>
                            <Text style={styles.qaLabel}>वॉलेट एवं विड्रॉल</Text>
                        </TouchableOpacity>

                        {/* 7. Notice / Update */}
                        <TouchableOpacity
                            style={styles.qaCard}
                            activeOpacity={0.8}
                            onPress={() => setShowNoticeModal(true)}
                        >
                            <View style={[styles.qaIconCircle, { backgroundColor: '#FFF8E1' }]}>
                                <Ionicons name="megaphone" size={24} color="#F57F17" />
                            </View>
                            <Text style={styles.qaLabel}>नोटिस / अपडेट</Text>
                        </TouchableOpacity>

                        {/* 8. Help & Support */}
                        <TouchableOpacity
                            style={styles.qaCard}
                            activeOpacity={0.8}
                            onPress={() => setShowSupportModal(true)}
                        >
                            <View style={[styles.qaIconCircle, { backgroundColor: '#FFEBEE' }]}>
                                <Ionicons name="headset" size={24} color="#D32F2F" />
                            </View>
                            <Text style={styles.qaLabel}>सहायता केंद्र</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* ── Incentive Banner (ज्यादा नेटवर्क, ज्यादा कमाई!) ── */}
                <View style={styles.incentiveBanner}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                        <Ionicons name="trending-up" size={20} color="#FFD54F" style={{ marginRight: 8 }} />
                        <Text style={styles.incentiveBannerTitle}>ज्यादा नेटवर्क, ज्यादा कमाई!</Text>
                    </View>
                    <Text style={styles.incentiveBannerSub}>
                        जितने अधिक लोग जोड़ेंगे, उतनी अधिक कमाई होगी।
                    </Text>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>

            {/* ── Wallet & Withdraw Modal (PDF Page 1 UI) ── */}
            <Modal visible={showWithdrawModal} animationType="slide" transparent>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={styles.modalOverlay}
                >
                    <View style={styles.withdrawModalCard}>
                        {/* Header */}
                        <View style={styles.withdrawModalHeader}>
                            <TouchableOpacity onPress={() => setShowWithdrawModal(false)} style={{ padding: 4 }}>
                                <Ionicons name="arrow-back" size={22} color="#fff" />
                            </TouchableOpacity>
                            <Text style={styles.withdrawModalTitle}>वॉलेट एवं विड्रॉल</Text>
                            <View style={{ width: 24 }} />
                        </View>

                        <ScrollView
                            style={{ padding: 16 }}
                            contentContainerStyle={{ paddingBottom: 140 }}
                            keyboardShouldPersistTaps="handled"
                            showsVerticalScrollIndicator={false}
                        >
                            {/* 2 Balance Indicators */}
                            <View style={styles.modalBalanceRow}>
                                <View style={styles.modalBalanceBox}>
                                    <Text style={styles.modalBalanceLabel}>Withdrawable Balance</Text>
                                    <Text style={[styles.modalBalanceVal, { color: '#2E7D32' }]}>
                                        ₹ {Math.floor(stats?.balance ?? 850)}
                                    </Text>
                                    <Text style={styles.modalMinLimitText}>⚠️ मिनिमम विड्रॉल सीमा: केवल ₹50 (शुल्क वॉलेट से कटेगा)</Text>
                                </View>

                                <View style={styles.modalBalanceBox}>
                                    <Text style={styles.modalBalanceLabel}>Pending Bonus (Locked)</Text>
                                    <Text style={[styles.modalBalanceVal, { color: '#E65100' }]}>
                                        ₹ {Math.floor(stats?.hold_balance ?? 300)}
                                    </Text>
                                </View>
                            </View>

                            {/* Withdraw Input Box */}
                            <View style={styles.withdrawFormGroup}>
                                <Text style={styles.inputGroupLabel}>विड्रॉल राशि दर्ज करें</Text>
                                <View style={styles.amountInputRow}>
                                    <Text style={styles.amountInputPrefix}>₹</Text>
                                    <TextInput
                                        style={styles.amountTextInput}
                                        placeholder="राशि दर्ज करें (न्यूनतम ₹50)"
                                        placeholderTextColor="#999"
                                        keyboardType="numeric"
                                        value={withdrawAmount}
                                        onChangeText={setWithdrawAmount}
                                    />
                                </View>

                                {/* Quick Chips */}
                                <View style={styles.quickChipsRow}>
                                    {[50, 100, 500, stats?.balance ? Math.floor(stats.balance) : 850].map((val, idx) => (
                                        <TouchableOpacity
                                            key={idx}
                                            style={styles.quickChip}
                                            onPress={() => setWithdrawAmount(String(val))}
                                        >
                                            <Text style={styles.quickChipText}>{idx === 3 ? 'पूरा (All)' : `₹${val}`}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            {/* Payment Method Selector */}
                            <View style={styles.withdrawFormGroup}>
                                <Text style={styles.inputGroupLabel}>पेमेंट माध्यम चुनें</Text>
                                
                                <TouchableOpacity
                                    style={[styles.paymentMethodOption, paymentMethod === 'bank' && styles.paymentMethodActive]}
                                    onPress={() => setPaymentMethod('bank')}
                                >
                                    <Ionicons name="business" size={20} color={paymentMethod === 'bank' ? '#1565C0' : '#666'} />
                                    <Text style={styles.paymentMethodText}>🏦 बैंक खाता (••••5678)</Text>
                                    <Ionicons
                                        name={paymentMethod === 'bank' ? 'radio-button-on' : 'radio-button-off'}
                                        size={20}
                                        color={paymentMethod === 'bank' ? '#1565C0' : '#999'}
                                        style={{ marginLeft: 'auto' }}
                                    />
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.paymentMethodOption, paymentMethod === 'upi' && styles.paymentMethodActive]}
                                    onPress={() => setPaymentMethod('upi')}
                                >
                                    <Ionicons name="phone-portrait" size={20} color={paymentMethod === 'upi' ? '#1565C0' : '#666'} />
                                    <Text style={styles.paymentMethodText}>📱 UPI आईडी (GPay / PhonePe / Paytm)</Text>
                                    <Ionicons
                                        name={paymentMethod === 'upi' ? 'radio-button-on' : 'radio-button-off'}
                                        size={20}
                                        color={paymentMethod === 'upi' ? '#1565C0' : '#999'}
                                        style={{ marginLeft: 'auto' }}
                                    />
                                </TouchableOpacity>

                                {paymentMethod === 'upi' && (
                                    <TextInput
                                        style={styles.upiTextInput}
                                        placeholder="अपनी UPI आईडी दर्ज करें (उदा. name@upi)"
                                        placeholderTextColor="#999"
                                        value={upiId}
                                        onChangeText={setUpiId}
                                    />
                                )}
                            </View>

                            {/* Withdraw Submit Button */}
                            <TouchableOpacity
                                style={[styles.withdrawSubmitBtn, withdrawing && { opacity: 0.6 }]}
                                disabled={withdrawing}
                                onPress={handleExecuteWithdraw}
                            >
                                {withdrawing ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <>
                                        <Ionicons name="cash" size={20} color="#fff" style={{ marginRight: 8 }} />
                                        <Text style={styles.withdrawSubmitBtnText}>विड्रॉ करें</Text>
                                    </>
                                )}
                            </TouchableOpacity>

                            {/* Note */}
                            <Text style={styles.withdrawNoticeNote}>
                                नोट: न्यूनतम विड्रॉल सीमा ₹50 है। विड्रॉल लेनदेन शुल्क वॉलेट से काटा जाएगा।
                            </Text>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* ── Notices Modal ── */}
            <Modal visible={showNoticeModal} animationType="fade" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.infoModalContent}>
                        <View style={styles.infoModalHeader}>
                            <Text style={styles.infoModalTitle}>📢 नोटिस एवं अपडेट</Text>
                            <TouchableOpacity onPress={() => setShowNoticeModal(false)}>
                                <Ionicons name="close-circle" size={24} color="#666" />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={{ maxHeight: 300, marginVertical: 10 }}>
                            <View style={styles.noticeItem}>
                                <Text style={styles.noticeTitle}>🚀 नया एजेंट बोनस ऑफर चालू है!</Text>
                                <Text style={styles.noticeBody}>
                                    अधिक से अधिक कारीगर, मजदूर व गाड़ियां जोड़ें। लेबर पर ₹10 बोनस + ₹1 प्रति बुकिंग कमीशन मिलेगा!
                                </Text>
                            </View>
                            <View style={styles.noticeItem}>
                                <Text style={styles.noticeTitle}>💳 विड्रॉल पॉलिसी</Text>
                                <Text style={styles.noticeBody}>
                                    न्यूनतम विड्रॉल सीमा केवल ₹50 है (लेनदेन शुल्क वॉलेट से काटा जाएगा)। आपका बैलेंस सुरक्षित है।
                                </Text>
                            </View>
                        </ScrollView>
                        <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowNoticeModal(false)}>
                            <Text style={styles.modalCloseBtnText}>ठीक है</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* ── Support Modal ── */}
            <Modal visible={showSupportModal} animationType="fade" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.infoModalContent}>
                        <View style={styles.infoModalHeader}>
                            <Text style={styles.infoModalTitle}>🎧 एजेंट सहायता केंद्र</Text>
                            <TouchableOpacity onPress={() => setShowSupportModal(false)}>
                                <Ionicons name="close-circle" size={24} color="#666" />
                            </TouchableOpacity>
                        </View>
                        <View style={{ marginVertical: 14, gap: 10 }}>
                            <View style={styles.supportRow}>
                                <Ionicons name="call" size={20} color="#2E7D32" />
                                <Text style={styles.supportText}>हेल्पलाइन: <Text style={{ fontWeight: 'bold' }}>1800-123-7890</Text></Text>
                            </View>
                            <View style={styles.supportRow}>
                                <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
                                <Text style={styles.supportText}>व्हाट्सएप: <Text style={{ fontWeight: 'bold' }}>+91 98765 43210</Text></Text>
                            </View>
                            <View style={styles.supportRow}>
                                <Ionicons name="mail" size={20} color="#1565C0" />
                                <Text style={styles.supportText}>ईमेल: <Text style={{ fontWeight: 'bold' }}>support@shramsarathi.in</Text></Text>
                            </View>
                            <Text style={{ fontSize: 12, color: '#777', marginTop: 6 }}>
                                समय: सोमवार - शनिवार, सुबह 9:00 से शाम 7:00 बजे तक
                            </Text>
                        </View>
                        <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowSupportModal(false)}>
                            <Text style={styles.modalCloseBtnText}>बंद करें</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <WalletRechargeModal
                visible={showRechargeModal}
                onClose={() => setShowRechargeModal(false)}
                onSuccess={() => fetchStats()}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0D253F',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F4F6F9',
    },
    loadingText: {
        marginTop: 12,
        color: '#555',
        fontSize: 14,
    },
    topHeader: {
        backgroundColor: '#0D253F',
        paddingHorizontal: 16,
        paddingBottom: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    topHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    headerLogoBox: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerAppTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    headerAppSub: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 11,
    },
    headerBellBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        flex: 1,
        backgroundColor: '#F4F6F9',
    },
    profileBar: {
        backgroundColor: '#fff',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    profileAvatarBox: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#FFF3E0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    agentGreeting: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#212121',
    },
    agentIdText: {
        fontSize: 12,
        color: '#666',
        marginTop: 2,
    },
    activeBadge: {
        backgroundColor: '#E8F5E9',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#C8E6C9',
    },
    activeBadgeText: {
        color: '#2E7D32',
        fontSize: 11,
        fontWeight: 'bold',
    },
    balanceCardsContainer: {
        paddingHorizontal: 16,
        paddingTop: 14,
        gap: 12,
    },
    withdrawableCard: {
        backgroundColor: '#2E7D32',
        borderRadius: 14,
        padding: 16,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 3,
    },
    lockedBonusCard: {
        backgroundColor: '#E65100',
        borderRadius: 14,
        padding: 16,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 3,
    },
    cardSuperTitle: {
        color: '#fff',
        fontSize: 15,
        fontWeight: 'bold',
    },
    cardSubTitle: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 11,
        marginBottom: 6,
    },
    lockedHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    balanceRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginVertical: 4,
    },
    balanceRupeeSymbol: {
        color: '#fff',
        fontSize: 22,
        fontWeight: 'bold',
        marginRight: 4,
    },
    balanceBigAmount: {
        color: '#fff',
        fontSize: 32,
        fontWeight: '900',
        letterSpacing: 1,
    },
    withdrawActionBtn: {
        backgroundColor: '#fff',
        borderRadius: 8,
        paddingVertical: 10,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        marginTop: 10,
    },
    withdrawActionBtnText: {
        color: '#1B5E20',
        fontSize: 13,
        fontWeight: 'bold',
    },
    limitWarningPill: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8,
    },
    limitWarningText: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 11,
    },
    lockedExplanationText: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 11,
        marginTop: 6,
        lineHeight: 16,
    },
    overviewSection: {
        paddingHorizontal: 16,
        marginTop: 18,
    },
    overviewHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    sectionHeadingText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333',
    },
    overviewDateText: {
        fontSize: 11,
        color: '#777',
    },
    overviewGrid: {
        flexDirection: 'row',
        gap: 8,
    },
    overviewCard: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 10,
        paddingVertical: 12,
        paddingHorizontal: 6,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    overviewCardTitle: {
        fontSize: 11,
        color: '#666',
        textAlign: 'center',
        marginBottom: 4,
    },
    overviewCardValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#111',
    },
    quickActionsSection: {
        paddingHorizontal: 16,
        marginTop: 20,
    },
    qaGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginTop: 10,
    },
    qaCard: {
        width: '22.5%',
        backgroundColor: '#fff',
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 4,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E8E8E8',
    },
    qaIconCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 6,
    },
    qaLabel: {
        fontSize: 10,
        color: '#333',
        textAlign: 'center',
        fontWeight: '600',
        lineHeight: 13,
    },
    incentiveBanner: {
        marginHorizontal: 16,
        marginTop: 20,
        backgroundColor: '#0D253F',
        borderRadius: 12,
        padding: 16,
    },
    incentiveBannerTitle: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
    },
    incentiveBannerSub: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 12,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    withdrawModalCard: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '85%',
    },
    withdrawModalHeader: {
        backgroundColor: '#0D253F',
        paddingHorizontal: 16,
        paddingVertical: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
    },
    withdrawModalTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    modalBalanceRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 16,
    },
    modalBalanceBox: {
        flex: 1,
        backgroundColor: '#F5F5F5',
        borderRadius: 10,
        padding: 10,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    modalBalanceLabel: {
        fontSize: 10,
        color: '#666',
        fontWeight: '600',
    },
    modalBalanceVal: {
        fontSize: 18,
        fontWeight: 'bold',
        marginVertical: 4,
    },
    modalMinLimitText: {
        fontSize: 9,
        color: '#E65100',
    },
    withdrawFormGroup: {
        marginBottom: 16,
    },
    inputGroupLabel: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 8,
    },
    amountInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#0D253F',
        borderRadius: 10,
        paddingHorizontal: 12,
        backgroundColor: '#fff',
    },
    amountInputPrefix: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#0D253F',
        marginRight: 6,
    },
    amountTextInput: {
        flex: 1,
        height: 48,
        fontSize: 16,
        color: '#111',
    },
    quickChipsRow: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 8,
    },
    quickChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: '#E8F5E9',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#C8E6C9',
    },
    quickChipText: {
        color: '#2E7D32',
        fontSize: 11,
        fontWeight: 'bold',
    },
    paymentMethodOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        marginBottom: 8,
        gap: 10,
    },
    paymentMethodActive: {
        borderColor: '#1565C0',
        backgroundColor: '#E3F2FD',
    },
    paymentMethodText: {
        fontSize: 13,
        color: '#333',
        fontWeight: '600',
    },
    upiTextInput: {
        borderWidth: 1,
        borderColor: '#CCC',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        fontSize: 13,
        marginTop: 4,
    },
    withdrawSubmitBtn: {
        backgroundColor: '#2E7D32',
        borderRadius: 10,
        paddingVertical: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8,
    },
    withdrawSubmitBtnText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: 'bold',
    },
    withdrawNoticeNote: {
        fontSize: 11,
        color: '#666',
        textAlign: 'center',
        marginVertical: 14,
        lineHeight: 16,
    },
    infoModalContent: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 18,
        margin: 20,
    },
    infoModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
        paddingBottom: 10,
    },
    infoModalTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#0D253F',
    },
    noticeItem: {
        backgroundColor: '#F9F9F9',
        borderRadius: 8,
        padding: 10,
        marginBottom: 8,
    },
    noticeTitle: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#212121',
        marginBottom: 4,
    },
    noticeBody: {
        fontSize: 12,
        color: '#555',
        lineHeight: 17,
    },
    supportRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    supportText: {
        fontSize: 13,
        color: '#333',
    },
    modalCloseBtn: {
        backgroundColor: '#0D253F',
        borderRadius: 8,
        paddingVertical: 10,
        alignItems: 'center',
        marginTop: 10,
    },
    modalCloseBtnText: {
        color: '#fff',
        fontWeight: 'bold',
    },
});
