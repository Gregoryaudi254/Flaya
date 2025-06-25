import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { useToast } from 'react-native-toast-notifications';
import { 
  doc, 
  getDoc, 
  collection, 
  getDocs, 
  updateDoc, 
  deleteDoc,
  query,
  where 
} from 'firebase/firestore';
import { db } from '@/constants/firebase';

const EventManagement = () => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const toast = useToast();
  const { eventId } = useLocalSearchParams();
  
  const [event, setEvent] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [processingUserId, setProcessingUserId] = useState(null);
  
  // Tab definitions
  const tabs = [
    { title: 'Pending', key: 'pending' },
    { title: 'Invited', key: 'invited' },
    { title: 'Attended', key: 'attended' }
  ];
  
  useEffect(() => {
    loadEventData();
  }, []);
  
  const loadEventData = async () => {
    try {
      setLoading(true);
      
      // Load event details
      const eventDoc = await getDoc(doc(db, 'events', eventId));
      if (eventDoc.exists()) {
        setEvent({ id: eventDoc.id, ...eventDoc.data() });
      }
      
      // Load users
      const usersRef = collection(db, 'events', eventId, 'users');
      const usersSnapshot = await getDocs(usersRef);
      
      const usersData = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setUsers(usersData);
    } catch (error) {
      console.error('Error loading event data:', error);
      showToast('Error loading event data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  const onRefresh = () => {
    setRefreshing(true);
    loadEventData();
  };
  
  const showToast = (message) => {
    toast.show(message, {
      type: "normal",
      placement: "bottom",
      duration: 2000,
      offset: 30,
      animationType: "zoom-in",
    });
  };
  
  // Filter users based on active tab
  const getFilteredUsers = () => {
    switch (activeTab) {
      case 0: // Pending - not invited and not attended
        return users.filter(user => !user.invited && !user.attended);
      case 1: // Invited - invited but not attended
        return users.filter(user => user.invited && !user.attended);
      case 2: // Attended - attended
        return users.filter(user => user.attended);
      default:
        return [];
    }
  };
  
  // Get counts for each tab
  const getCounts = () => {
    return {
      pending: users.filter(user => !user.invited && !user.attended).length,
      invited: users.filter(user => user.invited && !user.attended).length,
      attended: users.filter(user => user.attended).length
    };
  };
  
  const handleInviteUser = async (userId) => {
    try {
      setProcessingUserId(userId);
      
      const userRef = doc(db, 'events', eventId, 'users', userId);
      await updateDoc(userRef, {
        invited: true
      });
      
      // Update local state
      setUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, invited: true } : user
      ));
      
      showToast('User invited successfully');
    } catch (error) {
      console.error('Error inviting user:', error);
      showToast('Error inviting user');
    } finally {
      setProcessingUserId(null);
    }
  };
  
  const handleMarkAttended = async (userId) => {
    try {
      setProcessingUserId(userId);
      
      const userRef = doc(db, 'events', eventId, 'users', userId);
      await updateDoc(userRef, {
        attended: true
      });
      
      // Update local state
      setUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, attended: true } : user
      ));
      
      showToast('User marked as attended');
    } catch (error) {
      console.error('Error marking attendance:', error);
      showToast('Error marking attendance');
    } finally {
      setProcessingUserId(null);
    }
  };
  
  const handleDeleteUser = (userId, username) => {
    Alert.alert(
      "Remove User",
      `Are you sure you want to remove ${username} from this event?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Remove", 
          style: "destructive",
          onPress: () => deleteUser(userId)
        }
      ]
    );
  };
  
  const deleteUser = async (userId) => {
    try {
      setProcessingUserId(userId);
      
      await deleteDoc(doc(db, 'events', eventId, 'users', userId));
      
      // Update local state
      setUsers(prev => prev.filter(user => user.id !== userId));
      
      showToast('User removed successfully');
    } catch (error) {
      console.error('Error deleting user:', error);
      showToast('Error removing user');
    } finally {
      setProcessingUserId(null);
    }
  };
  
  const handlePhoneCall = (phoneNumber) => {
    if (phoneNumber) {
      const phoneUrl = `tel:${phoneNumber}`;
      Linking.canOpenURL(phoneUrl)
        .then((supported) => {
          if (supported) {
            Linking.openURL(phoneUrl);
          } else {
            showToast('Phone dialer not available');
          }
        })
        .catch((error) => {
          console.error('Error opening phone dialer:', error);
          showToast('Error opening phone dialer');
        });
    }
  };
  
  const renderUserItem = ({ item }) => {
    const isProcessing = processingUserId === item.id;
    
    return (
      <View style={[styles.userCard, { backgroundColor: isDark ? '#222222' : '#FFFFFF' }]}>
        <View style={styles.userInfo}>
          <Image 
            source={{ uri: item.profilephoto || 'https://via.placeholder.com/50' }}
            style={styles.userPhoto}
          />
          <View style={styles.userDetails}>
            <Text style={[styles.username, { color: isDark ? '#FFFFFF' : '#000000' }]}>
              {item.username}
            </Text>
            <View style={styles.userMetaRow}>
              <TouchableOpacity onPress={() => handlePhoneCall(item.phoneNumber)}>
                <Text style={[styles.phoneNumber, { color: Colors.blue }]}>
                  {item.phoneNumber}
                </Text>
              </TouchableOpacity>
              <Text style={[styles.userMeta, { color: isDark ? '#AAAAAA' : '#666666' }]}>
                {' • ' + item.gender}
              </Text>
            </View>
            <Text style={[styles.userTimestamp, { color: isDark ? '#888888' : '#999999' }]}>
              Joined: {item.timestamp?.toDate?.()?.toLocaleDateString() || 'N/A'}
            </Text>
          </View>
        </View>
        
        <View style={styles.userActions}>
          {activeTab === 0 && ( // Pending tab
            <>
              <TouchableOpacity
                style={[styles.actionButton, styles.inviteButton, { opacity: isProcessing ? 0.5 : 1 }]}
                onPress={() => handleInviteUser(item.id)}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
                    <Text style={styles.actionButtonText}>Invite</Text>
                  </>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.actionButton, styles.deleteButton, { opacity: isProcessing ? 0.5 : 1 }]}
                onPress={() => handleDeleteUser(item.id, item.username)}
                disabled={isProcessing}
              >
                <Ionicons name="trash-outline" size={16} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Remove</Text>
              </TouchableOpacity>
            </>
          )}
          
          {activeTab === 1 && ( // Invited tab
            <TouchableOpacity
              style={[styles.actionButton, styles.attendButton, { opacity: isProcessing ? 0.5 : 1 }]}
              onPress={() => handleMarkAttended(item.id)}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="person-add" size={16} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>Mark Attended</Text>
                </>
              )}
            </TouchableOpacity>
          )}
          
          {activeTab === 2 && ( // Attended tab - no actions
            <View style={styles.statusBadge}>
              <Ionicons name="checkmark-circle" size={16} color={Colors.green} />
              <Text style={[styles.statusText, { color: Colors.green }]}>Attended</Text>
            </View>
          )}
        </View>
      </View>
    );
  };
  
  const renderEmptyList = () => {
    const emptyMessages = {
      0: 'No pending invites',
      1: 'No invited users',
      2: 'No attended users'
    };
    
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="people-outline" size={60} color={isDark ? '#555555' : '#CCCCCC'} />
        <Text style={[styles.emptyText, { color: isDark ? '#CCCCCC' : '#999999' }]}>
          {emptyMessages[activeTab]}
        </Text>
      </View>
    );
  };
  
  const counts = getCounts();
  const filteredUsers = getFilteredUsers();
  
  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#121212' : '#F5F5F5' }]}>
        <Stack.Screen
          options={{
            headerTitle: "Event Management",
            headerTitleStyle: { color: isDark ? '#FFFFFF' : '#000000' },
            headerStyle: { backgroundColor: isDark ? '#121212' : '#F5F5F5' },
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={isDark ? Colors.light_main : Colors.dark_main} />
          <Text style={[styles.loadingText, { color: isDark ? '#AAAAAA' : '#888888' }]}>
            Loading event data...
          </Text>
        </View>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#121212' : '#F5F5F5' }]}>
      <Stack.Screen
        options={{
          headerTitle: "Event Management",
          headerTitleStyle: { color: isDark ? '#FFFFFF' : '#000000' },
          headerStyle: { backgroundColor: isDark ? '#121212' : '#F5F5F5' },
        }}
      />
      
      {/* Event Details Header */}
      {event && (
        <View style={[styles.eventHeader, { backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF' }]}>
          <View style={styles.eventInfo}>
            <Image 
              source={{ uri: event.poster || 'https://via.placeholder.com/80x60' }}
              style={styles.eventPoster}
            />
            <View style={styles.eventDetails}>
              <Text style={[styles.eventName, { color: isDark ? '#FFFFFF' : '#000000' }]} numberOfLines={2}>
                {event.name}
              </Text>
              <Text style={[styles.eventDate, { color: isDark ? '#AAAAAA' : '#666666' }]}>
                {event.startDate} • {event.startTime}
              </Text>
              <Text style={[styles.eventLocation, { color: isDark ? '#AAAAAA' : '#666666' }]}>
                {event.location?.address}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => router.push(`/admin/edit-event?eventId=${eventId}`)}
          >
            <Ionicons name="create-outline" size={20} color={Colors.blue} />
            <Text style={[styles.editButtonText, { color: Colors.blue }]}>Edit</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {/* Tabs */}
      <View style={[styles.tabContainer, { backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF' }]}>
        {tabs.map((tab, index) => {
          const count = index === 0 ? counts.pending : index === 1 ? counts.invited : counts.attended;
          const isActive = activeTab === index;
          
          return (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tab,
                isActive && styles.activeTab,
                { borderBottomColor: isActive ? Colors.blue : 'transparent' }
              ]}
              onPress={() => setActiveTab(index)}
            >
              <Text style={[
                styles.tabText,
                { color: isActive ? Colors.blue : (isDark ? '#AAAAAA' : '#666666') }
              ]}>
                {tab.title}
              </Text>
              <View style={[styles.countBadge, { backgroundColor: isActive ? Colors.blue : (isDark ? '#333333' : '#EEEEEE') }]}>
                <Text style={[styles.countText, { color: isActive ? '#FFFFFF' : (isDark ? '#AAAAAA' : '#666666') }]}>
                  {count}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
      
      {/* User List */}
      <FlatList
        data={filteredUsers}
        renderItem={renderUserItem}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={renderEmptyList}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[isDark ? Colors.light_main : Colors.dark_main]}
          />
        }
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    paddingTop: 10,
    marginTop: -10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  eventInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  eventPoster: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  eventDetails: {
    flex: 1,
  },
  eventName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  eventDate: {
    fontSize: 14,
    marginBottom: 2,
  },
  eventLocation: {
    fontSize: 12,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.blue,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderBottomWidth: 2,
  },
  activeTab: {
    borderBottomColor: Colors.blue,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 6,
  },
  countBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
  },
  countText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  listContainer: {
    padding: 15,
  },
  userCard: {
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  userInfo: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  userPhoto: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  userDetails: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  userMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  phoneNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    marginRight: 4,
  },
  userMeta: {
    fontSize: 14,
    marginBottom: 2,
  },
  userTimestamp: {
    fontSize: 12,
  },
  userActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 4,
  },
  inviteButton: {
    backgroundColor: Colors.green,
  },
  deleteButton: {
    backgroundColor: '#FF4444',
  },
  attendButton: {
    backgroundColor: Colors.blue,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 15,
  },
});

export default EventManagement; 