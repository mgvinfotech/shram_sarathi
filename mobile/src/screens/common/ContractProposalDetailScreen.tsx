import React, { useCallback, useEffect, useRef, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import {
  Text, Surface, Button, Divider, Portal, Modal, TextInput, Checkbox, Badge,
} from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { Audio } from 'expo-av';
import { api, getErrorMessage } from '../../services/api';
import { useLanguage } from '../../i18n/LanguageContext';
import SsnTermsSheet from '../../components/SsnTermsSheet';

const PRIMARY = '#FF6B00';
const GREEN = '#1E8E3E';
const RED = '#D93025';
const ORANGE = '#F29900';

const inr = (n: number) => '₹' + Number(n || 0).toLocaleString('en-IN');

/**
 * Screen 2 (ठेकेदार इंटरफेस) + Screen 3 (ग्राहक का रिव्यू / Version Compare).
 * Ek hi screen — jab current_version > 1 hoti hai to comparison table dikhta hai.
 */
export default function ContractProposalDetailScreen({ route, navigation }: any) {
  const proposalId: number = route?.params?.proposalId;
  const { lang } = useLanguage();
  const hi = lang === 'hi';
  const T = (h: string, e: string) => (hi ? h : e);

  const [d, setD] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [secs, setSecs] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);

  // Accept dialog
  const [acceptOpen, setAcceptOpen] = useState(false);
  const [termsRead, setTermsRead] = useState(false);

  // Reject dialog
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // Counter modal
  const [counterOpen, setCounterOpen] = useState(false);
  const [cAmount, setCAmount] = useState('');
  const [cDays, setCDays] = useState('');
  const [cAdv, setCAdv] = useState('');
  const [cNote, setCNote] = useState('');
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [voiceUri, setVoiceUri] = useState<string | null>(null);
  const [voiceUrl, setVoiceUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [sound, setSound] = useState<Audio.Sound | null>(null);

  const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; }, []);
  useEffect(() => () => { if (sound) sound.unloadAsync(); }, [sound]);

  const load = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await api.get(`/api/contractor/proposal/${proposalId}`);
      if (!mounted.current) return;
      setD(res.data);
      setSecs(res.data?.seconds_left ?? null);
    } catch (e) {
      if (!silent) Alert.alert(T('त्रुटि', 'Error'), getErrorMessage(e));
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [proposalId]);

  // Directive #1 — dusre thekedar ne accept kar liya to card turant hat jaaye
  useFocusEffect(
    useCallback(() => {
      mounted.current = true;
      load();
      const t = setInterval(() => load(true), 5000);
      return () => clearInterval(t);
    }, [load])
  );

  // Auto-Expiry countdown (Directive #6)
  useEffect(() => {
    if (secs === null) return;
    const t = setInterval(() => setSecs((s) => (s === null ? null : Math.max(0, s - 1))), 1000);
    return () => clearInterval(t);
  }, [secs === null]);

  const countdown = () => {
    if (secs === null) return null;
    if (secs <= 0) return T('वैधता समाप्त', 'Expired');
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // ─── Actions ──────────────────────────────────────────────────────────────

  const doAccept = async () => {
    if (!termsRead) {
      Alert.alert(T('रुकें', 'Wait'), T('पहले शर्तें पढ़कर टिक करें।', 'Please tick the terms first.'));
      return;
    }
    try {
      setBusy(true);
      const res = await api.post(`/api/contractor/proposal/${proposalId}/accept`, { terms_read: true });
      setAcceptOpen(false);
      setTermsRead(false);
      Alert.alert(
        T('🎉 CONTRACT CREATED', '🎉 CONTRACT CREATED'),
        `${res.data.contract_id}\n\n${res.data.message || ''}`,
        [{ text: T('कॉन्ट्रैक्ट देखें', 'View contract'), onPress: () => navigation.replace('DigitalContract', { proposalId }) }]
      );
    } catch (e: any) {
      setAcceptOpen(false);
      const msg = getErrorMessage(e);
      Alert.alert(
        e?.response?.status === 409 ? T('⌛ Offer Expired', '⌛ Offer Expired') : T('स्वीकार नहीं हो सका', 'Could not accept'),
        msg
      );
      load(true);
    } finally {
      setBusy(false);
    }
  };

  const doReject = async () => {
    try {
      setBusy(true);
      const res = await api.post(`/api/contractor/proposal/${proposalId}/reject`, {
        reason: rejectReason.trim() || undefined,
      });
      setRejectOpen(false);
      setRejectReason('');
      Alert.alert(T('✕ अस्वीकृत', '✕ Rejected'), res.data?.message || T('प्रस्ताव अस्वीकार कर दिया गया।', 'Proposal rejected.'), [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      Alert.alert(T('त्रुटि', 'Error'), getErrorMessage(e));
      load(true);
    } finally {
      setBusy(false);
    }
  };

  const doCancel = () => {
    Alert.alert(
      T('प्रस्ताव रद्द करें?', 'Cancel proposal?'),
      T('अंतिम स्वीकृति से पहले रद्द करने पर कोई शुल्क नहीं लगता।', 'No fee applies when cancelling before final acceptance.'),
      [
        { text: T('नहीं', 'No'), style: 'cancel' },
        {
          text: T('हाँ, रद्द करें', 'Yes, cancel'),
          style: 'destructive',
          onPress: async () => {
            try {
              setBusy(true);
              const res = await api.post(`/api/contractor/proposal/${proposalId}/cancel`, {});
              Alert.alert('🚫', res.data?.message || T('रद्द कर दिया गया।', 'Cancelled.'), [
                { text: 'OK', onPress: () => navigation.goBack() },
              ]);
            } catch (e) {
              Alert.alert(T('त्रुटि', 'Error'), getErrorMessage(e));
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );
  };

  const openCounter = () => {
    setCAmount(String(Math.round(d?.total_amount ?? 0)));
    setCDays(String(d?.duration_days ?? ''));
    setCAdv(String(d?.payment_terms?.[0]?.percent ?? ''));
    setCNote('');
    setVoiceUri(null);
    setVoiceUrl(null);
    setCounterOpen(true);
  };

  const startRec = async () => {
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(T('अनुमति चाहिए', 'Permission needed'), T('माइक की अनुमति दें।', 'Please allow microphone access.'));
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording: rec } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecording(rec);
    } catch (e: any) {
      Alert.alert(T('त्रुटि', 'Error'), e?.message || 'Recording failed');
    }
  };

  const stopRec = async () => {
    if (!recording) return;
    const rec = recording;
    setRecording(null);
    try {
      await rec.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      const uri = rec.getURI();
      if (!uri) return;
      setVoiceUri(uri);
      setUploading(true);
      const form = new FormData();
      form.append('file', { uri, name: 'voice-note.m4a', type: 'audio/m4a' } as any);
      const res = await api.post('/api/contractor/proposal/upload-media', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setVoiceUrl(res.data?.url ?? null);
    } catch (e) {
      Alert.alert(T('वॉइस नोट अपलोड नहीं हुआ', 'Voice note upload failed'), getErrorMessage(e));
      setVoiceUri(null);
    } finally {
      setUploading(false);
    }
  };

  const playVoice = async (uri: string) => {
    try {
      if (sound) {
        await sound.unloadAsync();
        setSound(null);
      }
      const { sound: s } = await Audio.Sound.createAsync({ uri });
      setSound(s);
      await s.playAsync();
    } catch {
      Alert.alert(T('त्रुटि', 'Error'), T('वॉइस नोट नहीं चल सका।', 'Could not play the voice note.'));
    }
  };

  const sendCounter = async () => {
    const amt = parseFloat(cAmount);
    const days = parseInt(cDays, 10);
    const adv = parseFloat(cAdv);
    if (!amt || amt < 1) { Alert.alert(T('त्रुटि', 'Error'), T('कुल राशि दर्ज करें।', 'Enter the total amount.')); return; }
    if (!days || days < 1) { Alert.alert(T('त्रुटि', 'Error'), T('कार्य अवधि दर्ज करें।', 'Enter the duration.')); return; }
    if (isNaN(adv) || adv < 0 || adv > 100) { Alert.alert(T('त्रुटि', 'Error'), T('अग्रिम प्रतिशत 0–100 के बीच हो।', 'Advance percent must be 0–100.')); return; }
    try {
      setBusy(true);
      const res = await api.post(`/api/contractor/proposal/${proposalId}/counter`, {
        total_amount: amt,
        duration_days: days,
        advance_percent: adv,
        note: cNote.trim() || undefined,
        voice_note_url: voiceUrl || undefined,
      });
      setCounterOpen(false);
      Alert.alert(
        T(`📤 संशोधित प्रस्ताव भेजा गया (V${res.data.version})`, `📤 Counter offer sent (V${res.data.version})`),
        res.data?.message || ''
      );
      load(true);
    } catch (e) {
      Alert.alert(T('भेजा नहीं जा सका', 'Could not send'), getErrorMessage(e));
      load(true);
    } finally {
      setBusy(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  if (loading || !d) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={PRIMARY} />
      </SafeAreaView>
    );
  }

  const isContractor = d.role === 'contractor';
  const compareRows = (d.comparison || []).filter((r: any) => r.changed);
  const showCompare = d.has_changes;
  const w = d.wallet;
  const walletShort = isContractor && w && !w.sufficient;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backTxt}>‹</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>
            {showCompare
              ? T(`प्रस्ताव तुलना (V1 ↔ V${d.current_version})`, `Compare (V1 ↔ V${d.current_version})`)
              : T('प्राप्त प्रस्ताव', 'Received Proposal') + ` (V${d.current_version})`}
          </Text>
          <Text style={styles.headerSub}>{d.proposal_code} · {d.status_label}</Text>
        </View>
        <View style={{ position: 'relative' }}>
          <Text style={{ fontSize: 22 }}>🔔</Text>
          {d.current_version > 1 && (
            <Badge size={16} style={{ position: 'absolute', top: -2, right: -4, backgroundColor: RED }}>
              {d.current_version}
            </Badge>
          )}
        </View>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 14, paddingBottom: 140 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => { setRefreshing(true); await load(true); setRefreshing(false); }}
            colors={[PRIMARY]}
            tintColor={PRIMARY}
          />
        }
      >
        {/* Locked → contract ready */}
        {d.status === 'locked' && (
          <Surface style={[styles.banner, { backgroundColor: '#E6F4EA', borderColor: GREEN }]} elevation={0}>
            <Text style={[styles.bannerTxt, { color: '#1B5E20' }]}>
              🔒 {T('कॉन्ट्रैक्ट लॉक हो चुका है', 'Contract is locked')} — {d.contract_id}
            </Text>
            <Button
              mode="contained"
              buttonColor={GREEN}
              style={{ marginTop: 8, borderRadius: 8 }}
              onPress={() => navigation.replace('DigitalContract', { proposalId })}
            >
              📋 {T('डिजिटल कॉन्ट्रैक्ट देखें', 'View Digital Contract')}
            </Button>
          </Surface>
        )}

        {/* Blocked / closed reason */}
        {!!d.block_reason && d.status !== 'locked' && (
          <Surface style={[styles.banner, { backgroundColor: '#FFF8E1', borderColor: ORANGE }]} elevation={0}>
            <Text style={[styles.bannerTxt, { color: '#8D6E00' }]}>⚠️ {d.block_reason}</Text>
          </Surface>
        )}

        {/* Race-condition: kisi aur thekedar ne le liya */}
        {d.thread_taken_by_other && (
          <Surface style={[styles.banner, { backgroundColor: '#FDECEA', borderColor: RED }]} elevation={0}>
            <Text style={[styles.bannerTxt, { color: '#B3261E' }]}>
              ⌛ {T('Offer Expired — यह प्रस्ताव किसी अन्य ठेकेदार के साथ आगे बढ़ चुका है।', 'Offer Expired — taken by another contractor.')}
            </Text>
          </Surface>
        )}

        {/* Wallet (Directive #3) */}
        {isContractor && w && (
          <Surface
            style={[styles.banner, walletShort
              ? { backgroundColor: '#FDECEA', borderColor: RED }
              : { backgroundColor: '#E8F0FE', borderColor: '#1A73E8' }]}
            elevation={0}
          >
            <Text style={[styles.bannerTxt, { color: walletShort ? '#B3261E' : '#174EA6' }]}>
              💳 {T('वॉलेट', 'Wallet')}: {inr(w.balance)} · {T('आवश्यक', 'Required')} ({w.fee_percent}%): {inr(w.required_balance)}
            </Text>
            {walletShort && (
              <>
                <Text style={[styles.bannerSub, { color: '#B3261E' }]}>
                  {T(`पर्याप्त वॉलेट बैलेंस नहीं है। कृपया ${inr(w.missing_amount)} का रिचार्ज करें।`,
                     `Insufficient wallet balance. Please recharge ${inr(w.missing_amount)}.`)}
                </Text>
                <Text style={[styles.bannerSub, { color: '#B3261E', fontSize: 11 }]}>
                  {T('स्वीकार करने या संशोधित प्रस्ताव भेजने के लिए वॉलेट में यह राशि होनी ज़रूरी है (प्लेटफ़ॉर्म शर्त #2)।',
                     'This balance is required before you can accept or send a counter offer (Platform Term #2).')}
                </Text>
              </>
            )}
          </Surface>
        )}

        {/* ── Top Notification Banner (PDF Screen 2 & 3) ── */}
        {d.status !== 'locked' && (
          <Surface style={styles.topAlertCard} elevation={2}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
              <View style={styles.alertIconCircle}>
                <Text style={{ fontSize: 22 }}>🔔</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.alertCardHeading}>
                  {isContractor
                    ? T(`एक ग्राहक ने आपको ठेका कार्य का प्रस्ताव (V${d.current_version}) भेजा है।`,
                        `A customer has sent you a contract work proposal (V${d.current_version}).`)
                    : (d.current_version > 1
                        ? T(`Contractor Counter Proposal – V${d.current_version}`, `Contractor Counter Proposal – V${d.current_version}`)
                        : T(`आपका ठेका प्रस्ताव (V1) सक्रिय है।`, `Your contract proposal (V1) is active.`))}
                </Text>
                <Text style={styles.alertCardSub}>
                  👷 {d.contractor_type_label} · 💰 {inr(d.total_amount)} {d.place ? `· 📍 ${d.place}` : ''}
                </Text>
              </View>
            </View>

            {/* Quick Action Buttons Group right in the alert card */}
            <View style={styles.quickActionGroup}>
              {d.can_accept && (
                <TouchableOpacity
                  style={[styles.quickBtn, { backgroundColor: GREEN }]}
                  disabled={busy}
                  onPress={() => { setTermsRead(false); setAcceptOpen(true); }}
                >
                  <Text style={styles.quickBtnTxt}>☑ {T('प्रस्ताव स्वीकार करें (Accept)', 'Accept Proposal')}</Text>
                </TouchableOpacity>
              )}
              {d.can_counter && (
                <TouchableOpacity
                  style={[styles.quickBtn, { backgroundColor: ORANGE }]}
                  disabled={busy}
                  onPress={openCounter}
                >
                  <Text style={styles.quickBtnTxt}>✏️ {T('प्रस्ताव संशोधित करें (Counter Offer)', 'Counter Offer')}</Text>
                </TouchableOpacity>
              )}
              {d.can_reject && (
                <TouchableOpacity
                  style={[styles.quickBtn, { backgroundColor: RED }]}
                  disabled={busy}
                  onPress={() => setRejectOpen(true)}
                >
                  <Text style={styles.quickBtnTxt}>✕ {T('प्रस्ताव अस्वीकार करें (Reject)', 'Reject')}</Text>
                </TouchableOpacity>
              )}
            </View>
          </Surface>
        )}

        {/* ── Work card (Screen 2) ── */}
        <Surface style={styles.card} elevation={1}>
          <Text style={styles.workTitle}>👷 {T('कार्य', 'Work')}: {d.contractor_type_label}</Text>
          <Text style={styles.workDesc}>{d.work_description}</Text>
          {!!d.work_quantity && (
            <Text style={styles.workMeta}>
              📐 {T('मात्रा', 'Quantity')}: {d.work_quantity} {d.work_unit_label}
            </Text>
          )}
          <Text style={styles.amountBig}>{inr(d.total_amount)}</Text>
          <Text style={styles.workMeta}>📍 {d.site_address}</Text>
          {d.address_locked && (
            <Text style={styles.lockHint}>
              🔒 {T('पूरा पता एवं संपर्क नंबर कॉन्ट्रैक्ट लॉक होने पर दिखेंगे।', 'Full address and phone unlock after contract lock.')}
            </Text>
          )}
        </Surface>

        {/* ── Comparison table (Screen 3) ── */}
        {showCompare && (
          <Surface style={styles.card} elevation={1}>
            <Text style={styles.partTitle}>
              {T(`प्रस्ताव की तुलना — V1 ↔ V${d.current_version}`, `Comparison — V1 ↔ V${d.current_version}`)}
            </Text>
            <View style={styles.tblHead}>
              <Text style={[styles.tblH, { flex: 1.1 }]}>{T('विवरण', 'Detail')}</Text>
              <Text style={[styles.tblH, styles.tblC]}>V1</Text>
              <Text style={[styles.tblH, styles.tblC]}>V{d.current_version}</Text>
            </View>
            {(d.comparison || []).map((r: any) => {
              const col = r.direction === 'up' ? RED : r.direction === 'down' ? GREEN : '#2D3748';
              const arrow = r.direction === 'up' ? ' ↑' : r.direction === 'down' ? ' ↓' : '';
              return (
                <View key={r.key} style={[styles.tblRow, r.changed && { backgroundColor: '#FFFDF5' }]}>
                  <Text style={[styles.tblCell, { flex: 1.1, fontWeight: '600' }]}>{hi ? r.label_hi : r.label_en}</Text>
                  <Text style={[styles.tblCell, styles.tblC, { color: '#5F6368' }]}>{r.base_text}</Text>
                  <Text style={[styles.tblCell, styles.tblC, { color: col, fontWeight: r.changed ? '800' : '400' }]}>
                    {r.latest_text}{arrow}
                  </Text>
                </View>
              );
            })}
            <Text style={styles.tblNote}>
              {compareRows.length === 0
                ? T('(कोई शर्त नहीं बदली)', '(No terms changed)')
                : T('(बाकी सभी शर्तें V1 के अनुसार अपरिवर्तित हैं)', '(All other terms remain as per V1)')}
            </Text>
          </Surface>
        )}

        {/* ── Summary rows ── */}
        <Surface style={styles.card} elevation={1}>
          <Text style={styles.partTitle}>{T('सारांश', 'Summary')}</Text>
          {[
            [T('कुल राशि', 'Total amount'), inr(d.total_amount)],
            [T('अग्रिम', 'Advance'), `${d.payment_terms?.[0]?.percent ?? 0}% · ${inr(d.payment_terms?.[0]?.amount ?? 0)}`],
            [T('कार्य अवधि', 'Duration'), `${d.duration_days} ${T('दिन', 'days')}`],
            [T('सामग्री', 'Material'), d.material_label],
            [T('कार्य प्रारंभ', 'Starts'), `${d.start_date_text} · ${d.start_time}`],
            [T('मूल्य का आधार', 'Price basis'), d.price_basis_label],
            [T('स्थान', 'Place'), d.place || '—'],
          ].map(([k, v], i) => (
            <View key={i} style={styles.sRow}>
              <Text style={styles.sKey}>{k}</Text>
              <Text style={styles.sVal}>{v}</Text>
            </View>
          ))}

          <TouchableOpacity onPress={() => setShowAll(!showAll)} style={{ marginTop: 8 }}>
            <Text style={styles.moreLink}>
              {showAll ? T('‹ कम दिखाएँ', '‹ Show less') : T('पूरा विवरण देखें ›', 'View full details ›')}
            </Text>
          </TouchableOpacity>

          {showAll && (
            <View style={{ marginTop: 10 }}>
              <Divider style={{ marginBottom: 10 }} />
              <Text style={styles.subHead}>{T('भुगतान की शर्तें', 'Payment terms')}</Text>
              {(d.payment_terms || []).map((p: any) => (
                <View key={p.key} style={styles.sRow}>
                  <Text style={styles.sKey}>{p.label}</Text>
                  <Text style={styles.sVal}>{p.percent}% · {inr(p.amount)}</Text>
                </View>
              ))}
              <View style={[styles.sRow, { borderTopWidth: 1, borderTopColor: '#EDF2F7', paddingTop: 6 }]}>
                <Text style={[styles.sKey, { fontWeight: '800' }]}>{T('कुल योग', 'Total')}</Text>
                <Text style={[styles.sVal, { fontWeight: '800', color: GREEN }]}>
                  {d.payment_total?.percent}% · {inr(d.payment_total?.amount ?? 0)}
                </Text>
              </View>

              {!!d.material_details && (
                <>
                  <Text style={styles.subHead}>{T('सामग्री का विवरण', 'Material details')}</Text>
                  <Text style={styles.paraTxt}>{d.material_details}</Text>
                </>
              )}
              {!!d.quality_terms && (
                <>
                  <Text style={styles.subHead}>{T('विशेष गुणवत्ता शर्त', 'Special quality condition')}</Text>
                  <Text style={styles.paraTxt}>{d.quality_terms}</Text>
                </>
              )}
              <Text style={styles.subHead}>{T('अतिरिक्त कार्य', 'Extra work')}</Text>
              <Text style={styles.paraTxt}>
                {d.extra_work_consent
                  ? T('बिना दोनों पक्षों की डिजिटल सहमति के कोई अतिरिक्त कार्य Contract में शामिल नहीं माना जाएगा।',
                       'No extra work is part of the contract without both parties’ digital consent.')
                  : T('कोई विशेष शर्त नहीं।', 'No specific condition.')}
              </Text>
              <TouchableOpacity style={styles.readOnlyBtn} onPress={() => setTermsOpen(true)}>
                <Text style={styles.readOnlyTxt}>📖 {T('प्लेटफ़ॉर्म की स्थायी शर्तें पढ़ें', 'Read platform standard terms')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </Surface>

        {/* ── Version history (Digital Audit Trail) ── */}
        <Surface style={styles.card} elevation={1}>
          <TouchableOpacity onPress={() => setShowHistory(!showHistory)} style={styles.rowBetween}>
            <Text style={styles.partTitle}>
              🧾 {T('Version History Record', 'Version History Record')} ({(d.version_history || []).length})
            </Text>
            <Text style={styles.caret}>{showHistory ? '▴' : '▾'}</Text>
          </TouchableOpacity>
          {showHistory && (d.version_history || []).map((v: any) => (
            <View key={v.version} style={styles.histItem}>
              <View style={styles.rowBetween}>
                <Text style={styles.histV}>
                  V{v.version} {v.is_final ? '★ FINAL' : ''}
                </Text>
                <Text style={styles.histBy}>{v.created_by_label}</Text>
              </View>
              {!!v.total_amount && <Text style={styles.histAmt}>{inr(v.total_amount)}</Text>}
              {!!v.note && <Text style={styles.histNote}>“{v.note}”</Text>}
              {(v.changes || []).map((c: any, i: number) => (
                <Text key={i} style={styles.histChange}>
                  • {hi ? c.label_hi : c.label_en}: {c.from_text} → {c.to_text}
                </Text>
              ))}
              {!!v.voice_note_url && (
                <TouchableOpacity onPress={() => playVoice(v.voice_note_url)} style={styles.voiceRow}>
                  <Text style={{ fontSize: 18, marginRight: 6 }}>▶️</Text>
                  <Text style={styles.voiceTxt}>{T('वॉइस नोट सुनें', 'Play voice note')}</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
          {showHistory && (
            <Text style={styles.tblNote}>
              {T('यह रिकॉर्ड डिजिटल ऑडिट ट्रेल के रूप में सुरक्षित है।', 'This record is retained as a digital audit trail.')}
            </Text>
          )}
        </Surface>

        {/* ── 3 Action buttons ── */}
        {d.status !== 'locked' && (
          <>
            {d.can_accept && (
              <Button
                mode="contained"
                buttonColor={GREEN}
                style={styles.actBtn}
                contentStyle={{ paddingVertical: 6 }}
                labelStyle={styles.actLbl}
                disabled={busy}
                onPress={() => { setTermsRead(false); setAcceptOpen(true); }}
              >
                ☑ {T('प्रस्ताव स्वीकार करें', 'Accept Proposal')} (V{d.current_version})
              </Button>
            )}
            {d.can_counter && (
              <Button
                mode="contained"
                buttonColor={ORANGE}
                style={styles.actBtn}
                contentStyle={{ paddingVertical: 6 }}
                labelStyle={styles.actLbl}
                disabled={busy}
                onPress={openCounter}
              >
                ✏️ {T('प्रस्ताव संशोधित करें', 'Modify Proposal')} (V{d.current_version + 1})
              </Button>
            )}
            {d.can_reject && (
              <Button
                mode="contained"
                buttonColor={RED}
                style={styles.actBtn}
                contentStyle={{ paddingVertical: 6 }}
                labelStyle={styles.actLbl}
                disabled={busy}
                onPress={() => setRejectOpen(true)}
              >
                ✕ {T('प्रस्ताव अस्वीकार करें', 'Reject Proposal')}
              </Button>
            )}
            {d.can_cancel && (
              <Button mode="outlined" textColor={RED} style={[styles.actBtn, { borderColor: RED }]} disabled={busy} onPress={doCancel}>
                🚫 {T('प्रस्ताव रद्द करें', 'Cancel Proposal')}
              </Button>
            )}
            {(d.can_counter || d.can_accept) && (
              <Text style={styles.footNote}>
                💡 {T(
                  'यदि आप संशोधन करेंगे तो नया प्रस्ताव (V' + (d.current_version + 1) + ') बनाकर दूसरे पक्ष को भेजा जाएगा। यह प्रक्रिया तब तक चलेगी जब तक कोई एक पक्ष Accept नहीं करता।',
                  'If you modify, a new version (V' + (d.current_version + 1) + ') is sent to the other party. This continues until one party accepts.'
                )}
              </Text>
            )}
          </>
        )}
      </ScrollView>

      {/* ── FINAL ACCEPTANCE dialog (Screen 4 gate) ── */}
      <Portal>
        <Modal visible={acceptOpen} onDismiss={() => setAcceptOpen(false)} contentContainerStyle={styles.modal}>
          <Text style={styles.modalTitle}>FINAL ACCEPTANCE</Text>
          <Divider style={{ marginVertical: 10 }} />
          <Text style={styles.warnTxt}>
            ⚠️ {T(
              `आप इस प्रस्ताव के नवीनतम संस्करण (V${d.current_version}) को स्वीकार करने जा रहे हैं। इसके बाद दर्ज कार्य, मूल्य, भुगतान एवं समय-सीमा अंतिम सहमत शर्तों के रूप में लॉक हो जाएंगी।`,
              `You are about to accept the latest version (V${d.current_version}). After this, the work, price, payments and timeline lock as the final agreed terms.`
            )}
          </Text>
          <View style={styles.lockBox}>
            <View style={styles.sRow}><Text style={styles.sKey}>{T('कुल राशि', 'Total')}</Text><Text style={styles.sVal}>{inr(d.total_amount)}</Text></View>
            <View style={styles.sRow}><Text style={styles.sKey}>{T('अवधि', 'Duration')}</Text><Text style={styles.sVal}>{d.duration_days} {T('दिन', 'days')}</Text></View>
            <View style={styles.sRow}><Text style={styles.sKey}>{T('अग्रिम', 'Advance')}</Text><Text style={styles.sVal}>{d.payment_terms?.[0]?.percent}%</Text></View>
            {isContractor && (
              <View style={styles.sRow}>
                <Text style={styles.sKey}>{T('प्लेटफ़ॉर्म शुल्क', 'Platform fee')} ({d.fee_percent}%)</Text>
                <Text style={[styles.sVal, { color: RED }]}>− {inr(d.required_fee)}</Text>
              </View>
            )}
          </View>
          <TouchableOpacity style={styles.checkRow} onPress={() => setTermsRead(!termsRead)}>
            <Checkbox status={termsRead ? 'checked' : 'unchecked'} color={PRIMARY} />
            <Text style={styles.checkTxt}>{T('मैंने सभी शर्तें पढ़ ली हैं।', 'I have read all the terms.')}</Text>
          </TouchableOpacity>
          <Text style={styles.tinyNote}>
            {T('एक प्रस्ताव केवल एक ही बार एक ठेकेदार द्वारा स्वीकृत किया जा सकता है।',
               'A proposal can be accepted by only one contractor, only once.')}
          </Text>
          <Button
            mode="contained"
            buttonColor={GREEN}
            style={{ borderRadius: 10, marginTop: 12 }}
            contentStyle={{ paddingVertical: 6 }}
            loading={busy}
            disabled={busy || !termsRead}
            onPress={doAccept}
          >
            FINAL ACCEPTANCE
          </Button>
          <Button mode="text" textColor="#5F6368" onPress={() => setAcceptOpen(false)} disabled={busy}>
            {T('रद्द करें', 'Cancel')}
          </Button>
        </Modal>

        {/* ── Counter Offer modal ── */}
        <Modal visible={counterOpen} onDismiss={() => setCounterOpen(false)} contentContainerStyle={styles.modal}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 60 }}>
            <Text style={styles.modalTitle}>
              ✏️ {T(`प्रस्ताव संशोधित करें (V${d.current_version + 1})`, `Modify Proposal (V${d.current_version + 1})`)}
            </Text>
            <Text style={styles.tinyNote}>
              {T('केवल आवश्यक फ़ील्ड बदलें — बाकी सभी शर्तें V1 के अनुसार बनी रहेंगी।',
                 'Change only the essential fields — all other terms remain as per V1.')}
            </Text>
            <Divider style={{ marginVertical: 12 }} />

            <Text style={styles.fLabel}>{T('कुल ठेका राशि', 'Total contract amount')} *</Text>
            <TextInput
              mode="outlined" dense keyboardType="numeric" value={cAmount} onChangeText={setCAmount}
              left={<TextInput.Affix text="₹" />} style={styles.fInput}
              outlineColor="#E2E8F0" activeOutlineColor={PRIMARY}
            />
            <Text style={styles.fWas}>{T('पहले', 'Was')}: {inr(d.total_amount)}</Text>

            <Text style={styles.fLabel}>{T('कार्य अवधि (दिन)', 'Duration (days)')} *</Text>
            <TextInput
              mode="outlined" dense keyboardType="numeric" value={cDays} onChangeText={setCDays}
              style={styles.fInput} outlineColor="#E2E8F0" activeOutlineColor={PRIMARY}
            />
            <Text style={styles.fWas}>{T('पहले', 'Was')}: {d.duration_days} {T('दिन', 'days')}</Text>

            <Text style={styles.fLabel}>{T('अग्रिम भुगतान (%)', 'Advance payment (%)')} *</Text>
            <TextInput
              mode="outlined" dense keyboardType="numeric" value={cAdv} onChangeText={setCAdv}
              right={<TextInput.Affix text="%" />} style={styles.fInput}
              outlineColor="#E2E8F0" activeOutlineColor={PRIMARY}
            />
            <Text style={styles.fWas}>
              {T('पहले', 'Was')}: {d.payment_terms?.[0]?.percent}% · {T('शेष प्रतिशत सिस्टम स्वयं 100% पर संतुलित करेगा।', 'The system rebalances the rest to 100%.')}
            </Text>

            <Text style={styles.fLabel}>{T('टिप्पणी (वैकल्पिक)', 'Note (optional)')}</Text>
            <TextInput
              mode="outlined" multiline numberOfLines={3} value={cNote} onChangeText={setCNote}
              placeholder={T('जैसे: सरिया के दाम बढ़ गए हैं।', 'e.g. Steel prices have gone up.')}
              style={styles.fInput} outlineColor="#E2E8F0" activeOutlineColor={PRIMARY}
            />

            <Text style={styles.fLabel}>🎤 {T('वॉइस नोट (वैकल्पिक)', 'Voice note (optional)')}</Text>
            {recording ? (
              <Button mode="contained" buttonColor={RED} style={styles.recBtn} onPress={stopRec}>
                ⏹ {T('रिकॉर्डिंग रोकें', 'Stop recording')}
              </Button>
            ) : (
              <Button
                mode="outlined" textColor={PRIMARY} style={[styles.recBtn, { borderColor: PRIMARY }]}
                loading={uploading} disabled={uploading} onPress={startRec}
              >
                🎙️ {voiceUrl ? T('फिर से रिकॉर्ड करें', 'Re-record') : T('रिकॉर्ड करें', 'Record')}
              </Button>
            )}
            {!!voiceUrl && (
              <TouchableOpacity onPress={() => voiceUri && playVoice(voiceUri)} style={styles.voiceRow}>
                <Text style={{ fontSize: 18, marginRight: 6 }}>▶️</Text>
                <Text style={styles.voiceTxt}>{T('वॉइस नोट जुड़ गया — सुनें', 'Voice note attached — play')}</Text>
              </TouchableOpacity>
            )}

            {isContractor && w && !w.sufficient && (
              <Text style={[styles.warnTxt, { color: RED, marginTop: 12 }]}>
                ⚠️ {T(`पर्याप्त वॉलेट बैलेंस नहीं है। कृपया ${inr(w.missing_amount)} का रिचार्ज करें।`,
                       `Insufficient wallet balance. Please recharge ${inr(w.missing_amount)}.`)}
              </Text>
            )}

            <Button
              mode="contained" buttonColor={ORANGE} style={{ borderRadius: 10, marginTop: 14 }}
              contentStyle={{ paddingVertical: 6 }} loading={busy} disabled={busy || uploading} onPress={sendCounter}
            >
              📤 {T('संशोधित प्रस्ताव भेजें', 'Send Counter Offer')} (V{d.current_version + 1})
            </Button>
            <Button mode="text" textColor="#5F6368" onPress={() => setCounterOpen(false)} disabled={busy}>
              {T('रद्द करें', 'Cancel')}
            </Button>
          </ScrollView>
        </Modal>

        {/* ── Reject modal ── */}
        <Modal visible={rejectOpen} onDismiss={() => setRejectOpen(false)} contentContainerStyle={styles.modal}>
          <Text style={styles.modalTitle}>✕ {T('प्रस्ताव अस्वीकार करें', 'Reject Proposal')}</Text>
          <Text style={styles.tinyNote}>
            {T('अंतिम स्वीकृति से पहले अस्वीकार करने पर कोई दंड नहीं लगता।', 'No penalty applies when rejecting before final acceptance.')}
          </Text>
          <TextInput
            mode="outlined" multiline numberOfLines={3} value={rejectReason} onChangeText={setRejectReason}
            label={T('कारण (वैकल्पिक)', 'Reason (optional)')} style={[styles.fInput, { marginTop: 12 }]}
            outlineColor="#E2E8F0" activeOutlineColor={PRIMARY}
          />
          <Button
            mode="contained" buttonColor={RED} style={{ borderRadius: 10, marginTop: 12 }}
            loading={busy} disabled={busy} onPress={doReject}
          >
            {T('अस्वीकार करें', 'Reject')}
          </Button>
          <Button mode="text" textColor="#5F6368" onPress={() => setRejectOpen(false)} disabled={busy}>
            {T('रद्द करें', 'Cancel')}
          </Button>
        </Modal>
      </Portal>

      <SsnTermsSheet visible={termsOpen} onDismiss={() => setTermsOpen(false)} terms={d.ssn_terms} />
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
  headerTitle: { fontSize: 15, fontWeight: '800', color: '#1A202C' },
  headerSub: { fontSize: 11.5, color: '#718096', marginTop: 1 },

  banner: { borderRadius: 10, borderWidth: 1, padding: 12, marginBottom: 12 },
  bannerTxt: { fontSize: 12.5, fontWeight: '700', lineHeight: 19 },
  bannerSub: { fontSize: 12, marginTop: 4, lineHeight: 18 },

  topAlertCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#F59E0B',
    padding: 14,
    marginBottom: 14,
  },
  alertIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertCardHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: '#92400E',
    lineHeight: 20,
  },
  alertCardSub: {
    fontSize: 12,
    color: '#78350F',
    marginTop: 3,
    fontWeight: '600',
  },
  quickActionGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  quickBtn: {
    flex: 1,
    minWidth: 100,
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickBtnTxt: {
    color: '#fff',
    fontSize: 11.5,
    fontWeight: '800',
    textAlign: 'center',
  },

  timerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12,
  },
  timerLabel: { fontSize: 12.5, color: '#4A5568', fontWeight: '600' },
  timerVal: { fontSize: 16, fontWeight: '800', color: '#1A202C', fontVariant: ['tabular-nums'] },

  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 14 },
  partTitle: { fontSize: 13.5, fontWeight: '800', color: PRIMARY, marginBottom: 8 },
  workTitle: { fontSize: 15, fontWeight: '800', color: '#1A202C' },
  workDesc: { fontSize: 13, color: '#2D3748', marginTop: 6, lineHeight: 20 },
  workMeta: { fontSize: 12.5, color: '#4A5568', marginTop: 6 },
  amountBig: { fontSize: 26, fontWeight: '800', color: GREEN, marginTop: 10 },
  lockHint: { fontSize: 11, color: '#B45309', marginTop: 6, lineHeight: 16 },

  tblHead: { flexDirection: 'row', backgroundColor: '#F1F3F5', borderRadius: 6, paddingVertical: 7, paddingHorizontal: 6 },
  tblH: { fontSize: 11.5, fontWeight: '800', color: '#374151' },
  tblC: { flex: 1, textAlign: 'center' },
  tblRow: {
    flexDirection: 'row', paddingVertical: 9, paddingHorizontal: 6,
    borderBottomWidth: 1, borderBottomColor: '#F1F3F5', alignItems: 'center',
  },
  tblCell: { fontSize: 12, color: '#2D3748' },
  tblNote: { fontSize: 11, color: '#718096', marginTop: 8, fontStyle: 'italic', lineHeight: 16 },

  sRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 5 },
  sKey: { fontSize: 12.5, color: '#5F6368', flex: 1, paddingRight: 8 },
  sVal: { fontSize: 12.5, color: '#1A202C', fontWeight: '700', flex: 1, textAlign: 'right' },
  subHead: { fontSize: 12.5, fontWeight: '800', color: '#374151', marginTop: 12, marginBottom: 4 },
  paraTxt: { fontSize: 12, color: '#4A5568', lineHeight: 19 },
  moreLink: { fontSize: 12.5, color: PRIMARY, fontWeight: '700' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  caret: { fontSize: 16, color: '#718096' },

  histItem: { borderLeftWidth: 3, borderLeftColor: PRIMARY, paddingLeft: 10, paddingVertical: 8, marginBottom: 8, backgroundColor: '#FAFBFC', borderRadius: 6 },
  histV: { fontSize: 13, fontWeight: '800', color: '#1A202C' },
  histBy: { fontSize: 11, color: '#718096' },
  histAmt: { fontSize: 13, fontWeight: '700', color: GREEN, marginTop: 2 },
  histNote: { fontSize: 12, color: '#4A5568', fontStyle: 'italic', marginTop: 3 },
  histChange: { fontSize: 11.5, color: '#5F6368', marginTop: 2 },
  voiceRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  voiceTxt: { fontSize: 12, color: '#1A73E8', fontWeight: '600' },

  actBtn: { borderRadius: 10, marginBottom: 10 },
  actLbl: { fontSize: 15, fontWeight: '700' },
  footNote: { fontSize: 11, color: '#718096', textAlign: 'center', marginTop: 6, lineHeight: 17 },

  modal: { backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 14, padding: 18, maxHeight: '88%' },
  modalTitle: { fontSize: 16, fontWeight: '800', color: '#1A202C', textAlign: 'center' },
  warnTxt: { fontSize: 12.5, color: '#8D6E00', lineHeight: 19, backgroundColor: '#FFF8E1', padding: 10, borderRadius: 8 },
  lockBox: { backgroundColor: '#F7FAFC', borderRadius: 8, padding: 10, marginTop: 12 },
  checkRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  checkTxt: { flex: 1, fontSize: 13, color: '#2D3748', fontWeight: '600' },
  tinyNote: { fontSize: 11, color: '#718096', marginTop: 6, lineHeight: 16, textAlign: 'center' },

  fLabel: { fontSize: 12.5, fontWeight: '700', color: '#2D3748', marginTop: 12, marginBottom: 4 },
  fInput: { backgroundColor: '#fff' },
  fWas: { fontSize: 11, color: '#718096', marginTop: 3 },
  recBtn: { borderRadius: 8, marginTop: 4 },

  readOnlyBtn: {
    backgroundColor: '#F7FAFC', borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0',
    paddingVertical: 11, paddingHorizontal: 12, marginTop: 12,
  },
  readOnlyTxt: { fontSize: 12.5, color: '#2B6CB0', fontWeight: '600' },
});
