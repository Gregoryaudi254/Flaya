import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Image,
  ActivityIndicator,
  Alert,
  RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { useToast } from 'react-native-toast-notifications';
import { db } from '@/constants/firebase';
import { collection, getDocs, doc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';

const LocationChangesAdmin = () => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const toast = useToast();
  
  const [locationRequests, setLocationRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  
  useEffect(() => {
    fetchLocationRequests();
  }, []);
  
  const fetchLocationRequests = async () => {
    try {
      const locationChangesRef = collection(db, 'locationchanges');
      const q = query(locationChangesRef, orderBy('requestedAt', 'desc'));
      const snapshot = await getDocs(q);
      
      const requests = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setLocationRequests(requests);
    } catch (error) {
      console.error('Error fetching location requests:', error);
      showToast('Error loading location requests');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  const onRefresh = () => {
    setRefreshing(true);
    fetchLocationRequests();
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
  
  const handleApprove = async (requestId) => {
    Alert.alert(
      "Approve Location Change",
      "Are you sure you want to approve this location change request?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Approve", 
          style: "default",
          onPress: () => processRequest(requestId, 'approved')
        }
      ]
    );
  };
  
  const handleReject = async (requestId) => {
    Alert.alert(
      "Reject Location Change",
      "Are you sure you want to reject this location change request?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Reject", 
          style: "destructive",
          onPress: () => processRequest(requestId, 'denied', 'Location change request denied by admin')
        }
      ]
    );
  };
  
  const processRequest = async (requestId, status, denialReason = null) => {
    try {
      setProcessingId(requestId);
      
      const requestRef = doc(db, 'locationchanges', requestId);
      const updateData = { 
        status,
        processedAt: new Date(),
        processedBy: 'admin'
      };
      
      if (denialReason) {
        updateData.denialReason = denialReason;
      }
      
      await updateDoc(requestRef, updateData);
      
      // Remove from local state
      setLocationRequests(prev => prev.filter(req => req.id !== requestId));
      
      showToast(`Location change ${status === 'approved' ? 'approved' : 'rejected'} successfully`);
    } catch (error) {
      console.error('Error processing request:', error);
      showToast('Error processing request');
    } finally {
      setProcessingId(null);
    }
  };
  
  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };
  
  const renderLocationRequest = ({ item }) => (
    <View style={[styles.requestCard, { backgroundColor: isDark ? '#222222' : '#FFFFFF' }]}>
      {/* Header with business info */}
      <View style={styles.requestHeader}>
        <Image 
          source={{ uri: item.businessPhoto || 'https://via.placeholder.com/50' }}
          style={styles.businessPhoto}
        />
        <View style={styles.businessInfo}>
          <Text style={[styles.businessName, { color: isDark ? '#FFFFFF' : '#000000' }]}>
            {item.businessName}
          </Text>
          <Text style={[styles.username, { color: isDark ? '#AAAAAA' : '#666666' }]}>
            @{item.username}
          </Text>
          {item.businessCategory && (
            <View style={[styles.categoryContainer, { backgroundColor: isDark ? '#4ECDC4' + '20' : '#3498DB' + '20' }]}>
              <Text style={[styles.categoryText, { color: isDark ? '#4ECDC4' : '#3498DB' }]}>
                {item.businessCategory}
              </Text>
            </View>
          )}
          <Text style={[styles.requestDate, { color: isDark ? '#888888' : '#999999' }]}>
            {formatDate(item.requestedAt)}
          </Text>
        </View>
      </View>
      
      {/* Location comparison */}
      <View style={styles.locationComparison}>
        <View style={styles.locationSection}>
          <Text style={[styles.locationLabel, { color: isDark ? '#FF6B6B' : '#E74C3C' }]}>
            Previous Location
          </Text>
          <Text style={[styles.coordinates, { color: isDark ? '#CCCCCC' : '#333333' }]}>
            Lat: {item.previousLocation?.latitude?.toFixed(6)}
          </Text>
          <Text style={[styles.coordinates, { color: isDark ? '#CCCCCC' : '#333333' }]}>
            Lng: {item.previousLocation?.longitude?.toFixed(6)}
          </Text>
          <Text style={[styles.address, { color: isDark ? '#AAAAAA' : '#666666' }]}>
            {item.previousLocation?.address}
          </Text>
        </View>
        
        <View style={styles.arrowContainer}>
          <Ionicons 
            name="arrow-forward" 
            size={24} 
            color={isDark ? '#4ECDC4' : '#3498DB'} 
          />
        </View>
        
        <View style={styles.locationSection}>
          <Text style={[styles.locationLabel, { color: isDark ? '#4ECDC4' : '#3498DB' }]}>
            New Location
          </Text>
          <Text style={[styles.coordinates, { color: isDark ? '#CCCCCC' : '#333333' }]}>
            Lat: {item.newLocation?.latitude?.toFixed(6)}
          </Text>
          <Text style={[styles.coordinates, { color: isDark ? '#CCCCCC' : '#333333' }]}>
            Lng: {item.newLocation?.longitude?.toFixed(6)}
          </Text>
          <Text style={[styles.address, { color: isDark ? '#AAAAAA' : '#666666' }]}>
            {item.newLocation?.address}
          </Text>
        </View>
      </View>
      
      {/* Request reason */}
      <View style={styles.reasonSection}>
        <Text style={[styles.reasonLabel, { color: isDark ? '#AAAAAA' : '#666666' }]}>
          Reason:
        </Text>
        <Text style={[styles.reasonText, { color: isDark ? '#CCCCCC' : '#333333' }]}>
          {item.reason || 'No reason provided'}
        </Text>
      </View>
      
      {/* Action buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.rejectButton, { opacity: processingId === item.id ? 0.5 : 1 }]}
          onPress={() => handleReject(item.id)}
          disabled={processingId === item.id}
        >
          {processingId === item.id ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="close-circle" size={18} color="#FFFFFF" />
              <Text style={styles.buttonText}>Reject</Text>
            </>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.approveButton, { opacity: processingId === item.id ? 0.5 : 1 }]}
          onPress={() => handleApprove(item.id)}
          disabled={processingId === item.id}
        >
          {processingId === item.id ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
              <Text style={styles.buttonText}>Approve</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
  
  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#121212' : '#F5F5F5' }]}>
        <Stack.Screen
          options={{
            headerTitle: "Location Change Requests",
            headerTitleStyle: { color: isDark ? '#FFFFFF' : '#000000' },
            headerStyle: { backgroundColor: isDark ? '#121212' : '#F5F5F5' },
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={isDark ? Colors.light_main : Colors.dark_main} />
          <Text style={[styles.loadingText, { color: isDark ? '#AAAAAA' : '#888888' }]}>
            Loading location requests...
          </Text>
        </View>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#121212' : '#F5F5F5' }]}>
      <Stack.Screen
        options={{
          headerTitle: "Location Change Requests",
          headerTitleStyle: { color: isDark ? '#FFFFFF' : '#000000' },
          headerStyle: { backgroundColor: isDark ? '#121212' : '#F5F5F5' },
        }}
      />
      
      {locationRequests.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="location-outline" size={60} color={isDark ? '#AAAAAA' : '#888888'} />
          <Text style={[styles.emptyText, { color: isDark ? '#FFFFFF' : '#000000' }]}>
            No location change requests
          </Text>
          <Text style={[styles.emptySubtext, { color: isDark ? '#AAAAAA' : '#666666' }]}>
            All location change requests will appear here
          </Text>
        </View>
      ) : (
        <FlatList
          data={locationRequests}
          renderItem={renderLocationRequest}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[isDark ? Colors.light_main : Colors.dark_main]}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyText: {
    marginTop: 10,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  emptySubtext: {
    marginTop: 5,
    fontSize: 14,
    textAlign: 'center',
  },
  listContainer: {
    padding: 15,
  },
  requestCard: {
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  requestHeader: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  businessPhoto: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  businessInfo: {
    flex: 1,
  },
  businessName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  username: {
    fontSize: 14,
    marginBottom: 2,
  },
  requestDate: {
    fontSize: 12,
  },
  locationComparison: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  locationSection: {
    flex: 1,
  },
  arrowContainer: {
    paddingHorizontal: 10,
  },
  locationLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 5,
    textTransform: 'uppercase',
  },
  coordinates: {
    fontSize: 11,
    fontFamily: 'monospace',
  },
  address: {
    fontSize: 12,
    marginTop: 3,
    fontStyle: 'italic',
  },
  reasonSection: {
    marginBottom: 15,
  },
  reasonLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 3,
  },
  reasonText: {
    fontSize: 13,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rejectButton: {
    backgroundColor: '#E74C3C',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 0.48,
  },
  approveButton: {
    backgroundColor: '#27AE60',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 0.48,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginLeft: 5,
  },
  categoryContainer: {
    padding: 5,
    borderRadius: 5,
    marginBottom: 5,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default LocationChangesAdmin; 