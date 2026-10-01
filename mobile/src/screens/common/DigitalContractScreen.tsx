import React, { useCallback, useEffect, useRef, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Linking, RefreshControl, Platform, KeyboardAvoidingView,
} from 'react-native';
import { Text, Surface, Button, Divider, Portal, Modal, TextInput, Checkbox } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { api, getErrorMessage } from '../../services/api';
import { useLanguage } from '../../i18n/LanguageContext';
import SsnTermsSheet from '../../components/SsnTermsSheet';

const PRIMARY = '#FF6B00';
const GREEN = '#1E8E3E';
const RED = '#D93025';

const inr = (n: number) => '₹' + Number(n || 0).toLocaleString('en-IN');

/**
 * Screen 4 — 📋 DIGITAL WORK CONTRACT (Read-Only) + Agreement upload + Amendment.
 */
export default function DigitalContractScreen({ route, navigation }: any) {
  const proposalId: number = route?.params?.proposalId;
  const { lang } = useLanguage();
  const hi = lang === 'hi';
  const T = (h: string, e: string) => (hi ? h : e);

  const [d, setD] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Amendment
  const [amdOpen, setAmdOpen] = useState(false);
  const [aAmount, setAAmount] = useState('');
  const [aDays, setADays] = useState('');
  const [aReason, setAReason] = useState('');
  const [aConsent, setAConsent] = useState(false);

  const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; }, []);

  const load = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await api.get(`/api/contractor/proposal/${proposalId}`);
      if (!mounted.current) return;
      setD(res.data);
    } catch (e) {
      if (!silent) Alert.alert(T('त्रुटि', 'Error'), getErrorMessage(e));
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [proposalId]);

  useFocusEffect(useCallback(() => { mounted.current = true; load(); }, [load]));

  const openUrl = async (url?: string | null) => {
    if (!url) return;
    try {
      const ok = await Linking.canOpenURL(url);
      if (ok) await Linking.openURL(url);
      else Alert.alert(T('त्रुटि', 'Error'), T('लिंक नहीं खुल सका।', 'Could not open the link.'));
    } catch {
      Alert.alert(T('त्रुटि', 'Error'), T('लिंक नहीं खुल सका।', 'Could not open the link.'));
    }
  };

  const uploadAgreement = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(T('अनुमति चाहिए', 'Permission needed'), T('गैलरी की अनुमति दें।', 'Please allow gallery access.'));
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      });
      if (res.canceled || !res.assets?.length) return;
      const a = res.assets[0];
      setBusy(true);
      const form = new FormData();
      form.append('file', {
        uri: a.uri,
        name: a.fileName || 'agreement.jpg',
        type: a.mimeType || 'image/jpeg',
      } as any);
      const up = await api.post(`/api/contractor/proposal/${proposalId}/agreement`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      Alert.alert('📎', up.data?.message || T('Agreement अपलोड हो गया।', 'Agreement uploaded.'));
      load(true);
    } catch (e) {
      Alert.alert(T('अपलोड नहीं हुआ', 'Upload failed'), getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const openAmendment = () => {
    setAAmount(String(Math.round(d?.total_amount ?? 0)));
    setADays(String(d?.duration_days ?? ''));
    setAReason('');
    setAConsent(false);
    setAmdOpen(true);
  };

  const sendAmendment = async () => {
    if (!aReason.trim()) {
      Alert.alert(T('रुकें', 'Wait'), T('परिवर्तन का कारण लिखें।', 'Please write the reason for the change.'));
      return;
    }
    if (!aConsent) {
      Alert.alert(T('रुकें', 'Wait'), T('सहमति पर टिक करें।', 'Please tick the consent box.'));
      return;
    }
    // Sirf badle hue fields bhejo — backend kam se kam ek parivartan maangta hai
    const payload: any = { reason: aReason.trim() };
    const amt = parseFloat(aAmount);
    const days = parseInt(aDays, 10);
    if (!isNaN(amt) && Math.abs(amt - Number(d.total_amount)) > 0.001) payload.total_amount = amt;
    if (!isNaN(days) && days !== Number(d.duration_days)) payload.duration_days = days;
    if (Object.keys(payload).length === 1) {
      Alert.alert(
        T('कोई परिवर्तन नहीं', 'No change'),
        T('कम से कम एक शर्त (राशि या अवधि) बदलें।', 'Change at least one term (amount or duration).')
      );
      return;
    }
    try {
      setBusy(true);
      const res = await api.post(`/api/contractor/proposal/${proposalId}/amendment`, payload);
      setAmdOpen(false);
      Alert.alert('🔄', res.data?.message || T('परिवर्तन अनुरोध भेजा गया।', 'Amendment request sent.'));
      load(true);
    } catch (e) {
      Alert.alert(T('त्रुटि', 'Error'), getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const respondAmendment = (approve: boolean) => {
    Alert.alert(
      approve ? T('परिवर्तन स्वीकार करें?', 'Approve amendment?') : T('परिवर्तन अस्वीकार करें?', 'Reject amendment?'),
      approve
        ? T('स्वीकार करने पर कॉन्ट्रैक्ट की शर्तें अपडेट हो जाएंगी। कोई अतिरिक्त 2% शुल्क नहीं लगेगा।',
             'On approval the contract terms update. No extra 2% fee is charged.')
        : T('अनुरोध अस्वीकार हो जाएगा और मूल शर्तें बनी रहेंगी।', 'The request will be rejected and the original terms remain.'),
      [
        { text: T('नहीं', 'No'), style: 'cancel' },
        {
          text: T('हाँ', 'Yes'),
          onPress: async () => {
            try {
              setBusy(true);
              const res = await api.post(`/api/contractor/proposal/${proposalId}/amendment/respond`, {
                decision: approve ? 'approve' : 'reject',
              });
              Alert.alert(approve ? '✅' : '✕', res.data?.message || '');
              load(true);
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

  if (loading || !d) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={PRIMARY} />
      </SafeAreaView>
    );
  }

  // Lock nahi hua — user galti se yahan aa gaya
  if (d.status !== 'locked') {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backTxt}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{T('डिजिटल कॉन्ट्रैक्ट', 'Digital Contract')}</Text>
        </View>
        <View style={styles.center}>
          <Text style={{ fontSize: 40 }}>🔓</Text>
          <Text style={styles.emptyTxt}>
            {T('यह प्रस्ताव अभी लॉक नहीं हुआ है।', 'This proposal is not locked yet.')}
          </Text>
          <Text style={styles.emptySub}>{d.status_label}</Text>
          <Button
            mode="contained" buttonColor={PRIMARY} style={{ marginTop: 16, borderRadius: 8 }}
            onPress={() => navigation.replace('ContractProposalDetail', { proposalId })}
          >
            {T('प्रस्ताव खोलें', 'Open proposal')}
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  const cust = d.customer || {};
  const conr = d.contractor || {};

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backTxt}>‹</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>DIGITAL WORK CONTRACT</Text>
          <Text style={styles.headerSub}>Read-Only · {d.proposal_code}</Text>
        </View>
        <View style={styles.lockPill}>
          <Text style={styles.lockPillTxt}>🔒 LOCKED</Text>
        </View>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 14, paddingBottom: 140 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => { setRefreshing(true); await load(true); setRefreshing(false); }}
            colors={[PRIMARY]} tintColor={PRIMARY}
          />
        }
      >
        {/* 🎉 CONTRACT CREATED */}
        <Surface style={styles.heroCard} elevation={2}>
          <Text style={styles.heroEmoji}>🎉</Text>
          <Text style={styles.heroTitle}>{T('कॉन्ट्रैक्ट बन गया', 'CONTRACT CREATED')}</Text>
          <Text style={styles.heroId}>{d.contract_id}</Text>
          <Text style={styles.heroSub}>
            {T('अंतिम संस्करण', 'Final Version')}: V{d.final_version ?? d.current_version}
          </Text>
          <View style={styles.readOnlyLegalBox}>
            <Text style={styles.readOnlyLegalTxt}>
              📋 {T('DIGITAL WORK CONTRACT (Read-Only Mode)', 'DIGITAL WORK CONTRACT (Read-Only Mode)')}
            </Text>
            <Text style={styles.readOnlyLegalSub}>
              {T(
                'अब पूरा फ़ॉर्म एक विधिक दस्तावेज़ में बदल चुका है जिसे कोई एकतरफ़ा नहीं बदल सकता।',
                'The proposal has transformed into a legally binding digital work contract that cannot be altered unilaterally.'
              )}
            </Text>
          </View>
        </Surface>

        {/* 📋 Contract body */}
        <Surface style={styles.card} elevation={1}>
          <Text style={styles.partTitle}>📋 {T('अंतिम सहमत शर्तें', 'Final Agreed Terms')}</Text>
          {[
            ['Contract ID', d.contract_id],
            [T('अंतिम संस्करण', 'Final Version'), `V${d.final_version ?? d.current_version}`],
            [T('ठेकेदार का प्रकार', 'Contractor Type'), d.contractor_type_label],
            [T('कार्य', 'Work'), d.work_description],
            ...(d.work_quantity ? [[T('मात्रा', 'Quantity'), `${d.work_quantity} ${d.work_unit_label}`]] : []),
            [T('कुल राशि', 'Total Amount'), inr(d.total_amount)],
            [T('अग्रिम', 'Advance'), `${d.payment_terms?.[0]?.percent}% · ${inr(d.payment_terms?.[0]?.amount ?? 0)}`],
            [T('कार्य अवधि', 'Duration'), `${d.duration_days} ${T('दिन', 'days')}`],
            [T('कार्य प्रारंभ', 'Starts'), `${d.start_date_text} · ${d.start_time}`],
            [T('सामग्री', 'Material'), d.material_label],
            [T('मूल्य का आधार', 'Price Basis'), d.price_basis_label],
            [T('स्थान', 'Location'), d.site_address],
            [T('लॉक समय', 'Locked at'), d.locked_at ? new Date(d.locked_at).toLocaleString('en-IN') : '—'],
          ].map(([k, v], i) => (
            <View key={i} style={styles.sRow}>
              <Text style={styles.sKey}>{k as string}</Text>
              <Text style={styles.sVal}>{(v as string) || '—'}</Text>
            </View>
          ))}
        </Surface>

        {/* भुगतान शर्तें */}
        <Surface style={styles.card} elevation={1}>
          <Text style={styles.partTitle}>💰 {T('भुगतान की शर्तें', 'Payment Terms')}</Text>
          {(d.payment_terms || []).map((p: any) => (
            <View key={p.key} style={styles.sRow}>
              <Text style={styles.sKey}>{p.label}</Text>
              <Text style={styles.sVal}>{p.percent}% · {inr(p.amount)}</Text>
            </View>
          ))}
          <Divider style={{ marginVertical: 8 }} />
          <View style={styles.sRow}>
            <Text style={[styles.sKey, { fontWeight: '800' }]}>{T('कुल योग', 'Total')}</Text>
            <Text style={[styles.sVal, { color: GREEN, fontWeight: '800' }]}>
              {d.payment_total?.percent}% · {inr(d.payment_total?.amount ?? 0)}
            </Text>
          </View>
          <Text style={styles.note}>
            {T('भुगतान सीधे दोनों पक्षों के बीच होगा (Direct Settlement)।', 'Payments settle directly between the parties.')}
          </Text>
        </Surface>

        {/* संपर्क विवरण — अनलॉक */}
        <Surface style={styles.card} elevation={1}>
          <Text style={styles.partTitle}>
            🔓 {T('संपर्क विवरण (अनलॉक)', 'Contact Details (Unlocked)')}
          </Text>
          <View style={styles.partyRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.partyRole}>{T('ग्राहक', 'Customer')}</Text>
              <Text style={styles.partyName}>{cust.name}</Text>
              {!!cust.phone && (
                <TouchableOpacity onPress={() => openUrl(`tel:${cust.phone}`)}>
                  <Text style={styles.partyPhone}>📞 {cust.phone}</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.partyRole}>{T('ठेकेदार', 'Contractor')}</Text>
              <Text style={styles.partyName}>{conr.name}</Text>
              {!!conr.phone && (
                <TouchableOpacity onPress={() => openUrl(`tel:${conr.phone}`)}>
                  <Text style={styles.partyPhone}>📞 {conr.phone}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
          {d.role === 'contractor' && !!d.platform_fee && (
            <Text style={styles.note}>
              💳 {T(`प्लेटफ़ॉर्म शुल्क ${inr(d.platform_fee)} (${d.fee_percent}%) आपके वॉलेट से काट लिया गया है।`,
                     `Platform fee ${inr(d.platform_fee)} (${d.fee_percent}%) was debited from your wallet.`)}
            </Text>
          )}
        </Surface>

        {/* Amendment (परिवर्तन) */}
        {d.amendment_status === 'requested' && (
          <Surface style={[styles.card, { borderWidth: 1, borderColor: '#F29900' }]} elevation={1}>
            <Text style={styles.partTitle}>🔄 {T('परिवर्तन अनुरोध', 'Amendment Request')}</Text>
            <Text style={styles.note}>{d.amendment_reason}</Text>
            {!!d.amendment_payload && (
              <View style={{ marginTop: 8 }}>
                {Object.entries(d.amendment_payload).map(([k, v]) => (
                  <View key={k} style={styles.sRow}>
                    <Text style={styles.sKey}>{k}</Text>
                    <Text style={styles.sVal}>{String(v)}</Text>
                  </View>
                ))}
              </View>
            )}
            {d.can_respond_amendment ? (
              <View style={{ flexDirection: 'row', marginTop: 12 }}>
                <Button
                  mode="contained" buttonColor={GREEN} style={{ flex: 1, marginRight: 8, borderRadius: 8 }}
                  disabled={busy} onPress={() => respondAmendment(true)}
                >
                  ☑ {T('स्वीकार', 'Approve')}
                </Button>
                <Button
                  mode="contained" buttonColor={RED} style={{ flex: 1, borderRadius: 8 }}
                  disabled={busy} onPress={() => respondAmendment(false)}
                >
                  ✕ {T('अस्वीकार', 'Reject')}
                </Button>
              </View>
            ) : (
              <Text style={styles.note}>
                ⏳ {T('दूसरे पक्ष की सहमति का इंतज़ार है।', 'Waiting for the other party’s consent.')}
              </Text>
            )}
          </Surface>
        )}

        {/* Version History (legal evidence) */}
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
                <Text style={styles.histV}>V{v.version} {v.is_final ? '★ FINAL' : ''}</Text>
                <Text style={styles.histBy}>{v.created_by_label}</Text>
              </View>
              {!!v.total_amount && <Text style={styles.histAmt}>{inr(v.total_amount)}</Text>}
              {!!v.note && <Text style={styles.histNote}>“{v.note}”</Text>}
              {(v.changes || []).map((c: any, i: number) => (
                <Text key={i} style={styles.histChange}>
                  • {hi ? c.label_hi : c.label_en}: {c.from_text} → {c.to_text}
                </Text>
              ))}
            </View>
          ))}
          {showHistory && (
            <Text style={styles.note}>
              {T('यह रिकॉर्ड भारतीय साक्ष्य अधिनियम के अंतर्गत डिजिटल ऑडिट ट्रेल के रूप में मान्य है।',
                 'This record serves as a digital audit trail under the Indian Evidence Act.')}
            </Text>
          )}
        </Surface>

        {/* Certificate + Agreement */}
        <Surface style={styles.card} elevation={1}>
          <Text style={styles.partTitle}>📄 {T('दस्तावेज़', 'Documents')}</Text>
          <Button
            mode="contained" buttonColor={PRIMARY} style={{ borderRadius: 8, marginTop: 4 }}
            contentStyle={{ paddingVertical: 4 }} disabled={!d.certificate_url}
            onPress={() => openUrl(d.certificate_url)}
          >
            📥 {T('डिजिटल कॉन्ट्रैक्ट प्रमाणपत्र देखें', 'View Digital Contract Certificate')}
          </Button>
          <Text style={styles.note}>
            {T('वॉटरमार्क युक्त प्रमाणपत्र — ब्राउज़र में खुलेगा, वहीं से PDF सेव/प्रिंट कर सकते हैं।',
               'Watermarked certificate — opens in the browser where you can save or print it as PDF.')}
          </Text>

          <Divider style={{ marginVertical: 12 }} />

          {d.agreement_url ? (
            <>
              <Button
                mode="outlined" textColor={GREEN} style={{ borderRadius: 8, borderColor: GREEN }}
                onPress={() => openUrl(d.agreement_url)}
              >
                📎 {T('अपलोड किया गया विस्तृत Agreement देखें', 'View uploaded detailed Agreement')}
              </Button>
              <Button mode="text" textColor={PRIMARY} loading={busy} disabled={busy} onPress={uploadAgreement}>
                {T('बदलें / फिर अपलोड करें', 'Replace / re-upload')}
              </Button>
            </>
          ) : (
            <>
              <Button
                mode="outlined" textColor={PRIMARY} style={{ borderRadius: 8, borderColor: PRIMARY }}
                loading={busy} disabled={busy} onPress={uploadAgreement}
              >
                📤 {T('विस्तृत Agreement Upload करें (वैकल्पिक)', 'Upload detailed Agreement (optional)')}
              </Button>
              <Text style={styles.note}>
                {T('यदि आपने ₹100–500 के स्टाम्प पेपर पर अलग एग्रीमेंट बनाया है तो उसकी फ़ोटो यहाँ अपलोड करें।',
                   'If you executed a separate ₹100–500 stamp-paper agreement, upload its photo here.')}
              </Text>
            </>
          )}
        </Surface>

        {/* Terms + Amendment CTA */}
        <TouchableOpacity style={styles.readOnlyBtn} onPress={() => setTermsOpen(true)}>
          <Text style={styles.readOnlyTxt}>📖 {T('प्लेटफ़ॉर्म की स्थायी शर्तें पढ़ें', 'Read platform standard terms')}</Text>
        </TouchableOpacity>

        {d.can_request_amendment && (
          <Button
            mode="outlined" textColor="#B45309" style={{ borderRadius: 8, borderColor: '#F29900', marginTop: 12 }}
            disabled={busy} onPress={openAmendment}
          >
            🔄 {T('परिवर्तन (Amendment) का अनुरोध करें', 'Request an Amendment')}
          </Button>
        )}

        <Text style={styles.footNote}>
          {T('विवाद की स्थिति में SOS सहायता टीम से संपर्क करें। यह कॉन्ट्रैक्ट दोनों पक्षों की "माई बुकिंग / इतिहास" में सुरक्षित है।',
             'In case of a dispute, contact the SOS support team. This contract is stored in both parties’ bookings history.')}
        </Text>
      </ScrollView>

      {/* Amendment modal */}
      <Portal>
        <Modal visible={amdOpen} onDismiss={() => setAmdOpen(false)} contentContainerStyle={styles.modal}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>🔄 {T('परिवर्तन का अनुरोध', 'Amendment Request')}</Text>
              <Text style={styles.tinyNote}>
                {T('लॉक हुए कॉन्ट्रैक्ट में बदलाव दोनों पक्षों की सहमति से ही संभव है। कोई अतिरिक्त 2% शुल्क नहीं लगेगा।',
                   'A locked contract can change only with both parties’ consent. No extra 2% fee is charged.')}
              </Text>
              <Divider style={{ marginVertical: 12 }} />
              <Text style={styles.fLabel}>{T('नई कुल राशि', 'New total amount')}</Text>
              <TextInput
                mode="outlined" dense keyboardType="numeric" value={aAmount} onChangeText={setAAmount}
                left={<TextInput.Affix text="₹" />} style={styles.fInput}
                outlineColor="#E2E8F0" activeOutlineColor={PRIMARY}
              />
              <Text style={styles.fLabel}>{T('नई कार्य अवधि (दिन)', 'New duration (days)')}</Text>
              <TextInput
                mode="outlined" dense keyboardType="numeric" value={aDays} onChangeText={setADays}
                style={styles.fInput} outlineColor="#E2E8F0" activeOutlineColor={PRIMARY}
              />
              <Text style={styles.fLabel}>{T('परिवर्तन का कारण', 'Reason for the change')} *</Text>
              <TextInput
                mode="outlined" multiline numberOfLines={3} value={aReason} onChangeText={setAReason}
                placeholder={T('जैसे: ग्राहक ने अतिरिक्त कार्य जोड़ा।', 'e.g. Customer added extra work.')}
                style={styles.fInput} outlineColor="#E2E8F0" activeOutlineColor={PRIMARY}
              />
              <TouchableOpacity style={styles.checkRow} onPress={() => setAConsent(!aConsent)}>
                <Checkbox status={aConsent ? 'checked' : 'unchecked'} color={PRIMARY} />
                <Text style={styles.checkTxt}>
                  {T('मैं सहमत हूँ कि यह परिवर्तन दूसरे पक्ष की स्वीकृति के बाद ही लागू होगा।',
                     'I agree this change applies only after the other party approves.')}
                </Text>
              </TouchableOpacity>
              <Button
                mode="contained" buttonColor="#F29900" style={{ borderRadius: 10, marginTop: 12 }}
                loading={busy} disabled={busy} onPress={sendAmendment}
              >
                {T('अनुरोध भेजें', 'Send request')}
              </Button>
              <Button mode="text" textColor="#5F6368" onPress={() => setAmdOpen(false)} disabled={busy}>
                {T('रद्द करें', 'Cancel')}
              </Button>
            </ScrollView>
          </KeyboardAvoidingView>
        </Modal>
      </Portal>

      <SsnTermsSheet visible={termsOpen} onDismiss={() => setTermsOpen(false)} terms={d.ssn_terms} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8F9FA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F9FA', padding: 24 },
  emptyTxt: { fontSize: 15, color: '#2D3748', fontWeight: '700', marginTop: 12, textAlign: 'center' },
  emptySub: { fontSize: 12.5, color: '#718096', marginTop: 4 },

  header: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 3, borderBottomColor: GREEN,
  },
  backBtn: { paddingHorizontal: 8 },
  backTxt: { fontSize: 30, color: '#333', lineHeight: 32 },
  headerTitle: { fontSize: 14.5, fontWeight: '800', color: '#1A202C', letterSpacing: 0.3 },
  headerSub: { fontSize: 11.5, color: '#718096', marginTop: 1 },
  lockPill: { backgroundColor: '#E6F4EA', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 12 },
  lockPillTxt: { fontSize: 10.5, color: '#1B5E20', fontWeight: '800' },

  heroCard: { backgroundColor: '#fff', borderRadius: 14, padding: 20, alignItems: 'center', marginBottom: 14, borderTopWidth: 4, borderTopColor: GREEN },
  heroEmoji: { fontSize: 40 },
  heroTitle: { fontSize: 15, fontWeight: '800', color: '#1B5E20', marginTop: 6, letterSpacing: 0.5 },
  heroId: { fontSize: 19, fontWeight: '800', color: '#1A202C', marginTop: 6, letterSpacing: 0.5 },
  heroSub: { fontSize: 12, color: '#718096', marginTop: 4 },
  readOnlyLegalBox: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
    alignItems: 'center',
    width: '100%',
  },
  readOnlyLegalTxt: { fontSize: 12, fontWeight: '800', color: '#166534' },
  readOnlyLegalSub: { fontSize: 11, color: '#15803D', textAlign: 'center', marginTop: 3, lineHeight: 16 },

  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 14 },
  partTitle: { fontSize: 13.5, fontWeight: '800', color: PRIMARY, marginBottom: 8 },
  sRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: '#F7FAFC' },
  sKey: { fontSize: 12.5, color: '#5F6368', flex: 1, paddingRight: 8 },
  sVal: { fontSize: 12.5, color: '#1A202C', fontWeight: '700', flex: 1.2, textAlign: 'right' },
  note: { fontSize: 11.5, color: '#718096', marginTop: 8, lineHeight: 17 },
  footNote: { fontSize: 11, color: '#718096', textAlign: 'center', marginTop: 16, lineHeight: 17 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  caret: { fontSize: 16, color: '#718096' },

  partyRow: { flexDirection: 'row', marginTop: 4 },
  partyRole: { fontSize: 11, color: '#718096', fontWeight: '700' },
  partyName: { fontSize: 13.5, color: '#1A202C', fontWeight: '700', marginTop: 2 },
  partyPhone: { fontSize: 13, color: '#1A73E8', fontWeight: '700', marginTop: 4 },

  histItem: { borderLeftWidth: 3, borderLeftColor: PRIMARY, paddingLeft: 10, paddingVertical: 8, marginBottom: 8, backgroundColor: '#FAFBFC', borderRadius: 6 },
  histV: { fontSize: 13, fontWeight: '800', color: '#1A202C' },
  histBy: { fontSize: 11, color: '#718096' },
  histAmt: { fontSize: 13, fontWeight: '700', color: GREEN, marginTop: 2 },
  histNote: { fontSize: 12, color: '#4A5568', fontStyle: 'italic', marginTop: 3 },
  histChange: { fontSize: 11.5, color: '#5F6368', marginTop: 2 },

  readOnlyBtn: { backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0', paddingVertical: 12, paddingHorizontal: 12 },
  readOnlyTxt: { fontSize: 12.5, color: '#2B6CB0', fontWeight: '600' },

  modal: { backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 14, padding: 18, maxHeight: '88%' },
  modalTitle: { fontSize: 16, fontWeight: '800', color: '#1A202C', textAlign: 'center' },
  tinyNote: { fontSize: 11, color: '#718096', marginTop: 6, lineHeight: 16, textAlign: 'center' },
  fLabel: { fontSize: 12.5, fontWeight: '700', color: '#2D3748', marginTop: 12, marginBottom: 4 },
  fInput: { backgroundColor: '#fff' },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 12 },
  checkTxt: { flex: 1, fontSize: 12, color: '#2D3748', lineHeight: 18, paddingTop: 8 },
});
