import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  Dimensions,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { collection, query, orderBy, getDocs, deleteDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '@/constants/firebase';
import { getData } from '@/constants/localstorage';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Stack, useRouter } from 'expo-router';
import { useToast } from 'react-native-toast-notifications';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const AdminEventsScreen = () => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const toast = useToast();

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isAdmin, setIsAdmin] = useState(true);

  useEffect(() => {
    checkAdminStatus();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchEvents();
    }
  }, [isAdmin]);

  const checkAdminStatus = async () => {
    try {
      const userInfo = await getData('@profile_info');
      if (!userInfo || !userInfo.uid) {
        showToast("User information not found");
        return;
      }
      
      const adminDocRef = doc(db, "admins", userInfo.uid);
      const adminDoc = await getDoc(adminDocRef);
      
      setIsAdmin(true);
      
    } catch (error) {
      console.error("Error checking admin status:", error);
      showToast("Error checking permissions");
    }
  };

  const fetchEvents = async () => {
    try {
      setLoading(true);
      
      const eventsRef = collection(db, "events");
      const querySnapshot = await getDocs(eventsRef);

      const eventsData = querySnapshot.docs.map((snap) => {
        const data = snap.data();
        return {
          ...data,
          id: snap.id,
          createdAt: data.createdAt?.toMillis ? new Date(data.createdAt.toMillis()) : new Date(),
        };
      });
      
      setEvents(eventsData);
    } catch (error) {
      console.error("Error fetching events:", error);
      showToast("Couldn't load events");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchEvents();
  }, []);

  const showToast = (message) => {
    toast.show(message, {
      type: "normal",
      placement: "bottom",
      duration: 2000,
      offset: 30,
      animationType: "zoom-in",
    });
  };

  const handleDeleteEvent = (eventId, eventName) => {
    Alert.alert(
      "Delete Event",
      `Are you sure you want to delete "${eventName}"? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: () => deleteEvent(eventId)
        }
      ]
    );
  };

  const deleteEvent = async (eventId) => {
    try {
      await deleteDoc(doc(db, "events", eventId));
      setEvents(prevEvents => prevEvents.filter(event => event.id !== eventId));
      showToast("Event deleted successfully");
    } catch (error) {
      console.error("Error deleting event:", error);
      showToast("Failed to delete event");
    }
  };

  const handleAddEvent = () => {
    router.push('/admin/create-event');
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadEvents();
  };

  const renderEventItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.eventCard, { backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF' }]}
      onPress={() => router.push(`/admin/event-management?eventId=${item.id}`)}
    >
      <View style={styles.eventContent}>
        <Image 
          source={{ uri: item.poster || 'https://via.placeholder.com/100x80' }}
          style={styles.eventPoster}
          resizeMode="cover"
        />
        
        <View style={styles.eventInfo}>
          <Text style={[styles.eventName, { color: isDark ? '#FFFFFF' : '#000000' }]} numberOfLines={2}>
            {item.name || 'Event Name'}
          </Text>
          
          <View style={styles.eventDetails}>
            <View style={styles.detailRow}>
              <Ionicons name="location-outline" size={16} color={Colors.blue} />
              <Text style={[styles.detailText, { color: isDark ? '#CCCCCC' : '#666666' }]} numberOfLines={1}>
                {item.location?.address || item.location?.city || 'Location not specified'}
              </Text>
            </View>
            
            {item.category && (
              <View style={styles.detailRow}>
                <Ionicons name="pricetag-outline" size={16} color={Colors.orange} />
                <Text style={[styles.detailText, { color: isDark ? '#CCCCCC' : '#666666' }]}>
                  {item.category}
                </Text>
              </View>
            )}
            
            {item.startDate && (
              <View style={styles.detailRow}>
                <Ionicons name="calendar-outline" size={16} color={Colors.green} />
                <Text style={[styles.detailText, { color: isDark ? '#CCCCCC' : '#666666' }]}>
                  {item.startDate}
                </Text>
              </View>
            )}
          </View>
        </View>
        
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteEvent(item.id, item.name)}
        >
          <Ionicons name="trash-outline" size={20} color="#FF4444" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="calendar-outline" size={60} color={isDark ? '#555555' : '#CCCCCC'} />
      <Text style={[styles.emptyText, { color: isDark ? '#CCCCCC' : '#999999' }]}>
        No events found
      </Text>
      <Text style={[styles.emptySubtext, { color: isDark ? '#888888' : '#BBBBBB' }]}>
        Events will appear here once they are created
      </Text>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { backgroundColor: isDark ? '#2A2A2A' : '#FFFFFF' }]}>
          <Text style={[styles.statNumber, { color: isDark ? '#FFFFFF' : '#000000' }]}>
            {events.length}
          </Text>
          <Text style={[styles.statLabel, { color: isDark ? '#CCCCCC' : '#666666' }]}>
            Total Events
          </Text>
        </View>
      </View>
      
      <TouchableOpacity
        style={[styles.addButton, { backgroundColor: Colors.blue }]}
        onPress={handleAddEvent}
      >
        <Ionicons name="add" size={24} color="#FFFFFF" />
        <Text style={styles.addButtonText}>Add Event</Text>
      </TouchableOpacity>
    </View>
  );

  if (!isAdmin) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#121212' : '#F5F5F5' }]}>
        <Stack.Screen
          options={{
            headerTitle: "Events Management",
            headerTitleStyle: { color: isDark ? '#FFFFFF' : '#000000' },
            headerStyle: { backgroundColor: isDark ? '#121212' : '#F5F5F5' },
          }}
        />
        <View style={styles.noAccessContainer}>
          <Ionicons name="lock-closed" size={60} color={isDark ? '#AAAAAA' : '#888888'} />
          <Text style={[styles.noAccessText, { color: isDark ? '#FFFFFF' : '#000000' }]}>
            You don't have admin access
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#121212' : '#F5F5F5' }]}>
      <Stack.Screen
        options={{
          headerTitle: "Events Management",
          headerTitleStyle: { color: isDark ? '#FFFFFF' : '#000000' },
          headerStyle: { backgroundColor: isDark ? '#121212' : '#F5F5F5' },
        }}
      />
      
      <FlatList
        data={events}
        renderItem={renderEventItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={!loading ? renderEmptyList : null}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.blue]}
            tintColor={Colors.blue}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
      />
      
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.blue} />
          <Text style={[styles.loadingText, { color: isDark ? '#CCCCCC' : '#666666' }]}>
            Loading events...
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContainer: {
    padding: 15,
  },
  headerContainer: {
    marginBottom: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  statCard: {
    flex: 1,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 14,
    marginTop: 5,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  eventCard: {
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  eventContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  eventPoster: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 15,
  },
  eventInfo: {
    flex: 1,
  },
  eventName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  eventDetails: {
    gap: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  detailText: {
    fontSize: 14,
    marginLeft: 6,
    flex: 1,
  },
  deleteButton: {
    padding: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 15,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 5,
    textAlign: 'center',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  noAccessContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  noAccessText: {
    marginTop: 10,
    fontSize: 18,
    textAlign: 'center',
  },
});

export default AdminEventsScreen; 