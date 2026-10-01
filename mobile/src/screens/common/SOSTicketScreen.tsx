import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api, getErrorMessage } from '../../services/api';
import { useLanguage } from '../../i18n/LanguageContext';

interface Ticket {
  id: number;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  created_at: string;
  resolution_notes?: string;
}

export default function SOSTicketScreen({ navigation }: any) {
  const { lang } = useLanguage();
  const hi = lang === 'hi';
  const insets = useSafeAreaInsets();
  const modalBottomPadding = Math.max(insets.bottom, Platform.OS === 'android' ? 34 : 16);

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<'sos_emergency' | 'booking' | 'wallet' | 'dispute' | 'other'>('sos_emergency');
  const [priority, setPriority] = useState<'normal' | 'high' | 'urgent'>('urgent');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/support/tickets');
      if (res.data?.data) {
        setTickets(res.data.data);
      }
    } catch (err: any) {
      if (err?.response?.status === 404) {
        setTickets([]);
      } else {
        console.log('Error fetching tickets:', err);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchTickets();
  };

  const handleCreateTicket = async (isSos = false) => {
    const finalSubject = isSos ? (subject.trim() || (hi ? 'SOS आपातकालीन सहायता' : 'SOS Emergency Help')) : subject.trim();
    const finalDesc = isSos ? (description.trim() || (hi ? 'आपातकालीन सहायता अनुरोध - कृपया तुरंत संपर्क करें।' : 'Emergency SOS request - Please contact immediately.')) : description.trim();

    if (!finalSubject) {
      Alert.alert(hi ? 'त्रुटि' : 'Error', hi ? 'कृपया विषय (Subject) भरें।' : 'Please enter ticket subject.');
      return;
    }
    if (!finalDesc) {
      Alert.alert(hi ? 'त्रुटि' : 'Error', hi ? 'कृपया समस्या का विवरण भरें।' : 'Please enter issue description.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/api/support/tickets', {
        subject: finalSubject,
        description: finalDesc,
        priority: isSos ? 'urgent' : priority,
        is_sos: isSos,
      });

      Alert.alert(
        '✅ ' + (hi ? 'सफलता' : 'Success'),
        res.data?.message || (hi ? 'टिकट सफलतापूर्वक दर्ज कर लिया गया है।' : 'Ticket submitted successfully.')
      );

      setModalVisible(false);
      setSubject('');
      setDescription('');
      fetchTickets();
    } catch (err: any) {
      if (err?.response?.status === 404) {
        Alert.alert(
          hi ? 'सूचना' : 'Notice',
          hi
            ? 'टिकट सेवा अभी सर्वर पर अपडेट हो रही है। आपातकालीन सहायता के लिए कृपया सीधे हेल्पलाइन पर संपर्क करें: 1800-000-0000'
            : 'Ticket service is currently updating on the server. For immediate assistance please call helpline: 1800-000-0000'
        );
      } else {
        Alert.alert(hi ? 'विफल' : 'Failed', getErrorMessage(err));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickSOS = () => {
    Alert.alert(
      '🚨 SOS आपातकालीन कॉल / रिपोर्ट',
      hi
        ? 'क्या आप तुरंत SOS आपातकालीन टिकट दर्ज करना चाहते हैं? सहायता टीम को तत्काल अलर्ट भेजा जाएगा।'
        : 'Do you want to submit an instant SOS Emergency ticket? Our support team will be alerted immediately.',
      [
        { text: hi ? 'रद्द करें' : 'Cancel', style: 'cancel' },
        {
          text: hi ? '🚨 हाँ, SOS भेजें' : '🚨 Yes, Send SOS',
          style: 'destructive',
          onPress: () => handleCreateTicket(true),
        },
      ]
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'resolved':
        return { label: hi ? '✅ समाधान हो गया' : 'Resolved', bg: '#E8F5E9', text: '#2E7D32' };
      case 'in_progress':
        return { label: hi ? '⏳ प्रगति पर है' : 'In Progress', bg: '#FFF8E1', text: '#F57F17' };
      case 'closed':
        return { label: hi ? 'बंद' : 'Closed', bg: '#ECEFF1', text: '#546E7A' };
      default:
        return { label: hi ? '🔴 खुला है' : 'Open', bg: '#FFEBEE', text: '#C62828' };
    }
  };

  const renderTicketItem = ({ item }: { item: Ticket }) => {
    const badge = getStatusBadge(item.status);
    const isUrgent = item.priority === 'urgent' || item.subject.includes('[SOS]');

    return (
      <View style={[styles.ticketCard, isUrgent && styles.ticketCardUrgent]}>
        <View style={styles.ticketHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
            {isUrgent && <Text style={{ fontSize: 16 }}>🚨</Text>}
            <Text style={styles.ticketId}>#{item.id}</Text>
            <Text style={styles.ticketSubject} numberOfLines={1}>
              {item.subject}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.statusText, { color: badge.text }]}>{badge.label}</Text>
          </View>
        </View>

        <Text style={styles.ticketDesc}>{item.description}</Text>

        {item.resolution_notes ? (
          <View style={styles.resolutionBox}>
            <Text style={styles.resolutionTitle}>
              {hi ? '✅ समाधान टिप्पणी:' : '✅ Resolution Note:'}
            </Text>
            <Text style={styles.resolutionText}>{item.resolution_notes}</Text>
          </View>
        ) : null}

        <View style={styles.ticketFooter}>
          <Text style={styles.ticketDate}>
            📅 {new Date(item.created_at).toLocaleDateString('hi-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
          <Text style={[styles.priorityText, isUrgent && { color: '#D32F2F', fontWeight: 'bold' }]}>
            {item.priority === 'urgent' ? '⚠️ ' + (hi ? 'अति आवश्यक' : 'Urgent') : (hi ? 'सामान्य' : 'Normal')}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* ── Top Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={styles.headerTitle}>
            {hi ? 'सपोर्ट व शिकायत प्रणाली' : 'Support & Ticket System'}
          </Text>
          <Text style={styles.headerSub}>SOS & Help Center</Text>
        </View>
        {/* Quick SOS button */}
        <TouchableOpacity style={styles.sosHeaderBtn} onPress={handleQuickSOS} activeOpacity={0.8}>
          <Text style={styles.sosHeaderBtnText}>🚨 SOS</Text>
        </TouchableOpacity>
      </View>

      {/* ── SOS Emergency Banner ── */}
      <View style={styles.sosBanner}>
        <View style={styles.sosIconBox}>
          <Text style={{ fontSize: 24 }}>🚨</Text>
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.sosBannerTitle}>
            {hi ? 'तत्काल SOS सहायता' : 'Emergency SOS Assistance'}
          </Text>
          <Text style={styles.sosBannerSub}>
            {hi
              ? 'सुरक्षा, विवाद या आपात स्थिति में 1-टैप SOS भेजें।'
              : 'One-tap emergency report for safety or urgent disputes.'}
          </Text>
        </View>
        <TouchableOpacity style={styles.sosTriggerBtn} onPress={handleQuickSOS} activeOpacity={0.85}>
          <Text style={styles.sosTriggerBtnText}>{hi ? 'SOS दबाएं' : 'Press SOS'}</Text>
        </TouchableOpacity>
      </View>

      {/* ── Ticket List ── */}
      <View style={styles.listHeaderRow}>
        <Text style={styles.listTitle}>
          {hi ? 'आपकी शिकायतें एवं टिकट' : 'Your Support Tickets'}
        </Text>
        <TouchableOpacity
          style={styles.newTicketBtn}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={18} color="#FFFFFF" />
          <Text style={styles.newTicketBtnText}>{hi ? 'नई शिकायत दर्ज करें' : 'New Ticket'}</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#FF6B00" />
          <Text style={styles.loadingText}>{hi ? 'टिकट लोड हो रहे हैं...' : 'Loading tickets...'}</Text>
        </View>
      ) : (
        <FlatList
          data={tickets}
          keyExtractor={item => String(item.id)}
          renderItem={renderTicketItem}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>🛡️</Text>
              <Text style={styles.emptyTitle}>
                {hi ? 'कोई खुली शिकायत नहीं है' : 'No active tickets'}
              </Text>
              <Text style={styles.emptySub}>
                {hi
                  ? 'यदि आपको कोई समस्या या शिकायत है तो ऊपर "नई शिकायत दर्ज करें" पर क्लिक करें।'
                  : 'If you have any issue, click "New Ticket" to submit a support request.'}
              </Text>
            </View>
          }
        />
      )}

      {/* ── Create Ticket Modal ── */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { paddingBottom: modalBottomPadding + 16 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{hi ? 'नई शिकायत / टिकट दर्ज करें' : 'Create Support Ticket'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close-circle" size={24} color="#999" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 60 }}
              style={{ maxHeight: 380 }}
            >
              {/* Category selector */}
              <Text style={styles.fieldLabel}>{hi ? 'समस्या की श्रेणी' : 'Category'}</Text>
              <View style={styles.categoryRow}>
                {[
                  { key: 'sos_emergency', label: hi ? '🚨 SOS सुरक्षा' : '🚨 SOS Safety' },
                  { key: 'booking', label: hi ? '📋 बुकिंग समस्या' : '📋 Booking' },
                  { key: 'wallet', label: hi ? '💰 वॉलेट / पेमेंट' : '💰 Payment' },
                  { key: 'dispute', label: hi ? '⚖️ कार्य विवाद' : '⚖️ Dispute' },
                  { key: 'other', label: hi ? 'अन्य' : 'Other' },
                ].map(c => (
                  <TouchableOpacity
                    key={c.key}
                    style={[styles.catChip, category === c.key && styles.catChipActive]}
                    onPress={() => {
                      setCategory(c.key as any);
                      if (c.key === 'sos_emergency') setPriority('urgent');
                    }}
                  >
                    <Text style={[styles.catChipText, category === c.key && styles.catChipTextActive]}>
                      {c.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Priority selector */}
              <Text style={styles.fieldLabel}>{hi ? 'प्राथमिकता' : 'Priority'}</Text>
              <View style={styles.priorityRow}>
                {[
                  { key: 'normal', label: hi ? 'सामान्य' : 'Normal', color: '#2E7D32' },
                  { key: 'high', label: hi ? 'उच्च (High)' : 'High', color: '#F57F17' },
                  { key: 'urgent', label: hi ? 'अति आवश्यक (Urgent)' : 'Urgent', color: '#D32F2F' },
                ].map(p => (
                  <TouchableOpacity
                    key={p.key}
                    style={[styles.prioChip, priority === p.key && { borderColor: p.color, backgroundColor: p.color + '15' }]}
                    onPress={() => setPriority(p.key as any)}
                  >
                    <Text style={[styles.prioChipText, priority === p.key && { color: p.color, fontWeight: '700' }]}>
                      {p.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Subject Input */}
              <Text style={styles.fieldLabel}>{hi ? 'विषय / मुख्य समस्या' : 'Subject'}</Text>
              <TextInput
                style={styles.textInput}
                placeholder={hi ? 'उदा: भुगतान नहीं मिला / मजदूर नहीं पहुंचा...' : 'e.g. Payment not received...'}
                value={subject}
                onChangeText={setSubject}
              />

              {/* Description Input */}
              <Text style={styles.fieldLabel}>{hi ? 'विस्तार से विवरण लिखें' : 'Description'}</Text>
              <TextInput
                style={[styles.textInput, { height: 100, textAlignVertical: 'top' }]}
                placeholder={hi ? 'समस्या का पूरा विवरण यहां लिखें...' : 'Explain the issue in detail...'}
                value={description}
                onChangeText={setDescription}
                multiline
              />
            </ScrollView>

            <TouchableOpacity
              style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
              onPress={() => handleCreateTicket(category === 'sos_emergency')}
              disabled={submitting}
              activeOpacity={0.85}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.submitBtnText}>
                  {category === 'sos_emergency'
                    ? (hi ? '🚨 तत्काल SOS टिकट सबमिट करें' : 'Submit SOS Ticket')
                    : (hi ? 'टिकट सबमिट करें' : 'Submit Ticket')}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  backBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  headerSub: {
    fontSize: 11,
    color: '#666666',
  },
  sosHeaderBtn: {
    backgroundColor: '#D32F2F',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  sosHeaderBtnText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 12,
  },
  sosBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    margin: 16,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  sosIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFCDD2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sosBannerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#B71C1C',
  },
  sosBannerSub: {
    fontSize: 11,
    color: '#C62828',
    marginTop: 2,
  },
  sosTriggerBtn: {
    backgroundColor: '#D32F2F',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  sosTriggerBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  listTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  newTicketBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B00',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  newTicketBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  listContainer: {
    padding: 16,
    gap: 12,
  },
  ticketCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 12,
  },
  ticketCardUrgent: {
    borderColor: '#FFCDD2',
    borderLeftWidth: 4,
    borderLeftColor: '#D32F2F',
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  ticketId: {
    fontSize: 12,
    color: '#888888',
    fontWeight: '600',
  },
  ticketSubject: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  ticketDesc: {
    fontSize: 13,
    color: '#444444',
    lineHeight: 18,
    marginBottom: 10,
  },
  resolutionBox: {
    backgroundColor: '#E8F5E9',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  resolutionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2E7D32',
    marginBottom: 2,
  },
  resolutionText: {
    fontSize: 12,
    color: '#1B5E20',
  },
  ticketFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 8,
  },
  ticketDate: {
    fontSize: 11,
    color: '#888888',
  },
  priorityText: {
    fontSize: 11,
    color: '#666666',
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 13,
    color: '#666666',
    marginTop: 10,
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333333',
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 12,
    color: '#777777',
    textAlign: 'center',
    paddingHorizontal: 30,
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#444444',
    marginTop: 10,
    marginBottom: 6,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  catChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    backgroundColor: '#FAFAFA',
  },
  catChipActive: {
    borderColor: '#FF6B00',
    backgroundColor: '#FFF3E8',
  },
  catChipText: {
    fontSize: 11,
    color: '#555555',
  },
  catChipTextActive: {
    color: '#FF6B00',
    fontWeight: '700',
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  prioChip: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    alignItems: 'center',
  },
  prioChipText: {
    fontSize: 11,
    color: '#666666',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#1A1A1A',
    backgroundColor: '#FFFFFF',
  },
  submitBtn: {
    backgroundColor: '#FF6B00',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
