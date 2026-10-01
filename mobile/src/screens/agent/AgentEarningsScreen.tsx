import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api, getErrorMessage } from '../../services/api';

type FilterType = 'all' | 'registration' | 'booking' | 'frc' | 'withdrawal' | 'other';

interface Transaction {
  id: number;
  amount: number;
  type: 'credit' | 'debit';
  category: string;
  category_label: string;
  description: string;
  balance_after: number;
  hold_status: string;
  date: string;
  formatted_date?: string;
}

interface EarningsData {
  balance: number;
  hold_balance: number;
  total_earned: number;
  total_withdrawn: number;
  total: number;
  page: number;
  per_page: number;
  transactions: Transaction[];
}

export default function AgentEarningsScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const initialFilter = route?.params?.filter || 'all';
  const [filter, setFilter] = useState<FilterType>(initialFilter);
  const [data, setData] = useState<EarningsData>({
    balance: 850,
    hold_balance: 300,
    total_earned: 2450,
    total_withdrawn: 0,
    total: 0,
    page: 1,
    per_page: 20,
    transactions: [],
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchEarnings = useCallback(async (f: FilterType) => {
    try {
      const res = await api.get(`/api/agent/earnings?filter=${f}&page=1&per_page=50`);
      setData(res.data);
    } catch (err) {
      try {
        const altRes = await api.get(`/api/provider/agent/earnings?filter=${f}&page=1&per_page=50`);
        setData(altRes.data);
      } catch (altErr) {
        Alert.alert('त्रुटि', getErrorMessage(altErr));
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchEarnings(filter);
  }, [filter, fetchEarnings]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchEarnings(filter);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '20 मई 2025, 11:45 AM';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('hi-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const topPadding = Math.max(insets.top, Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0);

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#0D253F" translucent={false} />

      {/* ── Top Header (Safe Area Padded) ── */}
      <View style={[styles.header, { paddingTop: topPadding + 6 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>अर्निंग्स एवं पासबुक (Earnings Ledger)</Text>
        <TouchableOpacity onPress={() => setFilter('all')}>
          <Ionicons name="filter-outline" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* ── Filter Tabs (PDF Page 1 Design) ── */}
      <View style={styles.tabsBar}>
        {[
          { key: 'all',          label: 'सभी' },
          { key: 'registration', label: 'रजिस्ट्रेशन बोनस' },
          { key: 'booking',      label: 'बुकिंग कमीशन' },
          { key: 'frc',          label: 'FRC बोनस' },
          { key: 'withdrawal',   label: 'निकासी' },
        ].map((t) => {
          const isSelected = filter === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              style={[styles.tabItem, isSelected && styles.tabItemActive]}
              onPress={() => setFilter(t.key as any)}
            >
              <Text style={[styles.tabItemText, isSelected && styles.tabItemTextActive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Balance Summary Bar ── */}
      <View style={styles.summaryBar}>
        <View style={styles.summaryBox}>
          <Text style={styles.summaryLabel}>Withdrawable Balance</Text>
          <Text style={[styles.summaryAmount, { color: '#2E7D32' }]}>₹{Math.floor(data.balance)}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryBox}>
          <Text style={styles.summaryLabel}>Locked Pending Bonus</Text>
          <Text style={[styles.summaryAmount, { color: '#E65100' }]}>₹{Math.floor(data.hold_balance)}</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#0D253F" />
          <Text style={{ marginTop: 10, color: '#666' }}>पासबुक लोड हो रही है...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0D253F']} />}
        >
          {/* ── Ledger Table Block (PDF Page 1) ── */}
          <View style={styles.ledgerBlock}>
            {/* Table Header */}
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.thCell, { flex: 2.2 }]}>तिथि</Text>
              <Text style={[styles.thCell, { flex: 3.2 }]}>विवरण</Text>
              <Text style={[styles.thCell, { flex: 1.5, textAlign: 'center' }]}>राशि (₹)</Text>
              <Text style={[styles.thCell, { flex: 2.2, textAlign: 'center' }]}>प्रकार</Text>
              <Text style={[styles.thCell, { flex: 1.5, textAlign: 'right' }]}>बैलेंस</Text>
            </View>

            {/* Table Rows */}
            {data.transactions.length > 0 ? (
              data.transactions.map((tx) => {
                const isCredit = tx.type === 'credit';
                const isHold = tx.hold_status === 'held';
                return (
                  <View key={tx.id} style={styles.tableRow}>
                    {/* Date */}
                    <View style={{ flex: 2.2 }}>
                      <Text style={styles.txDateText}>{tx.formatted_date || formatDate(tx.date)}</Text>
                    </View>

                    {/* Description */}
                    <View style={{ flex: 3.2, paddingHorizontal: 4 }}>
                      <Text style={styles.txDescText} numberOfLines={2}>
                        {tx.description || 'कमीशन क्रेडिट'}
                      </Text>
                    </View>

                    {/* Amount */}
                    <View style={{ flex: 1.5, alignItems: 'center' }}>
                      <Text
                        style={[
                          styles.txAmountText,
                          { color: isCredit ? (isHold ? '#E65100' : '#2E7D32') : '#D32F2F' },
                        ]}
                      >
                        {isCredit ? '+' : '-'}{tx.amount}
                      </Text>
                    </View>

                    {/* Type Badge */}
                    <View style={{ flex: 2.2, alignItems: 'center' }}>
                      <View
                        style={[
                          styles.txTypeBadge,
                          tx.category === 'BOOKING_COMMISSION' || tx.category === 'CONTRACTOR_COMMISSION'
                            ? styles.badgeBooking
                            : (tx.category === 'FRC_BONUS'
                              ? styles.badgeFRC
                              : (tx.category === 'WITHDRAWAL' ? styles.badgeWithdraw : styles.badgePending)),
                        ]}
                      >
                        <Text
                          style={[
                            styles.txTypeBadgeText,
                            tx.category === 'BOOKING_COMMISSION' || tx.category === 'CONTRACTOR_COMMISSION'
                              ? styles.textBooking
                              : (tx.category === 'FRC_BONUS'
                                ? styles.textFRC
                                : (tx.category === 'WITHDRAWAL' ? styles.textWithdraw : styles.textPending)),
                          ]}
                          numberOfLines={1}
                        >
                          {tx.category_label || tx.category}
                        </Text>
                      </View>
                    </View>

                    {/* Balance After */}
                    <View style={{ flex: 1.5, alignItems: 'flex-end' }}>
                      <Text style={styles.txBalanceText}>{Math.floor(tx.balance_after)}</Text>
                    </View>
                  </View>
                );
              })
            ) : (
              <View style={styles.emptyRow}>
                <Ionicons name="receipt-outline" size={36} color="#B0BEC5" />
                <Text style={styles.emptyText}>इस श्रेणी में कोई लेनदेन नहीं मिला।</Text>
              </View>
            )}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D253F',
  },
  header: {
    backgroundColor: '#0D253F',
    paddingHorizontal: 16,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  tabsBar: {
    backgroundColor: '#0D253F',
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingBottom: 10,
    gap: 4,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  tabItemActive: {
    backgroundColor: '#fff',
  },
  tabItemText: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '600',
  },
  tabItemTextActive: {
    color: '#0D253F',
    fontWeight: 'bold',
  },
  summaryBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    alignItems: 'center',
  },
  summaryBox: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 10,
    color: '#666',
    fontWeight: '600',
  },
  summaryAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#E0E0E0',
  },
  loadingBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F4F6F9',
  },
  content: {
    flex: 1,
    padding: 10,
    backgroundColor: '#F4F6F9',
  },
  ledgerBlock: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#F5F7FA',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 6,
    marginBottom: 6,
  },
  thCell: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#555',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  txDateText: {
    fontSize: 10,
    color: '#555',
    lineHeight: 14,
  },
  txDescText: {
    fontSize: 10.5,
    color: '#212121',
    fontWeight: '500',
    lineHeight: 14,
  },
  txAmountText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  txTypeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeBooking: {
    backgroundColor: '#E8F5E9',
  },
  textBooking: {
    color: '#2E7D32',
    fontSize: 9,
    fontWeight: 'bold',
  },
  badgeFRC: {
    backgroundColor: '#E3F2FD',
  },
  textFRC: {
    color: '#1565C0',
    fontSize: 9,
    fontWeight: 'bold',
  },
  badgePending: {
    backgroundColor: '#FFF3E0',
  },
  textPending: {
    color: '#E65100',
    fontSize: 9,
    fontWeight: 'bold',
  },
  badgeWithdraw: {
    backgroundColor: '#FFEBEE',
  },
  textWithdraw: {
    color: '#D32F2F',
    fontSize: 9,
    fontWeight: 'bold',
  },
  txTypeBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  txBalanceText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#333',
  },
  emptyRow: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
  },
  emptyText: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
  },
});
