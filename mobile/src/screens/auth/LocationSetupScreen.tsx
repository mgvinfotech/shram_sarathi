import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator, Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TextInput } from 'react-native-paper';
import * as Location from 'expo-location';
import SignupProgressBar from '../../components/SignupProgressBar';
import { useLanguage } from '../../i18n/LanguageContext';

// ─── Design Tokens ────────────────────────────────────────────────────────────
const G = {
  primary: '#FF6B00',
  bg:      '#FAFAFA',
  white:   '#FFFFFF',
  text:    '#1A1A1A',
  sub:     '#666666',
  border:  '#E0E0E0',
  success: '#2E7D32',
};

export default function LocationSetupScreen({ navigation, route }: any) {
  const { lang } = useLanguage();
  const hi = lang === 'hi';

  // Accept both old format { role, formData } and new format { roles, profileData }
  const {
    roles,
    role,
    profileData,
    formData,
    phone,
    name,
    ...restParams
  } = route.params || {};

  const [address, setAddress]     = useState('');
  const [radiusKm, setRadiusKm]   = useState('10');
  const [fetching, setFetching]   = useState(false);

  const handleFetchGPS = async () => {
    setFetching(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          '',
          hi ? 'लोकेशन की अनुमति नहीं मिली। कृपया मैन्युअल पता लिखें।'
             : 'Location permission denied. Please type your address manually.'
        );
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const geo = await Location.reverseGeocodeAsync({
        latitude:  loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
      if (geo && geo.length > 0) {
        const g = geo[0];
        const parts = [g.street, g.subregion, g.city, g.region].filter(Boolean);
        setAddress(parts.join(', '));
      } else {
        setAddress(`Lat: ${loc.coords.latitude.toFixed(4)}, Lng: ${loc.coords.longitude.toFixed(4)}`);
      }
    } catch (e: any) {
      Alert.alert('', hi ? 'लोकेशन प्राप्त करने में समस्या हुई।' : 'Could not fetch location.');
    } finally {
      setFetching(false);
    }
  };

  const handleNext = () => {
    if (!address.trim()) {
      Alert.alert('', hi ? 'कृपया अपना पता दर्ज करें।' : 'Please enter your address.');
      return;
    }
    const locationData = {
      address:  address.trim(),
      radiusKm: radiusKm ? parseFloat(radiusKm) : 10,
      lat: 0,
      lng: 0,
    };
    navigation.navigate('KYCDocumentsScreen', {
      roles,
      role,
      profileData,
      formData,
      phone,
      name,
      location:     address.trim(),
      radius:       radiusKm,
      locationData,
      ...restParams,
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <SignupProgressBar currentStep={4} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Back */}
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
            <Text style={styles.backText}>← {hi ? 'वापस' : 'Back'}</Text>
          </TouchableOpacity>

          <Text style={styles.title}>
            📍 {hi ? 'काम की जगह / पता' : 'Work Location'}
          </Text>
          <Text style={styles.subtitle}>
            {hi
              ? 'आप कहाँ काम करना चाहते हैं? यह जानकारी ग्राहकों को आप तक पहुँचने में मदद करेगी।'
              : 'Where do you want to work? This helps customers find you nearby.'}
          </Text>

          {/* GPS Button */}
          <TouchableOpacity
            style={styles.gpsBtn}
            onPress={handleFetchGPS}
            disabled={fetching}
            activeOpacity={0.8}
          >
            {fetching ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.gpsBtnText}>
                📍 {hi ? 'GPS से लोकेशन लें (Auto-Fetch)' : 'Fetch GPS Location'}
              </Text>
            )}
          </TouchableOpacity>

          <Text style={styles.orDivider}>{hi ? '— या मैन्युअल भरें —' : '— or type manually —'}</Text>

          {/* Address Input */}
          <TextInput
            label={hi ? 'पता / पिन / गाँव / मोहल्ला *' : 'Address / Village / Area *'}
            value={address}
            onChangeText={setAddress}
            mode="outlined"
            activeOutlineColor={G.primary}
            style={styles.input}
            multiline
            numberOfLines={3}
            placeholder={hi ? 'जैसे: वार्ड 5, रामपुर, जिला सागर' : 'e.g. Ward 5, Rampur, Sagar'}
          />

          {/* Radius Input */}
          <TextInput
            label={hi ? 'काम करने की सीमा (KM)' : 'Work Radius (KM)'}
            value={radiusKm}
            onChangeText={setRadiusKm}
            mode="outlined"
            activeOutlineColor={G.primary}
            style={styles.input}
            keyboardType="number-pad"
            placeholder="10"
            right={<TextInput.Affix text=" KM" />}
          />

          <Text style={styles.hintText}>
            {hi
              ? `ℹ️ ${radiusKm || 10} KM के दायरे में आने वाले ग्राहक आपको देख सकेंगे।`
              : `ℹ️ Customers within ${radiusKm || 10} KM will be able to see your profile.`}
          </Text>

          <View style={{ height: 20 }} />
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.btn} onPress={handleNext} activeOpacity={0.85}>
            <Text style={styles.btnText}>{hi ? 'आगे बढ़ें →' : 'Continue →'}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: G.white },
  scroll: { flex: 1, backgroundColor: G.bg },
  scrollContent: { padding: 20, paddingBottom: 120 },

  back: { marginBottom: 16 },
  backText: { color: G.primary, fontSize: 15, fontWeight: '600' },

  title: { fontSize: 22, fontWeight: '800', color: G.text, marginBottom: 8 },
  subtitle: { fontSize: 13, color: G.sub, marginBottom: 24, lineHeight: 20 },

  gpsBtn: {
    backgroundColor: '#2E7D32',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#2E7D32',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  gpsBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },

  orDivider: {
    textAlign: 'center',
    color: G.sub,
    fontSize: 12,
    fontWeight: '600',
    marginVertical: 14,
  },

  input: { backgroundColor: G.white, marginBottom: 14 },

  hintText: {
    fontSize: 12,
    color: '#2E7D32',
    backgroundColor: '#F0FFF4',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#C6F6D5',
  },

  footer: {
    backgroundColor: G.white,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  btn: {
    backgroundColor: G.primary,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    shadowColor: G.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '800', letterSpacing: 0.3 },
});
