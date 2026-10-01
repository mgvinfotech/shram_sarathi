import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useCallback } from 'react';
import {
  View, TouchableOpacity, StyleSheet, Alert, Image, Modal, ScrollView, Linking,
} from 'react-native';
import { Button, Avatar, List, Divider, Text } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store';
import { logout } from '../../store/slices/authSlice';
import { useLanguage } from '../../i18n/LanguageContext';
import { api, getImageUrl } from '../../services/api';
import { isProviderRole } from '../../utils/roleUtils';
import RoleSwitchModal from '../../components/RoleSwitchModal';

interface Props {
  navigation: any;
}

export default function ProfileScreen({ navigation }: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const { name, phone, role, userId } = useSelector((s: RootState) => s.auth);
  const { t, lang, toggle } = useLanguage();
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [isFullImageVisible, setIsFullImageVisible] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [providerDetails, setProviderDetails] = useState<any>(null);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [showRoleModal, setShowRoleModal] = useState(false);

  // Helper to format experience without duplicating 'वर्ष' or 'Years'
  const formatExperience = (exp: any) => {
    if (!exp) return null;
    const s = String(exp).trim();
    if (s.includes('वर्ष') || s.includes('साल') || s.toLowerCase().includes('year')) {
      return s;
    }
    return `${s} ${lang === 'hi' ? 'वर्ष' : 'Years'}`;
  };

  // Localized category display name
  const getCategoryLabel = (cat?: string) => {
    if (!cat) return '';
    const c = cat.toLowerCase();
    if (c === 'transport' || c === 'vehicle') return lang === 'hi' ? 'ट्रांसपोर्ट (वाहन सेवा)' : 'Transport (Vehicle)';
    if (c === 'driver') return lang === 'hi' ? 'ड्राइवर (चालक)' : 'Driver';
    if (c === 'karigar') return lang === 'hi' ? 'कारीगर (Mistri / Skilled)' : 'Karigar (Skilled)';
    if (c === 'labour' || c === 'labor') return lang === 'hi' ? 'मजदूर (Labour)' : 'Labour';
    if (c === 'contractor') return lang === 'hi' ? 'ठेकेदार (Contractor)' : 'Contractor';
    if (c === 'agent') return lang === 'hi' ? 'एजेंट (Agent)' : 'Agent';
    return cat;
  };

  const fetchProfileDetails = useCallback(async () => {
    try {
      const promises: Promise<any>[] = [
        api.get('/api/auth/me'),
        api.get('/api/wallet'),
      ];
      if (isProviderRole(role) && userId) {
        promises.push(api.get(`/api/provider/profile/${userId}`));
      }

      const results = await Promise.allSettled(promises);

      if (results[0].status === 'fulfilled') {
        const meData = results[0].value.data;
        if (meData?.photo_url) setPhotoUrl(meData.photo_url);
      }
      if (results[1].status === 'fulfilled') {
        const wData = results[1].value.data;
        if (wData?.balance !== undefined) setWalletBalance(wData.balance);
      }
      if (results[2] && results[2].status === 'fulfilled') {
        const pData = { ...results[2].value.data };
        if (pData?.photo_url) setPhotoUrl(pData.photo_url);
        if (typeof pData?.is_online === 'boolean') setIsOnline(pData.is_online);

        // If transport, ensure vehicle profile fields are populated
        const isTr = ['transport', 'vehicle', 'transporter'].includes((pData?.category || role || '').toLowerCase());
        if (isTr && (!pData.vehicle_number || pData.per_km_rate === null || pData.per_km_rate === undefined)) {
          try {
            const vRes = await api.get('/api/transport/vehicle-profile');
            if (vRes.data) {
              pData.vehicle_number = vRes.data.vehicle_number || pData.vehicle_number;
              pData.vehicle_type = vRes.data.vehicle_type || pData.vehicle_type;
              pData.per_km_rate = vRes.data.per_km_rate ?? pData.per_km_rate;
              if (vRes.data.is_passenger_vehicle !== undefined) pData.is_passenger_vehicle = vRes.data.is_passenger_vehicle;
              if (vRes.data.is_goods_vehicle !== undefined) pData.is_goods_vehicle = vRes.data.is_goods_vehicle;
              if (vRes.data.is_delivery_vehicle !== undefined) pData.is_delivery_vehicle = vRes.data.is_delivery_vehicle;
            }
          } catch {
            // silent fallback
          }
        }
        setProviderDetails(pData);
      }
    } catch {
      // silent
    }
  }, [role, userId]);

  useFocusEffect(
    useCallback(() => {
      fetchProfileDetails();
    }, [fetchProfileDetails])
  );

  const handleToggleOnline = async () => {
    const nextStatus = !isOnline;
    setIsOnline(nextStatus);
    try {
      await api.post('/api/provider/toggle-online', { is_online: nextStatus });
    } catch {
      setIsOnline(!nextStatus);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      t('logout'),
      lang === 'hi' ? 'क्या आप लॉगआउट करना चाहते हैं?' : 'Are you sure you want to logout?',
      [
        { text: lang === 'hi' ? 'रद्द करें' : 'Cancel', style: 'cancel' },
        {
          text: t('logout'),
          style: 'destructive',
          onPress: async () => {
            await dispatch(logout());
            navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
          },
        },
      ]
    );
  };

  const avatarUri = getImageUrl(photoUrl);

  const effectiveRole = (
    providerDetails?.category ||
    (role && role.toLowerCase() !== 'provider' ? role : '') ||
    providerDetails?.role ||
    role ||
    'labour'
  ).toLowerCase().trim();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Avatar */}
        <View style={styles.avatarSection}>
        {avatarUri ? (
          <TouchableOpacity onPress={() => setIsFullImageVisible(true)} activeOpacity={0.8}>
            <Image
              source={{ uri: avatarUri }}
              style={{ width: 88, height: 88, borderRadius: 44, borderWidth: 3, borderColor: '#FF6B00', marginBottom: 12 }}
            />
          </TouchableOpacity>
        ) : (
          <Avatar.Text size={88} label={name?.[0]?.toUpperCase() || 'U'} style={[styles.avatar, { backgroundColor: '#FF6B00', marginBottom: 12 }]} />
        )}
        <Text variant="titleLarge" style={styles.name}>{name}</Text>
        <Text variant="bodyMedium" style={styles.phone}>{phone}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{role}</Text>
        </View>

        {isProviderRole(role) && (
          <>
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: isOnline ? '#E8F5E9' : '#FFEBEE',
                borderWidth: 1.5,
                borderColor: isOnline ? '#2E7D32' : '#C62828',
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 20,
                marginTop: 10,
                gap: 8
              }}
              onPress={handleToggleOnline}
              activeOpacity={0.8}
            >
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: isOnline ? '#2E7D32' : '#C62828' }} />
              <Text style={{ fontSize: 13, fontWeight: 'bold', color: isOnline ? '#1B5E20' : '#C62828' }}>
                {isOnline ? '🟢 ऑनलाइन (ONLINE)' : '🔴 ऑफलाइन (OFFLINE)'}
              </Text>
            </TouchableOpacity>

            {providerDetails && (() => {
              const isTransport = ['transport', 'vehicle', 'transporter'].includes(effectiveRole);
              const isDriver = effectiveRole === 'driver';
              const isContractor = effectiveRole === 'contractor';
              const isKarigar = effectiveRole === 'karigar';
              const isAgent = effectiveRole === 'agent';

              let title = lang === 'hi' ? 'मजदूर प्रोफाइल (Labour Profile)' : 'Labour Profile';
              let icon = '👷';
              let titleColor = '#2E7D32';

              if (isTransport) {
                title = lang === 'hi' ? 'ट्रांसपोर्ट / वाहन प्रोफाइल' : 'Transport / Vehicle Profile';
                icon = '🛺';
                titleColor = '#E65100';
              } else if (isDriver) {
                title = lang === 'hi' ? 'ड्राइवर प्रोफाइल (Driver Profile)' : 'Driver Profile';
                icon = '🚗';
                titleColor = '#FF6B00';
              } else if (isContractor) {
                title = lang === 'hi' ? 'ठेकेदार प्रोफाइल (Contractor)' : 'Contractor Profile';
                icon = '🏗️';
                titleColor = '#FF6B00';
              } else if (isKarigar) {
                title = lang === 'hi' ? 'कारीगर प्रोफाइल (Karigar Profile)' : 'Karigar Profile';
                icon = '🔧';
                titleColor = '#2E7D32';
              } else if (isAgent) {
                title = lang === 'hi' ? 'एजेंट प्रोफाइल (Agent Profile)' : 'Agent Profile';
                icon = '🤝';
                titleColor = '#FF6B00';
              }

              const isIncomplete = isTransport
                ? (!providerDetails.vehicle_number || !providerDetails.vehicle_type)
                : isDriver
                ? (!providerDetails.dl_number && !providerDetails.driver_license)
                : isContractor
                ? (!providerDetails.firm_name)
                : (!providerDetails.expected_daily_wage || !providerDetails.sub_categories || providerDetails.sub_categories.length === 0);

              return (
                <View style={{ marginTop: 14, backgroundColor: '#FFF5EE', padding: 14, borderRadius: 12, width: '100%', alignItems: 'center', borderWidth: 1, borderColor: '#FFE4D6' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 6 }}>
                    <Text style={{ fontSize: 14, color: titleColor, fontWeight: 'bold' }}>
                      {icon} {title}
                    </Text>
                    {isIncomplete && (
                      <TouchableOpacity
                        onPress={() => navigation.navigate('EditProfile', { role: effectiveRole, category: providerDetails?.category })}
                        style={{ backgroundColor: '#FFF7ED', borderWidth: 1, borderColor: '#FFD8A8', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }}
                      >
                        <Text style={{ fontSize: 11, color: '#E65100', fontWeight: '800' }}>
                          {lang === 'hi' ? '✏️ पूरा करें' : '✏️ Complete'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  <View style={{ width: '100%' }}>
                    {/* Category */}
                    {providerDetails.category ? (
                      <Text style={{ fontSize: 13, color: '#333', fontWeight: '600', marginTop: 2 }}>
                        🏷️ {lang === 'hi' ? 'श्रेणी' : 'Category'}: {getCategoryLabel(providerDetails.category)}
                      </Text>
                    ) : null}

                    {/* ── 1. TRANSPORT / VEHICLE DETAILS ── */}
                    {isTransport && (
                      <>
                        {/* Vehicle Type */}
                        {providerDetails.vehicle_type ? (
                          <Text style={{ fontSize: 13, color: '#333', fontWeight: '600', marginTop: 4 }}>
                            🚘 {lang === 'hi' ? 'वाहन का प्रकार' : 'Vehicle Type'}: {providerDetails.vehicle_type}
                          </Text>
                        ) : null}

                        {/* Vehicle Registration Number */}
                        {providerDetails.vehicle_number ? (
                          <Text style={{ fontSize: 13, color: '#333', fontWeight: '600', marginTop: 4 }}>
                            🔢 {lang === 'hi' ? 'गाड़ी नंबर' : 'Vehicle No.'}: {providerDetails.vehicle_number}
                          </Text>
                        ) : (
                          <View style={{ backgroundColor: '#FEF3C7', padding: 8, borderRadius: 8, marginTop: 6 }}>
                            <Text style={{ fontSize: 11.5, color: '#92400E', fontWeight: '600' }}>
                              ⚠️ {lang === 'hi' ? 'गाड़ी नंबर दर्ज नहीं है। प्रोफाइल एडिट करके गाड़ी नंबर जोड़ें।' : 'Vehicle number not set. Edit profile to add vehicle number.'}
                            </Text>
                          </View>
                        )}

                        {/* Service Usage Types */}
                        {(() => {
                          const uses: string[] = [];
                          if (providerDetails.is_passenger_vehicle) uses.push(lang === 'hi' ? '👥 सवारी' : '👥 Passenger');
                          if (providerDetails.is_goods_vehicle) uses.push(lang === 'hi' ? '📦 माल ढुलाई' : '📦 Goods');
                          if (providerDetails.is_delivery_vehicle) uses.push(lang === 'hi' ? '🛵 पार्सल' : '🛵 Parcel');
                          return uses.length > 0 ? (
                            <Text style={{ fontSize: 13, color: '#333', fontWeight: '600', marginTop: 4 }}>
                              🏷️ {lang === 'hi' ? 'सेवा प्रकार' : 'Service'}: {uses.join(' | ')}
                            </Text>
                          ) : null;
                        })()}

                        {/* Per KM Rate */}
                        {providerDetails.per_km_rate ? (
                          <Text style={{ fontSize: 13, color: '#333', fontWeight: '600', marginTop: 4 }}>
                            ⚡ {lang === 'hi' ? 'किराया दर' : 'Fare Rate'}: ₹{providerDetails.per_km_rate} / {lang === 'hi' ? 'किमी' : 'km'}
                          </Text>
                        ) : (
                          <View style={{ backgroundColor: '#FEF3C7', padding: 8, borderRadius: 8, marginTop: 6 }}>
                            <Text style={{ fontSize: 11.5, color: '#92400E', fontWeight: '600' }}>
                              ⚠️ {lang === 'hi' ? 'किराया दर (₹/किमी) दर्ज नहीं है। बुकिंग पाने के लिए प्रोफाइल एडिट करें।' : 'Per km fare rate not set. Edit profile to set rate.'}
                            </Text>
                          </View>
                        )}

                        {/* DL Number */}
                        {(providerDetails.dl_number || providerDetails.driver_license) ? (
                          <Text style={{ fontSize: 13, color: '#333', fontWeight: '600', marginTop: 4 }}>
                            🪪 {lang === 'hi' ? 'ड्राइविंग लाइसेंस नं.' : 'DL No.'}: {providerDetails.dl_number || providerDetails.driver_license}
                          </Text>
                        ) : null}
                      </>
                    )}

                    {/* ── 2. DRIVER ROLE DETAILS ── */}
                    {isDriver && (
                      <>
                        {providerDetails.vehicle_type ? (
                          <Text style={{ fontSize: 13, color: '#333', fontWeight: '600', marginTop: 4 }}>
                            🚘 {lang === 'hi' ? 'वाहन का प्रकार' : 'Vehicle Type'}: {providerDetails.vehicle_type}
                          </Text>
                        ) : null}

                        {(providerDetails.dl_number || providerDetails.driver_license) ? (
                          <Text style={{ fontSize: 13, color: '#333', fontWeight: '600', marginTop: 4 }}>
                            🪪 {lang === 'hi' ? 'ड्राइविंग लाइसेंस नं.' : 'DL No.'}: {providerDetails.dl_number || providerDetails.driver_license}
                          </Text>
                        ) : (
                          <View style={{ backgroundColor: '#FEF3C7', padding: 8, borderRadius: 8, marginTop: 6 }}>
                            <Text style={{ fontSize: 11.5, color: '#92400E', fontWeight: '600' }}>
                              ⚠️ {lang === 'hi' ? 'ड्राइविंग लाइसेंस नं. दर्ज नहीं है।' : 'Driving license not set.'}
                            </Text>
                          </View>
                        )}

                        {providerDetails.contract_types && providerDetails.contract_types.length > 0 ? (
                          <Text style={{ fontSize: 13, color: '#333', fontWeight: '600', marginTop: 4 }}>
                            🏢 {lang === 'hi' ? 'ड्राइविंग प्रकार' : 'Drive Type'}: {Array.isArray(providerDetails.contract_types) ? providerDetails.contract_types.join(', ') : providerDetails.contract_types}
                          </Text>
                        ) : null}

                        {providerDetails.expected_daily_wage ? (
                          <Text style={{ fontSize: 13, color: '#333', fontWeight: '600', marginTop: 4 }}>
                            💰 {lang === 'hi' ? 'अपेक्षित वेतन / दिहाड़ी' : 'Expected Wage'}: ₹{providerDetails.expected_daily_wage}
                          </Text>
                        ) : null}
                      </>
                    )}

                    {/* ── 3. CONTRACTOR ROLE DETAILS ── */}
                    {isContractor && (
                      <>
                        {providerDetails.firm_name ? (
                          <Text style={{ fontSize: 13, color: '#333', fontWeight: '600', marginTop: 4 }}>
                            🏢 {lang === 'hi' ? 'फर्म का नाम' : 'Firm'}: {providerDetails.firm_name}
                          </Text>
                        ) : (
                          <View style={{ backgroundColor: '#FEF3C7', padding: 8, borderRadius: 8, marginTop: 6 }}>
                            <Text style={{ fontSize: 11.5, color: '#92400E', fontWeight: '600' }}>
                              ⚠️ {lang === 'hi' ? 'फर्म का नाम दर्ज नहीं है।' : 'Firm name not set.'}
                            </Text>
                          </View>
                        )}

                        {providerDetails.team_size ? (
                          <Text style={{ fontSize: 13, color: '#333', fontWeight: '600', marginTop: 4 }}>
                            👥 {lang === 'hi' ? 'टीम का आकार' : 'Team Size'}: {providerDetails.team_size} {lang === 'hi' ? 'सदस्य' : 'workers'}
                          </Text>
                        ) : null}
                      </>
                    )}

                    {/* ── 4. LABOUR / KARIGAR ROLE DETAILS ── */}
                    {!isTransport && !isDriver && !isContractor && !isAgent && (
                      <>
                        {providerDetails.sub_categories && providerDetails.sub_categories.length > 0 ? (
                          <Text style={{ fontSize: 13, color: '#333', fontWeight: '600', marginTop: 4 }}>
                            🛠️ {lang === 'hi' ? 'हुनर / कार्य' : 'Skills'}: {Array.isArray(providerDetails.sub_categories) ? providerDetails.sub_categories.join(', ') : providerDetails.sub_categories}
                          </Text>
                        ) : null}

                        {providerDetails.expected_daily_wage ? (
                          <Text style={{ fontSize: 13, color: '#333', fontWeight: '600', marginTop: 4 }}>
                            💰 {lang === 'hi' ? 'दैनिक दिहाड़ी' : 'Daily Wage'}: ₹{providerDetails.expected_daily_wage}
                          </Text>
                        ) : (
                          <View style={{ backgroundColor: '#FEF3C7', padding: 8, borderRadius: 8, marginTop: 6 }}>
                            <Text style={{ fontSize: 11.5, color: '#92400E', fontWeight: '600' }}>
                              ⚠️ {lang === 'hi' ? 'दैनिक दिहाड़ी दर्ज नहीं है। काम पाने के लिए प्रोफाइल एडिट करें।' : 'Daily wage not set. Edit profile to receive jobs.'}
                            </Text>
                          </View>
                        )}
                      </>
                    )}

                    {/* Experience (without duplicate 'वर्ष') */}
                    {providerDetails.experience_years ? (
                      <Text style={{ fontSize: 13, color: '#333', fontWeight: '600', marginTop: 4 }}>
                        ⏳ {lang === 'hi' ? 'अनुभव' : 'Exp'}: {formatExperience(providerDetails.experience_years)}
                      </Text>
                    ) : null}

                    {/* Location */}
                    {providerDetails.base_location_address ? (
                      <Text style={{ fontSize: 12, color: '#666', marginTop: 8, textAlign: 'center' }}>
                        📍 {providerDetails.base_location_address}
                      </Text>
                    ) : null}
                  </View>
                </View>
              );
            })()}
          </>
        )}
      </View>

      {/* ── Switch Role Card ── */}
      <TouchableOpacity
        style={styles.switchRoleCard}
        onPress={() => setShowRoleModal(true)}
        activeOpacity={0.85}
      >
        <View style={styles.switchRoleIconBox}>
          <Text style={{ fontSize: 24 }}>🔄</Text>
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.switchRoleTitle}>
            {lang === 'hi' ? 'भूमिका बदलें (Switch Account)' : 'Switch Account Mode'}
          </Text>
          <Text style={styles.switchRoleSub}>
            {isProviderRole(role)
              ? (lang === 'hi' ? 'ग्राहक मोड में बदलें (मजदूर/गाड़ी बुक करें)' : 'Switch to Customer Mode')
              : (lang === 'hi' ? 'कामगार / कारीगर मोड में बदलें (काम पाएं)' : 'Switch to Worker / Karigar Mode')}
          </Text>
        </View>
        <View style={styles.switchRoleBtnPill}>
          <Text style={styles.switchRoleBtnText}>{lang === 'hi' ? 'बदलें →' : 'Switch →'}</Text>
        </View>
      </TouchableOpacity>

      {/* Options */}
      <List.Section style={styles.options}>
        {/* Edit Profile */}
        <List.Item
          title={lang === 'hi' ? 'प्रोफाइल एडिट करें' : 'Edit Profile'}
          left={props => <List.Icon {...props} icon="pencil-outline" />}
          right={props => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate('EditProfile', { role: effectiveRole, category: providerDetails?.category })}
          titleStyle={styles.optionLabel}
        />
        <Divider style={styles.divider} />

        {/* My Wallet & Balance */}
        <List.Item
          title={lang === 'hi' ? 'मेरा वॉलेट एवं रिचार्ज' : 'My Wallet & Recharge'}
          description={
            walletBalance !== null
              ? (lang === 'hi' ? `उपलब्ध बैलेंस: ₹${walletBalance.toFixed(2)}` : `Available: ₹${walletBalance.toFixed(2)}`)
              : (lang === 'hi' ? 'पैसे जोड़ें / निकालें' : 'Add / Withdraw Money')
          }
          descriptionStyle={{ color: '#2E7D32', fontWeight: 'bold' }}
          left={props => <List.Icon {...props} icon="wallet-outline" color="#F26333" />}
          right={props => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate('WalletScreen')}
          titleStyle={styles.optionLabel}
        />
        <Divider style={styles.divider} />
        {/* My Bookings */}
        {!isProviderRole(role) && (
          <>
            <List.Item
              title={lang === 'hi' ? 'मेरी बुकिंग्स (My Bookings)' : 'My Bookings'}
              left={props => <List.Icon {...props} icon="car-clock" />}
              right={props => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => navigation.navigate('CustomerBookings')}
              titleStyle={styles.optionLabel}
            />
            <Divider style={styles.divider} />
          </>
        )}
        {/* Language Toggle */}
        <List.Item
          title={lang === 'hi' ? 'भाषा / Language' : 'Language / भाषा'}
          description={lang === 'hi' ? 'हिंदी' : 'English'}
          descriptionStyle={styles.optionValue}
          left={props => <List.Icon {...props} icon="web" />}
          right={props => <List.Icon {...props} icon="chevron-right" />}
          onPress={toggle}
          titleStyle={styles.optionLabel}
        />
        <Divider style={styles.divider} />
        <List.Item
          title={lang === 'hi' ? 'नियम, शर्तें एवं रिफंड नीति' : 'Terms, Conditions & Refund Policy'}
          description={lang === 'hi' ? 'सीमित वॉलेट रिफंड, मानक रेट कार्ड एवं नियम' : 'Limited wallet refund, standard rates & rules'}
          descriptionStyle={{ fontSize: 11, color: '#64748B' }}
          left={props => <List.Icon {...props} icon="clipboard-text-outline" color="#166534" />}
          right={props => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate('TermsAndRefund')}
          titleStyle={styles.optionLabel}
        />
        {/* SOS Ticket System & Support */}
        <List.Item
          title={lang === 'hi' ? '🚨 SOS व सहायता टिकट' : '🚨 SOS & Support Tickets'}
          description={lang === 'hi' ? 'सहायता, शिकायत एवं आपातकालीन SOS टिकट' : 'Help, dispute resolution & SOS tickets'}
          descriptionStyle={{ color: '#D32F2F', fontSize: 11 }}
          left={props => <List.Icon {...props} icon="alert-octagon" color="#D32F2F" />}
          right={props => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate('SOSTicketScreen')}
          titleStyle={[styles.optionLabel, { color: '#B71C1C', fontWeight: 'bold' }]}
        />
        <Divider style={styles.divider} />
        <List.Item
          title={lang === 'hi' ? 'हेल्पलाइन सहायता (+917084900909)' : 'Helpline Support (+917084900909)'}
          description={lang === 'hi' ? 'कॉल करके सहायता या पूछताछ करें' : 'Call for assistance or inquiries'}
          descriptionStyle={{ fontSize: 11, color: '#166534' }}
          left={props => <List.Icon {...props} icon="phone-in-talk" color="#166534" />}
          right={props => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => Linking.openURL('tel:+917084900909')}
          titleStyle={styles.optionLabel}
        />
        <Divider style={styles.divider} />
        <List.Item
          title={lang === 'hi' ? 'गोपनीयता नीति' : 'Privacy Policy'}
          left={props => <List.Icon {...props} icon="shield-lock-outline" />}
          right={props => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate('TermsAndRefund')}
          titleStyle={styles.optionLabel}
        />
      </List.Section>

        {/* Logout */}
        <Button
          mode="outlined"
          style={styles.logoutButton}
          onPress={handleLogout}
          textColor="#E53E3E"
          labelStyle={styles.logoutText}
        >
          🚪 {t('logout')}
        </Button>

        <Text style={styles.version}>Shram Sarathi v1.0.0</Text>
      </ScrollView>

      {/* ── Fullscreen Image Modal ── */}
      <Modal
        visible={isFullImageVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsFullImageVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsFullImageVisible(false)}
        >
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={() => setIsFullImageVisible(false)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
          {avatarUri ? (
            <Image
              source={{ uri: avatarUri }}
              style={styles.fullImage}
              resizeMode="contain"
            />
          ) : null}
        </TouchableOpacity>
      </Modal>
      <RoleSwitchModal
        visible={showRoleModal}
        onClose={() => {
          setShowRoleModal(false);
          fetchProfileDetails();
        }}
        navigation={navigation}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  switchRoleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 4,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#FFD4B0',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  switchRoleIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF3E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchRoleTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#1A202C',
  },
  switchRoleSub: {
    fontSize: 11.5,
    color: '#718096',
    marginTop: 2,
  },
  switchRoleBtnPill: {
    backgroundColor: '#FF6B00',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    marginLeft: 8,
  },
  switchRoleBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  scrollContent: { paddingBottom: 40 },
  avatarSection: { alignItems: 'center', padding: 32, backgroundColor: '#fff' },
  avatar: { backgroundColor: '#FF6B00', marginBottom: 12 },
  name: { fontWeight: 'bold', color: '#333' },
  phone: { color: '#666', marginTop: 4 },
  roleBadge: {
    backgroundColor: '#FFF5EE', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 4, marginTop: 8,
  },
  roleText: { fontSize: 12, color: '#FF6B00', fontWeight: '600', textTransform: 'capitalize' },
  options: {
    backgroundColor: '#fff', margin: 16, borderRadius: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
    overflow: 'hidden',
  },
  optionLabel: { fontSize: 14, color: '#333', fontWeight: '500' },
  optionValue: { fontSize: 12, color: '#FF6B00', marginTop: 2 },
  divider: { backgroundColor: '#f5f5f5' },
  logoutButton: {
    margin: 16, borderRadius: 16,
    paddingVertical: 4,
    borderWidth: 1.5, borderColor: '#FED7D7',
  },
  logoutText: { color: '#E53E3E', fontSize: 16, fontWeight: '600' },
  version: { textAlign: 'center', color: '#ccc', fontSize: 12, marginTop: 8 },

  // Fullscreen Modal Styles
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center', alignItems: 'center',
  },
  closeBtn: {
    position: 'absolute', top: 40, right: 24, zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.2)', width: 40, height: 40,
    borderRadius: 20, alignItems: 'center', justifyContent: 'center',
  },
  closeBtnText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  fullImage: { width: '92%', height: '80%' },
});
