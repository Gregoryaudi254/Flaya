import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { useToast } from 'react-native-toast-notifications';
import { db, functions } from '@/constants/firebase';
import { getData } from '@/constants/localstorage';
import { httpsCallable } from 'firebase/functions';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useRouter } from 'expo-router';
const BusinessApprovalsScreen = () => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const toast = useToast();
  const router = useRouter()
  const [pendingBusinesses, setPendingBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(true);
  const [loadingApproval, setLoadingApproval] = useState({});
  
  useEffect(() => {
    checkAdminStatus();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchPendingBusinesses();
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
  
  const fetchPendingBusinesses = async () => {
    try {
      setLoading(true);
      
      // Query users with business accounts waiting for approval
      const usersRef = collection(db, "businessprocessing");
      const q = query(
        usersRef, 
        where("business.approved", "==", false),
      );
      
      const querySnapshot = await getDocs(q);
      const businesses = [];
      
      querySnapshot.forEach((doc) => {
        const userData = doc.data();
        businesses.push({
          id: doc.id,
          businessName: userData.business?.name || "Unnamed Business",
          category: userData.business?.category || "Uncategorized",
          ownerName: `${userData.ownername || ''} ${userData.lastname || ''}`.trim(),
          profilePic: userData.profilephoto,
          business: userData.business || {},
          createdAt: userData.createdAt?.toDate?.() || new Date(),
        });
      });
      
      // Sort by creation date, newest first
      businesses.sort((a, b) => b.createdAt - a.createdAt);
      
      setPendingBusinesses(businesses);
    } catch (error) {
      console.error("Error fetching pending businesses:", error);
      showToast("Error loading pending businesses");
    } finally {
      setLoading(false);
    }
  };
  
  const handleApprove = async (userId) => {
    try {
      setLoadingApproval(prev => ({ ...prev, [userId]: true }));
      
      // approve
      const ref = doc(db, `users/${userId}`);
      await updateDoc(ref, {isbusinessaccount:true});
      
      const refBusiness = doc(db, `businessprocessing/${userId}`);
      await updateDoc(refBusiness, {'business.approved':true});


      showToast("Business approved successfully");
      // Remove from list
      setPendingBusinesses(prev => prev.filter(item => item.id !== userId));
    } catch (error) {
      console.error("Error approving business:", error);
      showToast("Error approving business");
    } finally {
      setLoadingApproval(prev => ({ ...prev, [userId]: false }));
    }
  };
  
  const handleReject = async (userId) => {
    Alert.alert(
      "Reject Business",
      "Are you sure you want to reject this business application?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Reject",
          style: "destructive",
          onPress: async () => {
            try {
              setLoadingApproval(prev => ({ ...prev, [userId]: true }));
              
              // approve
                const ref = doc(db, `users/${userId}`);
                await updateDoc(ref, {isbusinessaccount:null, business:null});
                
                const refBusiness = doc(db, `businessprocessing/${userId}`);
                await deleteDoc(refBusiness);


                showToast("Business deleted successfully");
                // Remove from list
                setPendingBusinesses(prev => prev.filter(item => item.id !== userId));
            } catch (error) {
              console.error("Error rejecting business:", error);
              showToast("Error rejecting business");
            } finally {
              setLoadingApproval(prev => ({ ...prev, [userId]: false }));
            }
          }
        }
      ]
    );
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


  const handleProfilePress = (uid)=> {
    router.push({
      pathname:'/oppuserprofile',
      params:{uid:uid}
    })
  }

  
  const renderBusinessItem = useCallback(({ item }) => (
    <View style={[
      styles.businessItem, 
      { backgroundColor: isDark ? '#222222' : '#FFFFFF' }
    ]}>

        <TouchableOpacity onPress={() => handleProfilePress(item.id)}>

            <View style={styles.businessHeader}>
            <Image 
            source={{ uri: item.profilePic || 'https://via.placeholder.com/50' }} 
            style={styles.businessImage} 
            />
            <View style={styles.businessInfo}>
            <Text style={[styles.businessName, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                {item.businessName}
            </Text>
            <Text style={[styles.businessCategory, { color: isDark ? '#CCCCCC' : '#666666' }]}>
                {item.category}
            </Text>
            <Text style={[styles.ownerName, { color: isDark ? '#AAAAAA' : '#888888' }]}>
                Owner: {item.ownerName}
            </Text>
            </View>
           </View>

        </TouchableOpacity>
     
      
      <View style={styles.businessDetails}>
        {item.business.description && (
          <Text 
            style={[styles.businessDescription, { color: isDark ? '#CCCCCC' : '#666666' }]}
            numberOfLines={2}
          >
            {item.business.description}
          </Text>
        )}
        
        {item.business.address && (
          <View style={styles.addressRow}>
            <Ionicons name="location-outline" size={16} color={isDark ? '#AAAAAA' : '#888888'} />
            <Text 
              style={[styles.addressText, { color: isDark ? '#AAAAAA' : '#888888' }]}
              numberOfLines={1}
            >
              {item.business.address}
            </Text>
          </View>
        )}
      </View>
      
      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.rejectButton]}
          onPress={() => handleReject(item.id)}
          disabled={loadingApproval[item.id]}
        >
          {loadingApproval[item.id] ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="close" size={16} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Reject</Text>
            </>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.approveButton]}
          onPress={() => handleApprove(item.id)}
          disabled={loadingApproval[item.id]}
        >
          {loadingApproval[item.id] ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Approve</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  ), [isDark, loadingApproval]);
  
  if (!isAdmin) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#121212' : '#F5F5F5' }]}>
        <Stack.Screen
          options={{
            headerTitle: "Business Approvals",
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
          headerTitle: "Business Approvals",
          headerTitleStyle: { color: isDark ? '#FFFFFF' : '#000000' },
          headerStyle: { backgroundColor: isDark ? '#121212' : '#F5F5F5' },
        }}
      />
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={isDark ? Colors.light_main : Colors.dark_main} />
          <Text style={[styles.loadingText, { color: isDark ? '#AAAAAA' : '#888888' }]}>
            Loading pending businesses...
          </Text>
        </View>
      ) : pendingBusinesses.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="business" size={60} color={isDark ? '#AAAAAA' : '#888888'} />
          <Text style={[styles.emptyText, { color: isDark ? '#FFFFFF' : '#000000' }]}>
            No pending business approvals
          </Text>
        </View>
      ) : (
        <FlatList
          data={pendingBusinesses}
          renderItem={renderBusinessItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          refreshing={loading}
          onRefresh={fetchPendingBusinesses}
        />
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
  businessItem: {
    borderRadius: 10,
    padding: 15,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    marginBottom: 5,
  },
  businessHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  businessImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 10,
  },
  businessInfo: {
    flex: 1,
  },
  businessName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  businessCategory: {
    fontSize: 14,
  },
  ownerName: {
    fontSize: 12,
    marginTop: 2,
  },
  businessDetails: {
    marginBottom: 10,
  },
  businessDescription: {
    fontSize: 14,
    marginBottom: 5,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addressText: {
    fontSize: 12,
    marginLeft: 5,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginLeft: 10,
  },
  rejectButton: {
    backgroundColor: '#FF3B30',
  },
  approveButton: {
    backgroundColor: '#34C759',
  },
  actionButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 5,
  },
  separator: {
    height: 10,
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
    fontSize: 16,
    textAlign: 'center',
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

export default BusinessApprovalsScreen; 