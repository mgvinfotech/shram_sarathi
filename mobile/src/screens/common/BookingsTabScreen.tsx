import React, { useEffect, useState, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { Text, Surface, ActivityIndicator, Button, SegmentedButtons } from 'react-native-paper';
import { useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../../services/api';
import { useLanguage } from '../../i18n/LanguageContext';
import { RootState } from '../../store';
import { isProviderRole, isCustomerRole } from '../../utils/roleUtils';

type CategoryType = 'transport' | 'labour' | 'contractor' | 'driver' | 'karigar';

export default function BookingsTabScreen({ navigation }: { navigation: any }) {
  const { lang } = useLanguage();
  const { role } = useSelector((s: RootState) => s.auth);

  const [activeTab, setActiveTab] = useState<CategoryType>('transport');
  const [providerTab, setProviderTab] = useState<CategoryType | null>(null);
  const [statusTab, setStatusTab] = useState<'active' | 'history'>('active');
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // डिजिटल ठेका प्रस्ताव (Contract Proposal Engine) — Directive #7: दोनों पक्षों की "माई बुकिंग/इतिहास" में दिखे
  const [proposalStats, setProposalStats] = useState<{ total: number; live: number; locked: number }>({
    total: 0, live: 0, locked: 0,
  });

  const fetchProposalStats = async (isProvider: boolean) => {
    try {
      const url = isProvider
        ? '/api/contractor/proposal/contractor/inbox'
        : '/api/contractor/proposal/customer/list';
      const res = await api.get(url);
      const rows: any[] = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      setProposalStats({
        total: rows.length,
        live: rows.filter(r => ['broadcasted', 'negotiating'].includes(r.status)).length,
        locked: rows.filter(r => r.status === 'locked').length,
      });
    } catch {
      setProposalStats({ total: 0, live: 0, locked: 0 });
    }
  };

  const fetchBookings = async () => {
    try {
      setLoading(true);
      let endpoint = '';
      let currentTab = activeTab;

      if (isProviderRole(role)) {
        let mappedTab = providerTab;
        if (!mappedTab) {
          try {
            const dashRes = await api.get('/api/provider/dashboard');
            if (dashRes.data?.category) {
              if (['taxi', 'transport'].includes(dashRes.data.category)) mappedTab = 'transport';
              else if (['thekedar', 'contractor'].includes(dashRes.data.category)) mappedTab = 'contractor';
              else if (dashRes.data.category === 'driver') mappedTab = 'driver';
              else if (dashRes.data.category === 'karigar') mappedTab = 'karigar';
              else mappedTab = 'labour';

              setProviderTab(mappedTab);
            }
          } catch (e) { }
        }

        currentTab = mappedTab || 'labour'; // fallback

        if (currentTab === 'transport') endpoint = '/api/transport/driver/bookings';
        else if (currentTab === 'driver') endpoint = '/api/driver/provider/history';
        else if (currentTab === 'karigar') endpoint = '/api/karigar/provider/history';
        else if (currentTab === 'labour') endpoint = '/api/labour/provider/history';
        else if (currentTab === 'contractor') endpoint = '/api/contractor/provider/history';
      } else {
        // customer
        if (activeTab === 'transport') endpoint = '/api/transport/customer/bookings';
        else if (activeTab === 'driver') endpoint = '/api/driver/customer/history';
        else if (activeTab === 'karigar') endpoint = '/api/karigar/customer/history';
        else if (activeTab === 'labour') endpoint = '/api/labour/customer/history';
        else if (activeTab === 'contractor') endpoint = '/api/contractor/customer/history';
      }

      if (endpoint) {
        const res = await api.get(endpoint);
        setBookings(res.data || []);
      } else {
        setBookings([]); // Contractor or unhandled category
      }

      // ठेका तब में डिजिटल ठेका प्रस्ताव का सारांश भी लाओ
      if (currentTab === 'contractor') {
        await fetchProposalStats(isProviderRole(role));
      }
    } catch (err) {
      console.log('Error fetching bookings', err);
      setBookings([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchBookings();
    }, [activeTab, role, providerTab])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchBookings();
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed': return '#4CAF50';
      case 'active':
      case 'driver_found':
      case 'booked':
      case 'accepted': return '#3182CE';
      case 'searching':
      case 'pending': return '#D69E2E';
      case 'cancelled':
      case 'rejected':
      case 'penalty': return '#E53E3E';
      default: return '#666';
    }
  };

  const getStatusLabel = (status: string) => {
    const s = status?.toLowerCase();
    if (lang === 'hi') {
      switch (s) {
        case 'completed': return 'पूर्ण';
        case 'active': return 'चल रही है';
        case 'driver_found': return 'ड्राइवर मिल गया';
        case 'booked': return 'कन्फर्म';
        case 'accepted': return 'स्वीकृत';
        case 'searching': return 'खोज रहे हैं';
        case 'pending': return 'पेंडिंग';
        case 'cancelled': return 'रद्द';
        case 'rejected': return 'अस्वीकृत';
        default: return status;
      }
    } else {
      switch (s) {
        case 'driver_found': return 'Driver Found';
        default: return status ? status.charAt(0).toUpperCase() + status.slice(1) : '';
      }
    }
  };

  const filteredBookings = bookings.filter(b => {
    const s = b.status?.toLowerCase();
    const isActive = ['searching', 'pending', 'active', 'driver_found', 'booked', 'accepted', 'call_initiated', 'confirmed'].includes(s);
    if (statusTab === 'active') return isActive;
    return !isActive; // completed, cancelled, rejected, penalty etc.
  });

  const currentActiveTab = isProviderRole(role) ? (providerTab || 'transport') : activeTab;

  const renderTransportCard = (b: any, index: number) => (
    <Surface key={index} style={styles.card} elevation={2}>
      <View style={styles.cardHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ fontSize: 18, marginRight: 8 }}>🚕</Text>
          <Text style={styles.dateText}>{new Date(b.created_at).toLocaleDateString()}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: getStatusColor(b.status) }]}>
          <Text style={styles.badgeText}>{getStatusLabel(b.status)}</Text>
        </View>
      </View>

      <View style={styles.routeBox}>
        <Text style={styles.addressText} numberOfLines={1}>📍 {b.pickup_address}</Text>
        <Text style={styles.addressText} numberOfLines={1}>🏁 {b.drop_address}</Text>
      </View>

      {/* Driver/Customer Info */}
      {(b.driver_name || b.customer_name) && (
        <View style={styles.personRow}>
          <Text style={styles.personName}>
            {isProviderRole(role)
              ? `👤 ${b.customer_name || 'Customer'}`
              : `👨‍✈️ ${b.driver_name || 'Driver'} ${b.vehicle_number ? `(${b.vehicle_number})` : ''}`}
          </Text>
          {b.status === 'completed' && !b.driver_name && (
            <Text style={{ fontSize: 16, color: '#FFD700' }}>
              {b.customer_rating ? Array(b.customer_rating).fill('★').join('') : '☆'}
            </Text>
          )}
        </View>
      )}

      <View style={styles.footerRow}>
        <Text style={styles.fareText}>₹{b.total_fare || b.estimated_fare || 0}</Text>

        {isCustomerRole(role) ? (
          <Button
            mode="outlined"
            textColor="#3182CE"
            style={{ borderColor: '#3182CE' }}
            labelStyle={{ fontSize: 12, marginHorizontal: 12, marginVertical: 4 }}
            onPress={() => navigation.navigate('TransportBooking', { booking_id: b.booking_id || b.id })}
          >
            {lang === 'hi' ? 'विवरण' : 'Details'}
          </Button>
        ) : (
          <Button
            mode="outlined"
            textColor="#3182CE"
            style={{ borderColor: '#3182CE' }}
            labelStyle={{ fontSize: 12, marginHorizontal: 12, marginVertical: 4 }}
            onPress={() => navigation.navigate('VehicleDriverDash')}
          >
            {lang === 'hi' ? 'डैशबोर्ड' : 'Dash'}
          </Button>
        )}
      </View>
    </Surface>
  );

  const renderLabourCard = (b: any, index: number) => {
    const cardEmoji = currentActiveTab === 'karigar' ? '🔧' : currentActiveTab === 'driver' ? '🚗' : currentActiveTab === 'contractor' ? '🏗️' : '👷';
    const cardRoleLabel = currentActiveTab === 'karigar' ? 'Karigar' : currentActiveTab === 'driver' ? 'Driver' : currentActiveTab === 'contractor' ? 'Contractor' : 'Labour';

    return (
      <Surface key={index} style={styles.card} elevation={2}>
        <View style={styles.cardHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ fontSize: 18, marginRight: 8 }}>{cardEmoji}</Text>
            <Text style={styles.dateText}>{new Date(b.created_at).toLocaleDateString()}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: getStatusColor(b.status) }]}>
            <Text style={styles.badgeText}>{getStatusLabel(b.status)}</Text>
          </View>
        </View>

        <View style={styles.routeBox}>
          <Text style={{ fontSize: 15, fontWeight: 'bold', color: '#2D3748', marginBottom: 4 }}>
            {b.labour_type ? b.labour_type.toUpperCase() : (b.karigar_type ? b.karigar_type.toUpperCase() : cardRoleLabel.toUpperCase())}
          </Text>
          <Text style={styles.addressText} numberOfLines={2}>📍 {b.address}</Text>
          {b.description && (
            <Text style={{ fontSize: 13, color: '#718096', marginTop: 4, fontStyle: 'italic' }} numberOfLines={5}>
              "{b.description}"
            </Text>
          )}
        </View>

        {/* Provider/Customer Info */}
        {(b.provider_name || b.customer_name) && (
          <View style={styles.personRow}>
            <Text style={styles.personName}>
              {isProviderRole(role)
                ? `👤 ${b.customer_name || 'Customer'} ${b.customer_phone ? `(📞 ${b.customer_phone})` : ''}`
                : `${cardEmoji} ${b.provider_name || cardRoleLabel} ${b.provider_phone ? `(📞 ${b.provider_phone})` : ''}`}
            </Text>
          </View>
        )}

        {/* Action button if needed */}
        {(isCustomerRole(role) || currentActiveTab === 'contractor') && ['pending', 'searching', 'accepted'].includes(b.status) && (
          <View style={{ alignItems: 'flex-end', marginTop: 8 }}>
            <Button
              mode="text"
              textColor="#E53E3E"
              onPress={() => {
                if (currentActiveTab === 'karigar') {
                  navigation.navigate('KarigarRequestStatus', { job_id: b.job_id || b.id });
                } else if (currentActiveTab === 'driver') {
                  navigation.navigate('DriverRequestStatus', { job_id: b.job_id || b.id });
                } else {
                  navigation.navigate('LabourRequestStatus', { job_id: b.job_id || b.id });
                }
              }}
            >
              {lang === 'hi' ? 'स्टेटस देखें' : 'View Status'}
            </Button>
          </View>
        )}

        {isProviderRole(role) && currentActiveTab !== 'contractor' && b.status === 'searching' && (
          <View style={{ alignItems: 'flex-end', marginTop: 8 }}>
            <Button
              mode="contained"
              buttonColor="#3182CE"
              onPress={() => {
                if (currentActiveTab === 'karigar') {
                  navigation.navigate('KarigarProviderRequest', { job_id: b.job_id || b.id });
                } else if (currentActiveTab === 'driver') {
                  navigation.navigate('DriverProviderRequest', { job_id: b.job_id || b.id });
                } else {
                  navigation.navigate('LabourProviderRequest', { job_id: b.job_id || b.id });
                }
              }}
            >
              {lang === 'hi' ? 'जवाब दें' : 'Respond'}
            </Button>
          </View>
        )}

        {isProviderRole(role) && currentActiveTab === 'contractor' && b.status === 'call_initiated' && (
          <View style={{ alignItems: 'flex-end', marginTop: 8 }}>
            <Button
              mode="contained"
              buttonColor="#2B6CB0"
              onPress={() => navigation.navigate('ContractorDeal', { bookingId: b.job_id || b.id })}
            >
              {lang === 'hi' ? 'डील कन्फर्म करें' : 'Confirm Deal'}
            </Button>
          </View>
        )}
      </Surface>
    );
  };



  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
        {navigation.canGoBack() ? (
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4, width: 40 }}>
            <Text style={{ fontSize: 22, color: '#333' }}>←</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
        <Text style={styles.title}>{lang === 'hi' ? 'मेरी बुकिंग्स' : 'My Bookings'}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs */}
      <View style={{ padding: 16, paddingBottom: 8 }}>
        {!isProviderRole(role) && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            <SegmentedButtons
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as CategoryType)}
              buttons={[
                { value: 'transport', label: lang === 'hi' ? 'परिवहन' : 'Transport', icon: 'car' },
                { value: 'labour', label: lang === 'hi' ? 'मजदूर' : 'Labour', icon: 'hammer' },
                { value: 'karigar', label: lang === 'hi' ? 'कारीगर' : 'Karigar', icon: 'wrench' },
                { value: 'driver', label: lang === 'hi' ? 'ड्राइवर' : 'Driver', icon: 'account-tie' },
                { value: 'contractor', label: lang === 'hi' ? 'ठेकेदार' : 'Contractor', icon: 'office-building' },
              ]}
              theme={{ colors: { secondaryContainer: '#FFEDD5', onSecondaryContainer: '#FF6B00' } }}
            />
          </ScrollView>
        )}

        {/* Status Tabs */}
        <View style={[styles.statusTabsContainer, isProviderRole(role) ? { marginTop: 0 } : {}]}>
          <TouchableOpacity
            style={[styles.statusTab, statusTab === 'active' && styles.statusTabActive]}
            onPress={() => setStatusTab('active')}
          >
            <Text style={[styles.statusTabText, statusTab === 'active' && styles.statusTabTextActive]}>
              {lang === 'hi' ? 'चल रही (Active)' : 'Active / Pending'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.statusTab, statusTab === 'history' && styles.statusTabActive]}
            onPress={() => setStatusTab('history')}
          >
            <Text style={[styles.statusTabText, statusTab === 'history' && styles.statusTabTextActive]}>
              {lang === 'hi' ? 'पुरानी (History)' : 'Completed / History'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* डिजिटल ठेका प्रस्ताव — Directive #7: दोनों पक्षों की माई बुकिंग/इतिहास में उपलब्ध */}
        {currentActiveTab === 'contractor' && (
          <TouchableOpacity
            style={styles.proposalBanner}
            activeOpacity={0.85}
            onPress={() =>
              navigation.navigate(isProviderRole(role) ? 'ContractorProposalInbox' : 'MyContractProposals')
            }
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.proposalBannerTitle}>
                📜 {lang === 'hi' ? 'डिजिटल ठेका प्रस्ताव' : 'Digital Work Contracts'}
              </Text>
              <Text style={styles.proposalBannerSub}>
                {lang === 'hi'
                  ? `${proposalStats.live} सक्रिय · ${proposalStats.locked} लॉक्ड ठेका · प्रमाणपत्र देखें`
                  : `${proposalStats.live} live · ${proposalStats.locked} locked · view certificate`}
              </Text>
            </View>
            <Text style={styles.proposalBannerArrow}>›</Text>
          </TouchableOpacity>
        )}

        {/* ग्राहक के लिए नया प्रस्ताव बनाने का शॉर्टकट */}
        {currentActiveTab === 'contractor' && role !== 'provider' && (
          <Button
            mode="contained"
            buttonColor="#FF6B00"
            style={{ borderRadius: 10, marginTop: 8 }}
            onPress={() => navigation.navigate('ContractProposalCreate')}
          >
            {lang === 'hi' ? '📝 नया ठेका प्रस्ताव बनाएँ (V1)' : '📝 Create New Work Proposal (V1)'}
          </Button>
        )}
      </View>

      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#FF6B00" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {filteredBookings.length === 0 ? (
            <View style={styles.center}>
              <Text style={{ fontSize: 40, marginBottom: 16 }}>📭</Text>
              <Text style={styles.emptyText}>
                {lang === 'hi' ? 'अभी तक कोई बुकिंग नहीं मिली है।' : 'No bookings found yet.'}
              </Text>
            </View>
          ) : (
            filteredBookings.map((b, i) => currentActiveTab === 'transport' ? renderTransportCard(b, i) : renderLabourCard(b, i))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: {
    padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee',
    alignItems: 'center'
  },
  title: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 80 },
  emptyText: { fontSize: 16, color: '#666', textAlign: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  dateText: { fontSize: 14, color: '#666', fontWeight: '500' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  routeBox: { backgroundColor: '#F7FAFC', padding: 12, borderRadius: 8, marginBottom: 12 },
  addressText: { fontSize: 13, color: '#4A5568', marginVertical: 2 },
  personRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  personName: { fontSize: 14, color: '#2B6CB0', fontWeight: '600' },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  fareText: { fontSize: 18, fontWeight: 'bold', color: '#276749' },
  statusTabsContainer: {
    flexDirection: 'row',
    marginTop: 16,
    backgroundColor: '#EDF2F7',
    borderRadius: 8,
    padding: 4,
  },
  statusTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  statusTabActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statusTabText: {
    fontSize: 14,
    color: '#718096',
    fontWeight: '500',
  },
  statusTabTextActive: {
    color: '#FF6B00',
    fontWeight: 'bold',
  },
  proposalBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFF7ED', borderWidth: 1, borderColor: '#FFD8A8',
    borderRadius: 12, padding: 12, marginTop: 12,
  },
  proposalBannerTitle: { fontSize: 14, fontWeight: 'bold', color: '#C2410C' },
  proposalBannerSub: { fontSize: 11, color: '#8A5A2B', marginTop: 2 },
  proposalBannerArrow: { fontSize: 26, color: '#C2410C', marginLeft: 8 },
});
