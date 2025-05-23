import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Keyboard,
  Image,
  Dimensions
} from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { collection, doc, getDocs, limit, query, updateDoc, where, getDoc } from 'firebase/firestore';
import { db, functions } from '@/constants/firebase';
import { useToast } from 'react-native-toast-notifications';
import { useSelector } from 'react-redux';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import MapView from 'react-native-maps';
import * as Location from 'expo-location';
import { httpsCallable } from 'firebase/functions';
import { getData } from '@/constants/localstorage';

const { width } = Dimensions.get('window');

const BusinessInfoEditSheet = React.forwardRef(({ userId, business, onUpdate }, ref) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const toast = useToast();
  const navigation = useNavigation();

  // Bottom sheet snap points
  const snapPoints = useMemo(() => ['25%', '75%', '90%'], []);
  
  // Form state
  const [businessName, setBusinessName] = useState(business?.name || '');
  const [address, setAddress] = useState(business?.address || '');
  const [phone, setPhone] = useState(business?.phonenumber || '');
  const [email, setEmail] = useState(business?.email || '');
  const [loading, setLoading] = useState(false);
  const [keyboardStatus, setKeyboardStatus] = useState(false);
  const [mapLoading, setMapLoading] = useState(true);

  // Map location state
  const [userLocation, setUserLocation] = useState({
    latitude: business?.coordinates?._latitude || business?.coordinates?.latitude || 0,
    longitude: business?.coordinates?._longitude || business?.coordinates?.longitude || 0,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });

  const user = useSelector(state => state.user);
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);

  // Fetch user data including subscription
  useEffect(() => {
    const fetchUserData = async () => {
      
      try {
        const userinfo = await getData('@profile_info')
        // Get subscription status
        const callbackFunction = httpsCallable(functions, 'getSubscriptionStatus');
        const response = await callbackFunction({ userid: userinfo.uid });
        
        if (response.data.subscriptionType === null) {
          setSubscriptionStatus('inactive');
        } else {
          setSubscriptionStatus(response.data.status);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };
    
    fetchUserData();
  }, [user]);

  // Get user location
  useEffect(() => {
    const getUserLocation = async () => {
      try {
        setMapLoading(true);
        
        // Check if we already have business coordinates
        if (business?.coordinates?._latitude || business?.coordinates?.latitude) {
          setUserLocation({
            latitude: business.coordinates._latitude || business.coordinates.latitude,
            longitude: business.coordinates._longitude || business.coordinates.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          });
          setMapLoading(false);
          return;
        }
        
        // Request permission to access the device's location
        const { status } = await Location.requestForegroundPermissionsAsync();
        
        if (status !== 'granted') {
          showToast('Permission to access location was denied');
          setMapLoading(false);
          return;
        }
        
        // Get the current location of the device
        const location = await Location.getCurrentPositionAsync({});
        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
      } catch (error) {
        console.error('Error getting location:', error);
        showToast('Could not get your location');
      } finally {
        setMapLoading(false);
      }
    };
    
    getUserLocation();
  }, [business]);

  // Handle map region change
  const handleRegionChangeComplete = (region) => {
    setUserLocation(region);
  };

  // Set up keyboard listeners
  useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', () => {
      setKeyboardStatus(true);
    });
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardStatus(false);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  // Reset form when business data changes
  useEffect(() => {
    if (business) {
      setBusinessName(business.name || '');
      setAddress(business.address || '');
      setPhone(business.phonenumber || '');
      setEmail(business.email || '');
    }
  }, [business]);

  // Form validation
  const isFormValid = useCallback(() => {
    if (!businessName.trim()) {
      showToast('Business name is required');
      return false;
    }
   
    if (!address.trim()) {
      showToast('Address is required');
      return false;
    }
    
    // Email validation
    if (email && !/^\S+@\S+\.\S+$/.test(email)) {
      showToast('Please enter a valid email address');
      return false;
    }
    
    // Phone validation (simple check)
    if (phone && !/^[+0-9\s-]{8,}$/.test(phone)) {
      showToast('Please enter a valid phone number');
      return false;
    }
   
    return true;
  }, [businessName, address, email, phone]);

  const cleanString = (str) => {
    return str.replace(/\s+/g, '').toLowerCase();
  };

  // Handle form submission
  const handleSave = useCallback(async () => {
    if (!isFormValid()) return;
    
    try {
      setLoading(true);

      const usersRef = collection(db, 'users');
      const q = query(
        usersRef,
        where("businessname", "==", cleanString(businessName)),
        limit(1)
      );
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty && querySnapshot.docs[0].data().uid !== userId) {
        showToast("Business with same name already exists");
        setLoading(false)
        return;
      }   
      
      const userRef = doc(db, 'users', userId);
      
      // Create business data object
      const businessData = {
        'businessname':cleanString(businessName),
        'business.name': businessName,
        'business.address': address,
        'business.phonenumber': phone,
        'business.email': email,
        'business.coordinates': {
          _latitude: userLocation.latitude,
          _longitude: userLocation.longitude
        },
        'business.updatedAt': new Date()
      };
      
      // Update the business data in Firestore
      await updateDoc(userRef, businessData);
      
      // Notify parent component of update
      if (onUpdate) {
        onUpdate({
          name: businessName,
          address,
          phonenumber: phone,
          email,
          coordinates: {
            _latitude: userLocation.latitude,
            _longitude: userLocation.longitude
          }
        });
      }
      
      showToast('Business information updated successfully');
      
      // Close the bottom sheet
      if (ref.current) {
        ref.current.close();
      }
    } catch (error) {
      console.error('Error updating business info:', error);
      showToast('Error updating business information');
    } finally {
      setLoading(false);
    }
  }, [userId, businessName, address, phone, email, userLocation, isFormValid, onUpdate]);

  // Toast helper
  const showToast = (message) => {
    toast.show(message, {
      type: 'normal',
      placement: 'bottom',
      duration: 2000,
      offset: 30,
      animationType: 'zoom-in',
    });
  };

  const renderContent = () => {
    // Add subscription verification
    const hasActiveSubscription = 
      subscriptionStatus === 'active';

    if (!hasActiveSubscription) {
      return (
        <View style={styles.subscriptionRequired}>
          <MaterialIcons name="business-center" size={40} color="#666" />
          <Text style={styles.subscriptionTitle}>Subscription Required</Text>
          <Text style={styles.subscriptionText}>
            You need an active business subscription to edit your business information.
          </Text>
          <TouchableOpacity 
            style={styles.subscriptionButton}
            onPress={() => {
              // Close this sheet and navigate to subscription page
              ref.current?.close();
              setTimeout(() => {
                navigation.navigate('subscriptionPage');
              }, 300);
            }}
          >
            <Text style={styles.subscriptionButtonText}>Manage Subscription</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Continue with the existing form content
    return (
      <View style={styles.content}>
        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: isDark ? '#CCCCCC' : '#555555' }]}>Business Name *</Text>
          <TextInput
            style={[
              styles.input,
              { 
                color: isDark ? Colors.light_main : Colors.dark_main,
                backgroundColor: isDark ? '#333333' : '#F5F5F5',
                borderColor: isDark ? '#444444' : '#DDDDDD' 
              }
            ]}
            placeholder="Enter business name"
            placeholderTextColor={isDark ? '#777777' : '#999999'}
            value={businessName}
            onChangeText={setBusinessName}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: isDark ? '#CCCCCC' : '#555555' }]}>Address *</Text>
          <TextInput
            style={[
              styles.input,
              { 
                color: isDark ? Colors.light_main : Colors.dark_main,
                backgroundColor: isDark ? '#333333' : '#F5F5F5',
                borderColor: isDark ? '#444444' : '#DDDDDD',
                height: 80, 
                textAlignVertical: 'top' 
              }
            ]}
            placeholder="Enter business address (Building, Road etc)"
            placeholderTextColor={isDark ? '#777777' : '#999999'}
            value={address}
            onChangeText={setAddress}
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: isDark ? '#CCCCCC' : '#555555' }]}>Phone Number</Text>
          <TextInput
            style={[
              styles.input,
              { 
                color: isDark ? Colors.light_main : Colors.dark_main,
                backgroundColor: isDark ? '#333333' : '#F5F5F5',
                borderColor: isDark ? '#444444' : '#DDDDDD' 
              }
            ]}
            placeholder="Enter phone number"
            placeholderTextColor={isDark ? '#777777' : '#999999'}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: isDark ? '#CCCCCC' : '#555555' }]}>Email</Text>
          <TextInput
            style={[
              styles.input,
              { 
                color: isDark ? Colors.light_main : Colors.dark_main,
                backgroundColor: isDark ? '#333333' : '#F5F5F5',
                borderColor: isDark ? '#444444' : '#DDDDDD' 
              }
            ]}
            placeholder="Enter email address"
            placeholderTextColor={isDark ? '#777777' : '#999999'}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: isDark ? '#CCCCCC' : '#555555' }]}>Business Location *</Text>
          <Text style={[styles.locationHelp, { color: isDark ? '#999999' : '#888888' }]}>
            Drag the map to position the pin at your business location
          </Text>
          
          <View style={styles.mapContainer}>
            {mapLoading ? (
              <View style={styles.mapLoadingContainer}>
                <ActivityIndicator size="large" color={isDark ? Colors.light_main : Colors.blue} />
                <Text style={{ color: isDark ? '#CCCCCC' : '#666666', marginTop: 10 }}>
                  Loading map...
                </Text>
              </View>
            ) : (
              <>
                <MapView
                  style={styles.map}
                  region={userLocation}
                  provider="google"
                  onRegionChangeComplete={handleRegionChangeComplete}
                  showsUserLocation
                >
                </MapView>
                <View style={styles.markerFixed}>
                  <Image
                    style={styles.markerImage}
                    source={require('@/assets/icons/markerpin.png')}
                  />
                </View>
              </>
            )}
          </View>
          
          <View style={styles.locationInfo}>
            <View style={styles.locationCoords}>
              <Text style={[styles.coordsText, { color: isDark ? '#CCCCCC' : '#666666' }]}>
                Lat: {userLocation.latitude.toFixed(6)}
              </Text>
              <Text style={[styles.coordsText, { color: isDark ? '#CCCCCC' : '#666666' }]}>
                Long: {userLocation.longitude.toFixed(6)}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.saveButton, 
            { backgroundColor: loading ? '#888888' : Colors.blue }
          ]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="save-outline" size={20} color="#FFFFFF" style={styles.saveIcon} />
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <BottomSheet
      ref={ref}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      backgroundStyle={{ backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF' }}
      handleIndicatorStyle={{ backgroundColor: isDark ? '#666666' : '#CCCCCC' }}
      style={{ zIndex: 2 }}
    >
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: isDark ? Colors.light_main : Colors.dark_main }]}>
          Edit Business Information
        </Text>
        <TouchableOpacity 
          style={[styles.closeButton, { backgroundColor: isDark ? '#333333' : '#EEEEEE' }]}
          onPress={() => ref.current?.close()}
        >
          <Ionicons name="close" size={20} color={isDark ? '#FFFFFF' : '#333333'} />
        </TouchableOpacity>
      </View>

      <BottomSheetScrollView 
        contentContainerStyle={[styles.contentContainer, { paddingBottom: keyboardStatus ? 280 : 50 }]}
      >
        {renderContent()}
      </BottomSheetScrollView>
    </BottomSheet>
  );
});

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex:2,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    padding: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '500',
  },
  locationHelp: {
    fontSize: 12,
    marginBottom: 10,
    fontStyle: 'italic',
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 16,
  },
  mapContainer: {
    height: 220,
    width: '100%',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 10,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  mapLoadingContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  markerFixed: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    marginLeft: -20,
    marginTop: -40,
  },
  markerImage: {
    height: 40,
    width: 40,
  },
  locationInfo: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  locationCoords: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  coordsText: {
    fontSize: 12,
  },
  saveButton: {
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 30,
    flexDirection: 'row',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  saveIcon: {
    marginRight: 10,
  },
  subscriptionRequired: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  subscriptionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 10,
    color: '#333',
  },
  subscriptionText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    color: '#666',
    paddingHorizontal: 20,
  },
  subscriptionButton: {
    backgroundColor: '#0066CC',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  subscriptionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  content: {
    padding: 20,
  },
});

export default BusinessInfoEditSheet; 