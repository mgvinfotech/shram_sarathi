import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Portal, Modal, Text, Button, Divider } from 'react-native-paper';
import { useLanguage } from '../i18n/LanguageContext';

type Clause = {
  no: number;
  hi_title: string;
  en_title: string;
  hi: string;
  en: string;
};

type Terms = {
  version?: string;
  title_hi?: string;
  title_en?: string;
  preamble_hi?: string;
  preamble_en?: string;
  clauses?: Clause[];
};

const PRIMARY = '#FF6B00';

/**
 * PART–F (A) — प्लेटफ़ॉर्म की स्थायी शर्तें [Read-Only].
 * Tier-1 SSN terms; proposal ke saath freeze hoti hain.
 */
export default function SsnTermsSheet({
  visible,
  onDismiss,
  terms,
}: {
  visible: boolean;
  onDismiss: () => void;
  terms?: Terms | null;
}) {
  const { lang } = useLanguage();
  const hi = lang === 'hi';
  const T = (h: string, e: string) => (hi ? h : e);

  const clauses = terms?.clauses ?? [];

  return (
    <Portal>
      <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.modal}>
        <View style={styles.head}>
          <Text style={styles.title}>
            {hi ? terms?.title_hi ?? 'प्लेटफ़ॉर्म की स्थायी शर्तें' : terms?.title_en ?? 'Standard SSN Platform Terms'}
          </Text>
          <View style={styles.roPill}>
            <Text style={styles.roTxt}>🔒 Read-Only · v{terms?.version ?? '1.0'}</Text>
          </View>
        </View>
        <Divider />
        <ScrollView style={{ maxHeight: 460 }} contentContainerStyle={{ padding: 16 }}>
          {!!(hi ? terms?.preamble_hi : terms?.preamble_en) && (
            <Text style={styles.preamble}>{hi ? terms?.preamble_hi : terms?.preamble_en}</Text>
          )}
          {clauses.length === 0 && (
            <Text style={styles.preamble}>{T('शर्तें लोड नहीं हो सकीं।', 'Terms could not be loaded.')}</Text>
          )}
          {clauses.map((c) => (
            <View key={c.no} style={styles.clause}>
              <Text style={styles.clauseTitle}>
                {c.no}. {hi ? c.hi_title : c.en_title}
              </Text>
              <Text style={styles.clauseBody}>{hi ? c.hi : c.en}</Text>
            </View>
          ))}
          <Text style={styles.legal}>
            {T(
              'नोट: "Version History Record (V1, V2… VN)" डिजिटल ऑडिट ट्रेल के रूप में सुरक्षित रखा जाता है।',
              'Note: The Version History Record (V1, V2… VN) is retained as a digital audit trail.'
            )}
          </Text>
        </ScrollView>
        <Divider />
        <Button mode="contained" onPress={onDismiss} buttonColor={PRIMARY} style={styles.closeBtn}>
          {T('बंद करें', 'Close')}
        </Button>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: { backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 14, overflow: 'hidden' },
  head: { padding: 16, paddingBottom: 12 },
  title: { fontSize: 16, fontWeight: '800', color: '#1A202C' },
  roPill: { alignSelf: 'flex-start', backgroundColor: '#EDF2F7', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, marginTop: 6 },
  roTxt: { fontSize: 10.5, color: '#4A5568', fontWeight: '700' },
  preamble: { fontSize: 12.5, color: '#4A5568', lineHeight: 19, marginBottom: 14, fontStyle: 'italic' },
  clause: { marginBottom: 14 },
  clauseTitle: { fontSize: 13.5, fontWeight: '700', color: PRIMARY, marginBottom: 3 },
  clauseBody: { fontSize: 12.5, color: '#2D3748', lineHeight: 19 },
  legal: { fontSize: 11, color: '#718096', lineHeight: 17, marginTop: 4, borderTopWidth: 1, borderTopColor: '#EDF2F7', paddingTop: 10 },
  closeBtn: { margin: 14, borderRadius: 10 },
});
