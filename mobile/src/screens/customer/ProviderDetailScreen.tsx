import { SafeAreaView } from 'react-native-safe-area-context';
import React from 'react';
import {
  View, ScrollView, StyleSheet, Platform, StatusBar, Linking, Alert
} from 'react-native';
import { Button, Appbar, Card, Avatar, Text, Chip, Surface } from 'react-native-paper';
import { useLanguage } from '../../i18n/LanguageContext';
import { getSkillTranslation } from '../../utils/skills';

interface Props {
  navigation: any;
  route?: { params?: { provider?: any } };
}

export default function ProviderDetailScreen({ navigation, route }: Props) {
  const provider = route?.params?.provider;
  const { t, lang } = useLanguage();

  if (!provider) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 16, color: '#333' }}>
            {lang === 'hi' ? 'सारथी की जानकारी नहीं मिली' : 'Provider details not found'}
          </Text>
          <Button mode="contained" buttonColor="#FF6B00" onPress={() => navigation.goBack()}>
            {lang === 'hi' ? 'वापस जाएं' : 'Go Back'}
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  const isThekedar = provider.category === 'thekedar';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* Header */}
        <Appbar.Header style={styles.header}>
          <Appbar.BackAction onPress={() => navigation.goBack()} color="#FF6B00" />
          <Appbar.Content title="" />
        </Appbar.Header>

        {/* Profile Card */}
        <Card style={styles.profileCard}>
          <Card.Content style={styles.profileCardContent}>
            <Avatar.Text size={80} label={provider.name[0]} style={styles.avatar} />
            <Text variant="headlineSmall" style={styles.name}>{provider.name}</Text>
            <Text variant="bodyMedium" style={styles.category}>
              {t(provider.category as any) || provider.category}
              {provider.sub_categories && provider.sub_categories.length > 0 ? (
                ` (${provider.sub_categories.map((slug: string) => getSkillTranslation(slug, lang as any)).join(', ')})`
              ) : ''}
            </Text>

            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Text variant="titleMedium" style={styles.statValue}>⭐ {provider.rating.toFixed(1)}</Text>
                <Text variant="labelSmall" style={styles.statLabel}>Rating</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.stat}>
                <Text variant="titleMedium" style={styles.statValue}>{provider.total_bookings}</Text>
                <Text variant="labelSmall" style={styles.statLabel}>Bookings</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.stat}>
                <Text variant="titleMedium" style={styles.statValue}>📍 {Number(provider.distance_km).toFixed(2)}</Text>
                <Text variant="labelSmall" style={styles.statLabel}>{t('kmAway')}</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Sub Categories */}
        {provider.sub_categories?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Skills</Text>
            <View style={styles.chips}>
              {provider.sub_categories.map((s: string) => (
                <Chip key={s} style={styles.chip} textStyle={styles.chipText}>
                  {s}
                </Chip>
              ))}
            </View>
          </View>
        )}

        {/* Privacy Note */}
        <Surface style={styles.privacyNote} elevation={1}>
          <Text variant="titleSmall" style={styles.privacyText}>
            🔒 {t('numberPrivate')}
          </Text>
          <Text variant="bodySmall" style={styles.privacySubtext}>
            {isThekedar
              ? (lang === 'hi'
                ? 'मात्रा भरें और कुल बिल देखें। कॉल के बाद ठेकेदार को सीक्रेट PIN दें।'
                : 'Enter quantity to see total bill. After call, give PIN to contractor.')
              : t('feeNote1')}
          </Text>
        </Surface>

        {/* CTA */}
        <View style={styles.ctaContainer}>
          {isThekedar ? (
            <View style={{ gap: 10 }}>
              <Button
                mode="contained"
                style={styles.ctaButton}
                onPress={() => navigation.navigate('ContractProposalCreate', { contractorId: provider.user_id || provider.id, provider })}
                buttonColor="#FF6B00"
                labelStyle={styles.ctaText}
              >
                📝 {lang === 'hi' ? 'डिजिटल ठेका प्रस्ताव भेजें (V1)' : 'Send Contract Proposal (V1)'}
              </Button>

              <Button
                mode="outlined"
                style={[styles.ctaButton, { borderColor: '#FF6B00', backgroundColor: '#FFF4E5' }]}
                onPress={() => navigation.navigate('ContractorBooking', { provider })}
                textColor="#FF6B00"
                labelStyle={[styles.ctaText, { color: '#FF6B00' }]}
              >
                🏗️ {lang === 'hi' ? 'मात्रा भरें & कॉल करें' : 'Enter Quantity & Call'}
              </Button>
            </View>
          ) : (
            <Button
              mode="contained"
              style={styles.ctaButton}
              onPress={() => {
                if (provider.phone) {
                  Linking.openURL(`tel:${provider.phone}`);
                } else {
                  Alert.alert('', t('phoneNotAvailable') || 'Phone number not available');
                }
              }}
              buttonColor="#FF6B00"
              labelStyle={styles.ctaText}
            >
              📞 {t('callNow') || 'Call Provider'}
            </Button>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    
  },
  header: { backgroundColor: '#fff', elevation: 0 },
  profileCard: {
    margin: 16, borderRadius: 20, backgroundColor: '#fff',
  },
  profileCardContent: { alignItems: 'center', padding: 24 },
  avatar: { backgroundColor: '#FF6B00', marginBottom: 12 },
  name: { fontWeight: 'bold', color: '#333' },
  category: { fontSize: 14, color: '#666', marginTop: 4, marginBottom: 20 },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  stat: { alignItems: 'center', paddingHorizontal: 20 },
  statValue: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  statLabel: { fontSize: 11, color: '#999', marginTop: 2 },
  statDivider: { width: 1, height: 32, backgroundColor: '#eee' },
  section: { backgroundColor: '#fff', margin: 16, borderRadius: 16, padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: '#FFF5EE', borderRadius: 20,
  },
  chipText: { fontSize: 12, color: '#FF6B00' },
  privacyNote: {
    backgroundColor: '#F0FFF4', margin: 16, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#C6F6D5',
  },
  privacyText: { fontSize: 14, fontWeight: '600', color: '#276749', marginBottom: 4 },
  privacySubtext: { fontSize: 12, color: '#2F855A', lineHeight: 18 },
  ctaContainer: { padding: 16, paddingBottom: 32 },
  ctaButton: {
    borderRadius: 14,
    paddingVertical: 6,
  },
  ctaText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});
