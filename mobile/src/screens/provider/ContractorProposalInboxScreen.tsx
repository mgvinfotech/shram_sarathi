import React, { useCallback, useEffect, useRef, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { Text, Surface, Badge } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { api, getErrorMessage } from '../../services/api';
import { useLanguage } from '../../i18n/LanguageContext';

const PRIMARY = '#FF6B00';
const GREEN = '#1E8E3E';
const RED = '#D93025';

const inr = (n: number) => '₹' + Number(n || 0).toLocaleString('en-IN');

/**
 * Screen 2 (list) — ठेकेदार का इनबॉक्स: प्राप्त प्रस्ताव (V1 broadcast).
 * Directive #1 — 5 second polling se dusre thekedar ka accept hone par card hat jaata hai.
 */
export default function ContractorProposalInboxScreen({ navigation }: any) {
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
      const res = await api.get('/api/contractor/proposal/contractor/inbox');
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
      const t = setInterval(() => load(true), 5000);
      return () => clearInterval(t);
    }, [load])
  );

  const live = rows.filter((r) => r.is_actionable);
  const past = rows.filter((r) => !r.is_actionable);

  const offerBadge = (r: any) => {
    if (r.is_actionable) {
      return { txt: r.offer_status === 'countered' ? T('आपका V' + r.current_version, 'Your V' + r.current_version) : T('नया', 'New'), col: r.offer_status === 'countered' ? '#F29900' : GREEN };
    }
    if (r.offer_status === 'accepted') return { txt: T('स्वीकृत', 'Accepted'), col: GREEN };
    if (r.expiry_reason === 'taken_by_other') return { txt: T('किसी अन्य ने लिया', 'Taken by other'), col: RED };
    if (r.expiry_reason === 'thread_locked') return { txt: T('होल्ड पर', 'On hold'), col: '#5F6368' };
    if (r.expiry_reason === 'timeout' || r.status === 'expired') return { txt: T('वैधता समाप्त', 'Expired'), col: '#5F6368' };
    if (r.offer_status === 'rejected') return { txt: T('अस्वीकृत', 'Rejected'), col: RED };
    return { txt: r.status_label, col: '#5F6368' };
  };

  const Card = ({ item }: { item: any }) => {
    const b = offerBadge(item);
    const dim = !item.is_actionable && item.offer_status !== 'accepted';
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() =>
          navigation.navigate(
            item.contract_id ? 'DigitalContract' : 'ContractProposalDetail',
            { proposalId: item.proposal_id }
          )
        }
      >
        <Surface style={[styles.card, dim && { opacity: 0.62 }]} elevation={1}>
          <View style={styles.cardTop}>
            <Text style={styles.cardTitle}>👷 {item.contractor_type_label}</Text>
            <View style={[styles.pill, { backgroundColor: b.col }]}>
              <Text style={styles.pillTxt}>{b.txt}</Text>
            </View>
          </View>
          <Text style={styles.desc} numberOfLines={2}>{item.work_description}</Text>
          <View style={styles.metaRow}>
            <Text style={styles.amount}>{inr(item.total_amount)}</Text>
            {item.current_version > 1 && (
              <Badge size={20} style={{ backgroundColor: '#F29900' }}>{`V${item.current_version}`}</Badge>
            )}
          </View>
          <View style={styles.infoGrid}>
            <Text style={styles.info}>📍 {item.place || '—'}</Text>
            {item.distance_km != null && <Text style={styles.info}>🛣 {Number(item.distance_km).toFixed(1)} km</Text>}
            <Text style={styles.info}>⏱ {item.duration_days} {T('दिन', 'days')}</Text>
            <Text style={styles.info}>💰 {T('अग्रिम', 'Adv')} {item.advance_percent}%</Text>
            <Text style={styles.info}>🧱 {item.material_label}</Text>
            <Text style={styles.info}>📅 {item.start_date}</Text>
          </View>
          {!!item.contract_id && <Text style={styles.contractId}>🔒 {item.contract_id}</Text>}
          <Text style={styles.cta}>{T('पूरा विवरण देखें ›', 'View full details ›')}</Text>
        </Surface>
      </TouchableOpacity>
    );
  };

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
          <Text style={styles.headerTitle}>{T('प्राप्त प्रस्ताव', 'Received Proposals')}</Text>
          <Text style={styles.headerSub}>
            {T(`${live.length} सक्रिय · ${past.length} पूर्व`, `${live.length} active · ${past.length} past`)}
          </Text>
        </View>
        <View style={{ position: 'relative', paddingHorizontal: 6 }}>
          <Text style={{ fontSize: 22 }}>🔔</Text>
          {live.length > 0 && (
            <Badge size={17} style={{ position: 'absolute', top: -2, right: 0, backgroundColor: RED }}>
              {live.length}
            </Badge>
          )}
        </View>
      </View>

      <FlatList
        data={[...live, ...past]}
        keyExtractor={(i) => String(i.proposal_id)}
        renderItem={Card}
        contentContainerStyle={{ padding: 14, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => { setRefreshing(true); await load(true); setRefreshing(false); }}
            colors={[PRIMARY]} tintColor={PRIMARY}
          />
        }
        ListHeaderComponent={
          live.length > 0 ? (
            <Surface style={styles.notice} elevation={0}>
              <Text style={styles.noticeTxt}>
                🔔 {T('एक ग्राहक ने आपको ठेका कार्य का प्रस्ताव (V1) भेजा है।',
                       'A customer has sent you a contract work proposal (V1).')}
              </Text>
            </Surface>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={{ fontSize: 44 }}>📭</Text>
            <Text style={styles.emptyTxt}>{T('अभी कोई प्रस्ताव नहीं आया।', 'No proposals yet.')}</Text>
            <Text style={styles.emptySub}>
              {T('आपकी श्रेणी एवं क्षेत्र के अनुसार नए प्रस्ताव यहाँ दिखेंगे।',
                 'New proposals matching your skill and area will appear here.')}
            </Text>
          </View>
        }
      />
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

  notice: { backgroundColor: '#FFF4E5', borderRadius: 10, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#FFD8A8' },
  noticeTxt: { fontSize: 12.5, color: '#B45309', fontWeight: '700', lineHeight: 19 },

  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 12 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: 14.5, fontWeight: '800', color: '#1A202C', flex: 1, paddingRight: 8 },
  pill: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  pillTxt: { fontSize: 10, color: '#fff', fontWeight: '800' },
  desc: { fontSize: 12.5, color: '#4A5568', marginTop: 6, lineHeight: 18 },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  amount: { fontSize: 21, fontWeight: '800', color: GREEN },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
  info: { fontSize: 11.5, color: '#5F6368', width: '50%', marginTop: 3 },
  contractId: { fontSize: 11.5, color: '#1B5E20', fontWeight: '800', marginTop: 8 },
  cta: { fontSize: 12, color: PRIMARY, fontWeight: '700', marginTop: 10, textAlign: 'right' },

  empty: { alignItems: 'center', paddingTop: 70, paddingHorizontal: 30 },
  emptyTxt: { fontSize: 15, color: '#2D3748', fontWeight: '700', marginTop: 12 },
  emptySub: { fontSize: 12.5, color: '#718096', marginTop: 6, textAlign: 'center', lineHeight: 19 },
});
