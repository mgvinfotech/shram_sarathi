import React, { useState, useEffect } from 'react';
import {
  View, TouchableOpacity, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { Avatar, Surface, Text } from 'react-native-paper';
import { api } from '../../services/api';
import { useLanguage } from '../../i18n/LanguageContext';

interface Props {
  navigation: any;
  route: {
    params: { bookingId: number; providerName: string; providerCategory: string };
  };
}

type CallState = 'idle' | 'calling' | 'connected' | 'ended' | 'waiting_ivr';

export default function CallScreen({ navigation, route }: Props) {
  const { bookingId, providerName, providerCategory } = route.params;
  const [callState, setCallState] = useState<CallState>('idle');
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (callState === 'connected') {
      interval = setInterval(() => setDuration((d) => d + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [callState]);

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const getStatusText = () => {
    switch (callState) {
      case 'idle':       return t('readyToCall');
      case 'calling':    return t('connecting');
      case 'connected':  return `${t('callInProgress')} • ${formatDuration(duration)}`;
      case 'ended':      return t('callEnded');
      case 'waiting_ivr': return t('waitingIvr');
    }
  };

  const handleCall = async () => {
    setIsLoading(true);
    setCallState('calling');
    try {
      await api.post('/api/call/initiate', null, { params: { booking_id: bookingId } });
      setCallState('connected');
    } catch (err: any) {
      setCallState('idle');
      Alert.alert(t('callFailed'), err.response?.data?.detail || t('callFailedMsg'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Provider Info */}
      <View style={styles.providerSection}>
        <Avatar.Text size={100} label={providerName[0]} style={styles.avatar} color="#fff" />
        <Text variant="headlineSmall" style={styles.providerName}>{providerName}</Text>
        <Text variant="bodyMedium" style={styles.providerCategory}>{providerCategory}</Text>
        <Text variant="bodySmall" style={styles.statusText}>{getStatusText()}</Text>
      </View>

      {/* Privacy Badge */}
      <View style={styles.privacyBadge}>
        <Text variant="labelSmall" style={styles.privacyText}>{t('numberPrivate')}</Text>
      </View>

      {/* Call Button */}
      <View style={styles.callSection}>
        {callState === 'idle' && (
          <TouchableOpacity
            style={styles.callButton}
            onPress={handleCall}
            disabled={isLoading}
            accessibilityLabel="Call"
            accessibilityRole="button"
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="large" />
            ) : (
              <Text style={styles.callIcon}>📞</Text>
            )}
          </TouchableOpacity>
        )}

        {callState === 'calling' && (
          <View style={styles.callingAnimation}>
            <ActivityIndicator color="#FF6B00" size="large" />
            <Text style={styles.callingText}>{t('connecting')}</Text>
          </View>
        )}

        {callState === 'connected' && (
          <View style={styles.connectedContainer}>
            <View style={styles.connectedIndicator}>
              <Text style={styles.connectedText}>✅ Connected</Text>
            </View>
            <Text style={styles.durationText}>{formatDuration(duration)}</Text>
          </View>
        )}
      </View>

      {/* Info */}
      <Surface style={styles.infoBox} elevation={1}>
        <Text variant="bodySmall" style={styles.infoText}>ℹ️ {t('callInfo1')}</Text>
        <Text variant="bodySmall" style={styles.infoText}>❌ {t('callInfo2')}</Text>
      </Surface>

      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Text style={styles.backText}>{t('goBack')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: '#1a1a2e',
    alignItems: 'center', justifyContent: 'space-between', padding: 32,
  },
  providerSection: { alignItems: 'center', marginTop: 40 },
  avatar: { backgroundColor: '#FF6B00', marginBottom: 16 },
  providerName: { fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  providerCategory: { fontSize: 14, color: '#aaa', marginBottom: 12 },
  statusText: { fontSize: 14, color: '#FF6B00' },
  privacyBadge: {
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 6,
  },
  privacyText: { color: '#aaa', fontSize: 12 },
  callSection: { alignItems: 'center' },
  callButton: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#38A169', justifyContent: 'center', alignItems: 'center',
    shadowColor: '#38A169', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5, shadowRadius: 12, elevation: 8,
  },
  callIcon: { fontSize: 32 },
  callingAnimation: { alignItems: 'center' },
  callingText: { color: '#FF6B00', marginTop: 12, fontSize: 16 },
  connectedContainer: { alignItems: 'center' },
  connectedIndicator: {
    backgroundColor: 'rgba(56,161,105,0.2)', borderRadius: 20,
    paddingHorizontal: 20, paddingVertical: 8, marginBottom: 8,
  },
  connectedText: { color: '#38A169', fontWeight: 'bold' },
  durationText: { color: '#fff', fontSize: 32, fontWeight: 'bold' },
  infoBox: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12,
    padding: 16, width: '100%',
  },
  infoText: { color: '#aaa', fontSize: 12, marginBottom: 6, lineHeight: 18 },
  backButton: { paddingVertical: 8 },
  backText: { color: '#666', fontSize: 14 },
});
