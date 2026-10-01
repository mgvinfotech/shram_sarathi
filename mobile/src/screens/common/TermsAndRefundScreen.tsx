import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useLanguage } from '../../i18n/LanguageContext';

const PRIMARY = '#166534';
const ACCENT = '#EA580C';
const SUPPORT_PHONE = '+917084900909';

export default function TermsAndRefundScreen() {
  const navigation = useNavigation<any>();
  const { lang } = useLanguage();
  const hi = lang === 'hi';
  const [activeTab, setActiveTab] = useState<'refund' | 'terms' | 'rates' | 'safety'>('refund');

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* ── 1. Top Navigation Bar ── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            {hi ? 'नियम, शर्तें एवं रिफंड नीति' : 'Terms, Conditions & Refund Policy'}
          </Text>
          <Text style={styles.headerSubtitle}>
            {hi ? 'श्रम सारथी नेटवर्क' : 'Shram Sarathi Network'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.phoneHeaderBtn}
          onPress={() => Linking.openURL(`tel:${SUPPORT_PHONE}`)}
        >
          <Ionicons name="call" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* ── 2. Helpline Callout Banner ── */}
      <View style={styles.supportBanner}>
        <Ionicons name="headset-outline" size={20} color="#166534" style={{ marginRight: 8 }} />
        <View style={{ flex: 1 }}>
          <Text style={styles.supportBannerText}>
            {hi
              ? 'आधिकारिक सहायता एवं शिकायत निवारण हेल्पलाइन:'
              : 'Official Helpline & Dispute Resolution:'}
          </Text>
          <TouchableOpacity onPress={() => Linking.openURL(`tel:${SUPPORT_PHONE}`)}>
            <Text style={styles.supportBannerNumber}>{SUPPORT_PHONE}</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={styles.callNowBtn}
          onPress={() => Linking.openURL(`tel:${SUPPORT_PHONE}`)}
        >
          <Text style={styles.callNowBtnText}>{hi ? 'कॉल करें' : 'Call'}</Text>
        </TouchableOpacity>
      </View>

      {/* ── 3. Tab Navigation Chips ── */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabChip, activeTab === 'refund' && styles.tabChipActive]}
          onPress={() => setActiveTab('refund')}
        >
          <Ionicons
            name="wallet-outline"
            size={16}
            color={activeTab === 'refund' ? '#FFFFFF' : '#475569'}
          />
          <Text style={[styles.tabText, activeTab === 'refund' && styles.tabTextActive]}>
            {hi ? 'रिफंड नीति' : 'Refund Policy'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabChip, activeTab === 'terms' && styles.tabChipActive]}
          onPress={() => setActiveTab('terms')}
        >
          <Ionicons
            name="document-text-outline"
            size={16}
            color={activeTab === 'terms' ? '#FFFFFF' : '#475569'}
          />
          <Text style={[styles.tabText, activeTab === 'terms' && styles.tabTextActive]}>
            {hi ? 'नियम व शर्तें' : 'Terms'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabChip, activeTab === 'rates' && styles.tabChipActive]}
          onPress={() => setActiveTab('rates')}
        >
          <Ionicons
            name="pricetags-outline"
            size={16}
            color={activeTab === 'rates' ? '#FFFFFF' : '#475569'}
          />
          <Text style={[styles.tabText, activeTab === 'rates' && styles.tabTextActive]}>
            {hi ? 'रेट कार्ड' : 'Rate Card'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabChip, activeTab === 'safety' && styles.tabChipActive]}
          onPress={() => setActiveTab('safety')}
        >
          <Ionicons
            name="shield-checkmark-outline"
            size={16}
            color={activeTab === 'safety' ? '#FFFFFF' : '#475569'}
          />
          <Text style={[styles.tabText, activeTab === 'safety' && styles.tabTextActive]}>
            {hi ? 'सुरक्षा व SOS' : 'Safety'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── 4. Main Content Scrollable ── */}
      <ScrollView
        style={styles.contentContainer}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'refund' && (
          <View style={styles.sectionCard}>
            <View style={styles.cardHeaderRow}>
              <View style={[styles.iconBadge, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="alert-circle" size={22} color="#D97706" />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.cardHeaderTitle}>
                  {hi ? 'सीमित वॉलेट रिफंड नीति (Limited Refund Policy)' : 'Limited Wallet Refund Policy'}
                </Text>
                <Text style={styles.cardHeaderNotice}>
                  {hi ? 'कृपया ध्यानपूर्वक पढ़ें' : 'Please read carefully'}
                </Text>
              </View>
            </View>

            {/* Crucial Bullet Points from PDF */}
            <View style={styles.highlightBox}>
              <Text style={styles.highlightTitle}>
                {hi ? '📌 महत्वपूर्ण रिफंड नियम:' : '📌 Key Refund Policy:'}
              </Text>
              <Text style={styles.highlightText}>
                {hi
                  ? 'रिफंड पॉलिसी बहुत सीमित है। वॉलेट में पैसा केवल विवाद (Dispute) या उचित शिकायत (Complaint) की स्थिति में एडमिन समीक्षा के बाद ही आपके श्रम सारथी वॉलेट में क्रेडिट किया जाएगा।'
                  : 'Refund policy is strictly limited. Any refund is credited to your Shram Sarathi wallet only after admin verification of a valid dispute or complaint.'}
              </Text>
            </View>

            <View style={styles.clauseItem}>
              <Text style={styles.clauseNumber}>1.</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.clauseTitle}>
                  {hi ? 'वॉलेट में रिफंड (No Direct Bank Refund)' : 'In-App Wallet Credit Only'}
                </Text>
                <Text style={styles.clauseBody}>
                  {hi
                    ? 'विवाद समाधान के उपरांत स्वीकृत कोई भी रिफंड सीधे आपके श्रम सारथी इन-ऐप वॉलेट में क्रेडिट होगा। इसे सीधे बैंक खाते में ट्रांसफ़र नहीं किया जा सकता। इस बैलेंस का उपयोग आप किसी भी नई बुकिंग (मजदूर, कारीगर, ड्राइवर, ट्रांसपोर्ट) के लिए कर सकते हैं।'
                    : 'Any approved refund following dispute resolution will be credited directly to your in-app wallet balance, not to your bank account. You can utilize this balance for future bookings.'}
                </Text>
              </View>
            </View>

            <View style={styles.clauseItem}>
              <Text style={styles.clauseNumber}>2.</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.clauseTitle}>
                  {hi ? 'शिकायत एवं विवाद समाधान प्रक्रिया (Dispute Resolution)' : 'Dispute Filing & Admin Review'}
                </Text>
                <Text style={styles.clauseBody}>
                  {hi
                    ? 'यदि प्रोवाइडर काम पर नहीं पहुँचा या कार्य अधूरा छोड़ दिया, तो ग्राहक को उसी दिन ऐप में SOS टिकट या सपोर्ट हेल्पलाइन (+917084900909) पर शिकायत दर्ज करानी होगी। एडमिन टीम दोनों पक्षों से पुष्टि के बाद 24 से 48 घंटे में निर्णय लेती है।'
                    : 'If the provider fails to arrive or leaves work incomplete, raise an SOS ticket or call +917084900909 on the same day. Admin resolves disputes within 24-48 hours.'}
                </Text>
              </View>
            </View>

            <View style={styles.clauseItem}>
              <Text style={styles.clauseNumber}>3.</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.clauseTitle}>
                  {hi ? 'बुकिंग कैंसलेशन एवं विज़िट शुल्क (Cancellation Charges)' : 'Cancellation & Visit Charges'}
                </Text>
                <Text style={styles.clauseBody}>
                  {hi
                    ? 'यदि सेवा प्रदाता कार्यस्थल पर पहुँच चुका है और ग्राहक द्वारा बिना किसी ठोस कारण के बुकिंग रद्द की जाती है, तो प्रोवाइडर के यात्रा खर्च हेतु न्यूनतम विज़िट शुल्क (₹100-₹200) काटा जा सकता है।'
                    : 'If the worker/driver has arrived at the location and booking is cancelled without genuine cause, a minimum visit fee may be charged to compensate travel.'}
                </Text>
              </View>
            </View>

            <View style={styles.clauseItem}>
              <Text style={styles.clauseNumber}>4.</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.clauseTitle}>
                  {hi ? 'काम पूरा होने के बाद कोई रिफंड नहीं' : 'No Refund After Completion Confirmation'}
                </Text>
                <Text style={styles.clauseBody}>
                  {hi
                    ? 'एक बार जब ग्राहक द्वारा काम पूरा होने की पुष्टि कर दी जाती है या OTP सत्यापित हो जाता है, तो उस बुकिंग का कोई रिफंड देय नहीं होगा।'
                    : 'Once the job is confirmed completed via OTP or customer approval, no subsequent refund claim can be accepted.'}
                </Text>
              </View>
            </View>
          </View>
        )}

        {activeTab === 'terms' && (
          <View style={styles.sectionCard}>
            <View style={styles.cardHeaderRow}>
              <View style={[styles.iconBadge, { backgroundColor: '#E0F2FE' }]}>
                <Ionicons name="newspaper-outline" size={22} color="#0284C7" />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.cardHeaderTitle}>
                  {hi ? 'नियम व शर्तें (Platform Terms & Conditions)' : 'Terms & Conditions'}
                </Text>
                <Text style={styles.cardHeaderNotice}>
                  {hi ? 'श्रम सारथी नेटवर्क उपयोग के नियम' : 'Rules for using the network'}
                </Text>
              </View>
            </View>

            <View style={styles.clauseItem}>
              <Text style={styles.clauseNumber}>1.</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.clauseTitle}>
                  {hi ? 'प्लेटफ़ॉर्म की भूमिका (Platform Role)' : 'Intermediary Role'}
                </Text>
                <Text style={styles.clauseBody}>
                  {hi
                    ? 'श्रम सारथी नेटवर्क एक तकनीकी मंच (Technology Platform) है जो ग्राहकों को स्वतंत्र सेवा प्रदाताओं (मजदूर, कारीगर, ड्राइवर, वाहन मालिक, ठेकेदार) से सीधे जोड़ता है। प्लेटफ़ॉर्म किसी भी पक्ष का प्रत्यक्ष नियोक्ता नहीं है।'
                    : 'Shram Sarathi Network acts as a technology platform connecting customers directly with independent service providers. It is not an employer of the workers.'}
                </Text>
              </View>
            </View>

            <View style={styles.clauseItem}>
              <Text style={styles.clauseNumber}>2.</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.clauseTitle}>
                  {hi ? 'केवाईसी एवं पहचान सत्यापन (KYC Verification)' : 'Identity & KYC'}
                </Text>
                <Text style={styles.clauseBody}>
                  {hi
                    ? 'सभी प्रोवाइडर्स का आधार व मोबाइल ओटीपी सत्यापन किया जाता है। ग्राहकों से भी उचित पहचान और सही कार्यस्थल का पता प्रदान करने की अपेक्षा की जाती है।'
                    : 'Providers undergo Aadhaar and mobile OTP verification. Customers must also provide genuine identities and verifiable addresses.'}
                </Text>
              </View>
            </View>

            <View style={styles.clauseItem}>
              <Text style={styles.clauseNumber}>3.</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.clauseTitle}>
                  {hi ? 'आपसी सहमति एवं भुगतान (Fair Negotiation & Payment)' : 'Agreed Wages & Settlement'}
                </Text>
                <Text style={styles.clauseBody}>
                  {hi
                    ? 'चैट या कॉल के दौरान तय की गई दर दोनों पक्षों के लिए बाध्यकारी है। काम खत्म होने पर निर्धारित मजदूरी का तुरंत भुगतान करना अनिवार्य है।'
                    : 'The fare or wage agreed in the negotiation chat is binding. Prompt settlement upon completion is mandatory.'}
                </Text>
              </View>
            </View>

            <View style={styles.clauseItem}>
              <Text style={styles.clauseNumber}>4.</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.clauseTitle}>
                  {hi ? 'अनुशासन एवं व्यवहार (Conduct & Respect)' : 'Zero Tolerance for Misconduct'}
                </Text>
                <Text style={styles.clauseBody}>
                  {hi
                    ? 'कार्यस्थल पर किसी भी प्रकार का दुर्व्यवहार, नशा, हिंसा या अवैध गतिविधि सख्त वर्जित है। ऐसा पाए जाने पर अकाउंट स्थायी रूप से ब्लैकलिस्ट कर दिया जाएगा।'
                    : 'Intoxication, abuse, violence, or illegal activities at worksites are strictly prohibited and result in permanent platform blacklisting.'}
                </Text>
              </View>
            </View>
          </View>
        )}

        {activeTab === 'rates' && (
          <View style={styles.sectionCard}>
            <View style={styles.cardHeaderRow}>
              <View style={[styles.iconBadge, { backgroundColor: '#DCFCE7' }]}>
                <Ionicons name="cash-outline" size={22} color="#166534" />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.cardHeaderTitle}>
                  {hi ? 'मानक रेट कार्ड व दिशा-निर्देश' : 'Standard Rate Card & Guidelines'}
                </Text>
                <Text style={styles.cardHeaderNotice}>
                  {hi ? 'सरकारी / बाजार प्रचलित दरों के अनुरूप' : 'Indicative market standard rates'}
                </Text>
              </View>
            </View>

            {/* Rate Items */}
            <View style={styles.rateRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rateTitle}>👷‍♂️ {hi ? 'दैनिक मजदूर (Labour)' : 'Daily Labour'}</Text>
                <Text style={styles.rateDesc}>{hi ? '8 घंटे का कार्य समय (सुबह 9 से शाम 5)' : '8 hrs shift'}</Text>
              </View>
              <Text style={styles.ratePrice}>₹500 - ₹700 {hi ? '/दिन' : '/day'}</Text>
            </View>

            <View style={styles.rateRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rateTitle}>🔧 {hi ? 'कारीगर / मिस्त्री (Karigar)' : 'Karigar / Technician'}</Text>
                <Text style={styles.rateDesc}>{hi ? 'इलेक्ट्रीशियन, प्लंबर, राजमिस्त्री, बढ़ई' : 'Electrician, Plumber, Mason'}</Text>
              </View>
              <Text style={styles.ratePrice}>₹700 - ₹1200 {hi ? '/दिन' : '/day'}</Text>
            </View>

            <View style={styles.rateRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rateTitle}>🚗 {hi ? 'ड्राइवर (Driver)' : 'Driver'}</Text>
                <Text style={styles.rateDesc}>{hi ? 'दैनिक ड्यूटी (8-10 घंटे) अथवा ट्रिप' : 'Daily duty (8-10 hrs)'}</Text>
              </View>
              <Text style={styles.ratePrice}>₹600 - ₹1000 {hi ? '/दिन' : '/day'}</Text>
            </View>

            <View style={styles.rateRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rateTitle}>🚛 {hi ? 'ट्रांसपोर्ट / मालवाहक (Transport)' : 'Transport Vehicle'}</Text>
                <Text style={styles.rateDesc}>{hi ? 'पिकअप, छोटा हाथी, ट्रक (दूरी के अनुसार)' : 'Pickup, Tata Ace, Truck'}</Text>
              </View>
              <Text style={styles.ratePrice}>₹500 + KM</Text>
            </View>

            <View style={styles.rateRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rateTitle}>🏗️ {hi ? 'ठेकेदार (Contractor)' : 'Contractor Work'}</Text>
                <Text style={styles.rateDesc}>{hi ? 'डिजिटल अनुबंध व माइलस्टोन पर आधारित' : 'Milestone digital contract'}</Text>
              </View>
              <Text style={styles.ratePrice}>{hi ? 'कोटेशन अनुसार' : 'As Quoted'}</Text>
            </View>
          </View>
        )}

        {activeTab === 'safety' && (
          <View style={styles.sectionCard}>
            <View style={styles.cardHeaderRow}>
              <View style={[styles.iconBadge, { backgroundColor: '#FEE2E2' }]}>
                <Ionicons name="shield-checkmark-outline" size={22} color="#DC2626" />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.cardHeaderTitle}>
                  {hi ? 'सुरक्षा एवं आपातकालीन SOS' : 'Safety & Emergency SOS'}
                </Text>
                <Text style={styles.cardHeaderNotice}>
                  {hi ? 'आपकी सुरक्षा हमारी सर्वोच्च प्राथमिकता है' : 'Your safety is our priority'}
                </Text>
              </View>
            </View>

            <Text style={styles.safetyPara}>
              {hi
                ? 'यदि कार्यस्थल पर कोई विवाद, दुर्घटना या असुरक्षा की स्थिति उत्पन्न होती है, तो तुरंत नीचे दिए गए बटन से SOS टिकट बनाएं या हेल्पलाइन पर कॉल करें।'
                : 'In case of dispute, hazard, or safety concern at the worksite, immediately raise an SOS ticket or call the helpline.'}
            </Text>

            <TouchableOpacity
              style={styles.sosActionBtn}
              onPress={() => navigation.navigate('SOSTicketScreen')}
            >
              <Ionicons name="alert-circle" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.sosActionBtnText}>
                {hi ? '🚨 SOS व सहायता टिकट दर्ज करें' : '🚨 Raise SOS / Support Ticket'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.sosActionBtn, { backgroundColor: '#0284C7', marginTop: 10 }]}
              onPress={() => Linking.openURL(`tel:${SUPPORT_PHONE}`)}
            >
              <Ionicons name="call" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.sosActionBtnText}>
                {hi ? `हेल्पलाइन पर कॉल करें (${SUPPORT_PHONE})` : `Call Helpline (${SUPPORT_PHONE})`}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    padding: 6,
    marginRight: 8,
  },
  headerCenter: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: PRIMARY,
  },
  phoneHeaderBtn: {
    backgroundColor: PRIMARY,
    padding: 8,
    borderRadius: 20,
  },
  supportBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#BBF7D0',
  },
  supportBannerText: {
    fontSize: 11,
    color: '#166534',
    fontWeight: '600',
  },
  supportBannerNumber: {
    fontSize: 14,
    color: '#14532D',
    fontWeight: '800',
    textDecorationLine: 'underline',
  },
  callNowBtn: {
    backgroundColor: PRIMARY,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  callNowBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 6,
  },
  tabChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    gap: 4,
  },
  tabChipActive: {
    backgroundColor: PRIMARY,
  },
  tabText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#475569',
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  contentContainer: {
    padding: 14,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  iconBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardHeaderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  cardHeaderNotice: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  highlightBox: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  highlightTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#B45309',
    marginBottom: 4,
  },
  highlightText: {
    fontSize: 12,
    color: '#78350F',
    lineHeight: 18,
    fontWeight: '600',
  },
  clauseItem: {
    flexDirection: 'row',
    marginBottom: 14,
    gap: 8,
  },
  clauseNumber: {
    fontSize: 13,
    fontWeight: '800',
    color: PRIMARY,
  },
  clauseTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 3,
  },
  clauseBody: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
  },
  rateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  rateTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  rateDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  ratePrice: {
    fontSize: 13,
    fontWeight: '800',
    color: ACCENT,
  },
  safetyPara: {
    fontSize: 12.5,
    color: '#334155',
    lineHeight: 19,
    marginBottom: 16,
  },
  sosActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    paddingVertical: 12,
    borderRadius: 10,
  },
  sosActionBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
