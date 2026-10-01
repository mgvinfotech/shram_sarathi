import React, { useState, useEffect, useCallback } from 'react';
import {
  View, FlatList, StyleSheet, TouchableOpacity, RefreshControl, Alert,
} from 'react-native';
import { Text, Surface, Badge, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../services/api';

interface NotificationItem {
  id: number;
  title: string;
  body: string;
  type: string;
  booking_id?: number;
  booking_model?: string;
  data?: Record<string, any>;
  read_at: string | null;
  created_at: string;
}

// Emoji for each notification type
function typeEmoji(type: string): string {
  const map: Record<string, string> = {
    new_request: '🚗',
    trip_started: '✅',
    rejected:    '🔄',
    cancelled:   '❌',
    completed:   '🎉',
    no_driver:   '😔',
    general:     '🔔',
  };
  return map[type] ?? '🔔';
}

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

interface Props { navigation: any; }

export default function NotificationsScreen({ navigation }: Props) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api.get('/api/notifications');
      setNotifications(res.data.notifications ?? []);
      setUnreadCount(res.data.unread_count ?? 0);
    } catch (err) {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  };

  const markRead = async (id: number) => {
    try {
      await api.put(`/api/notifications/${id}/read`);
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {}
  };

  const markAllRead = async () => {
    try {
      await api.put('/api/notifications/mark-all-read');
      setNotifications(prev => prev.map(n => ({ ...n, read_at: new Date().toISOString() })));
      setUnreadCount(0);
    } catch {}
  };

  const clearAll = async () => {
    Alert.alert('Confirm', 'Saari notifications delete karein?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await api.delete('/api/notifications');
            setNotifications([]);
            setUnreadCount(0);
          } catch {}
        },
      },
    ]);
  };

  const handleTap = (item: NotificationItem) => {
    if (!item.read_at) markRead(item.id);

    // Navigate to relevant screen
    const screen = item.data?.screen;
    const bookingId = item.booking_id;
    if (screen) {
      navigation.navigate(screen, { bookingId });
    }
  };

  const renderItem = ({ item }: { item: NotificationItem }) => {
    const isUnread = !item.read_at;
    return (
      <TouchableOpacity onPress={() => handleTap(item)} activeOpacity={0.75}>
        <Surface
          style={[styles.card, isUnread && styles.cardUnread]}
          elevation={isUnread ? 3 : 1}
        >
          <View style={styles.cardRow}>
            <Text style={styles.emoji}>{typeEmoji(item.type)}</Text>
            <View style={styles.cardContent}>
              <View style={styles.cardHeader}>
                <Text style={[styles.title, isUnread && styles.titleUnread]} numberOfLines={1}>
                  {item.title}
                </Text>
                {isUnread && <View style={styles.unreadDot} />}
              </View>
              <Text style={styles.body} numberOfLines={2}>{item.body}</Text>
              <Text style={styles.time}>{timeAgo(item.created_at)}</Text>
            </View>
          </View>
        </Surface>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          Notifications{unreadCount > 0 ? ` (${unreadCount})` : ''}
        </Text>
        <View style={styles.headerActions}>
          {unreadCount > 0 && (
            <TouchableOpacity onPress={markAllRead} style={styles.headerActionBtn}>
              <Text style={styles.headerActionText}>All Read</Text>
            </TouchableOpacity>
          )}
          {notifications.length > 0 && (
            <TouchableOpacity onPress={clearAll} style={[styles.headerActionBtn, styles.deleteBtn]}>
              <Text style={[styles.headerActionText, { color: '#E53E3E' }]}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Loading...</Text>
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>🔔</Text>
          <Text style={styles.emptyText}>Koi notification nahi hai</Text>
          <Text style={styles.emptySubText}>
            Jab bhi koi ride request ya update aayegi, yahan dikhegi
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },
  header: {
    flexDirection:   'row',
    alignItems:      'center',
    paddingHorizontal: 16,
    paddingVertical:   14,
    backgroundColor:   '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    marginRight: 12,
    padding:     4,
  },
  backIcon: {
    fontSize:  22,
    color:     '#2D3748',
    fontWeight: 'bold',
  },
  headerTitle: {
    flex:       1,
    fontSize:   18,
    fontWeight: '700',
    color:      '#2D3748',
  },
  headerActions: {
    flexDirection: 'row',
    gap:           8,
  },
  headerActionBtn: {
    paddingHorizontal: 10,
    paddingVertical:    4,
    borderRadius:       6,
    backgroundColor:   '#EBF8FF',
  },
  deleteBtn: {
    backgroundColor: '#FFF5F5',
  },
  headerActionText: {
    fontSize:   12,
    fontWeight: '600',
    color:      '#3182CE',
  },
  listContent: {
    padding: 12,
    gap:     8,
  },
  card: {
    borderRadius:    12,
    backgroundColor: '#FFFFFF',
    padding:         14,
    marginBottom:    8,
  },
  cardUnread: {
    backgroundColor: '#EBF8FF',
    borderLeftWidth: 3,
    borderLeftColor: '#3182CE',
  },
  cardRow: {
    flexDirection: 'row',
    alignItems:    'flex-start',
  },
  emoji: {
    fontSize:    28,
    marginRight: 12,
    marginTop:   2,
  },
  cardContent: {
    flex: 1,
  },
  cardHeader: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize:   14,
    fontWeight: '600',
    color:      '#4A5568',
    flex:        1,
  },
  titleUnread: {
    color:      '#2D3748',
    fontWeight: '700',
  },
  unreadDot: {
    width:           8,
    height:          8,
    borderRadius:    4,
    backgroundColor: '#3182CE',
    marginLeft:      6,
  },
  body: {
    fontSize:   13,
    color:      '#718096',
    marginTop:   4,
    lineHeight:  18,
  },
  time: {
    fontSize:  11,
    color:     '#A0AEC0',
    marginTop:  6,
  },
  emptyContainer: {
    flex:           1,
    justifyContent: 'center',
    alignItems:     'center',
    paddingHorizontal: 32,
  },
  emptyEmoji: {
    fontSize:    64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize:   18,
    fontWeight: '600',
    color:      '#4A5568',
    textAlign:  'center',
  },
  emptySubText: {
    fontSize:  14,
    color:     '#A0AEC0',
    textAlign: 'center',
    marginTop:  8,
    lineHeight: 20,
  },
});
