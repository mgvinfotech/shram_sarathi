import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useEffect, useState } from 'react';
import {
  View, FlatList, TouchableOpacity, StyleSheet,
  Platform, StatusBar, Modal,
} from 'react-native';
import { Appbar, Card, Avatar, Text, ActivityIndicator } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store';
import { searchNearby, selectProvider } from '../../store/slices/providerSlice';
import { useLanguage } from '../../i18n/LanguageContext';
import { api } from '../../services/api';
import { getSkillTranslation } from '../../utils/skills';
import * as Location from 'expo-location';

interface Props {
  navigation: any;
  route: {
    params: {
      category: string;
      lat?: number;
      lng?: number;
      district?: string;
      state?: string;
    };
  };
}

interface SubCategory {
  id: number;
  name: string;
  name_hindi: string;
  slug: string;
}

export default function ProviderListScreen({ navigation, route }: Props) {
  const category = route?.params?.category || '';
  const dispatch = useDispatch<AppDispatch>();
  const { nearbyProviders, isLoading } = useSelector((s: RootState) => s.provider);
  const { t, lang } = useLanguage();

  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
  const [showSkillModal, setShowSkillModal] = useState(false);

  useEffect(() => {
    loadProviders();
    fetchSkills();
  }, []);

  const loadProviders = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Low,
        });
        const [address] = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
        const district = address.district || address.city || '';
        const state = address.region || '';
        dispatch(searchNearby({
          lat: loc.coords.latitude,
          lng: loc.coords.longitude,
          category,
          district,
          state,
        }));
        return;
      }
    } catch (e) {
      // ignore
    }
    // Fallback coordinates from route or default Varanasi
    dispatch(searchNearby({
      lat: route.params?.lat || 25.3176,
      lng: route.params?.lng || 82.9739,
      category,
      district: route.params?.district || 'Varanasi',
      state: route.params?.state || 'Uttar Pradesh',
    }));
  };

  const fetchSkills = async () => {
    try {
      const res = await api.get(`/api/categories/${category}/sub-categories`);
      setSubCategories(res.data);
    } catch (e) {
      console.error('Failed to load sub-categories', e);
    }
  };

  const getSkillLabel = (slug: string) => {
    const sub = subCategories.find((s) => s.slug === slug);
    if (sub) {
      return lang === 'hi' ? sub.name_hindi : sub.name;
    }
    return getSkillTranslation(slug, lang as any);
  };

  const handleSelect = (provider: any) => {
    dispatch(selectProvider(provider));
    navigation.navigate('ProviderDetail', { provider });
  };

  const filteredProviders = nearbyProviders.filter((p) => {
    if (!selectedSkill) return true;
    return p.sub_categories && p.sub_categories.includes(selectedSkill);
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <Appbar.Header style={styles.header}>
        <Appbar.BackAction onPress={() => navigation.goBack()} color="#FF6B00" />
        <Appbar.Content title={t(category as any) || category} titleStyle={styles.title} />
      </Appbar.Header>

      {/* Skills Dropdown Selector Bar */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowSkillModal(true)}
        >
          <Text style={styles.filterButtonText} numberOfLines={1}>
            {selectedSkill
              ? `${lang === 'hi' ? 'कौशल' : 'Skill'}: ${getSkillLabel(selectedSkill)}`
              : (lang === 'hi' ? 'सभी कौशल / All Skills' : 'All Skills')}
          </Text>
          <Text style={styles.filterArrow}>▼</Text>
        </TouchableOpacity>
        {selectedSkill && (
          <TouchableOpacity
            style={styles.clearFilterButton}
            onPress={() => setSelectedSkill(null)}
          >
            <Text style={styles.clearFilterText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <ActivityIndicator color="#FF6B00" style={{ marginTop: 40 }} size="large" />
      ) : filteredProviders.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🔍</Text>
          <Text style={styles.emptyText}>
            {lang === 'hi'
              ? 'इस क्षेत्र में कोई सारथी नहीं मिला'
              : 'No Saarthis found matching this filter'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredProviders}
          keyExtractor={(item) => String(item.provider_id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Card
              style={styles.card}
              onPress={() => handleSelect(item)}
            >
              <Card.Content style={styles.cardContent}>
                <Avatar.Text size={52} label={item.name[0]} style={styles.avatar} />
                <View style={styles.info}>
                  <Text variant="titleMedium" style={styles.name}>{item.name}</Text>
                  <Text variant="bodySmall" style={styles.category} numberOfLines={2}>
                    {t(item.category as any) || item.category}
                    {item.sub_categories && item.sub_categories.length > 0 ? (
                      ` (${item.sub_categories.map(getSkillLabel).join(', ')})`
                    ) : ''}
                  </Text>
                  <View style={styles.meta}>
                    <Text variant="labelMedium" style={styles.distance}>
                      📍 {Number(item.distance_km).toFixed(2)} {t('kmAway')}
                    </Text>
                    <Text variant="labelMedium" style={styles.rating}>⭐ {item.rating.toFixed(1)}</Text>
                  </View>
                </View>
                <View style={[styles.onlineDot, { backgroundColor: item.is_online ? '#38A169' : '#ccc' }]} />
              </Card.Content>
            </Card>
          )}
        />
      )}

      {/* Skill Selector Modal */}
      <Modal
        visible={showSkillModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSkillModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowSkillModal(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {lang === 'hi' ? 'कौशल फ़िल्टर चुनें' : 'Select Skill Filter'}
              </Text>
              <TouchableOpacity onPress={() => setShowSkillModal(false)} style={styles.modalCloseButton}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={[
                { slug: '', name: 'All Skills', name_hindi: 'सभी कौशल (All)' } as any,
                ...subCategories
              ]}
              keyExtractor={(item) => item.slug || 'all'}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.modalItem,
                    ((!selectedSkill && !item.slug) || (selectedSkill === item.slug)) && styles.selectedModalItem
                  ]}
                  onPress={() => {
                    setSelectedSkill(item.slug || null);
                    setShowSkillModal(false);
                  }}
                >
                  <Text style={[
                    styles.modalItemText,
                    ((!selectedSkill && !item.slug) || (selectedSkill === item.slug)) && styles.selectedModalItemText
                  ]}>
                    {lang === 'hi' ? item.name_hindi : item.name}
                  </Text>
                  {((!selectedSkill && !item.slug) || (selectedSkill === item.slug)) && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
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
    backgroundColor: '#fff',
    elevation: 2, // material shadow
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textTransform: 'capitalize',
  },
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ebebeb',
    gap: 8,
  },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
    flex: 1,
    marginRight: 8,
  },
  filterArrow: {
    fontSize: 10,
    color: '#6B7280',
  },
  clearFilterButton: {
    backgroundColor: '#FEE2E2',
    width: 38,
    height: 38,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  clearFilterText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: 'bold',
  },
  list: {
    padding: 16,
    gap: 10,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    marginBottom: 8,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  avatar: {
    backgroundColor: '#FF6B00',
  },
  info: {
    flex: 1,
    marginLeft: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  category: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
    lineHeight: 16,
  },
  meta: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  distance: {
    fontSize: 12,
    color: '#FF6B00',
  },
  rating: {
    fontSize: 12,
    color: '#333',
  },
  onlineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '60%',
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalClose: {
    fontSize: 18,
    color: '#666',
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f9f9f9',
  },
  selectedModalItem: {
    backgroundColor: '#FFF5F0',
  },
  modalItemText: {
    fontSize: 15,
    color: '#333',
  },
  selectedModalItemText: {
    color: '#FF6B00',
    fontWeight: 'bold',
  },
  checkmark: {
    fontSize: 16,
    color: '#FF6B00',
    fontWeight: 'bold',
  },
});
