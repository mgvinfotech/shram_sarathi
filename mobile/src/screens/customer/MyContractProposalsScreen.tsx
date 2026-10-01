import React, { useCallback, useEffect, useRef, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { Text, Surface, Button, Badge } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { api, getErrorMessage } from '../../services/api';
import { useLanguage } from '../../i18n/LanguageContext';

const PRIMARY = '#FF6B00';
const GREEN = '#1E8E3E';
const RED = '#D93025';

const inr = (n: number) => '₹' + Number(n || 0).toLocaleString('en-IN');

const STATUS_COLOR: Record<string, string> = {
  broadcasted: '#1A73E8',
  negotiating: '#F29900',
  locked: GREEN,
  rejected: RED,
  expired: '#5F6368',
  cancelled: '#5F6368',
  draft: '#5F6368',
};

/**
 * ग्राहक की "माई बुकिंग / इतिहास" — भेजे गए ठेका प्रस्ताव (V1 … VN) एवं लॉक कॉन्ट्रैक्ट.
 */
export default function MyContractProposalsScreen({ navigation }: any) {
  const { lang } = useLanguage();
  const hi = lang === 'hi';
  const T = (h: string, e: string) => (hi ? h : e);

  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const mounted = useRef(true);

  useEffect(() => () => { mounted.current = false; }, []);

  const load = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await api.get('/api/contractor/proposal/customer/list');
      if (!mounted.current) return;
      setRows(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      if (!silent) Alert.alert(T('त्रुटि', 'Error'), getErrorMessage(e));
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      mounted.current = true;
      load();
      const t = setInterval(() => load(true), 8000);
      return () => clearInterval(t);
    }, [load])
  );

  const activeCount = rows.filter((r) => r.status === 'broadcasted' || r.status === 'negotiating').length;

  const Card = ({ item }: { item: any }) => (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() =>
        navigation.navigate(
          item.status === 'locked' ? 'DigitalContract' : 'ContractProposalDetail',
          { proposalId: item.proposal_id }
        )
      }
    >
      <Surface style={styles.card} elevation={1}>
        <View style={styles.cardTop}>
          <Text style={styles.cardTitle}>👷 {item.contractor_type_label}</Text>
          <View style={[styles.pill, { backgroundColor: STATUS_COLOR[item.status] ?? '#5F6368' }]}>
            <Text style={styles.pillTxt}>{item.status_label}</Text>
          </View>
        </View>
        <Text style={styles.code}>{item.proposal_code}</Text>
        <Text style={styles.desc} numberOfLines={2}>{item.work_description}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.amount}>{inr(item.total_amount)}</Text>
          <Badge size={20} style={{ backgroundColor: item.current_version > 1 ? '#F29900' : '#A0AEC0' }}>
            {`V${item.current_version}`}
          </Badge>
        </View>
        <View style={styles.infoGrid}>
          <Text style={styles.info}>⏱ {item.duration_days} {T('दिन', 'days')}</Text>
          <Text style={styles.info}>💰 {T('अग्रिम', 'Adv')} {item.advance_percent}%</Text>
          <Text style={styles.info}>🧱 {item.material_label}</Text>
          <Text style={styles.info}>📅 {item.start_date}</Text>
          <Text style={styles.info}>👤 {item.counterparty}</Text>
          <Text style={styles.info}>📍 {item.place || '—'}</Text>
        </View>
        {!!item.contract_id && <Text style={styles.contractId}>🔒 {item.contract_id}</Text>}
        {item.status === 'negotiating' && (
          <Text style={styles.needAction}>
            ⚠️ {T('ठेकेदार का संशोधित प्रस्ताव आया है — रिव्यू करें।', 'Contractor sent a counter offer — review it.')}
          </Text>
        )}
        <Text style={styles.cta}>{T('पूरा विवरण देखें ›', 'View full details ›')}</Text>
      </Surface>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={PRIMARY} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backTxt}>‹</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{T('मेरे ठेका प्रस्ताव', 'My Contract Proposals')}</Text>
          <Text style={styles.headerSub}>
            {T(`${rows.length} कुल · ${activeCount} सक्रिय`, `${rows.length} total · ${activeCount} active`)}
          </Text>
        </View>
      </View>

      <FlatList
        data={rows}
        keyExtractor={(i) => String(i.proposal_id)}
        renderItem={Card}
        contentContainerStyle={{ padding: 14, paddingBottom: 96 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => { setRefreshing(true); await load(true); setRefreshing(false); }}
            colors={[PRIMARY]} tintColor={PRIMARY}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={{ fontSize: 44 }}>📝</Text>
            <Text style={styles.emptyTxt}>{T('अभी कोई प्रस्ताव नहीं बनाया।', 'No proposals yet.')}</Text>
            <Text style={styles.emptySub}>
              {T('ठेका कार्य का प्रस्ताव बनाकर आस-पास के सभी ठेकेदारों को एक साथ भेजें।',
                 'Create a contract work proposal and broadcast it to all nearby contractors at once.')}
            </Text>
          </View>
        }
      />

      <View style={styles.fabWrap}>
        <Button
          mode="contained"
          buttonColor={PRIMARY}
          style={{ borderRadius: 12 }}
          contentStyle={{ paddingVertical: 8 }}
          labelStyle={{ fontSize: 15, fontWeight: '700' }}
          onPress={() => navigation.navigate('ContractProposalCreate')}
        >
          + {T('नया ठेका प्रस्ताव बनाएँ', 'New Contract Proposal')}
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8F9FA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F9FA' },
  header: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 3, borderBottomColor: PRIMARY,
  },
  backBtn: { paddingHorizontal: 8 },
  backTxt: { fontSize: 30, color: '#333', lineHeight: 32 },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#1A202C' },
  headerSub: { fontSize: 11.5, color: '#718096', marginTop: 1 },

  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 12 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: 14.5, fontWeight: '800', color: '#1A202C', flex: 1, paddingRight: 8 },
  pill: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, maxWidth: 150 },
  pillTxt: { fontSize: 10, color: '#fff', fontWeight: '800' },
  code: { fontSize: 10.5, color: '#A0AEC0', marginTop: 2 },
  desc: { fontSize: 12.5, color: '#4A5568', marginTop: 6, lineHeight: 18 },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  amount: { fontSize: 21, fontWeight: '800', color: GREEN },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
  info: { fontSize: 11.5, color: '#5F6368', width: '50%', marginTop: 3 },
  contractId: { fontSize: 11.5, color: '#1B5E20', fontWeight: '800', marginTop: 8 },
  needAction: { fontSize: 11.5, color: '#B45309', fontWeight: '700', marginTop: 8, lineHeight: 17 },
  cta: { fontSize: 12, color: PRIMARY, fontWeight: '700', marginTop: 10, textAlign: 'right' },

  empty: { alignItems: 'center', paddingTop: 70, paddingHorizontal: 30 },
  emptyTxt: { fontSize: 15, color: '#2D3748', fontWeight: '700', marginTop: 12 },
  emptySub: { fontSize: 12.5, color: '#718096', marginTop: 6, textAlign: 'center', lineHeight: 19 },

  fabWrap: { position: 'absolute', left: 14, right: 14, bottom: 18 },
});
