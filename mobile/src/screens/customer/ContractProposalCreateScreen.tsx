import React, { useEffect, useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Platform,
  KeyboardAvoidingView,
} from 'react-native';
import {
  Text, TextInput, Button, Surface, RadioButton, Checkbox, Divider, Menu,
} from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Location from 'expo-location';
import * as Speech from 'expo-speech';
import { api, getErrorMessage } from '../../services/api';
import { useLanguage } from '../../i18n/LanguageContext';
import SsnTermsSheet from '../../components/SsnTermsSheet';

type Opt = { slug: string; hi: string; en: string; hi_hint?: string; en_hint?: string };

const PRIMARY = '#FF6B00';

export default function ContractProposalCreateScreen({ navigation }: { navigation: any }) {
  const { lang } = useLanguage();
  const hi = lang === 'hi';
  const T = (h: string, e: string) => (hi ? h : e);

  const [meta, setMeta] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);

  // PART-A
  const [contractorType, setContractorType] = useState('');
  const [typeMenu, setTypeMenu] = useState(false);
  const [workDesc, setWorkDesc] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('sqft');
  const [unitMenu, setUnitMenu] = useState(false);
  const [address, setAddress] = useState('');
  const [district, setDistrict] = useState('');
  const [stateName, setStateName] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);

  // PART-B
  const [startDate, setStartDate] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d;
  });
  const [showDate, setShowDate] = useState(false);
  const [startTime, setStartTime] = useState<Date>(() => {
    const d = new Date();
    d.setHours(10, 0, 0, 0);
    return d;
  });
  const [showTime, setShowTime] = useState(false);
  const [durationDays, setDurationDays] = useState('30');

  // PART-C
  const [material, setMaterial] = useState<'labour_only' | 'labour_material'>('labour_only');
  const [materialDetails, setMaterialDetails] = useState('');

  // PART-D
  const [priceBasis, setPriceBasis] = useState('total_contract');
  const [totalAmount, setTotalAmount] = useState('');

  // PART-E
  const [pAdv, setPAdv] = useState('20');
  const [pDur, setPDur] = useState('30');
  const [pCom, setPCom] = useState('30');
  const [pFin, setPFin] = useState('20');

  // PART-F
  const [extraWorkConsent, setExtraWorkConsent] = useState(true);
  const [qualityTerms, setQualityTerms] = useState('');
  const [validityHours, setValidityHours] = useState('48');
  const [declared, setDeclared] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/api/contractor/proposal/meta');
        setMeta(res.data);
        const pd = res.data?.payment_defaults;
        if (pd) {
          setPAdv(String(pd.advance_percent));
          setPDur(String(pd.during_percent));
          setPCom(String(pd.completion_percent));
          setPFin(String(pd.final_percent));
        }
        setValidityHours(String(res.data?.default_validity_hours ?? 48));
      } catch (e) {
        Alert.alert(T('त्रुटि', 'Error'), getErrorMessage(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const total = parseFloat(totalAmount) || 0;
  const nums = {
    adv: parseFloat(pAdv) || 0,
    dur: parseFloat(pDur) || 0,
    com: parseFloat(pCom) || 0,
    fin: parseFloat(pFin) || 0,
  };
  const pctSum = useMemo(
    () => Math.round((nums.adv + nums.dur + nums.com + nums.fin) * 100) / 100,
    [pAdv, pDur, pCom, pFin]
  );
  const sumOk = Math.abs(pctSum - 100) <= 0.5;
  const amt = (p: number) => Math.round(total * p) / 100;

  const label = (list: Opt[] | undefined, slug: string) => {
    const f = (list || []).find((o) => o.slug === slug);
    return f ? (hi ? f.hi : f.en) : '';
  };

  const fetchGps = async () => {
    try {
      setGpsLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(T('अनुमति चाहिए', 'Permission needed'), T('लोकेशन की अनुमति दें।', 'Please allow location access.'));
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      try {
        const geo = await Location.reverseGeocodeAsync({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        const g = geo?.[0];
        if (g) {
          const parts = [g.name, g.street, g.district, g.subregion, g.city, g.postalCode].filter(Boolean);
          setAddress(parts.join(', '));
          setDistrict(g.city || g.subregion || g.district || '');
          setStateName(g.region || '');
        }
      } catch {
        // reverse geocode optional
      }
      Alert.alert('📍', T('वर्तमान लोकेशन ले ली गई।', 'Current location captured.'));
    } catch (e: any) {
      Alert.alert(T('त्रुटि', 'Error'), e?.message || T('लोकेशन नहीं मिली।', 'Could not fetch location.'));
    } finally {
      setGpsLoading(false);
    }
  };

  const speakHint = () => {
    Speech.speak(
      T(
        'कार्य का विवरण बोलें, जैसे: दो मंज़िला आर सी सी छत की ढलाई। फिर नीचे लिखकर पुष्टि करें।',
        'Speak the work description, then confirm by typing below.'
      ),
      { language: hi ? 'hi-IN' : 'en-IN' }
    );
  };

  const fmtDate = (d: Date) =>
    `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  const fmtTime = (d: Date) => {
    let h = d.getHours();
    const m = String(d.getMinutes()).padStart(2, '0');
    const ap = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${String(h).padStart(2, '0')}:${m} ${ap}`;
  };
  const ymd = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const validate = (): string | null => {
    if (!contractorType) return T('ठेकेदार का प्रकार चुनें।', 'Select contractor type.');
    if (workDesc.trim().length < 5) return T('कार्य का विवरण दर्ज करें।', 'Enter work description.');
    if (!address.trim()) return T('कार्यस्थल का पता दर्ज करें।', 'Enter the work site address.');
    if (!durationDays || parseInt(durationDays, 10) < 1) return T('कार्य की अवधि (दिन) दर्ज करें।', 'Enter duration in days.');
    if (material === 'labour_material' && !materialDetails.trim())
      return T('सामग्री का विवरण दर्ज करें।', 'Enter material details.');
    if (total < 1) return T('कुल प्रस्तावित राशि दर्ज करें।', 'Enter the total proposed amount.');
    if (!sumOk) return T(`भुगतान शर्तों का कुल योग 100% होना चाहिए (अभी ${pctSum}%)।`, `Payment split must total 100% (now ${pctSum}%).`);
    if (!declared) return T('घोषणा पर टिक करें।', 'Please tick the declaration.');
    return null;
  };

  const submit = async () => {
    const err = validate();
    if (err) {
      Alert.alert(T('अपूर्ण जानकारी', 'Incomplete'), err);
      return;
    }
    try {
      setSubmitting(true);
      const res = await api.post('/api/contractor/proposal/create', {
        contractor_type: contractorType,
        work_description: workDesc.trim(),
        work_quantity: quantity ? parseFloat(quantity) : null,
        work_unit: unit,
        site_address: address.trim(),
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
        district: district || null,
        state: stateName || null,
        start_date: ymd(startDate),
        start_time: fmtTime(startTime),
        duration_days: parseInt(durationDays, 10),
        material_responsibility: material,
        material_details: material === 'labour_material' ? materialDetails.trim() : null,
        price_basis: priceBasis,
        total_amount: total,
        advance_percent: nums.adv,
        during_percent: nums.dur,
        completion_percent: nums.com,
        final_percent: nums.fin,
        extra_work_consent: extraWorkConsent,
        quality_terms: qualityTerms.trim() || null,
        validity_hours: parseInt(validityHours, 10) || 48,
        terms_accepted: true,
      });
      const d = res.data;
      Alert.alert(
        T('📤 प्रस्ताव भेजा गया', '📤 Proposal Sent'),
        `${d.proposal_code}\n\n${d.message}`,
        [
          {
            text: T('विवरण देखें', 'View details'),
            onPress: () =>
              navigation.replace('ContractVersionCompare', { proposalId: d.proposal_id }),
          },
        ]
      );
    } catch (e) {
      Alert.alert(T('भेजा नहीं जा सका', 'Could not send'), getErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={PRIMARY} />
        <Text style={{ marginTop: 12, color: '#666' }}>{T('लोड हो रहा है…', 'Loading…')}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backTxt}>‹</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>CONTRACT WORK PROPOSAL</Text>
            <Text style={styles.headerSub}>{T('प्रस्ताव निर्माण (ग्राहक)', 'Proposal Creation (Customer)')} · V1</Text>
          </View>
          <View style={styles.statusPill}>
            <Text style={styles.statusPillTxt}>🆕 {T('नया प्रस्ताव (Draft)', 'New Proposal (Draft)')}</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 160 }} keyboardShouldPersistTaps="handled">
        {/* Preamble / प्रस्तावना banner (PDF Screen 1) */}
        <Surface style={styles.preambleCard} elevation={0}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <Text style={{ fontSize: 18, marginRight: 8, marginTop: 1 }}>ℹ️</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.preambleTitle}>{T('प्रस्तावना (Preamble)', 'Preamble')}</Text>
              <Text style={styles.preambleTxt}>
                {T(
                  'नीचे दी गई जानकारी ठेकेदार के लिए आपके कार्य का विधिक प्रस्ताव होगी। इसे प्राप्त करने के बाद ठेकेदार इसे स्वीकार कर सकता है या इसमें आवश्यक संशोधन (Counter Offer) करके वापस भेज सकता है।',
                  'The information below will serve as a legal work proposal for the contractor. Upon receipt, the contractor can accept it directly or send it back with necessary amendments (Counter Offer).'
                )}
              </Text>
            </View>
          </View>
        </Surface>
        {/* ───────── PART-A ───────── */}
        <Surface style={styles.card} elevation={1}>
          <Text style={styles.partTitle}>PART–A · {T('कार्य का विवरण', 'Work Details')}</Text>

          <Text style={styles.qLabel}>1. {T('ठेकेदार का प्रकार', 'Contractor Type')} *</Text>
          <Menu
            visible={typeMenu}
            onDismiss={() => setTypeMenu(false)}
            anchor={
              <TouchableOpacity style={styles.select} onPress={() => setTypeMenu(true)}>
                <Text style={[styles.selectTxt, !contractorType && { color: '#9AA0A6' }]}>
                  {contractorType ? label(meta?.contractor_types, contractorType) : T('चुनें…', 'Select…')}
                </Text>
                <Text style={styles.caret}>▾</Text>
              </TouchableOpacity>
            }
          >
            {(meta?.contractor_types || []).map((o: Opt) => (
              <Menu.Item
                key={o.slug}
                title={hi ? o.hi : o.en}
                onPress={() => {
                  setContractorType(o.slug);
                  setTypeMenu(false);
                }}
              />
            ))}
          </Menu>

          <Text style={styles.qLabel}>2. {T('कार्य का विवरण', 'Work Description')} *</Text>
          <TextInput
            mode="outlined"
            multiline
            numberOfLines={4}
            value={workDesc}
            onChangeText={setWorkDesc}
            placeholder={T('जैसे: दो मंज़िला RCC छत की ढलाई एवं कॉलम कार्य', 'e.g. RCC slab casting for 2 floors')}
            style={styles.input}
            outlineColor="#E2E8F0"
            activeOutlineColor={PRIMARY}
          />
          <TouchableOpacity style={styles.micRow} onPress={speakHint}>
            <Text style={styles.micIcon}>🎤</Text>
            <Text style={styles.micTxt}>{T('बोलकर भी दर्ज करें', 'You can also dictate')}</Text>
          </TouchableOpacity>

          <Text style={styles.qLabel}>3. {T('कार्य की मात्रा', 'Work Quantity')}</Text>
          <View style={styles.row}>
            <TextInput
              mode="outlined"
              keyboardType="numeric"
              value={quantity}
              onChangeText={setQuantity}
              placeholder="1000"
              style={[styles.input, { flex: 1, marginRight: 8 }]}
              outlineColor="#E2E8F0"
              activeOutlineColor={PRIMARY}
            />
            <Menu
              visible={unitMenu}
              onDismiss={() => setUnitMenu(false)}
              anchor={
                <TouchableOpacity style={[styles.select, { width: 140, marginTop: 6 }]} onPress={() => setUnitMenu(true)}>
                  <Text style={styles.selectTxt}>{label(meta?.work_units, unit)}</Text>
                  <Text style={styles.caret}>▾</Text>
                </TouchableOpacity>
              }
            >
              {(meta?.work_units || []).map((o: Opt) => (
                <Menu.Item
                  key={o.slug}
                  title={hi ? o.hi : o.en}
                  onPress={() => {
                    setUnit(o.slug);
                    setUnitMenu(false);
                  }}
                />
              ))}
            </Menu>
          </View>

          <Text style={styles.qLabel}>4. {T('कार्यस्थल', 'Work Site')} *</Text>
          <Button
            mode="outlined"
            icon="crosshairs-gps"
            loading={gpsLoading}
            disabled={gpsLoading}
            onPress={fetchGps}
            textColor={PRIMARY}
            style={styles.gpsBtn}
          >
            📍 {T('वर्तमान लोकेशन लें', 'Use current location')}
          </Button>
          {coords && (
            <Text style={styles.gpsOk}>
              ✓ {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
            </Text>
          )}
          <TextInput
            mode="outlined"
            multiline
            value={address}
            onChangeText={setAddress}
            placeholder={T('या मैन्युअल पता लिखें', 'or type the address manually')}
            style={styles.input}
            outlineColor="#E2E8F0"
            activeOutlineColor={PRIMARY}
          />
          <View style={styles.row}>
            <TextInput
              mode="outlined"
              value={district}
              onChangeText={setDistrict}
              label={T('ज़िला', 'District')}
              style={[styles.input, { flex: 1, marginRight: 8 }]}
              outlineColor="#E2E8F0"
              activeOutlineColor={PRIMARY}
            />
            <TextInput
              mode="outlined"
              value={stateName}
              onChangeText={setStateName}
              label={T('राज्य', 'State')}
              style={[styles.input, { flex: 1 }]}
              outlineColor="#E2E8F0"
              activeOutlineColor={PRIMARY}
            />
          </View>
        </Surface>

        {/* ───────── PART-B ───────── */}
        <Surface style={styles.card} elevation={1}>
          <Text style={styles.partTitle}>PART–B · {T('समय-सीमा', 'Timeline')}</Text>

          <Text style={styles.qLabel}>5. {T('कार्य प्रारंभ तिथि', 'Work Start Date')} *</Text>
          <TouchableOpacity style={styles.select} onPress={() => setShowDate(true)}>
            <Text style={styles.selectTxt}>{fmtDate(startDate)}</Text>
            <Text style={styles.caret}>📅</Text>
          </TouchableOpacity>
          {showDate && (
            <DateTimePicker
              value={startDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              minimumDate={new Date()}
              onChange={(_e, d) => {
                setShowDate(Platform.OS === 'ios');
                if (d) setStartDate(d);
              }}
            />
          )}

          <Text style={styles.qLabel}>6. {T('कार्य प्रारंभ समय', 'Work Start Time')} *</Text>
          <TouchableOpacity style={styles.select} onPress={() => setShowTime(true)}>
            <Text style={styles.selectTxt}>{fmtTime(startTime)}</Text>
            <Text style={styles.caret}>🕐</Text>
          </TouchableOpacity>
          {showTime && (
            <DateTimePicker
              value={startTime}
              mode="time"
              is24Hour={false}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_e, d) => {
                setShowTime(Platform.OS === 'ios');
                if (d) setStartTime(d);
              }}
            />
          )}

          <Text style={styles.qLabel}>7. {T('कार्य पूर्ण करने की अवधि', 'Completion Duration')} *</Text>
          <View style={styles.row}>
            <TextInput
              mode="outlined"
              keyboardType="numeric"
              value={durationDays}
              onChangeText={setDurationDays}
              style={[styles.input, { flex: 1, marginRight: 8 }]}
              outlineColor="#E2E8F0"
              activeOutlineColor={PRIMARY}
            />
            <Text style={styles.suffix}>{T('दिन', 'days')}</Text>
          </View>
        </Surface>

        {/* ───────── PART-C ───────── */}
        <Surface style={styles.card} elevation={1}>
          <Text style={styles.partTitle}>PART–C · {T('सामग्री की जिम्मेदारी', 'Material Responsibility')}</Text>
          <Text style={styles.qLabel}>8. {T('जिम्मेदारी चुनें', 'Choose responsibility')} *</Text>
          <RadioButton.Group value={material} onValueChange={(v) => setMaterial(v as any)}>
            {(meta?.material_options || []).map((o: any) => (
              <TouchableOpacity key={o.slug} style={styles.radioRow} onPress={() => setMaterial(o.slug)}>
                <RadioButton value={o.slug} color={PRIMARY} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.radioTitle}>{hi ? o.hi : o.en}</Text>
                  <Text style={styles.radioHint}>{hi ? o.hi_hint : o.en_hint}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </RadioButton.Group>
          {material === 'labour_material' && (
            <>
              <Text style={styles.qLabel}>{T('सामग्री का विवरण', 'Material Details')} *</Text>
              <TextInput
                mode="outlined"
                multiline
                numberOfLines={3}
                value={materialDetails}
                onChangeText={setMaterialDetails}
                placeholder={T(
                  'सीमेंट का ब्रांड, सरिया का साइज, ईंट की श्रेणी आदि',
                  'Cement brand, rebar size, brick grade, etc.'
                )}
                style={styles.input}
                outlineColor="#E2E8F0"
                activeOutlineColor={PRIMARY}
              />
            </>
          )}
        </Surface>

        {/* ───────── PART-D ───────── */}
        <Surface style={styles.card} elevation={1}>
          <Text style={styles.partTitle}>PART–D · {T('प्रस्तावित ठेका मूल्य', 'Proposed Contract Price')}</Text>
          <Text style={styles.qLabel}>9. {T('मूल्य का आधार', 'Price Basis')} *</Text>
          <RadioButton.Group value={priceBasis} onValueChange={setPriceBasis}>
            {(meta?.price_bases || []).map((o: Opt) => (
              <TouchableOpacity key={o.slug} style={styles.radioRow} onPress={() => setPriceBasis(o.slug)}>
                <RadioButton value={o.slug} color={PRIMARY} />
                <Text style={styles.radioTitle}>{hi ? o.hi : o.en}</Text>
              </TouchableOpacity>
            ))}
          </RadioButton.Group>

          <Text style={styles.qLabel}>10. {T('कुल प्रस्तावित राशि', 'Total Proposed Amount')} *</Text>
          <TextInput
            mode="outlined"
            keyboardType="numeric"
            value={totalAmount}
            onChangeText={setTotalAmount}
            left={<TextInput.Affix text="₹" />}
            placeholder="350000"
            style={styles.input}
            outlineColor="#E2E8F0"
            activeOutlineColor={PRIMARY}
          />
          {total > 0 && <Text style={styles.amountEcho}>₹ {total.toLocaleString('en-IN')}</Text>}
        </Surface>

        {/* ───────── PART-E ───────── */}
        <Surface style={styles.card} elevation={1}>
          <Text style={styles.partTitle}>PART–E · {T('भुगतान की प्रस्तावित शर्तें', 'Proposed Payment Terms')}</Text>
          {[
            { n: 11, k: 'adv', hiL: 'अग्रिम भुगतान', enL: 'Advance', v: pAdv, set: setPAdv },
            { n: 12, k: 'dur', hiL: 'कार्य के दौरान', enL: 'During work', v: pDur, set: setPDur },
            { n: 13, k: 'com', hiL: 'कार्य पूर्ण होने पर', enL: 'On completion', v: pCom, set: setPCom },
            { n: 14, k: 'fin', hiL: 'अंतिम भुगतान', enL: 'Final payment', v: pFin, set: setPFin },
          ].map((r) => (
            <View key={r.k} style={styles.splitRow}>
              <Text style={styles.splitLabel}>
                {r.n}. {T(r.hiL, r.enL)}
              </Text>
              <View style={styles.splitInputs}>
                <View style={styles.autoBox}>
                  <Text style={styles.autoTxt}>₹ {amt(parseFloat(r.v) || 0).toLocaleString('en-IN')}</Text>
                </View>
                <TextInput
                  mode="outlined"
                  dense
                  keyboardType="numeric"
                  value={r.v}
                  onChangeText={r.set}
                  right={<TextInput.Affix text="%" />}
                  style={styles.pctInput}
                  outlineColor="#E2E8F0"
                  activeOutlineColor={PRIMARY}
                />
              </View>
            </View>
          ))}
          <Divider style={{ marginVertical: 8 }} />
          <View style={[styles.sumBar, { backgroundColor: sumOk ? '#E6F4EA' : '#FDECEA' }]}>
            <Text style={[styles.sumTxt, { color: sumOk ? '#1E7E34' : '#C5221F' }]}>
              {sumOk ? '✓' : '⚠️'} {T('सिस्टम ऑटो-कैलकुलेट: कुल योग', 'Auto-calculated total')} = {pctSum}%
              {!sumOk && ` — ${T('100% होना चाहिए', 'must be 100%')}`}
            </Text>
            <Text style={[styles.sumTxt, { color: sumOk ? '#1E7E34' : '#C5221F' }]}>
              ₹ {(amt(nums.adv) + amt(nums.dur) + amt(nums.com) + amt(nums.fin)).toLocaleString('en-IN')}
            </Text>
          </View>
        </Surface>

        {/* ───────── PART-F ───────── */}
        <Surface style={styles.card} elevation={1}>
          <Text style={styles.partTitle}>PART–F · {T('नियम एवं शर्तें', 'Terms & Conditions')}</Text>

          <Text style={styles.tierLabel}>A. {T('प्लेटफ़ॉर्म की स्थायी शर्तें', 'Platform Standard Terms')}</Text>
          <TouchableOpacity style={styles.readOnlyBtn} onPress={() => setTermsOpen(true)}>
            <Text style={styles.readOnlyTxt}>
              📖 {T('पढ़ें', 'Read')} ({meta?.ssn_terms?.clauses?.length ?? 7} {T('शर्तें', 'clauses')}) · Read-Only
            </Text>
          </TouchableOpacity>

          <Text style={styles.tierLabel}>B. {T('अतिरिक्त कार्य', 'Extra Work')}</Text>
          <TouchableOpacity style={styles.checkRow} onPress={() => setExtraWorkConsent(!extraWorkConsent)}>
            <Checkbox status={extraWorkConsent ? 'checked' : 'unchecked'} color={PRIMARY} />
            <Text style={styles.checkTxt}>
              {T(
                'बिना दोनों पक्षों की डिजिटल सहमति के कोई अतिरिक्त कार्य Contract में शामिल नहीं माना जाएगा।',
                'No extra work shall be part of the contract without both parties’ digital consent.'
              )}
            </Text>
          </TouchableOpacity>
          <TextInput
            mode="outlined"
            multiline
            numberOfLines={3}
            value={qualityTerms}
            onChangeText={setQualityTerms}
            label={T('विशेष गुणवत्ता शर्त', 'Special quality condition')}
            placeholder={T('जैसे: M-25 ग्रेड कंक्रीट अनिवार्य', 'e.g. M-25 grade concrete mandatory')}
            style={styles.input}
            outlineColor="#E2E8F0"
            activeOutlineColor={PRIMARY}
          />

          <Text style={styles.tierLabel}>C. {T('प्रस्ताव की वैधता', 'Proposal Validity')}</Text>
          <View style={styles.row}>
            <TextInput
              mode="outlined"
              dense
              keyboardType="numeric"
              value={validityHours}
              onChangeText={setValidityHours}
              style={{ width: 110, backgroundColor: '#fff' }}
              outlineColor="#E2E8F0"
              activeOutlineColor={PRIMARY}
            />
            <Text style={styles.suffix}>{T('घंटे', 'hours')}</Text>
          </View>
          <Text style={styles.hintSmall}>
            {T(
              'इस अवधि में कोई कार्यवाही न होने पर प्रस्ताव स्वतः समाप्त हो जाएगा।',
              'If no action is taken within this window, the proposal expires automatically.'
            )}
          </Text>
        </Surface>

        {/* ───────── प्रस्ताव की घोषणा एवं सबमिशन ───────── */}
        <Surface style={[styles.card, { borderColor: '#E2E8F0', borderWidth: 1 }]} elevation={1}>
          <Text style={styles.partTitle}>📜 {T('प्रस्ताव की घोषणा एवं सबमिशन', 'Proposal Declaration & Submission')}</Text>
          <Text style={styles.declarationText}>
            {T(
              'मैं उपरोक्त विवरण के आधार पर संबंधित कार्य के लिए यह ठेका प्रस्ताव प्रस्तुत कर रहा/रही हूँ।',
              'I hereby submit this contract work proposal for the specified work based on the details above.'
            )}
          </Text>
          <TouchableOpacity style={styles.checkRow} onPress={() => setDeclared(!declared)}>
            <Checkbox status={declared ? 'checked' : 'unchecked'} color={PRIMARY} />
            <Text style={[styles.checkTxt, { fontWeight: '700', color: '#1A202C' }]}>
              ☑ {T('मैंने प्रस्ताव की सभी शर्तें पढ़ ली हैं।', 'I have read all the terms of this proposal.')}
            </Text>
          </TouchableOpacity>
        </Surface>

        <Button
          mode="contained"
          onPress={submit}
          loading={submitting}
          disabled={submitting}
          buttonColor={PRIMARY}
          style={styles.sendBtn}
          contentStyle={{ paddingVertical: 10 }}
          labelStyle={{ fontSize: 16, fontWeight: '800' }}
        >
          📤 {T('प्रस्ताव भेजें', 'Send Proposal')} (Send Proposal V1)
        </Button>
        <Text style={styles.footNote}>
          {T(
            'यह प्रस्ताव इस श्रेणी के आस-पास के सभी पंजीकृत ठेकेदारों के पास नोटिफिकेशन के रूप में चला जाएगा।',
            'This proposal will be sent as a notification to all nearby registered contractors of this category.'
          )}
        </Text>
      </ScrollView>

      <SsnTermsSheet visible={termsOpen} onDismiss={() => setTermsOpen(false)} terms={meta?.ssn_terms} />
      </KeyboardAvoidingView>
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
  headerTitle: { fontSize: 15, fontWeight: '800', color: '#1A202C', letterSpacing: 0.4 },
  headerSub: { fontSize: 12, color: '#718096', marginTop: 1 },
  statusPill: { backgroundColor: '#FFF4E5', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  statusPillTxt: { fontSize: 11, color: '#B45309', fontWeight: '700' },

  preambleCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  preambleTitle: { fontSize: 13.5, fontWeight: '800', color: '#92400E', marginBottom: 4 },
  preambleTxt: { fontSize: 12, color: '#78350F', lineHeight: 18 },
  declarationText: { fontSize: 12.5, color: '#4A5568', lineHeight: 19, marginBottom: 8 },

  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 14 },
  partTitle: {
    fontSize: 14, fontWeight: '800', color: PRIMARY, marginBottom: 10,
    borderBottomWidth: 1, borderBottomColor: '#F1F3F5', paddingBottom: 7,
  },
  qLabel: { fontSize: 13, fontWeight: '700', color: '#2D3748', marginTop: 12, marginBottom: 4 },
  tierLabel: { fontSize: 13, fontWeight: '700', color: '#2D3748', marginTop: 14, marginBottom: 6 },
  input: { backgroundColor: '#fff', marginTop: 2 },
  row: { flexDirection: 'row', alignItems: 'center' },
  suffix: { fontSize: 14, color: '#4A5568', fontWeight: '600', marginLeft: 4 },
  hintSmall: { fontSize: 11, color: '#718096', marginTop: 6, lineHeight: 16 },

  select: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 6,
    paddingHorizontal: 14, paddingVertical: 15, backgroundColor: '#fff',
  },
  selectTxt: { fontSize: 15, color: '#1A202C', flex: 1 },
  caret: { fontSize: 14, color: '#718096', marginLeft: 8 },

  micRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, alignSelf: 'flex-start' },
  micIcon: { fontSize: 18, marginRight: 6 },
  micTxt: { fontSize: 12, color: PRIMARY, fontWeight: '600', textDecorationLine: 'underline' },

  gpsBtn: { borderColor: PRIMARY, marginTop: 4, marginBottom: 4 },
  gpsOk: { fontSize: 12, color: '#1E7E34', marginBottom: 4, fontWeight: '600' },

  radioRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 2 },
  radioTitle: { fontSize: 14, color: '#1A202C', fontWeight: '600', flex: 1 },
  radioHint: { fontSize: 11, color: '#718096', marginTop: 1 },

  amountEcho: { fontSize: 20, fontWeight: '800', color: '#276749', marginTop: 6, textAlign: 'right' },

  splitRow: { marginBottom: 10 },
  splitLabel: { fontSize: 13, color: '#2D3748', fontWeight: '600', marginBottom: 4 },
  splitInputs: { flexDirection: 'row', alignItems: 'center' },
  autoBox: {
    flex: 1, backgroundColor: '#F7FAFC', borderRadius: 6, borderWidth: 1, borderColor: '#EDF2F7',
    paddingVertical: 12, paddingHorizontal: 10, marginRight: 8,
  },
  autoTxt: { fontSize: 14, fontWeight: '700', color: '#276749' },
  pctInput: { width: 108, backgroundColor: '#fff' },

  sumBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10,
  },
  sumTxt: { fontSize: 12, fontWeight: '700', flexShrink: 1 },

  readOnlyBtn: {
    backgroundColor: '#F7FAFC', borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0',
    paddingVertical: 12, paddingHorizontal: 12,
  },
  readOnlyTxt: { fontSize: 13, color: '#2B6CB0', fontWeight: '600' },

  checkRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 4 },
  checkTxt: { flex: 1, fontSize: 12.5, color: '#2D3748', lineHeight: 19, paddingTop: 8 },

  sendBtn: { borderRadius: 10, marginTop: 4 },
  footNote: { fontSize: 11, color: '#718096', textAlign: 'center', marginTop: 10, lineHeight: 16 },
});
