import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useEffect, useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, ScrollView, TouchableOpacity, StyleSheet,
  Platform, StatusBar, Alert, Image,
} from 'react-native';
import { Searchbar, Avatar, Text } from 'react-native-paper';
import * as Location from 'expo-location';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store';
import { searchNearby } from '../../store/slices/providerSlice';
import { useLanguage } from '../../i18n/LanguageContext';
import { MobileTranslationKeys } from '../../i18n/en';
import { api } from '../../services/api';

// Category config — keys map to translation keys
const CATEGORIES: { key: MobileTranslationKeys; emoji: string; slug: string }[] = [
  { slug: 'majdoor', emoji: '👷', key: 'majdoor' },
  { slug: 'karigar', emoji: '🔧', key: 'karigar' },
  { slug: 'driver', emoji: '🚗', key: 'driver' },
  { slug: 'thekedar', emoji: '🏗️', key: 'thekedar' },
  { slug: 'transport', emoji: '🚛', key: 'transport' },
];

interface Props {
  navigation: any;
}

export default function HomeScreen({ navigation }: Props) {
  const [searchText, setSearchText] = useState('');
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationName, setLocationName] = useState('');
  const [locationDistrict, setLocationDistrict] = useState('');
  const [locationState, setLocationState] = useState('');
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  const dispatch = useDispatch<AppDispatch>();
  const { name } = useSelector((s: RootState) => s.auth);
  const { t, lang, toggle } = useLanguage();

  useFocusEffect(
    useCallback(() => {
      api.get('/api/wallet')
        .then((res) => {
          if (res.data?.balance !== undefined) {
            setWalletBalance(res.data.balance);
          }
        })
        .catch(() => { });
    }, [])
  );

  useEffect(() => {
    setLocationName(t('findingLocation'));
    requestLocation();
  }, []);

  const requestLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationName(t('locationDenied'));
        return;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const { latitude, longitude } = loc.coords;
      setLocation({ lat: latitude, lng: longitude });
      const [address] = await Location.reverseGeocodeAsync({ latitude, longitude });
      const street = address.street || address.name || '';
      const dist = address.district || address.city || '';
      const st = address.region || '';
      setLocationDistrict(dist);
      setLocationState(st);
      const display = [street, dist, st].filter(Boolean).join(', ') || `${dist}, ${st}`;
      setLocationName(display);
      dispatch(searchNearby({ lat: latitude, lng: longitude, district: dist, state: st }));
    } catch (error) {
      setLocationName("Varanasi, UP");
      setLocation({ lat: 25.3176, lng: 82.9739 });
      setLocationDistrict("Varanasi");
      setLocationState("Uttar Pradesh");
      dispatch(searchNearby({ lat: 25.3176, lng: 82.9739, district: 'Varanasi', state: 'Uttar Pradesh' }));
    }
  };

  const handleCategoryPress = (slug: string) => {
    const lat = location?.lat || 25.3176;
    const lng = location?.lng || 82.9739;

    // Transport category → dedicated booking screen
    if (slug === 'transport') {
      navigation.navigate('TransportBooking');
      return;
    }

    // Thekedar → डिजिटल ठेका प्रस्ताव (Contract Proposal) या ठेकेदार खोजें
    if (slug === 'thekedar') {
      const hi = lang === 'hi';
      Alert.alert(
        hi ? '🏗️ ठेकेदार सेवा' : '🏗️ Contractor Service',
        hi
          ? 'आप ठेका कार्य का डिजिटल प्रस्ताव बनाकर आस-पास के सभी ठेकेदारों को एक साथ भेज सकते हैं।'
          : 'You can create a digital contract proposal and broadcast it to all nearby contractors at once.',
        [
          {
            text: hi ? '📝 ठेका प्रस्ताव बनाएँ' : '📝 Create Proposal',
            onPress: () => navigation.navigate('ContractProposalCreate'),
          },
          {
            text: hi ? '📋 मेरे प्रस्ताव' : '📋 My Proposals',
            onPress: () => navigation.navigate('MyContractProposals'),
          },
          {
            text: hi ? '🔍 ठेकेदार खोजें' : '🔍 Browse Contractors',
            onPress: () => {
              dispatch(searchNearby({ lat, lng, category: slug, district: locationDistrict, state: locationState }));
              navigation.navigate('ProviderList', { category: slug, lat, lng, district: locationDistrict, state: locationState });
            },
          },
        ]
      );
      return;
    }

    if (slug === 'majdoor') {
      navigation.navigate('LabourRequest', { labour_type: slug, lat, lng });
      return;
    }
    if (slug === 'karigar') {
      navigation.navigate('KarigarBooking', { labour_type: slug, lat, lng });
      return;
    }
    if (slug === 'driver') {
      navigation.navigate('DriverBooking', { lat, lng });
      return;
    }

    dispatch(searchNearby({ lat, lng, category: slug, district: locationDistrict, state: locationState }));
    navigation.navigate('ProviderList', {
      category: slug,
      lat,
      lng,
      district: locationDistrict,
      state: locationState,
    });
  };

  const filteredCategories = CATEGORIES.filter((c) =>
    t(c.key).toLowerCase().includes(searchText.toLowerCase())
  );

  const workerCategories = filteredCategories.filter((c) => c.slug !== 'transport');
  const showTransport = filteredCategories.some((c) => c.slug === 'transport');

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Official App Branding Bar */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Image
              source={require('../../../assets/logo.png')}
              style={{ width: 36, height: 36 }}
              resizeMode="contain"
            />
            <View>
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#E65100' }}>
                श्रम सारथी नेटवर्क
              </Text>
              <Text style={{ fontSize: 9.5, fontWeight: '700', color: '#6B7280', letterSpacing: 0.4 }}>
                SHRAM SARATHI NETWORK
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {/* Language Toggle */}
            <TouchableOpacity
              style={styles.langToggle}
              onPress={toggle}
              accessibilityLabel="Toggle language"
            >
              <Text style={[styles.langOpt, lang === 'hi' && styles.langActive]}>हिं</Text>
              <Text style={styles.langSep}>|</Text>
              <Text style={[styles.langOpt, lang === 'en' && styles.langActive]}>EN</Text>
            </TouchableOpacity>

            {/* Avatar (fully visible) */}
            <TouchableOpacity
              onPress={() => navigation.navigate('ProfileTab')}
              accessibilityLabel={t('profile')}
              style={styles.avatarWrapper}
            >
              <Avatar.Text size={36} label={name?.[0]?.toUpperCase() || 'U'} style={styles.avatar} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Header Greeting & Location */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting} numberOfLines={1}>
              {t('hello')}, {name || t('friend')} 👋
            </Text>
            <View style={styles.locationRow}>
              <Text style={styles.locationIcon}>📍</Text>
              <Text style={styles.locationText} numberOfLines={1}>{locationName}</Text>
            </View>
          </View>
        </View>

        {/* Search */}
        <Searchbar
          placeholder={t('searchPlaceholder')}
          onChangeText={setSearchText}
          value={searchText}
          style={styles.searchContainer}
          iconColor="#FF6B00"
          inputStyle={{ fontSize: 14 }}
        />

        {/* Promo / Trust Banner */}
        <View style={styles.promoBanner}>
          <View style={{ flex: 1 }}>
            <View style={styles.badgeRow}>
              <Text style={styles.badgeText}>🇮🇳 श्रम सारथी</Text>
            </View>
            <Text style={styles.bannerTitle}>
              {lang === 'hi' ? 'भरोसेमंद मजदूर और सेवाएं' : 'Trusted Workers & Services'}
            </Text>
            <Text style={styles.bannerSubtitle}>
              {lang === 'hi' ? 'सत्यापित कर्मी • सुरक्षित बुकिंग • पारदर्शी दरें' : 'Verified Workers • Safe Booking • Fair Rates'}
            </Text>
          </View>
          <View style={styles.bannerIconBox}>
            <Text style={{ fontSize: 30 }}>🛡️</Text>
          </View>
        </View>

        {/* Categories Section Header */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>{t('selectService')}</Text>
          <Text style={styles.categoryCountBadge}>
            {lang === 'hi' ? 'मुख्य सेवाएं' : 'Main Services'}
          </Text>
        </View>

        {/* 4 Core Workers Row (मजदूर, कारीगर, ड्राइवर, ठेकेदार) */}
        {workerCategories.length > 0 && (
          <View style={styles.grid}>
            {workerCategories.map((cat) => (
              <TouchableOpacity
                key={cat.slug}
                style={styles.categoryItem}
                onPress={() => handleCategoryPress(cat.slug)}
                accessibilityLabel={t(cat.key)}
                accessibilityRole="button"
                activeOpacity={0.7}
              >
                <View style={styles.categoryCircle}>
                  <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                </View>
                <Text style={styles.categoryLabel} numberOfLines={1}>{t(cat.key)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Transport Dedicated Service Card */}
        {showTransport && (
          <TouchableOpacity
            style={styles.transportCard}
            onPress={() => handleCategoryPress('transport')}
            activeOpacity={0.8}
            accessibilityLabel={t('transport')}
          >
            <View style={styles.transportIconBox}>
              <Text style={{ fontSize: 28 }}>🚛</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={styles.transportTitle}>
                  {t('transport')}
                </Text>
                <View style={styles.transportTag}>
                  <Text style={styles.transportTagText}>
                    {lang === 'hi' ? 'वाहन सेवा' : 'Vehicles'}
                  </Text>
                </View>
              </View>
              <Text style={styles.transportDesc} numberOfLines={1}>
                {lang === 'hi'
                  ? 'पिकअप, छोटा हाथी, ट्रक, लोडर • माल ढुलाई बुकिंग'
                  : 'Pickup, Mini Truck, Loader • Freight & Goods'}
              </Text>
            </View>
            <View style={styles.transportArrowBox}>
              <Text style={{ color: '#FF6B00', fontWeight: 'bold', fontSize: 16 }}>➔</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* ── Coming Soon Services Section (Construction & Agriculture Material) ── */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>
            {lang === 'hi' ? 'सामग्री एवं सप्लाई सेवाएं' : 'Materials & Supply Services'}
          </Text>
          <View style={styles.comingSoonBadgeHeader}>
            <Text style={styles.comingSoonBadgeHeaderText}>
              {lang === 'hi' ? 'जल्द उपलब्ध' : 'Coming Soon'}
            </Text>
          </View>
        </View>

        <View style={styles.materialsRow}>
          {/* Construction Material Card */}
          <TouchableOpacity
            style={styles.materialCard}
            onPress={() => {
              Alert.alert(
                lang === 'hi' ? '🏗️ भवन निर्माण सामग्री (Coming Soon)' : '🏗️ Construction Material (Coming Soon)',
                lang === 'hi'
                  ? 'यह सेवा जल्द ही शुरू की जा रही है! यहाँ से आप सीमेंट, मौरंग, बालू, ईंट, सरिया व रोड़ी सीधे ऑर्डर कर सकेंगे।'
                  : 'This service is coming soon! You will be able to order cement, sand, bricks, TMT bars directly.'
              );
            }}
            activeOpacity={0.8}
          >
            <View style={styles.materialCardTop}>
              <View style={[styles.materialIconCircle, { backgroundColor: '#FFF3E0' }]}>
                <Text style={{ fontSize: 26 }}>🏗️</Text>
              </View>
              <View style={styles.comingSoonPill}>
                <Text style={styles.comingSoonPillText}>Coming Soon</Text>
              </View>
            </View>
            <Text style={styles.materialTitle}>
              {lang === 'hi' ? 'भवन निर्माण सामग्री' : 'Construction Material'}
            </Text>
            <Text style={styles.materialSub} numberOfLines={2}>
              {lang === 'hi' ? 'सीमेंट, बालू, मौरंग, ईंट, सरिया' : 'Cement, Sand, Bricks, Steel'}
            </Text>
          </TouchableOpacity>

          {/* Agriculture Material Card */}
          <TouchableOpacity
            style={styles.materialCard}
            onPress={() => {
              Alert.alert(
                lang === 'hi' ? '🌾 कृषि सामग्री (Coming Soon)' : '🌾 Agriculture Material (Coming Soon)',
                lang === 'hi'
                  ? 'यह सेवा जल्द ही शुरू की जा रही है! यहाँ से आप बीज, खाद, कीटनाशक, कृषि उपकरण सीधे मंगा सकेंगे।'
                  : 'This service is coming soon! You will be able to order seeds, fertilizers, farm equipment directly.'
              );
            }}
            activeOpacity={0.8}
          >
            <View style={styles.materialCardTop}>
              <View style={[styles.materialIconCircle, { backgroundColor: '#E8F5E9' }]}>
                <Text style={{ fontSize: 26 }}>🌾</Text>
              </View>
              <View style={[styles.comingSoonPill, { backgroundColor: '#E8F5E9' }]}>
                <Text style={[styles.comingSoonPillText, { color: '#2E7D32' }]}>Coming Soon</Text>
              </View>
            </View>
            <Text style={styles.materialTitle}>
              {lang === 'hi' ? 'कृषि सामग्री' : 'Agriculture Material'}
            </Text>
            <Text style={styles.materialSub} numberOfLines={2}>
              {lang === 'hi' ? 'खाद, बीज, कीटनाशक, कृषि यंत्र' : 'Fertilizers, Seeds, Equipment'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Quick Highlights / Why Shram Sarthi */}
        <View style={styles.featuresContainer}>
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>✅</Text>
            <Text style={styles.featureText}>{lang === 'hi' ? 'सत्यापित कर्मी' : 'Verified KYC'}</Text>
          </View>
          <View style={styles.featureDivider} />
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>💬</Text>
            <Text style={styles.featureText}>{lang === 'hi' ? 'सीधी बातचीत' : 'Direct Chat'}</Text>
          </View>
          <View style={styles.featureDivider} />
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>📞</Text>
            <Text style={styles.featureText}>{lang === 'hi' ? '24x7 सहायता' : '24x7 Support'}</Text>
          </View>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>


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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerLeft: {
    flex: 1,
    marginRight: 10,
  },
  greeting: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212121',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  locationIcon: {
    fontSize: 11,
  },
  locationText: {
    fontSize: 12,
    color: '#757575',
    marginLeft: 3,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },

  langToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 16,
    paddingHorizontal: 9,
    paddingVertical: 4,
    backgroundColor: '#FAFAFA',
    gap: 3,
  },
  langOpt: {
    fontSize: 12,
    color: '#9E9E9E',
    fontWeight: '600',
  },
  langActive: {
    color: '#FF6B00',
    fontWeight: '800',
  },
  langSep: {
    fontSize: 11,
    color: '#BDBDBD',
  },
  avatarWrapper: {
    marginLeft: 2,
  },
  avatar: {
    backgroundColor: '#FF6B00',
  },
  searchContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 10,
    borderRadius: 12,
    elevation: 2,
    height: 48,
  },
  promoBanner: {
    marginHorizontal: 16,
    marginVertical: 10,
    padding: 14,
    backgroundColor: '#FFF7ED',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FED7AA',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badgeRow: {
    alignSelf: 'flex-start',
    backgroundColor: '#F97316',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#9A3412',
  },
  bannerSubtitle: {
    fontSize: 11,
    color: '#C2410C',
    marginTop: 2,
  },
  bannerIconBox: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#FFEDD5',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#212121',
  },
  categoryCountBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FF6B00',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
    marginBottom: 12,
  },
  categoryItem: {
    width: '25%',
    alignItems: 'center',
    paddingVertical: 8,
  },
  categoryCircle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  categoryEmoji: {
    fontSize: 30,
    textAlign: 'center',
  },
  categoryLabel: {
    fontSize: 11,
    color: '#333',
    marginTop: 5,
    textAlign: 'center',
    fontWeight: '600',
    paddingHorizontal: 2,
  },
  transportCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 14,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  transportIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFF3E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  transportTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#212121',
  },
  transportTag: {
    backgroundColor: '#FF6B00',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  transportTagText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  transportDesc: {
    fontSize: 11,
    color: '#757575',
    marginTop: 3,
  },
  transportArrowBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFF3E0',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  featuresContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    elevation: 1,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  featureIcon: {
    fontSize: 13,
  },
  featureText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#424242',
  },
  featureDivider: {
    width: 1,
    height: 18,
    backgroundColor: '#EEEEEE',
  },
  nearbySection: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  providerCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 8,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  providerCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  providerAvatar: {
    backgroundColor: '#FF6B00',
  },
  providerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  providerName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#212121',
  },
  providerCategory: {
    fontSize: 12,
    color: '#757575',
    marginTop: 2,
  },
  providerDistance: {
    fontSize: 11,
    color: '#FF6B00',
    marginTop: 2,
    fontWeight: '500',
  },
  ratingText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#212121',
  },
  // ── Wallet Styles ──
  walletHeaderChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3ED',
    borderWidth: 1.5,
    borderColor: '#FFCCBC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 14,
    gap: 4,
  },
  walletHeaderIcon: {
    fontSize: 14,
  },
  walletHeaderBalance: {
    fontSize: 12,
    fontWeight: '800',
    color: '#F26333',
  },
  walletBanner: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E8ECEF',
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  walletIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF3ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  walletPill: {
    backgroundColor: '#FFF3ED',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  walletPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F26333',
  },
  walletSub: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  walletAmt: {
    fontWeight: '800',
    color: '#2E7D32',
  },
  comingSoonBadgeHeader: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  comingSoonBadgeHeaderText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#EA580C',
  },
  materialsRow: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  materialCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  materialCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  materialIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  comingSoonPill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  comingSoonPillText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#B45309',
    letterSpacing: 0.2,
  },
  materialTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 3,
  },
  materialSub: {
    fontSize: 10.5,
    color: '#6B7280',
    lineHeight: 14,
  },
});
