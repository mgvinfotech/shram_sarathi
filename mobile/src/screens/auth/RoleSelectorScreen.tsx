import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Card, Text } from 'react-native-paper';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../../store';
import { completeSignup } from '../../store/slices/authSlice';
import { useLanguage } from '../../i18n/LanguageContext';

interface Props {
  navigation: any;
  route: { params?: { phone?: string } };
}

export default function RoleSelectorScreen({ navigation, route }: Props) {
  const { t, lang } = useLanguage();
  const dispatch = useDispatch<AppDispatch>();
  const [isLoading, setIsLoading] = useState(false);

  // phone is passed from OTPScreen after OTP verified
  const phone = route.params?.phone;

  const handleSelect = async (dbRole: string, roles: string[], categorySlug?: string) => {
    if (!phone) {
      Alert.alert('Error', 'Session expired. Please signup again.');
      navigation.replace('Login');
      return;
    }

    setIsLoading(true);
    try {
      const result = await dispatch(completeSignup({ phone, role: dbRole as any, roles }));

      if (completeSignup.fulfilled.match(result)) {
        if (dbRole !== 'customer') {
          navigation.reset({ index: 0, routes: [{ name: 'ProviderSetup', params: { initialCategory: categorySlug } }] });
        } else {
          navigation.reset({ index: 0, routes: [{ name: 'CustomerApp' }] });
        }
      } else {
        Alert.alert('Error', (result.payload as string) || 'Signup failed. Please try again.');
      }
    } catch {
      Alert.alert('Error', lang === 'hi' ? 'कनेक्शन विफल। पुनः प्रयास करें।' : 'Connection failed. Please retry.');
    } finally {
      setIsLoading(false);
    }
  };

  // Maps each card id to the actual backend DB role
  const ROLES: { id: string; dbRole: string; roles: string[]; category: string; title: string; emoji: string; color: string; border: string }[] = [
    { id: 'customer',  dbRole: 'customer',    roles: ['customer'],             category: '',          title: lang === 'hi' ? 'ग्राहक'          : 'Customer',    emoji: '🏠', color: '#FFF5EE', border: '#FF6B00' },
    { id: 'majdoor',   dbRole: 'labour',      roles: ['labour',   'customer'], category: 'majdoor',   title: lang === 'hi' ? 'श्रमिक'          : 'Labour',      emoji: '👷', color: '#F0FFF4', border: '#38A169' },
    { id: 'thekedar',  dbRole: 'contractor',  roles: ['contractor','customer'], category: 'thekedar',  title: lang === 'hi' ? 'ठेकेदार'         : 'Contractor',  emoji: '🏗️', color: '#F0F5FF', border: '#3182CE' },
    { id: 'karigar',   dbRole: 'karigar',     roles: ['karigar',  'customer'], category: 'karigar',   title: lang === 'hi' ? 'कारीगर'          : 'Artisan',     emoji: '🔧', color: '#FFFFF0', border: '#D69E2E' },
    { id: 'driver',    dbRole: 'driver',      roles: ['driver',   'customer'], category: 'driver',    title: lang === 'hi' ? 'स्वतंत्र ड्राइवर': 'Driver',      emoji: '🚕', color: '#FFF5F5', border: '#E53E3E' },
    { id: 'transport', dbRole: 'driver',      roles: ['driver',   'customer'], category: 'transport',  title: lang === 'hi' ? 'परिवहन सेवा'    : 'Transport',   emoji: '🚛', color: '#F5F0FF', border: '#805AD5' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>{t('whoAreYou') || 'आप कौन हैं?'}</Text>
      <Text style={styles.subtitle}>{t('selectRole') || 'अपनी भूमिका चुनें'}</Text>

      <View style={styles.cardsContainer}>
        {ROLES.map((r) => (
          <Card
            key={r.id}
            style={[styles.card, { backgroundColor: r.color, borderColor: r.border }, isLoading && styles.cardDisabled]}
            onPress={() => handleSelect(r.dbRole, r.roles, r.category)}
            disabled={isLoading}
          >
            <Card.Content style={styles.cardContent}>
              <Text style={styles.cardEmoji}>{r.emoji}</Text>
              <Text variant="titleMedium" style={styles.cardTitle}>{r.title}</Text>
            </Card.Content>
          </Card>
        ))}
      </View>

      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#FF6B00" />
          <Text style={styles.loadingText}>
            {lang === 'hi' ? 'अकाउंट बन रहा है...' : 'Creating your account...'}
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 20, justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#333', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 24 },
  cardsContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
  card: {
    width: '48%',
    borderRadius: 16, 
    marginBottom: 12,
    borderWidth: 2,
  },
  cardContent: {
    paddingVertical: 20, paddingHorizontal: 8, alignItems: 'center',
  },
  cardDisabled: { opacity: 0.6 },
  cardEmoji: { fontSize: 36, marginBottom: 8 },
  cardTitle: { fontWeight: 'bold', color: '#333', textAlign: 'center' },
  loadingOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.85)',
    justifyContent: 'center', alignItems: 'center', gap: 12,
  },
  loadingText: { fontSize: 16, color: '#FF6B00', fontWeight: '600' },
});
