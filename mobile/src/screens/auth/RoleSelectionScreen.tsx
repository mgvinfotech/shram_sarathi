import { SafeAreaView } from 'react-native-safe-area-context';
/**
 * Step 1 of 6 — Role Selection Screen
 * PDF Reference: "श्रम सारथी नेटवर्क - आप ऐप का उपयोग किस रूप में करना चाहते हैं?"
 * Multi-select: User can select more than one role simultaneously.
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, StatusBar, Image,
} from 'react-native';
import SignupProgressBar from '../../components/SignupProgressBar';
import { useLanguage } from '../../i18n/LanguageContext';

// ─── Design Tokens ────────────────────────────────────────────────────────────
const G = {
  primary:  '#FF6B00',
  green:    '#2E7D32',
  bg:       '#FAFAFA',
  white:    '#FFFFFF',
  text:     '#1A1A1A',
  sub:      '#666666',
  border:   '#E0E0E0',
  card:     '#FFFFFF',
  selected: '#FFF3E8',
  selBorder:'#FF6B00',
};

// ─── Role Definitions ─────────────────────────────────────────────────────────
const ROLES = [
  {
    id: 'CUSTOMER',
    icon: '👤',
    hi: 'ग्राहक (Customer)',
    en: 'Customer',
    descHi: 'काम करवाने के लिए — मजदूर, ड्राइवर, कारीगर या गाड़ी बुक करें',
    descEn: 'Hire Labour, Driver, Karigar or Book Transport vehicle',
    color: '#E3F2FD',
    borderColor: '#1E88E5',
  },
  {
    id: 'LABOUR',
    icon: '👷',
    hi: 'मजदूर (Labour)',
    en: 'Labour',
    descHi: 'दैनिक मजदूरी काम के लिए — निर्माण, लोडिंग, खेती',
    descEn: 'Daily wage worker — Construction, Loading, Farming',
    color: '#E8F5E9',
    borderColor: '#43A047',
  },
  {
    id: 'KARIGAR',
    icon: '🛠️',
    hi: 'कारीगर / मिस्त्री (Karigar)',
    en: 'Karigar / Skilled Worker',
    descHi: 'विशेषज्ञ कारीगर — इलेक्ट्रीशियन, प्लम्बर, टाइल्स, बढ़ई',
    descEn: 'Skilled worker — Electrician, Plumber, Tiles, Carpenter',
    color: '#FFF8E1',
    borderColor: '#F9A825',
  },
  {
    id: 'DRIVER',
    icon: '🚗',
    hi: 'व्यक्तिगत चालक (Driver)',
    en: 'Driver (Personal / Commercial)',
    descHi: 'सैलरी या ट्रिप पर गाड़ी चलाने के लिए — पर्सनल / कमर्शियल चालक',
    descEn: 'Drive vehicles for salary / trip — Personal or commercial driver',
    color: '#F3E5F5',
    borderColor: '#8E24AA',
  },
  {
    id: 'TRANSPORT',
    icon: '🚛',
    hi: 'वाहन मालिक / परिवहन (Transport)',
    en: 'Vehicle Owner / Transport',
    descHi: 'अपनी गाड़ी जोड़ें — ऑटो, कार, पिकअप, लोडर से सवारी/माल ढुलाई करें',
    descEn: 'Add your vehicle — Auto, Car, Pickup, Loader to get ride & goods bookings',
    color: '#EDE7F6',
    borderColor: '#673AB7',
  },
  {
    id: 'CONTRACTOR',
    icon: '🏗️',
    hi: 'ठेकेदार (Contractor)',
    en: 'Contractor',
    descHi: 'प्रोजेक्ट और लेबर सप्लाई — टीम के साथ ठेके पर काम करें',
    descEn: 'Project & Labour Supply — Work with your team on contract',
    color: '#FCE4EC',
    borderColor: '#E53935',
  },
  {
    id: 'AGENT',
    icon: '💼',
    hi: 'एजेंट (Agent)',
    en: 'Agent / Referral Partner',
    descHi: 'रेफरल और कमीशन — नए कामगार/गाड़ियां जोड़ें और कमाएं',
    descEn: 'Referral & Commission — Add workers/vehicles, earn commission',
    color: '#E8EAF6',
    borderColor: '#3949AB',
  },
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function RoleSelectionScreen({ navigation }: any) {
  const { lang } = useLanguage();
  const hi = lang === 'hi';
  const [selected, setSelected] = useState<string[]>(['CUSTOMER']);

  const toggle = (id: string) => {
    if (id === 'CUSTOMER') {
      return;
    }
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );
  };

  const handleContinue = () => {
    const rolesToSend = Array.from(new Set(['CUSTOMER', ...selected]));
    navigation.navigate('Signup', { roles: rolesToSend });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={G.white} />

      {/* Progress Bar */}
      <SignupProgressBar currentStep={1} />

      {/* Header */}
      <View style={styles.header}>
        <Image
          source={require('../../../assets/logo.png')}
          style={{ width: 70, height: 70, alignSelf: 'center', marginBottom: 6 }}
          resizeMode="contain"
        />
        <Text style={styles.appName}>श्रम सारथी नेटवर्क</Text>
        <Text style={{ fontSize: 12, fontWeight: '700', color: '#4B5563', textAlign: 'center', marginBottom: 6 }}>
          Shram Sarathi Network
        </Text>
        <Text style={styles.title}>
          {hi ? 'आप किस रूप में ऐप का उपयोग करना चाहते हैं?' : 'How would you like to use the app?'}
        </Text>
        <Text style={styles.subtitle}>
          {hi ? '(एक या एक से अधिक भूमिकाएं चुन सकते हैं)' : '(You can select one or more roles)'}
        </Text>
      </View>

      {/* Role Cards */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {ROLES.map((role) => {
          const isCustomer = role.id === 'CUSTOMER';
          const isSel = isCustomer || selected.includes(role.id);
          return (
            <TouchableOpacity
              key={role.id}
              activeOpacity={isCustomer ? 1 : 0.75}
              style={[
                styles.card,
                isSel && { borderColor: role.borderColor, backgroundColor: role.color },
              ]}
              onPress={() => toggle(role.id)}
            >
              <View style={styles.cardLeft}>
                <View style={[styles.iconBox, { backgroundColor: isSel ? role.color : '#F5F5F5' }]}>
                  <Text style={styles.icon}>{role.icon}</Text>
                </View>
                <View style={styles.cardText}>
                  <Text style={[styles.roleName, isSel && { color: role.borderColor }]}>
                    {hi ? role.hi : role.en}
                    {isCustomer && (
                      <Text style={{ fontSize: 11, color: '#2E7D32', fontWeight: 'bold' }}>
                        {' '}[{hi ? 'अनिवार्य' : 'Mandatory'}]
                      </Text>
                    )}
                  </Text>
                  <Text style={styles.roleDesc}>
                    {hi ? role.descHi : role.descEn}
                  </Text>
                </View>
              </View>

              {/* Checkbox */}
              <View style={[styles.checkbox, isSel && { backgroundColor: role.borderColor, borderColor: role.borderColor }]}>
                {isSel && <Text style={styles.checkmark}>{isCustomer ? '🔒' : '✓'}</Text>}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Bottom CTA */}
      <View style={styles.footer}>
        {selected.length > 0 && (
          <Text style={styles.selCount}>
            {hi ? `${selected.length} भूमिका चुनी गई` : `${selected.length} role(s) selected`}
          </Text>
        )}
        <TouchableOpacity
          style={[styles.btn, selected.length === 0 && styles.btnDisabled]}
          onPress={handleContinue}
          disabled={selected.length === 0}
          activeOpacity={0.85}
        >
          <Text style={styles.btnText}>
            {selected.length === 0
              ? (hi ? 'कम से कम एक भूमिका चुनें' : 'Select at least one role')
              : (hi ? 'आगे बढ़ें →' : 'Continue →')}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: G.white },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: G.white,
    borderBottomWidth: 1,
    borderBottomColor: G.border,
  },
  appName: {
    fontSize: 13,
    fontWeight: '700',
    color: G.primary,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: G.text,
    lineHeight: 24,
  },
  subtitle: {
    fontSize: 12,
    color: G.sub,
    marginTop: 2,
  },
  scroll: {
    flex: 1,
    backgroundColor: G.bg,
  },
  scrollContent: {
    padding: 16,
    gap: 10,
    paddingBottom: 24,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: G.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: G.border,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  icon: {
    fontSize: 24,
  },
  cardText: {
    flex: 1,
  },
  roleName: {
    fontSize: 15,
    fontWeight: '700',
    color: G.text,
    marginBottom: 2,
  },
  roleDesc: {
    fontSize: 12,
    color: G.sub,
    lineHeight: 16,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: G.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: G.white,
  },
  checkmark: {
    color: G.white,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 14,
  },
  footer: {
    padding: 16,
    backgroundColor: G.white,
    borderTopWidth: 1,
    borderTopColor: G.border,
    alignItems: 'center',
    gap: 8,
  },
  selCount: {
    fontSize: 12,
    color: G.green,
    fontWeight: '600',
  },
  btn: {
    width: '100%',
    backgroundColor: G.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: {
    backgroundColor: '#CCCCCC',
  },
  btnText: {
    color: G.white,
    fontSize: 16,
    fontWeight: '800',
  },
});
