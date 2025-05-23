import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  SafeAreaView
} from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { getData } from '@/constants/localstorage';
import { db } from '@/constants/firebase';
import { doc, getDoc } from 'firebase/firestore';
import BusinessInfoEditSheet from '@/components/BusinessInfoEditSheet';
import { useToast } from 'react-native-toast-notifications';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

const BusinessEditScreen = () => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const toast = useToast();
  const businessInfoSheetRef = useRef(null);
  
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  
  useEffect(() => {
    const loadUserData = async () => {
      try {
        setLoading(true);
        const userInfo = await getData('@profile_info');
        
        if (!userInfo || !userInfo.uid) {
          showToast('User information not found');
          router.back();
          return;
        }
        
        const userRef = doc(db, 'users', userInfo.uid);
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists()) {
          showToast('User data not found');
          router.back();
          return;
        }
        
        const data = userSnap.data();
        
        // Check if business data exists
        if (!data.business) {
          data.business = {
            businessName: '',
            category: '',
            address: '',
            phone: '',
            email: '',
            website: '',
            description: ''
          };
        }
        
        setUserData({ ...data, uid: userInfo.uid });
        setLoading(false);
        
        // Open the bottom sheet after a short delay
        setTimeout(() => {
          if (businessInfoSheetRef.current) {
            businessInfoSheetRef.current.snapToIndex(1);
          }
        }, 500);
      } catch (error) {
        console.error('Error loading user data:', error);
        showToast('Error loading data');
        setLoading(false);
      }
    };
    
    loadUserData();
  }, []);
  
  const handleBusinessInfoUpdate = (updatedInfo) => {
    setUserData(prev => ({
      ...prev,
      business: {
        ...prev.business,
        ...updatedInfo
      }
    }));
    
    // Close the edit screen after successful update
    setTimeout(() => {
      router.back();
    }, 1000);
  };
  
  const showToast = (message) => {
    toast.show(message, {
      type: 'normal',
      placement: 'bottom',
      duration: 2000,
      offset: 30,
      animationType: 'zoom-in',
    });
  };
  
  const openBottomSheet = () => {
    if (businessInfoSheetRef.current) {
      businessInfoSheetRef.current.snapToIndex(1);
    }
  };

  
  
  return (

    <GestureHandlerRootView>

<SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#121212' : '#F5F5F5' }]}>
      <Stack.Screen 
        options={{
          title: 'Business Information',
          headerTitleStyle: { color: isDark ? '#FFFFFF' : '#000000' },
          headerStyle: { backgroundColor: isDark ? '#121212' : '#F5F5F5' },
        }}
      />
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={isDark ? Colors.light_main : Colors.dark_main} />
          <Text style={[styles.loadingText, { color: isDark ? '#AAAAAA' : '#666666' }]}>
            Loading business information...
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
          <View style={styles.businessHeader}>
            <View style={styles.businessIconContainer}>
              <Ionicons name="business" size={40} color={isDark ? Colors.light_main : Colors.blue} />
            </View>
            <Text style={[styles.businessName, { color: isDark ? Colors.light_main : Colors.dark_main }]}>
              {userData.business.businessName || 'Your Business'}
            </Text>
            <Text style={[styles.businessCategory, { color: isDark ? '#AAAAAA' : '#666666' }]}>
              {userData.business.category || 'No category selected'}
            </Text>
          </View>
          
          <View style={styles.infoCard}>
            <View style={styles.infoHeader}>
              <Text style={[styles.infoTitle, { color: isDark ? Colors.light_main : Colors.dark_main }]}>
                Business Details
              </Text>
              <TouchableOpacity
                style={[styles.editButton, { backgroundColor: Colors.blue }]}
                onPress={openBottomSheet}
              >
                <Ionicons name="pencil" size={16} color="#FFFFFF" />
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.infoItem}>
              <View style={styles.infoIcon}>
                <Ionicons name="business-outline" size={20} color={isDark ? Colors.light_main : Colors.blue} />
              </View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: isDark ? '#AAAAAA' : '#666666' }]}>Business Name</Text>
                <Text style={[styles.infoValue, { color: isDark ? Colors.light_main : Colors.dark_main }]}>
                  {userData.business.businessName || 'Not set'}
                </Text>
              </View>
            </View>
            
            <View style={styles.infoItem}>
              <View style={styles.infoIcon}>
                <Ionicons name="pricetag-outline" size={20} color={isDark ? Colors.light_main : Colors.blue} />
              </View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: isDark ? '#AAAAAA' : '#666666' }]}>Category</Text>
                <Text style={[styles.infoValue, { color: isDark ? Colors.light_main : Colors.dark_main }]}>
                  {userData.business.category || 'Not set'}
                </Text>
              </View>
            </View>
            
            <View style={styles.infoItem}>
              <View style={styles.infoIcon}>
                <Ionicons name="location-outline" size={20} color={isDark ? Colors.light_main : Colors.blue} />
              </View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: isDark ? '#AAAAAA' : '#666666' }]}>Address</Text>
                <Text style={[styles.infoValue, { color: isDark ? Colors.light_main : Colors.dark_main }]}>
                  {userData.business.address || 'Not set'}
                </Text>
              </View>
            </View>
            
            <View style={styles.infoItem}>
              <View style={styles.infoIcon}>
                <Ionicons name="call-outline" size={20} color={isDark ? Colors.light_main : Colors.blue} />
              </View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: isDark ? '#AAAAAA' : '#666666' }]}>Phone</Text>
                <Text style={[styles.infoValue, { color: isDark ? Colors.light_main : Colors.dark_main }]}>
                  {userData.business.phone || 'Not set'}
                </Text>
              </View>
            </View>
            
            <View style={styles.infoItem}>
              <View style={styles.infoIcon}>
                <Ionicons name="mail-outline" size={20} color={isDark ? Colors.light_main : Colors.blue} />
              </View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: isDark ? '#AAAAAA' : '#666666' }]}>Email</Text>
                <Text style={[styles.infoValue, { color: isDark ? Colors.light_main : Colors.dark_main }]}>
                  {userData.business.email || 'Not set'}
                </Text>
              </View>
            </View>
            
            <View style={styles.infoItem}>
              <View style={styles.infoIcon}>
                <Ionicons name="globe-outline" size={20} color={isDark ? Colors.light_main : Colors.blue} />
              </View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: isDark ? '#AAAAAA' : '#666666' }]}>Website</Text>
                <Text style={[styles.infoValue, { color: isDark ? Colors.light_main : Colors.dark_main }]}>
                  {userData.business.website || 'Not set'}
                </Text>
              </View>
            </View>
          </View>
          
          <View style={styles.descriptionCard}>
            <Text style={[styles.descriptionTitle, { color: isDark ? Colors.light_main : Colors.dark_main }]}>
              Business Description
            </Text>
            <Text style={[styles.descriptionText, { color: isDark ? '#CCCCCC' : '#555555' }]}>
              {userData.business.description || 'No description provided.'}
            </Text>
          </View>
        </ScrollView>
      )}
      
      {userData && (
        <BusinessInfoEditSheet
          ref={businessInfoSheetRef}
          userId={userData.uid}
          business={userData.business}
          onUpdate={handleBusinessInfoUpdate}
        />
      )}
    </SafeAreaView>

    </GestureHandlerRootView>
   
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
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  businessHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  businessIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  businessName: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  businessCategory: {
    fontSize: 16,
  },
  infoCard: {
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  infoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  editButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  infoItem: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  infoContent: {
    flex: 1,
    justifyContent: 'center',
  },
  infoLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
  },
  descriptionCard: {
    borderRadius: 15,
    padding: 15,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  descriptionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  descriptionText: {
    fontSize: 15,
    lineHeight: 22,
  },
});

export default BusinessEditScreen; 