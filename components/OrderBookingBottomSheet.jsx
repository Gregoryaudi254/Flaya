import React, { useState, useEffect, useRef, useCallback, forwardRef, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Image,
  KeyboardAvoidingView,
  Keyboard
} from 'react-native';
import BottomSheet, { BottomSheetView, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';
import { doc, collection, addDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '@/constants/firebase';
import { getData } from '@/constants/localstorage';
import { useToast } from 'react-native-toast-notifications';
import { CountryPicker } from 'react-native-country-codes-picker';
import { getLocation } from '@/constants/common';

const OrderBookingBottomSheet = forwardRef(({ businessId, businessName }, ref) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const mapRef = useRef(null);
  const toast = useToast();
  
  // Form state
  const [phoneNumber, setPhoneNumber] = useState('');
  const [description, setDescription] = useState('');
  const [userLocation, setUserLocation] = useState(null);
  const [address, setAddress] = useState('');
  const [coordinates, setCoordinates] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [locationFetching, setLocationFetching] = useState(false);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  
  // Country code picker
  const [show, setShow] = useState(false);
  const [countryCode, setCountryCode] = useState('+254');
  const [countryInitial, setCountryInitial] = useState('KE');
  
  // Snap points
  const snapPoints = useMemo(() => ['50%', '80%'], []);
  
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        setKeyboardVisible(true);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
      }
    );

    return () => {
      keyboardDidHideListener.remove();
      keyboardDidShowListener.remove();
    };
  }, []);
  
  const handleGetLocation = async () => {
    try {
      setLocationFetching(true);
      let location = await getLocation()
      
      if (location === null) {
        showToast('Permission to access location was denied');
        setLocationFetching(false);
        return;
      }
      
     
      setCoordinates({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      });

      setUserLocation({ 
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      });
      
      // Get address from coordinates
      const geocode = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      });
      
      if (geocode.length > 0) {
        const addressComponents = geocode[0];
        const formattedAddress = [
          addressComponents.street,
          addressComponents.city,
          addressComponents.region,
          addressComponents.postalCode,
          addressComponents.country
        ].filter(Boolean).join(', ');
        
        setAddress(formattedAddress);
      }
      
      setLocationFetching(false);
    } catch (error) {
      console.error("Error getting location:", error);
      showToast("Couldn't get your location");
      setLocationFetching(false);
    }
  };
  
  const handleRegionChangeComplete = (region) => {
    setUserLocation(region);
    
    // Update coordinates when map is moved
    setCoordinates({
      latitude: region.latitude,
      longitude: region.longitude
    });
    
    // Get address from new coordinates
    (async () => {
      try {
        const geocode = await Location.reverseGeocodeAsync({
          latitude: region.latitude,
          longitude: region.longitude
        });
        
        if (geocode.length > 0) {
          const addressComponents = geocode[0];
          const formattedAddress = [
            addressComponents.street,
            addressComponents.city,
            addressComponents.region,
            addressComponents.postalCode,
            addressComponents.country
          ].filter(Boolean).join(', ');
          
          setAddress(formattedAddress);
        }
      } catch (error) {
        console.error("Error getting address:", error);
      }
    })();
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
  
  const handleSubmit = async () => {
    if (!phoneNumber) {
      showToast("Please enter your phone number");
      return;
    }
    
    if (!description) {
      showToast("Please describe what you want to order or book");
      return;
    }
    
   
    
    try {
      setIsLoading(true);
      
      const userInfo = await getData('@profile_info');
      if (!userInfo) {
        showToast("User information not found");
        setIsLoading(false);
        return;
      }
      
      // Get business info
      const businessDoc = await getDoc(doc(db, `users/${businessId}`));
      if (!businessDoc.exists()) {
        showToast("Business not found");
        setIsLoading(false);
        return;
      }
      
      const businessData = businessDoc.data();
      
      // Create order/booking data
      const orderData = {
        userId: userInfo.uid,
        userName: userInfo.username,
        userPhoto: userInfo.profilephoto,
        businessId: businessId,
        businessName: businessName || businessData.business?.name || businessData.username,
        phoneNumber: `${countryCode}${phoneNumber}`,
        description: description,
        address: address,
        coordinates: coordinates,
        status: 'pending',
        createdAt: serverTimestamp(),
        seen: false
      };
      
      // Add to database
      await addDoc(collection(db, `users/${businessId}/orders`), orderData);
      
      // Also save in user's orders
      await addDoc(collection(db, `users/${userInfo.uid}/myorders`), {
        ...orderData,
        businessPhoto: businessData.profilephoto
      });
      
      showToast("Order/Booking sent successfully!");
      
      // Reset form and close bottom sheet
      setPhoneNumber('');
      setDescription('');
      setAddress('');
      setCoordinates(null);
      
      ref.current?.close();
      
    } catch (error) {
      console.error("Error submitting order:", error);
      showToast("Couldn't submit your order/booking");
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <BottomSheet
      ref={ref}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose={true}
      backgroundStyle={{ backgroundColor: isDark ? '#121212' : '#FFFFFF' }}
      handleIndicatorStyle={{ backgroundColor: isDark ? '#FFFFFF' : '#000000' }}
    >
      <BottomSheetScrollView contentContainerStyle={styles.contentContainer}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: isDark ? '#FFFFFF' : '#000000' }]}>
            Order/Book from {businessName}
          </Text>
          <Text style={styles.subtitle}>
            Enter your details to place an order or make a booking
          </Text>
        </View>
        
        <View style={styles.form}>
          <Text style={[styles.sectionTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
            Contact Information
          </Text>
          
          <View style={styles.phoneContainer}>
            <TouchableOpacity
              onPress={() => setShow(true)}
              style={styles.countryCodeButton}
            >
              <Text style={{ color: isDark ? '#FFFFFF' : '#000000' }}>
                {countryInitial}
              </Text>
              <Text style={{ color: isDark ? '#FFFFFF' : '#000000', marginStart: 5 }}>
                {countryCode}
              </Text>
              <Image 
                style={styles.dropdownIcon} 
                source={require('@/assets/icons/down-arrow.png')} 
              />
            </TouchableOpacity>
            
            <TextInput 
              style={[
                styles.phoneInput,
                { 
                  color: isDark ? '#FFFFFF' : '#000000',
                  borderColor: isDark ? 'gray' : '#DDDDDD'
                }
              ]}
              placeholder="Enter phone number"
              placeholderTextColor="#999999"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
            />
          </View>
          
          <Text style={[styles.label, { color: isDark ? '#AAAAAA' : '#666666' }]}>
            Description
          </Text>
          
          <TextInput
            style={[
              styles.textArea,
              { 
                color: isDark ? '#FFFFFF' : '#000000',
                backgroundColor: isDark ? '#333333' : '#F5F5F5',
                borderColor: isDark ? 'gray' : '#DDDDDD'
              }
            ]}
            placeholder="Describe what you want to order or book"
            placeholderTextColor="#999999"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            value={description}
            onChangeText={setDescription}
          />

          <View style={{flexDirection:'row', alignItems:'center', marginTop: 20}}>

            <Text style={[styles.sectionTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                Delivery Location
            </Text>

            <Text style={[{ color: 'gray', fontSize:17, marginBottom:15}]}> ( if applicable )</Text>

          </View>
          
          
          
          <View style={styles.mapContainer}>
            {userLocation ? (
              <MapView
                ref={mapRef}
                style={styles.map}
                initialRegion={userLocation}
                provider="google"
                onRegionChangeComplete={handleRegionChangeComplete}
              />
            ) : (
              <View style={[styles.mapPlaceholder, { backgroundColor: isDark ? '#333333' : '#F5F5F5' }]}>
                <TouchableOpacity 
                  style={styles.locationButton}
                  onPress={handleGetLocation}
                  disabled={locationFetching}
                >
                  {locationFetching ? (
                    <ActivityIndicator size="small" color={Colors.light_main} />
                  ) : (
                    <Text style={styles.locationButtonText}>Get Current Location</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
            
            {userLocation && (
              <View style={styles.markerFixed}>
                <Image
                  style={styles.markerIcon}
                  source={require('@/assets/icons/markerpin.png')}
                />
              </View>
            )}
          </View>
          
          <View style={styles.addressContainer}>
            <Text style={[styles.label, { color: isDark ? '#AAAAAA' : '#666666' }]}>
              Address
            </Text>
            <View style={styles.addressRow}>
              <TextInput
                style={[
                  styles.addressInput,
                  { 
                    color: isDark ? '#FFFFFF' : '#000000',
                    backgroundColor: isDark ? '#333333' : '#F5F5F5',
                    borderColor: isDark ? 'gray' : '#DDDDDD'
                  }
                ]}
                placeholder="Delivery address"
                placeholderTextColor="#999999"
                value={address}
                onChangeText={setAddress}
              />
              <TouchableOpacity
                style={styles.locationButtonSmall}
                onPress={handleGetLocation}
                disabled={locationFetching}
              >
                {locationFetching ? (
                  <ActivityIndicator size="small" color={Colors.light_main} />
                ) : (
                  <Image 
                    source={require('@/assets/icons/location_outline.png')} 
                    style={styles.locationIcon} 
                  />
                )}
              </TouchableOpacity>
            </View>
          </View>
          
          <TouchableOpacity
            style={[styles.submitButton, isLoading && styles.disabledButton]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>Submit Order/Booking</Text>
            )}
          </TouchableOpacity>
        </View>
      </BottomSheetScrollView>
      
      <CountryPicker
        show={show}
        style={{
          modal: {
            height: 500,
            backgroundColor: isDark ? '#222222' : '#FFFFFF'
          },
          textInput: {
            color: isDark ? '#FFFFFF' : '#000000',
            backgroundColor: isDark ? '#333333' : '#F5F5F5'
          },
          countryButtonStyles: {
            backgroundColor: isDark ? '#333333' : '#F5F5F5'
          },
          countryName: {
            color: isDark ? '#FFFFFF' : '#000000'
          }
        }}
        onBackdropPress={() => setShow(false)}
        pickerButtonOnPress={(item) => {
          setCountryCode(item.dial_code);
          setCountryInitial(item.code);
          setShow(false);
        }}
      />
    </BottomSheet>
  );
});

const styles = StyleSheet.create({
  contentContainer: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 5,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#888888',
    textAlign: 'center',
  },
  form: {
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
  },
  phoneContainer: {
    flexDirection: 'row',
    marginBottom: 15,
    alignItems: 'center',
  },
  countryCodeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderRadius: 5,
    backgroundColor: 'transparent',
  },
  dropdownIcon: {
    height: 15,
    width: 15,
    tintColor: 'gray',
    marginStart: 5,
  },
  phoneInput: {
    flex: 1,
    height: 45,
    borderWidth: 1,
    borderRadius: 5,
    marginStart: 5,
    paddingHorizontal: 10,
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    minHeight: 90,
    fontSize: 16,
  },
  mapContainer: {
    height: 200,
    borderRadius: 10,
    overflow: 'hidden',
    marginVertical: 15,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  mapPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
  },
  markerFixed: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -20,
    marginTop: -40,
  },
  markerIcon: {
    height: 40,
    width: 40,
  },
  locationButton: {
    backgroundColor: Colors.blue,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 5,
  },
  locationButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  addressContainer: {
    marginBottom: 20,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addressInput: {
    flex: 1,
    height: 45,
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
  },
  locationButtonSmall: {
    width: 45,
    height: 45,
    borderRadius: 5,
    backgroundColor: Colors.blue,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  locationIcon: {
    width: 24,
    height: 24,
    tintColor: '#FFFFFF',
  },
  submitButton: {
    backgroundColor: Colors.blue,
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  disabledButton: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default OrderBookingBottomSheet; 