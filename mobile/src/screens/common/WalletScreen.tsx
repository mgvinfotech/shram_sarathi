import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    RefreshControl,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, getErrorMessage } from '../../services/api';
import { useLanguage } from '../../i18n/LanguageContext';
import WalletRechargeModal from '../../components/WalletRechargeModal';
import WalletWithdrawModal from '../../components/WalletWithdrawModal';

const ORANGE = '#F26333';
const ORANGE_LIGHT = '#FFF3ED';
const GREEN = '#2E7D32';
const GREEN_LIGHT = '#E8F5E9';

interface TransactionItem {
    id: number;
    amount: number;
    type: 'credit' | 'debit';
    category: string;
    category_label: string;
    description: string;
    balance_after: number;
    hold_status: string;
    created_at: string;
}

interface WalletData {
    balance: number;
    hold_balance: number;
    total_earned: number;
    total_withdrawn: number;
    upi_vpa: string;
    merchant_name: string;
    transactions: TransactionItem[];
}

export default function WalletScreen({ navigation }: any) {
    const insets = useSafeAreaInsets();
    const { lang } = useLanguage();
    const [wallet, setWallet] = useState<WalletData | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [modalInitialAmt, setModalInitialAmt] = useState<number | undefined>(undefined);
    const [withdrawModalVisible, setWithdrawModalVisible] = useState(false);

    const fetchWallet = useCallback(async () => {
        try {
            const res = await api.get<WalletData>('/api/wallet');
            setWallet(res.data);
        } catch (err) {
            Alert.alert('त्रुटि', getErrorMessage(err));
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchWallet();
    }, [fetchWallet]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchWallet();
    };

    const handleOpenRecharge = (initialAmt?: number) => {
        setModalInitialAmt(initialAmt);
        setModalVisible(true);
    };

    const handleWithdraw = () => {
        setWithdrawModalVisible(true);
    };

    const formatDate = (dateStr: string) => {
        try {
            const d = new Date(dateStr);
            return d.toLocaleDateString('hi-IN', {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
            });
        } catch {
            return dateStr;
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={ORANGE} />
                    <Text style={styles.loadingText}>वॉलेट लोड हो रहा है...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* ── Header ── */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
                    <Text style={styles.backIcon}>←</Text>
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <Text style={styles.headerTitle}>{lang === 'hi' ? '💳 मेरा वॉलेट' : '💳 My Wallet'}</Text>
                    <Text style={styles.headerSubtitle}>{lang === 'hi' ? 'रिचार्ज एवं खाता लेजर' : 'Recharge & Ledger'}</Text>
                </View>
                <TouchableOpacity onPress={onRefresh} style={styles.refreshBtn} activeOpacity={0.7}>
                    <Text style={styles.refreshIcon}>🔄</Text>
                </TouchableOpacity>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[ORANGE]} />
                }
                contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 24) + 20 }]}
            >
                {/* ── Premium Balance Card ── */}
                <View style={styles.balanceCard}>
                    <View style={styles.balanceCardTop}>
                        <View>
                            <Text style={styles.balanceLabel}>{lang === 'hi' ? 'उपलब्ध बैलेंस (Withdrawable)' : 'Available (Withdrawable)'}</Text>
                            <View style={styles.balanceRow}>
                                <Text style={styles.currency}>₹</Text>
                                <Text style={styles.mainBalance}>
                                    {(wallet?.balance ?? 0).toFixed(2)}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.liveBadge}>
                            <View style={styles.liveDot} />
                            <Text style={styles.liveText}>{lang === 'hi' ? 'निकासी योग्य' : 'Withdrawable'}</Text>
                        </View>
                    </View>

                    {/* Hold / Pending Bonus Strip if present */}
                    {(wallet?.hold_balance ?? 0) > 0 && (
                        <View style={styles.holdStrip}>
                            <Text style={styles.holdIcon}>🔒</Text>
                            <Text style={styles.holdText}>
                                {lang === 'hi' ? 'लॉक बोनस (Hold):' : 'Hold Bonus:'} <Text style={styles.holdBold}>₹{(wallet?.hold_balance ?? 0).toFixed(2)}</Text> {lang === 'hi' ? '(रेफरल सदस्य का पहला काम पूरा होने पर अनलॉक होगा)' : '(Unlocks when member completes 1st job)'}
                            </Text>
                        </View>
                    )}

                    {/* Action Buttons Row */}
                    <View style={styles.actionsRow}>
                        <TouchableOpacity
                            style={styles.addMoneyBtn}
                            onPress={() => handleOpenRecharge()}
                            activeOpacity={0.85}
                        >
                            <Text style={styles.addMoneyText}>{lang === 'hi' ? '➕ पैसे जोड़ें' : '➕ Add Money'}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.withdrawBtn}
                            onPress={handleWithdraw}
                            activeOpacity={0.85}
                        >
                            <Text style={styles.withdrawText}>{lang === 'hi' ? '💸 निकासी' : '💸 Withdraw'}</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* ── Quick Top-Up Strip ── */}
                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>{lang === 'hi' ? '⚡ तुरंत रिचार्ज करें' : '⚡ Quick Top-up'}</Text>
                    <View style={styles.quickGrid}>
                        {[100, 200, 500, 1000].map((amt) => (
                            <TouchableOpacity
                                key={amt}
                                style={styles.quickChip}
                                onPress={() => handleOpenRecharge(amt)}
                                activeOpacity={0.75}
                            >
                                <Text style={styles.quickChipPlus}>+</Text>
                                <Text style={styles.quickChipText}>₹{amt}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* ── Rules & Guidance ── */}
                <View style={styles.infoCard}>
                    <View style={styles.infoHeader}>
                        <Text style={styles.infoTitle}>📋 वॉलेट नियम एवं जानकारी</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoBullet}>•</Text>
                        <Text style={styles.infoText}>
                            <Text style={styles.boldText}>UPI व कार्ड सपोर्ट:</Text> Google Pay, PhonePe, Paytm या डेबिट कार्ड से सुरक्षित भुगतान।
                        </Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoBullet}>•</Text>
                        <Text style={styles.infoText}>
                            <Text style={styles.boldText}>सुरक्षित लेनदेन:</Text> वॉलेट से निकासी 24-48 घंटों में आपके वेरिफाइड बैंक खाते या UPI में सीधे भेजी जाती है।
                        </Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoBullet}>•</Text>
                        <Text style={styles.infoText}>
                            <Text style={styles.boldText}>निकासी सीमा:</Text> न्यूनतम निकासी राशि केवल ₹50 है (लेनदेन शुल्क वॉलेट से काटा जाएगा)।
                        </Text>
                    </View>
                </View>

                {/* ── Transactions Ledger ── */}
                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>📋 हालिया लेनदेन (Transaction History)</Text>
                </View>

                {!wallet || wallet.transactions.length === 0 ? (
                    <View style={styles.emptyCard}>
                        <Text style={styles.emptyIcon}>📭</Text>
                        <Text style={styles.emptyTitle}>अभी कोई लेनदेन नहीं हुआ है</Text>
                        <Text style={styles.emptySubtitle}>
                            वॉलेट रिचार्ज या बुकिंग कमीशन का रिकॉर्ड यहाँ दिखेगा।
                        </Text>
                    </View>
                ) : (
                    wallet.transactions.map((tx) => {
                        const isCredit = tx.type === 'credit';
                        const isHeld = tx.hold_status === 'held';

                        return (
                            <View key={tx.id} style={styles.txCard}>
                                <View style={styles.txLeft}>
                                    <View
                                        style={[
                                            styles.txIconContainer,
                                            { backgroundColor: isCredit ? GREEN_LIGHT : '#FFEBEE' },
                                        ]}
                                    >
                                        <Text style={{ fontSize: 16 }}>
                                            {isCredit ? (isHeld ? '🔒' : '↓') : '↑'}
                                        </Text>
                                    </View>
                                    <View style={styles.txDetails}>
                                        <Text style={styles.txCategory}>{tx.category_label}</Text>
                                        <Text style={styles.txDescription} numberOfLines={2}>
                                            {tx.description}
                                        </Text>
                                        <Text style={styles.txDate}>{formatDate(tx.created_at)}</Text>
                                    </View>
                                </View>

                                <View style={styles.txRight}>
                                    <Text
                                        style={[
                                            styles.txAmount,
                                            { color: isCredit ? (isHeld ? '#F57F17' : GREEN) : '#D32F2F' },
                                        ]}
                                    >
                                        {isCredit ? '+' : '-'}₹{tx.amount.toFixed(2)}
                                    </Text>
                                    <Text style={styles.txBalAfter}>
                                        शेष: ₹{tx.balance_after.toFixed(2)}
                                    </Text>
                                </View>
                            </View>
                        );
                    })
                )}
            </ScrollView>

            {/* Recharge Modal */}
            <WalletRechargeModal
                visible={modalVisible}
                onClose={() => setModalVisible(false)}
                initialAmount={modalInitialAmt}
                onSuccess={() => {
                    fetchWallet();
                }}
            />

            {/* Withdraw Modal */}
            <WalletWithdrawModal
                visible={withdrawModalVisible}
                onClose={() => setWithdrawModalVisible(false)}
                currentBalance={wallet?.balance ?? 0}
                onSuccess={() => {
                    fetchWallet();
                }}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F6F8FA' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
    loadingText: { marginTop: 12, fontSize: 14, color: '#666' },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#EBEBEB',
    },
    backBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: '#F5F5F5',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    backIcon: { fontSize: 20, color: '#222', fontWeight: 'bold' },
    headerTitleContainer: { flex: 1 },
    headerTitle: { fontSize: 17, fontWeight: '800', color: '#1A1A1A' },
    headerSubtitle: { fontSize: 11, color: '#888', marginTop: 1 },
    refreshBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: '#F5F5F5',
        alignItems: 'center',
        justifyContent: 'center',
    },
    refreshIcon: { fontSize: 16 },

    scrollContent: { padding: 16 },

    // Balance Card
    balanceCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        padding: 18,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E8ECEF',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
    },
    balanceCardTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    balanceLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#666',
        marginBottom: 6,
    },
    balanceRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    currency: {
        fontSize: 24,
        fontWeight: '800',
        color: ORANGE,
        marginRight: 4,
    },
    mainBalance: {
        fontSize: 36,
        fontWeight: '900',
        color: '#1A1A1A',
    },
    liveBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E8F5E9',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 5,
    },
    liveDot: {
        width: 7,
        height: 7,
        borderRadius: 3.5,
        backgroundColor: GREEN,
    },
    liveText: {
        color: GREEN,
        fontSize: 11,
        fontWeight: '700',
    },
    holdStrip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF8E1',
        borderWidth: 1,
        borderColor: '#FFE082',
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 7,
        marginBottom: 16,
        gap: 6,
    },
    holdIcon: { fontSize: 13 },
    holdText: { fontSize: 11, color: '#795548', flex: 1 },
    holdBold: { fontWeight: '800', color: '#F57F17' },

    actionsRow: {
        flexDirection: 'row',
        gap: 10,
    },
    addMoneyBtn: {
        flex: 1,
        backgroundColor: ORANGE,
        paddingVertical: 13,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 2,
    },
    addMoneyText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 14,
    },
    withdrawBtn: {
        flex: 1,
        backgroundColor: '#F8F9FA',
        borderWidth: 1.5,
        borderColor: '#D0D7DE',
        paddingVertical: 13,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    withdrawText: {
        color: '#263238',
        fontWeight: 'bold',
        fontSize: 14,
    },

    // Quick Section
    sectionContainer: {
        marginBottom: 10,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '800',
        color: '#222',
    },
    quickGrid: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 8,
        marginBottom: 14,
    },
    quickChip: {
        flex: 1,
        backgroundColor: ORANGE_LIGHT,
        borderWidth: 1.5,
        borderColor: '#FFCCBC',
        borderRadius: 12,
        paddingVertical: 10,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 2,
    },
    quickChipPlus: {
        fontSize: 13,
        fontWeight: '800',
        color: ORANGE,
    },
    quickChipText: {
        fontSize: 13,
        fontWeight: '800',
        color: ORANGE,
    },

    // Info Card
    infoCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        padding: 14,
        marginBottom: 16,
        borderLeftWidth: 4,
        borderLeftColor: GREEN,
        borderWidth: 1,
        borderColor: '#E8ECEF',
    },
    infoHeader: { marginBottom: 8 },
    infoTitle: { fontSize: 13, fontWeight: '800', color: GREEN },
    infoRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 5 },
    infoBullet: { fontSize: 14, color: GREEN, marginRight: 6, lineHeight: 18 },
    infoText: { fontSize: 11, color: '#555', flex: 1, lineHeight: 17 },
    boldText: { fontWeight: '700', color: '#222' },

    // Empty
    emptyCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        padding: 30,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E8ECEF',
    },
    emptyIcon: { fontSize: 44, marginBottom: 8 },
    emptyTitle: { fontSize: 14, fontWeight: '700', color: '#333', marginBottom: 4 },
    emptySubtitle: { fontSize: 11, color: '#888', textAlign: 'center' },

    // Transactions
    txCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 12,
        marginBottom: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: '#EFEFEF',
        elevation: 1,
    },
    txLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 },
    txIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    txDetails: { flex: 1 },
    txCategory: { fontSize: 12, fontWeight: '800', color: '#1A1A1A' },
    txDescription: { fontSize: 11, color: '#666', marginTop: 1 },
    txDate: { fontSize: 10, color: '#AAA', marginTop: 3 },
    txRight: { alignItems: 'flex-end' },
    txAmount: { fontSize: 14, fontWeight: '800' },
    txBalAfter: { fontSize: 10, color: '#999', marginTop: 3 },
});
