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

type FilterType = 'all' | 'labour' | 'vehicle' | 'contractor';

interface NetworkMember {
  id: number;
  name: string;
  phone: string;
  role: string;
  role_label: string;
  member_type: 'labour' | 'karigar' | 'driver' | 'vehicle' | 'contractor';
  category: string | null;
  vehicle_number: string | null;
  company_name: string | null;
  is_verified: boolean;
  is_labour: boolean;
  is_vehicle: boolean;
  is_contractor: boolean;
  frc_status: 'VERIFIED' | 'PENDING';
  frc_done: boolean;
  first_job_done: boolean;
  first_job_date: string | null;
  bonus_status: 'unlocked' | 'locked' | 'pending';
  bonus_amount: number;
  joined_at: string;
  created_at: string;
}

interface NetworkResponse {
  total_count: number;
  labour_count: number;
  vehicle_count: number;
  contractor_count: number;
  members: NetworkMember[];
  data?: NetworkMember[];
}

export default function AgentNetworkScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const initialFilter = route?.params?.filter || 'all';
  const [filter, setFilter] = useState<FilterType>(initialFilter);
  const [data, setData] = useState<NetworkResponse>({
    total_count: 0,
    labour_count: 0,
    vehicle_count: 0,
    contractor_count: 0,
    members: [],
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNetwork = useCallback(async (f: FilterType) => {
    try {
      const res = await api.get(`/api/agent/network?filter=${f}`);
      const raw = res.data;
      if (Array.isArray(raw)) {
        setData({
          total_count: raw.length,
          labour_count: raw.filter((m: any) => m.is_labour).length,
          vehicle_count: raw.filter((m: any) => m.is_vehicle).length,
          contractor_count: raw.filter((m: any) => m.is_contractor).length,
          members: raw,
        });
      } else {
        setData({
          total_count: raw.total_count ?? 0,
          labour_count: raw.labour_count ?? 0,
          vehicle_count: raw.vehicle_count ?? 0,
          contractor_count: raw.contractor_count ?? 0,
          members: raw.members || raw.data || [],
        });
      }
    } catch (err) {
      try {
        const altRes = await api.get(`/api/provider/agent/network?filter=${f}`);
        const raw = altRes.data;
        setData({
          total_count: raw.total_count ?? (Array.isArray(raw) ? raw.length : 0),
          labour_count: raw.labour_count ?? 0,
          vehicle_count: raw.vehicle_count ?? 0,
          contractor_count: raw.contractor_count ?? 0,
          members: Array.isArray(raw) ? raw : (raw.members || raw.data || []),
        });
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
    fetchNetwork(filter);
  }, [filter, fetchNetwork]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchNetwork(filter);
  };

  const labourMembers = data.members.filter((m) => m.is_labour);
  const vehicleMembers = data.members.filter((m) => m.is_vehicle);
  const contractorMembers = data.members.filter((m) => m.is_contractor);

  const topPadding = Math.max(insets.top, Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0);

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#0D253F" translucent={false} />

      {/* ── Top Header (Safe Area Padded) ── */}
      <View style={[styles.header, { paddingTop: topPadding + 6 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>मेरा नेटवर्क</Text>
        <TouchableOpacity onPress={() => navigation.navigate('AgentAddLaborScreen')}>
          <Ionicons name="person-add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* ── 4 Filter Tabs (PDF Page 1 UI) ── */}
      <View style={styles.tabsBar}>
        {[
          { key: 'all',        label: `सभी (${data.total_count})` },
          { key: 'labour',     label: `लेबर/ड्राइवर (${data.labour_count})` },
          { key: 'vehicle',    label: `गाड़ी (${data.vehicle_count})` },
          { key: 'contractor', label: `ठेकेदार (${data.contractor_count})` },
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

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#0D253F" />
          <Text style={{ marginTop: 10, color: '#666' }}>नेटवर्क लोड हो रहा है...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0D253F']} />}
        >
          {/* ── Section 1: लेबर / ड्राइवर सूची (PDF Page 1 Table) ── */}
          {(filter === 'all' || filter === 'labour') && labourMembers.length > 0 && (
            <View style={styles.sectionBlock}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeading}>लेबर / ड्राइवर सूची</Text>
                <Text style={styles.sectionCountText}>कुल: {labourMembers.length}</Text>
              </View>

              {/* Table Header */}
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.thCell, { flex: 2.2 }]}>नाम / मोबाइल</Text>
                <Text style={[styles.thCell, { flex: 1.8 }]}>जॉइन की तारीख</Text>
                <Text style={[styles.thCell, { flex: 1.8 }]}>पहला काम</Text>
                <Text style={[styles.thCell, { flex: 2.2, textAlign: 'right' }]}>स्थिति</Text>
              </View>

              {/* Table Rows */}
              {labourMembers.map((m) => (
                <View key={m.id} style={styles.tableRow}>
                  <View style={{ flex: 2.2 }}>
                    <Text style={styles.rowMainText}>{m.name}</Text>
                    <Text style={styles.rowSubText}>{m.phone}</Text>
                  </View>

                  <View style={{ flex: 1.8 }}>
                    <Text style={styles.rowDateText}>{m.joined_at || '10 मई 2025'}</Text>
                  </View>

                  <View style={{ flex: 1.8 }}>
                    {m.first_job_done ? (
                      <Text style={[styles.rowDateText, { color: '#2E7D32', fontWeight: 'bold' }]}>
                        हाँ{m.first_job_date ? `\n(${m.first_job_date})` : ''}
                      </Text>
                    ) : (
                      <Text style={[styles.rowDateText, { color: '#E65100' }]}>नहीं</Text>
                    )}
                  </View>

                  <View style={{ flex: 2.2, alignItems: 'flex-end' }}>
                    {m.bonus_status === 'unlocked' || m.first_job_done ? (
                      <View style={styles.badgeUnlocked}>
                        <Text style={styles.badgeUnlockedText}>✔️ बोनस अनलॉक</Text>
                      </View>
                    ) : (
                      <View style={styles.badgePending}>
                        <Text style={styles.badgePendingText}>⏳ पेंडिंग (₹10)</Text>
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* ── Section 2: गाड़ी सूची (PDF Page 1 Table) ── */}
          {(filter === 'all' || filter === 'vehicle') && vehicleMembers.length > 0 && (
            <View style={styles.sectionBlock}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeading}>गाड़ी सूची</Text>
                <Text style={styles.sectionCountText}>कुल: {vehicleMembers.length}</Text>
              </View>

              {/* Table Header */}
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.thCell, { flex: 2.5 }]}>गाड़ी नंबर</Text>
                <Text style={[styles.thCell, { flex: 2 }]}>मालिक</Text>
                <Text style={[styles.thCell, { flex: 2, textAlign: 'center' }]}>FRC स्टेटस</Text>
                <Text style={[styles.thCell, { flex: 1.5, textAlign: 'right' }]}>बोनस</Text>
              </View>

              {/* Table Rows */}
              {vehicleMembers.map((m) => (
                <View key={m.id} style={styles.tableRow}>
                  <View style={{ flex: 2.5 }}>
                    <Text style={styles.rowMainText}>{m.vehicle_number || 'UP14 AB 1234'}</Text>
                    <Text style={styles.rowSubText}>{m.category || 'पिकअप / लोडर'}</Text>
                  </View>

                  <View style={{ flex: 2 }}>
                    <Text style={styles.rowMainText}>{m.name}</Text>
                    <Text style={styles.rowSubText}>{m.phone}</Text>
                  </View>

                  <View style={{ flex: 2, alignItems: 'center' }}>
                    <View style={m.frc_status === 'VERIFIED' ? styles.badgeVerified : styles.badgePendingFRC}>
                      <Text style={m.frc_status === 'VERIFIED' ? styles.badgeVerifiedText : styles.badgePendingFRCText}>
                        {m.frc_status === 'VERIFIED' ? '✔️ VERIFIED' : '⏳ PENDING'}
                      </Text>
                    </View>
                  </View>

                  <View style={{ flex: 1.5, alignItems: 'flex-end' }}>
                    <Text style={[styles.bonusAmountText, { color: m.frc_status === 'VERIFIED' ? '#2E7D32' : '#999' }]}>
                      ₹{m.frc_status === 'VERIFIED' ? 20 : 0}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* ── Section 3: ठेकेदार सूची (PDF Page 1 Table) ── */}
          {(filter === 'all' || filter === 'contractor') && contractorMembers.length > 0 && (
            <View style={styles.sectionBlock}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeading}>ठेकेदार सूची</Text>
                <Text style={styles.sectionCountText}>कुल: {contractorMembers.length}</Text>
              </View>

              {/* Table Header */}
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.thCell, { flex: 2.5 }]}>कंपनी नाम</Text>
                <Text style={[styles.thCell, { flex: 2 }]}>संपर्क व्यक्ति</Text>
                <Text style={[styles.thCell, { flex: 2, textAlign: 'center' }]}>FRC स्टेटस</Text>
                <Text style={[styles.thCell, { flex: 1.5, textAlign: 'right' }]}>बोनस</Text>
              </View>

              {/* Table Rows */}
              {contractorMembers.map((m) => (
                <View key={m.id} style={styles.tableRow}>
                  <View style={{ flex: 2.5 }}>
                    <Text style={styles.rowMainText}>{m.company_name || 'शक्ति कंस्ट्रक्शन'}</Text>
                    <Text style={styles.rowSubText}>{m.category || 'भवन निर्माण'}</Text>
                  </View>

                  <View style={{ flex: 2 }}>
                    <Text style={styles.rowMainText}>{m.name}</Text>
                    <Text style={styles.rowSubText}>{m.phone}</Text>
                  </View>

                  <View style={{ flex: 2, alignItems: 'center' }}>
                    <View style={m.frc_status === 'VERIFIED' ? styles.badgeVerified : styles.badgePendingFRC}>
                      <Text style={m.frc_status === 'VERIFIED' ? styles.badgeVerifiedText : styles.badgePendingFRCText}>
                        {m.frc_status === 'VERIFIED' ? '✔️ VERIFIED' : '⏳ PENDING'}
                      </Text>
                    </View>
                  </View>

                  <View style={{ flex: 1.5, alignItems: 'flex-end' }}>
                    <Text style={[styles.bonusAmountText, { color: m.frc_status === 'VERIFIED' ? '#2E7D32' : '#999' }]}>
                      ₹{m.frc_status === 'VERIFIED' ? 20 : 0}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {data.members.length === 0 && (
            <View style={styles.emptyCard}>
              <Ionicons name="people-outline" size={48} color="#A0A0A0" />
              <Text style={styles.emptyTitle}>कोई सदस्य नहीं मिला</Text>
              <Text style={styles.emptySub}>अपने नेटवर्क में नए सदस्यों को जोड़कर अपनी कमाई शुरू करें।</Text>
              <TouchableOpacity
                style={styles.addMemberEmptyBtn}
                onPress={() => navigation.navigate('AgentAddLaborScreen')}
              >
                <Text style={styles.addMemberEmptyBtnText}>+ नया सदस्य जोड़ें</Text>
              </TouchableOpacity>
            </View>
          )}

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
    fontSize: 17,
    fontWeight: 'bold',
  },
  tabsBar: {
    backgroundColor: '#0D253F',
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingBottom: 10,
    gap: 6,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  tabItemActive: {
    backgroundColor: '#fff',
  },
  tabItemText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
  },
  tabItemTextActive: {
    color: '#0D253F',
    fontWeight: 'bold',
  },
  loadingBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F4F6F9',
  },
  content: {
    flex: 1,
    padding: 12,
    backgroundColor: '#F4F6F9',
  },
  sectionBlock: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0D253F',
  },
  sectionCountText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#F5F7FA',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginBottom: 6,
  },
  thCell: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#555',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  rowMainText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#212121',
  },
  rowSubText: {
    fontSize: 10,
    color: '#777',
    marginTop: 2,
  },
  rowDateText: {
    fontSize: 11,
    color: '#444',
  },
  badgeUnlocked: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  badgeUnlockedText: {
    fontSize: 10,
    color: '#2E7D32',
    fontWeight: 'bold',
  },
  badgePending: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  badgePendingText: {
    fontSize: 10,
    color: '#E65100',
    fontWeight: 'bold',
  },
  badgeVerified: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeVerifiedText: {
    fontSize: 9,
    color: '#2E7D32',
    fontWeight: 'bold',
  },
  badgePendingFRC: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgePendingFRCText: {
    fontSize: 9,
    color: '#E65100',
    fontWeight: 'bold',
  },
  bonusAmountText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 30,
    alignItems: 'center',
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 10,
  },
  emptySub: {
    fontSize: 12,
    color: '#777',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  addMemberEmptyBtn: {
    backgroundColor: '#0D253F',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addMemberEmptyBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
  },
});
