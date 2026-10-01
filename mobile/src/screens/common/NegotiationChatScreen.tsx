import React, { useState, useEffect, useRef } from 'react';
import {
  View, StyleSheet, FlatList, KeyboardAvoidingView, Platform,
  TouchableOpacity, Alert, ActivityIndicator, Linking, Modal, Keyboard
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import { Text, TextInput, Surface } from 'react-native-paper';
import { api, getErrorMessage } from '../../services/api';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../i18n/LanguageContext';

interface Message {
  id: string;
  sender: 'customer' | 'provider' | 'driver' | 'system';
  type: 'text' | 'offer' | 'voice' | 'accepted' | 'rejected';
  content: string;
  wage?: number;
  timestamp: string;
}

interface JobDetail {
  job_id: number;
  work_type?: string;
  description?: string;
  category?: string;
  wage?: number;
  job_mode?: string;
  address?: string;
  time_shift?: string;
  start_time?: string;
  labour_count?: number;
  booked_spots?: number;
  distance_km?: number;
  contract_id?: string;
}

export default function NegotiationChatScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { lang } = useLanguage();
  const { role } = useSelector((s: RootState) => s.auth);

  const routeParams = route.params ?? {};
  const jobId = routeParams.job_id ?? routeParams.jobId;
  const providerId = routeParams.provider_id ?? routeParams.providerId;
  const initialModule = routeParams.module ?? 'labour';

  const [activeModule, setActiveModule] = useState<string>(initialModule);
  const [selectedProviderId, setSelectedProviderId] = useState<number | null>(providerId ? Number(providerId) : null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [jobDetails, setJobDetails] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // Counter Modal State
  const [showCounterModal, setShowCounterModal] = useState(false);
  const [offerWage, setOfferWage] = useState('');
  const [counterNote, setCounterNote] = useState('');

  // Voice playback & recording
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  // Chat input
  const [chatText, setChatText] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);

  const flatListRef = useRef<FlatList>(null);

  const isCustomer = role === 'customer';
  const myRole = isCustomer ? 'customer' : 'provider';

  const [remoteProviderId, setRemoteProviderId] = useState<number | null>(providerId ? Number(providerId) : null);
  const [jobStatus, setJobStatus] = useState<string>('negotiating');
  const [counterpartyName, setCounterpartyName] = useState<string>('');
  const [counterpartyPhone, setCounterpartyPhone] = useState<string>('');
  const hasAlertedAcceptedRef = useRef(false);

  const [currentJobId, setCurrentJobId] = useState<number | null>(jobId ? Number(jobId) : null);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [jobCardExpanded, setJobCardExpanded] = useState(false);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        setIsKeyboardVisible(true);
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 120);
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setIsKeyboardVisible(false);
      }
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Calculate active fare from latest message or jobDetails
  const latestWageFromMessages = messages
    .slice()
    .reverse()
    .find(m => m.wage && m.wage > 0)?.wage;
  const activeFare = Math.round(latestWageFromMessages || jobDetails?.wage || 600);

  const getModuleRoleLabel = () => {
    switch (activeModule) {
      case 'transport': return 'ड्राइवर';
      case 'driver': return 'ड्राइवर';
      case 'karigar': return 'कारीगर';
      case 'contractor': return 'ठेकेदार';
      default: return 'मज़दूर';
    }
  };

  const getShiftLabel = (shift?: string) => {
    if (!shift) return 'फुल डे (8 घंटे)';
    if (shift === 'half_day') return 'हाफ डे (4 घंटे)';
    if (shift === 'full_day') return 'फुल डे (8 घंटे)';
    if (shift === 'theka') return 'ठेका कार्य';
    if (shift === 'monthly') return 'मासिक / स्थायी';
    return shift;
  };

  const getStartTimeLabel = (time?: string) => {
    if (!time) return 'कल सुबह';
    if (time === 'today') return 'आज';
    if (time === 'tomorrow_morning' || time === 'tomorrow') return 'कल सुबह';
    return time;
  };

  const loadData = async () => {
    let effectiveJobId = currentJobId || (jobId ? Number(jobId) : null);

    if (!effectiveJobId) {
      try {
        if (isCustomer) {
          const bRes = await api.get(activeModule === 'transport' ? '/api/transport/customer/bookings' : `/api/${activeModule}/customer/history`);
          const list = Array.isArray(bRes.data) ? bRes.data : [];
          const active = list.find((b: any) => ['negotiating', 'searching', 'pending', 'accepted', 'active'].includes(b.status)) || list[0];
          if (active) {
            effectiveJobId = Number(active.booking_id || active.job_id || active.id);
            setCurrentJobId(effectiveJobId);
          }
        } else {
          const bRes = await api.get(activeModule === 'transport' ? '/api/transport/driver/bookings' : `/api/${activeModule}/provider/history`);
          const list = Array.isArray(bRes.data) ? bRes.data : [];
          const active = list.find((b: any) => ['negotiating', 'searching', 'pending', 'accepted', 'active'].includes(b.status)) || list[0];
          if (active) {
            effectiveJobId = Number(active.booking_id || active.job_id || active.id);
            setCurrentJobId(effectiveJobId);
          }
        }
      } catch {
        // silent
      }
    }

    if (!effectiveJobId) {
      setLoading(false);
      return;
    }

    try {
      let res;
      const targetPId = selectedProviderId || (providerId ? Number(providerId) : undefined);
      if (activeModule === 'transport') {
        res = await api.get(`/api/transport/negotiation/messages/${effectiveJobId}`);
      } else {
        try {
          res = await api.get(`/api/${activeModule}/negotiation/messages/${effectiveJobId}`, {
            params: targetPId ? { provider_id: targetPId } : {},
          });
        } catch (err: any) {
          if (err?.response?.status === 404) {
            const altModule = activeModule === 'labour' ? 'driver' : 'labour';
            res = await api.get(`/api/${altModule}/negotiation/messages/${effectiveJobId}`, {
              params: targetPId ? { provider_id: targetPId } : {},
            });
            setActiveModule(altModule);
          } else {
            throw err;
          }
        }
      }

      setMessages(res.data.messages || []);
      if (res.data.provider_id) {
        setRemoteProviderId(res.data.provider_id);
        if (!selectedProviderId) {
          setSelectedProviderId(res.data.provider_id);
        }
      }

      const currStatus = res.data.status;
      if (currStatus) {
        setJobStatus(currStatus);
      }
      if (res.data.driver_name || res.data.customer_name || res.data.provider_name) {
        const pName = res.data.driver_name || res.data.provider_name || getModuleRoleLabel();
        setCounterpartyName(isCustomer ? pName : (res.data.customer_name || 'ग्राहक'));
      }
      if (res.data.driver_phone || res.data.customer_phone || res.data.provider_phone) {
        const pPhone = res.data.driver_phone || res.data.provider_phone || '';
        setCounterpartyPhone(isCustomer ? pPhone : (res.data.customer_phone || ''));
      }

      // Populate Dynamic Job Details directly from response
      if (res.data.work_type || res.data.category || res.data.wage || res.data.address || res.data.service_type) {
        setJobDetails({
          job_id: res.data.job_id || effectiveJobId,
          work_type: res.data.work_type || res.data.description || res.data.service_type || res.data.category,
          description: res.data.description,
          category: res.data.category || res.data.labour_type || res.data.vehicle_type_label,
          wage: res.data.wage,
          job_mode: res.data.job_mode,
          address: res.data.address || (res.data.pickup_address ? `${res.data.pickup_address} ➔ ${res.data.drop_address}` : undefined),
          time_shift: res.data.time_shift,
          start_time: res.data.start_time,
          labour_count: res.data.labour_count,
          booked_spots: res.data.booked_spots,
          distance_km: res.data.distance_km,
        });
      }

      // If accepted/active and not yet alerted
      if ((currStatus === 'accepted' || currStatus === 'active' || currStatus === 'in_progress') && !hasAlertedAcceptedRef.current) {
        hasAlertedAcceptedRef.current = true;
        Alert.alert(
          '🎉 ऑफ़र स्वीकार कर लिया गया!',
          isCustomer
            ? `${counterpartyName || getModuleRoleLabel()} ने आपका ऑफ़र स्वीकार कर लिया है। काम पक्का हो गया!`
            : 'ग्राहक ने आपका ऑफ़र स्वीकार कर लिया है! काम पक्का हो गया।',
          [
            {
              text: '➔ मुख्य काम पर जाएं',
              onPress: () => {
                if (isCustomer) {
                  navigation.goBack();
                } else {
                  navigation.navigate('ProviderApp', { screen: 'DashboardTab' });
                }
              }
            },
            { text: 'चैट में रहें (Stay)', style: 'cancel' }
          ]
        );
      }

      // Secondary fallback fetch if jobDetails still incomplete
      if (!res.data.work_type && !res.data.address) {
        try {
          if (activeModule === 'transport') {
            const jobRes = await api.get(`/api/transport/booking/${effectiveJobId}`);
            setJobDetails({
              job_id: jobRes.data.booking_id,
              work_type: jobRes.data.service_type === 'goods' ? 'माल परिवहन' : jobRes.data.service_type === 'delivery' ? 'डिलीवरी' : 'यात्री सेवा',
              category: jobRes.data.vehicle_type_label || jobRes.data.vehicle_type,
              wage: jobRes.data.agreed_fare || jobRes.data.offered_fare || jobRes.data.total_fare,
              address: `${jobRes.data.pickup_address} ➔ ${jobRes.data.drop_address}`,
              distance_km: jobRes.data.distance_km,
            });
            if (jobRes.data.status) setJobStatus(jobRes.data.status);
          } else {
            const jobRes = await api.get(`/api/${activeModule}/status/${effectiveJobId}`);
            setJobDetails({
              job_id: jobRes.data.job_id,
              work_type: jobRes.data.work_type || jobRes.data.description || jobRes.data.labour_type,
              description: jobRes.data.description,
              category: jobRes.data.labour_type || jobRes.data.category,
              wage: jobRes.data.wage,
              job_mode: jobRes.data.job_mode,
              address: jobRes.data.address,
              time_shift: jobRes.data.time_shift,
              start_time: jobRes.data.start_time,
              labour_count: jobRes.data.labour_count,
              distance_km: jobRes.data.distance_km,
            });
            if (jobRes.data.status) setJobStatus(jobRes.data.status);
          }
        } catch {
          // silent
        }
      }
    } catch (error) {
      console.warn('Failed to load chat data', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 3000);
    return () => clearInterval(interval);
  }, [currentJobId, jobId, activeModule]);

  useEffect(() => {
    return sound ? () => { sound.unloadAsync(); } : undefined;
  }, [sound]);

  const playVoice = async (uri: string, msgId: string) => {
    try {
      if (sound && playingId === msgId) {
        await sound.stopAsync();
        setSound(null);
        setPlayingId(null);
        return;
      }
      if (sound) await sound.stopAsync();
      const { sound: newSound } = await Audio.Sound.createAsync({ uri });
      setSound(newSound);
      setPlayingId(msgId);
      await newSound.playAsync();
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setPlayingId(null);
        }
      });
    } catch (err) {
      console.error('Play error', err);
    }
  };

  const startVoiceRecording = async () => {
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (perm.status !== 'granted') {
        Alert.alert('अनुमति आवश्यक', 'माइक की अनुमति आवश्यक है।');
        return;
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const { recording: newRec } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(newRec);
      setIsRecording(true);
    } catch (err) {
      console.error('Recording start error', err);
    }
  };

  const stopAndSendVoiceRecording = async () => {
    if (!recording) return;
    setIsRecording(false);
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      if (uri) {
        const formData = new FormData();
        formData.append('file', {
          uri,
          name: `voice_${Date.now()}.m4a`,
          type: 'audio/m4a',
        } as any);

        let audioUrl = uri;
        try {
          const uploadRes = await api.post(`/api/${activeModule}/negotiation/upload-voice`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          if (uploadRes.data?.url) {
            audioUrl = uploadRes.data.url;
          }
        } catch {
          try {
            const fallbackRes = await api.post('/api/negotiation/upload-voice', formData, {
              headers: { 'Content-Type': 'multipart/form-data' },
            });
            if (fallbackRes.data?.url) {
              audioUrl = fallbackRes.data.url;
            }
          } catch {
            // fallback to uri
          }
        }

        await sendMessage('voice', audioUrl, activeFare);
      }
    } catch (err) {
      console.error('Recording stop error', err);
    }
  };

  const sendMessage = async (type: 'text' | 'offer' | 'voice', content: string, wage?: number) => {
    if (!content.trim() && !wage) return;
    const effectiveJobId = currentJobId || (jobId ? Number(jobId) : null);
    if (!effectiveJobId) return;

    setSendingMsg(true);
    try {
      if (activeModule === 'contractor') {
        if (type === 'offer' && wage) {
          await api.post(`/api/contractor/proposal/${effectiveJobId}/counter`, {
            total_amount: wage,
            notes: content,
          });
        }
      } else if (activeModule === 'transport') {
        await api.post(`/api/transport/negotiation/send`, {
          job_id: effectiveJobId,
          wage: wage || (Number(offerWage) || activeFare),
          message: content,
        });
      } else {
        const targetPId = selectedProviderId || remoteProviderId || (providerId ? Number(providerId) : undefined);
        await api.post(`/api/${activeModule}/negotiation/send`, {
          job_id: effectiveJobId,
          provider_id: targetPId,
          type,
          content,
          wage: wage || (Number(offerWage) || activeFare),
          message: content,
        });
      }
      setShowCounterModal(false);
      setOfferWage('');
      setCounterNote('');
      setChatText('');
      loadData();
    } catch (error) {
      Alert.alert('Error', getErrorMessage(error));
    } finally {
      setSendingMsg(false);
    }
  };

  const acceptOffer = async (customWage?: number) => {
    const effectiveJobId = currentJobId || (jobId ? Number(jobId) : null);
    if (!effectiveJobId) return;

    try {
      if (activeModule === 'contractor') {
        await api.post(`/api/contractor/proposal/${effectiveJobId}/accept`, { terms_read: true });
        Alert.alert('✅ सफलता', 'प्रस्ताव स्वीकार कर लिया गया! अनुबंध तैयार है।');
        navigation.navigate('ContractorProposalDetail', { proposal_id: effectiveJobId });
        return;
      }

      if (activeModule === 'transport') {
        if (isCustomer) {
          await api.post(`/api/transport/customer/accept`, { booking_id: effectiveJobId });
          Alert.alert('✅ सफलता', 'किराया तय हो गया! डिजिटल समझौता तैयार है।');
          navigation.navigate('TransportBooking', { booking_id: effectiveJobId });
        } else {
          await api.post(`/api/transport/driver/accept`, { booking_id: effectiveJobId });
          Alert.alert('✅ सफलता', 'किराया तय हो गया! यात्रा स्वीकृत हुई।');
          navigation.navigate('ProviderApp', { screen: 'DashboardTab' });
        }
        return;
      }

      const targetProviderId = selectedProviderId || remoteProviderId || (providerId ? Number(providerId) : undefined);
      if (isCustomer) {
        if (!targetProviderId) {
          Alert.alert('Error', 'Provider details missing.');
          return;
        }
        await api.post(`/api/${activeModule}/customer/accept`, { job_id: effectiveJobId, provider_id: targetProviderId });
        Alert.alert('✅ सफलता', `ऑफ़र स्वीकार कर लिया गया! काम पक्का हुआ ₹${customWage || activeFare} पर।`);
        navigation.goBack();
      } else {
        await api.post(`/api/${activeModule}/provider/accept`, { job_id: effectiveJobId });
        Alert.alert('✅ सफलता', `ऑफ़र स्वीकार कर लिया गया! काम पक्का हुआ ₹${customWage || activeFare} पर।`);
        navigation.navigate('ProviderApp', { screen: 'DashboardTab' });
      }
    } catch (error) {
      Alert.alert('Error', getErrorMessage(error));
    }
  };

  const rejectOffer = async () => {
    const effectiveJobId = currentJobId || (jobId ? Number(jobId) : null);
    if (!effectiveJobId) return;

    Alert.alert(
      lang === 'hi' ? 'ऑफ़र अस्वीकार करें?' : 'Reject Offer?',
      lang === 'hi' ? 'क्या आप इस बातचीत / ऑफ़र को मना करना चाहते हैं?' : 'Are you sure you want to reject this offer?',
      [
        { text: lang === 'hi' ? 'नहीं' : 'No', style: 'cancel' },
        {
          text: lang === 'hi' ? 'हाँ, मना करें' : 'Yes, Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              if (activeModule === 'contractor') {
                await api.post(`/api/contractor/proposal/${effectiveJobId}/reject`, { reason: 'Offer rejected by user' });
              } else if (activeModule === 'transport') {
                if (isCustomer) {
                  await api.post('/api/transport/customer/reject', { booking_id: effectiveJobId });
                } else {
                  await api.post('/api/transport/driver/reject', { booking_id: effectiveJobId });
                }
              } else {
                await sendMessage('text', lang === 'hi' ? 'क्षमा करें, यह मजदूरी/रेट संभव नहीं है।' : 'Sorry, this rate is not possible.');
              }
              Alert.alert(lang === 'hi' ? 'अस्वीकृत' : 'Rejected', lang === 'hi' ? 'ऑफ़र अस्वीकार कर दिया गया।' : 'Offer has been rejected.');
              navigation.goBack();
            } catch (err) {
              Alert.alert('Error', getErrorMessage(err));
            }
          }
        }
      ]
    );
  };

  const handleSendCounter = () => {
    const num = Number(offerWage);
    if (!num || num <= 0) {
      Alert.alert(lang === 'hi' ? 'कृपया सही राशि दर्ज करें' : 'Invalid Amount', 'Please enter a valid wage amount.');
      return;
    }
    const defaultMsg = isCustomer
      ? `क्या आप ₹${num} ${jobDetails?.job_mode === 'permanent' ? 'प्रति माह' : 'में'} करेंगे?`
      : `मेरी मजदूरी/रेट ₹${num} ${jobDetails?.job_mode === 'permanent' ? 'प्रति माह' : 'प्रति दिन'} रहेगी।`;
    const messageToSend = counterNote.trim() ? counterNote.trim() : defaultMsg;
    sendMessage('offer', messageToSend, num);
  };

  const adjustFareDelta = (delta: number) => {
    const base = Number(offerWage) || activeFare;
    const updated = Math.max(50, base + delta);
    setOfferWage(String(updated));
  };

  const isDealAccepted = jobStatus === 'accepted' || jobStatus === 'active' || jobStatus === 'completed';

  const renderMessage = ({ item }: { item: Message }) => {
    const isMe = item.sender === myRole || (myRole === 'provider' && item.sender === 'driver');
    const timeStr = item.timestamp
      ? new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '';

    let senderTitle = '';
    let categoryBadge = '';
    if (isMe) {
      senderTitle = isCustomer ? 'आप' : (counterpartyName ? `${counterpartyName}` : 'आप');
      categoryBadge = isCustomer ? 'ग्राहक' : getModuleRoleLabel();
    } else {
      if (item.sender === 'system') {
        senderTitle = 'सारथी सहायक';
      } else if (isCustomer) {
        senderTitle = counterpartyName || getModuleRoleLabel();
        categoryBadge = jobDetails?.category || getModuleRoleLabel();
      } else {
        senderTitle = counterpartyName || 'ग्राहक';
        categoryBadge = 'ग्राहक';
      }
    }

    const isIncomingOffer = !isMe && item.type === 'offer' && !isDealAccepted;

    return (
      <View style={[styles.msgWrapper, isMe ? styles.msgWrapperRight : styles.msgWrapperLeft]}>
        <Surface style={[styles.msgCard, isMe ? styles.myMsgCard : styles.theirMsgCard]}>
          {/* Header Row with Avatar, Name & Badge */}
          <View style={styles.msgHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={[styles.avatarCircle, isMe ? { backgroundColor: '#1E293B' } : { backgroundColor: '#E65100' }]}>
                <Text style={{ color: '#fff', fontSize: 11, fontWeight: 'bold' }}>
                  {senderTitle.charAt(0)}
                </Text>
              </View>
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={[styles.msgSenderTitle, isMe && { color: '#1E293B' }]}>{senderTitle}</Text>
                  {!isMe && <Ionicons name="checkmark-circle" size={14} color="#16A34A" />}
                </View>
                {!!categoryBadge && (
                  <Text style={{ fontSize: 9.5, color: '#64748B' }}>{categoryBadge}</Text>
                )}
              </View>
            </View>
            <Text style={styles.msgTimeLabel}>{timeStr}</Text>
          </View>

          <Text style={styles.msgBodyText}>{item.content}</Text>

          {/* Outgoing offer waiting badge for non-self acceptance clarity */}
          {isMe && item.type === 'offer' && !isDealAccepted && (
            <View style={styles.waitingOfferBadge}>
              <Ionicons name="hourglass-outline" size={13} color="#B45309" />
              <Text style={styles.waitingOfferText}>
                {item.wage ? `आपने ₹${item.wage} का ऑफ़र भेजा है` : 'ऑफ़र भेजा गया'} (स्वीकृति की प्रतीक्षा...)
              </Text>
            </View>
          )}

          {/* Voice Player */}
          {item.type === 'voice' && (
            <TouchableOpacity onPress={() => playVoice(item.content, item.id)} style={styles.voicePlayBtn}>
              <Ionicons name={playingId === item.id ? "square" : "play"} size={18} color="#16A34A" />
              <Text style={styles.voicePlayText}>
                {playingId === item.id ? 'चल रहा है...' : '🎙️ वॉयस संदेश सुनें'}
              </Text>
            </TouchableOpacity>
          )}

          {/* Inline Action Buttons on Incoming Offer (PDF Page 3 & 7) */}
          {isIncomingOffer && (
            <View style={styles.inlineActionRow}>
              <TouchableOpacity
                style={[styles.inlineBtn, { backgroundColor: '#16A34A' }]}
                onPress={() => acceptOffer(item.wage)}
              >
                <Ionicons name="checkmark-circle" size={15} color="#fff" />
                <Text style={styles.inlineBtnText}>Accept करें {item.wage ? `(₹${item.wage})` : ''}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.inlineBtn, { backgroundColor: '#EA580C' }]}
                onPress={() => {
                  setOfferWage(String(item.wage || activeFare));
                  setShowCounterModal(true);
                }}
              >
                <Ionicons name="sync" size={15} color="#fff" />
                <Text style={styles.inlineBtnText}>Cross Offer करें</Text>
              </TouchableOpacity>
            </View>
          )}
        </Surface>
      </View>
    );
  };

  const dynamicWorkType = jobDetails?.work_type || jobDetails?.description || jobDetails?.category || (activeModule === 'transport' ? 'परिवहन सेवा' : 'मज़दूरी/कार्य');
  const dynamicCategory = jobDetails?.category || getModuleRoleLabel();
  const dynamicAddress = jobDetails?.address || 'लोकेशन उपलब्ध नहीं';
  const dynamicCount = jobDetails?.labour_count ?? 1;
  const isPermanent = jobDetails?.job_mode === 'permanent';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* ── 1. Top Header (PDF Page 3) ── */}
      <View style={styles.navHeader}>
        <TouchableOpacity style={styles.navBackBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={styles.navTitle} numberOfLines={1}>
            {counterpartyName ? `${counterpartyName} से बातचीत` : 'Live Notification Chat'}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 1 }}>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: '#16A34A' }} />
            <Text style={{ fontSize: 11, color: '#16A34A', fontWeight: 'bold' }}>ऑनलाइन</Text>
            {jobDetails?.distance_km ? (
              <Text style={{ fontSize: 11, color: '#64748B' }}>· 📍 {jobDetails.distance_km} KM दूर</Text>
            ) : (
              <Text style={{ fontSize: 11, color: '#64748B' }}>· 📍 पास में</Text>
            )}
          </View>
        </View>
        {!!counterpartyPhone && isDealAccepted && (
          <TouchableOpacity
            style={{ backgroundColor: '#16A34A', padding: 8, borderRadius: 20, marginRight: 8 }}
            onPress={() => Linking.openURL(`tel:${counterpartyPhone}`)}
          >
            <Ionicons name="call" size={18} color="#fff" />
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.navMenuBtn} onPress={() => loadData()}>
          <Ionicons name="ellipsis-vertical" size={20} color="#1E293B" />
        </TouchableOpacity>
      </View>

      {/* ── 2. Green Notice Banner (Hidden during keyboard typing) ── */}
      {!isKeyboardVisible && (
        <View style={styles.noticeBanner}>
          <Ionicons name="notifications" size={18} color="#16A34A" style={{ marginRight: 8 }} />
          <Text style={styles.noticeBannerText}>
            यहाँ आपको {getModuleRoleLabel()} के accept या cross offer की सूचना मिलेगी और आप जवाब दे सकते हैं।
          </Text>
        </View>
      )}

      {/* ── 3. Top Dynamic Job Details Summary Card (Collapsible on typing) ── */}
      {isKeyboardVisible && !jobCardExpanded ? (
        <TouchableOpacity
          style={styles.compactJobCard}
          onPress={() => setJobCardExpanded(true)}
          activeOpacity={0.85}
        >
          <View style={styles.compactJobRow}>
            <Text style={styles.compactJobTitle} numberOfLines={1}>
              📋 {dynamicWorkType}
            </Text>
            <Text style={styles.compactJobWage}>
              ₹{activeFare} {isPermanent ? '/माह' : (activeModule === 'transport' ? '' : '/दिन')}
            </Text>
            <Ionicons name="chevron-down" size={16} color="#64748B" style={{ marginLeft: 4 }} />
          </View>
        </TouchableOpacity>
      ) : (
        <View style={styles.topJobCard}>
          {isKeyboardVisible && (
            <TouchableOpacity
              style={{ alignSelf: 'flex-end', paddingBottom: 4 }}
              onPress={() => setJobCardExpanded(false)}
            >
              <Text style={{ fontSize: 11, color: '#64748B' }}>संक्षिप्त करें ▲</Text>
            </TouchableOpacity>
          )}
          <View style={styles.jobCardRow}>
            <View style={{ flex: 1.3 }}>
              <Text style={styles.jobLabel}>काम का विवरण (Work)</Text>
              <Text style={styles.jobValue} numberOfLines={2}>
                {dynamicWorkType}
              </Text>
            </View>
            <View style={{ flex: 0.8, alignItems: 'center' }}>
              <Text style={styles.jobLabel}>
                {activeModule === 'transport' ? 'सेवा' : `${getModuleRoleLabel()} संख्या`}
              </Text>
              <Text style={[styles.jobValue, { color: '#16A34A', fontWeight: 'bold' }]}>
                {activeModule === 'transport' ? (dynamicCategory || '1') : String(dynamicCount).padStart(2, '0')}
              </Text>
            </View>
            <View style={{ flex: 1.1, alignItems: 'flex-end' }}>
              <Text style={styles.jobLabel}>मजदूरी / रेट</Text>
              <Text style={[styles.jobValue, { color: '#EA580C', fontWeight: 'bold' }]}>
                ₹ {activeFare} {isPermanent ? '/ माह' : (activeModule === 'transport' ? 'किराया' : '/ दिन')}
              </Text>
            </View>
          </View>

          <View style={[styles.jobCardRow, { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F1F5F9' }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.jobLabel}>शिफ्ट / प्रकार</Text>
              <Text style={styles.jobValue}>
                {getShiftLabel(jobDetails?.time_shift)}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.jobLabel}>काम शुरू</Text>
              <Text style={styles.jobValue}>
                {getStartTimeLabel(jobDetails?.start_time)}
              </Text>
            </View>
            <View style={{ flex: 1.5 }}>
              <Text style={styles.jobLabel}>स्थान (Location)</Text>
              <Text style={styles.jobValue} numberOfLines={1}>
                {dynamicAddress}
              </Text>
            </View>
          </View>

          {/* Spot Tracker for Multi-spot bookings */}
          {!!(jobDetails?.labour_count && jobDetails.labour_count > 1) && (
            <View style={styles.spotTrackerRow}>
              <Ionicons name="people" size={15} color="#16A34A" />
              <Text style={styles.spotTrackerText}>
                स्पॉट स्थिति: <Text style={{ fontWeight: 'bold', color: '#15803D' }}>{jobDetails.booked_spots ?? 0}/{jobDetails.labour_count} स्वीकृत</Text> ({Math.max(0, jobDetails.labour_count - (jobDetails.booked_spots ?? 0))} जगह बाकी)
              </Text>
            </View>
          )}
        </View>
      )}

      {/* ── 4. Chat Messages Feed ── */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 25}
      >
        {/* Timeline separator */}
        <View style={styles.timelineSeparator}>
          <View style={styles.timelineLine} />
          <Text style={styles.timelineText}>आज की बातचीत</Text>
          <View style={styles.timelineLine} />
        </View>

        {loading ? (
          <ActivityIndicator style={{ flex: 1 }} color="#16A34A" size="large" />
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(i, idx) => (i?.id ? String(i.id) : `msg_${idx}`)}
            renderItem={renderMessage}
            contentContainerStyle={styles.chatListContent}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="chatbubbles-outline" size={44} color="#94A3B8" />
                <Text style={styles.emptyText}>
                  {lang === 'hi'
                    ? 'बातचीत शुरू करने के लिए नीचे दिए गए बटन या इनपुट का उपयोग करें।'
                    : 'Use the buttons below to start negotiation.'}
                </Text>
              </View>
            }
          />
        )}

        {/* ── 5. Quick Action Chips (PDF Page 3) ── */}
        {!isDealAccepted && (
          <View style={styles.quickChipsBar}>
            <TouchableOpacity
              style={styles.quickChip}
              onPress={() => {
                setOfferWage(String(Math.max(50, activeFare - 50)));
                setShowCounterModal(true);
              }}
            >
              <Text style={styles.quickChipText}>₹ Rate कम करें (-50)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickChip}
              onPress={() => {
                setOfferWage(String(activeFare + 50));
                setShowCounterModal(true);
              }}
            >
              <Text style={styles.quickChipText}>₹ Rate बढ़ाएं (+50)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickChip}
              onPress={() => sendMessage('text', 'काम के लिए कब तक पहुँच सकते हैं?')}
            >
              <Text style={styles.quickChipText}>⏱ कब उपलब्ध हैं?</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── 6. Bottom Input Bar with Mic Recording (PDF Page 3 & 7) ── */}
        {!isDealAccepted ? (
          <View style={styles.inputBarContainer}>
            <TextInput
              style={styles.chatTextInput}
              placeholder="यहाँ संदेश लिखें..."
              placeholderTextColor="#94A3B8"
              value={chatText}
              onChangeText={setChatText}
              onFocus={() => {
                setTimeout(() => {
                  flatListRef.current?.scrollToEnd({ animated: true });
                }, 100);
              }}
              onSubmitEditing={() => {
                if (chatText.trim()) {
                  sendMessage('text', chatText.trim());
                }
              }}
            />

            {/* Mic Voice Note Button */}
            <TouchableOpacity
              style={[styles.micBtn, isRecording && { backgroundColor: '#DC2626' }]}
              onPressIn={startVoiceRecording}
              onPressOut={stopAndSendVoiceRecording}
              activeOpacity={0.8}
            >
              <Ionicons name={isRecording ? "radio" : "mic"} size={22} color="#fff" />
            </TouchableOpacity>

            {/* Send Button */}
            <TouchableOpacity
              style={[styles.sendBtn, (!chatText.trim() && !sendingMsg) && { opacity: 0.6 }]}
              onPress={() => {
                if (chatText.trim()) {
                  sendMessage('text', chatText.trim());
                }
              }}
              disabled={!chatText.trim() || sendingMsg}
            >
              {sendingMsg ? (
                <ActivityIndicator size={18} color="#fff" />
              ) : (
                <Ionicons name="send" size={18} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.acceptedActionContainer}>
            <Text style={{ fontSize: 13, color: '#166534', fontWeight: 'bold', textAlign: 'center', marginBottom: 8 }}>
              🎉 काम पक्का हो गया है! दोनों पक्षों के नंबर अनलॉक हो गए हैं।
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {!!counterpartyPhone && (
                <TouchableOpacity
                  style={[styles.acceptedActionBtn, { backgroundColor: '#16A34A', flex: 1 }]}
                  onPress={() => Linking.openURL(`tel:${counterpartyPhone}`)}
                >
                  <Ionicons name="call" size={18} color="#fff" />
                  <Text style={styles.acceptedActionBtnText}>
                    कॉल करें ({counterpartyPhone})
                  </Text>
                </TouchableOpacity>
              )}
              {activeModule === 'transport' && (
                <TouchableOpacity
                  style={[styles.acceptedActionBtn, { backgroundColor: '#0284C7', flex: 1 }]}
                  onPress={() => navigation.navigate('TransportBooking', { booking_id: currentJobId })}
                >
                  <Ionicons name="document-text" size={18} color="#fff" />
                  <Text style={styles.acceptedActionBtnText}>समझौता</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </KeyboardAvoidingView>

      {/* ── 7. Counter Offer Modal (PDF Page 7) ── */}
      <Modal
        visible={showCounterModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCounterModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <Surface style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>💰 अपना दाम बताएँ (Cross Offer)</Text>
              <TouchableOpacity onPress={() => setShowCounterModal(false)}>
                <Ionicons name="close-circle" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubLabel}>
              {lang === 'hi' ? 'आप कितनी राशि/मजदूरी प्रस्तावित करना चाहते हैं?' : 'How much wage/fare do you propose?'}
            </Text>

            {/* Fare Input */}
            <View style={styles.modalInputRow}>
              <Text style={styles.rupeeSymbol}>₹</Text>
              <TextInput
                style={styles.modalInputBox}
                value={offerWage}
                onChangeText={setOfferWage}
                keyboardType="numeric"
                placeholder={String(activeFare)}
                autoFocus
              />
            </View>

            {/* Quick Adjustment Chips */}
            <View style={styles.quickChipsRow}>
              <TouchableOpacity style={styles.adjustChip} onPress={() => adjustFareDelta(-50)}>
                <Text style={styles.adjustChipText}>- ₹50</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.adjustChip} onPress={() => adjustFareDelta(-20)}>
                <Text style={styles.adjustChipText}>- ₹20</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.adjustChip} onPress={() => adjustFareDelta(+20)}>
                <Text style={styles.adjustChipText}>+ ₹20</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.adjustChip} onPress={() => adjustFareDelta(+50)}>
                <Text style={styles.adjustChipText}>+ ₹50</Text>
              </TouchableOpacity>
            </View>

            {/* Note Input */}
            <TextInput
              style={styles.noteInputBox}
              value={counterNote}
              onChangeText={setCounterNote}
              placeholder={isCustomer ? 'उदा: क्या आप इस दर में करेंगे?' : 'उदा: काम के अनुसार मेरा दाम यह रहेगा।'}
              placeholderTextColor="#94A3B8"
            />

            {/* Action Buttons */}
            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#F1F5F9' }]}
                onPress={() => setShowCounterModal(false)}
              >
                <Text style={[styles.modalBtnText, { color: '#475569' }]}>रद्द करें</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#EA580C', flex: 1.5 }]}
                onPress={handleSendCounter}
              >
                <Text style={[styles.modalBtnText, { color: '#FFFFFF' }]}>Cross Offer भेजें</Text>
              </TouchableOpacity>
            </View>
          </Surface>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  // 1. Navigation Header
  navHeader: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  navBackBtn: { padding: 4 },
  navTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  navMenuBtn: { padding: 4 },

  // 2. Green Notice Banner
  noticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    borderBottomWidth: 1,
    borderBottomColor: '#BBF7D0',
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  noticeBannerText: {
    fontSize: 11.5,
    color: '#14532D',
    fontWeight: '600',
    flex: 1,
    lineHeight: 16,
  },

  // 3. Top Job Details Card
  compactJobCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 12,
    marginTop: 4,
    marginBottom: 2,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    elevation: 1,
  },
  compactJobRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  compactJobTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
  },
  compactJobWage: {
    fontSize: 12,
    fontWeight: '800',
    color: '#EA580C',
    marginLeft: 8,
  },
  topJobCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 12,
    marginTop: 8,
    marginBottom: 4,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 1,
  },
  jobCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  jobLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 2,
  },
  jobValue: {
    fontSize: 12.5,
    color: '#1E293B',
    fontWeight: '700',
  },
  spotTrackerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 8,
    gap: 6,
  },
  spotTrackerText: {
    fontSize: 11.5,
    color: '#166534',
    fontWeight: '600',
  },
  waitingOfferBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 6,
    gap: 5,
  },
  waitingOfferText: {
    fontSize: 11,
    color: '#92400E',
    fontWeight: '600',
  },

  // Timeline separator
  timelineSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
    paddingHorizontal: 20,
  },
  timelineLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  timelineText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
    marginHorizontal: 10,
  },

  // Chat Feed
  chatListContent: {
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
  msgWrapper: {
    marginVertical: 6,
    maxWidth: '90%',
  },
  msgWrapperLeft: { alignSelf: 'flex-start' },
  msgWrapperRight: { alignSelf: 'flex-end' },
  msgCard: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    elevation: 0.5,
  },
  theirMsgCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderTopLeftRadius: 4,
  },
  myMsgCard: {
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1',
    borderTopRightRadius: 4,
  },
  msgHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  avatarCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  msgSenderTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  msgTimeLabel: {
    fontSize: 10,
    color: '#64748B',
  },
  msgBodyText: {
    fontSize: 13.5,
    color: '#1E293B',
    lineHeight: 19,
  },
  voicePlayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#DCFCE7',
    borderRadius: 8,
    gap: 6,
  },
  voicePlayText: {
    fontSize: 12,
    color: '#15803D',
    fontWeight: 'bold',
  },
  inlineActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  inlineBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 4,
  },
  inlineBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 11.5,
  },

  // Quick Chips
  quickChipsBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 6,
  },
  quickChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  quickChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },

  // Bottom Input Bar
  inputBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 8,
  },
  chatTextInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  micBtn: {
    backgroundColor: '#16A34A',
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtn: {
    backgroundColor: '#0F172A',
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },

  acceptedActionContainer: {
    backgroundColor: '#F0FDF4',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#BBF7D0',
  },
  acceptedActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  acceptedActionBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },

  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    color: '#64748B',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  modalSubLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 12,
  },
  modalInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#EA580C',
    borderRadius: 10,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  rupeeSymbol: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#EA580C',
    marginRight: 6,
  },
  modalInputBox: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0F172A',
    backgroundColor: 'transparent',
  },
  quickChipsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  adjustChip: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  adjustChipText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#C2410C',
  },
  noteInputBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    marginBottom: 16,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnText: {
    fontWeight: 'bold',
    fontSize: 14,
  },
});
