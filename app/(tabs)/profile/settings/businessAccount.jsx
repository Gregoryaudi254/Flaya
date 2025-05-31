import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Switch,
  Modal,
  FlatList,
  Dimensions,
  Animated,
  Keyboard
} from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getData, storeData } from '@/constants/localstorage';
import { doc, updateDoc, getDoc, collection, query, getDocs, where, limit } from 'firebase/firestore';
import { db } from '@/constants/firebase';
import * as Location from 'expo-location';
import { useToast } from 'react-native-toast-notifications';
import {CountryPicker} from "react-native-country-codes-picker";
import DropDownPicker from 'react-native-dropdown-picker';
import { setData } from '@/slices/dataChangeSlice';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDispatch } from 'react-redux';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';


const { width, height } = Dimensions.get('window');

// Business categories
const businessCategories = [
  { id: 'fashion', name: 'Fashion & Clothing', icon: '👚' },
  { id: 'food', name: 'Food & Restaurant', icon: '🍔' },
  { id: 'tech', name: 'Technology', icon: '💻' },
  { id: 'beauty', name: 'Beauty & Cosmetics', icon: '💄' },
  { id: 'health', name: 'Health & Fitness', icon: '💪' },
  { id: 'education', name: 'Education', icon: '📚' },
  { id: 'entertainment', name: 'Entertainment', icon: '🎬' },
  { id: 'art', name: 'Art & Design', icon: '🎨' },
  { id: 'travel', name: 'Travel & Tourism', icon: '✈️' },
  { id: 'home', name: 'Home & Garden', icon: '🏡' },
  { id: 'sports', name: 'Sports', icon: '⚽' },
  { id: 'automotive', name: 'Automotive', icon: '🚗' },
  { id: 'events', name: 'Events & Parties', icon: '🎉' },
  { id: 'finance', name: 'Finance & Banking', icon: '💰' },
  { id: 'other', name: 'Other', icon: '📦' }
];

const BusinessAccountScreen = () => {
  const dispatch = useDispatch();
  const colorScheme = useColorScheme();
  const router = useRouter();
  const isDark = colorScheme === 'dark';
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(false);
  const [isBusiness, setIsBusiness] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  
  // Map reference
  const mapRef = useRef(null);
  
  // Business account details
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [phonenumber, setPhoneNumber] = useState('');
  const [bio, setBio] = useState('');
  const [website, setWebsite] = useState('');
  const [address, setAddress] = useState('');
  const [category, setCategory] = useState(null);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [coordinates, setCoordinates] = useState(null);
  const [locationFetching, setLocationFetching] = useState(false);

  const [open, setOpen] = useState(false);
  const [isCategoryListed, setCategoryListed] = useState(true);

  const [show, setShow] = useState(false);
  const [countryCode, setCountryCode] = useState('+254');
  const [countryInitial, setCountryInitial] = useState('KE');

  const [userLocation, setUserLocation] = useState(null);
  
  // Step indicators
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 2;
 
  const [items, setItems] = useState([
      {label: 'Clothing', value: 'clothing'},
      {label: 'Groceries', value: 'groceries'},
      {label: 'Electronics', value: 'electronics'},
      {label: 'Food', value: 'food'},
      {label: 'Home', value: 'home'},
      {label: 'Services', value: 'services'},
      {label: 'Beverages', value: 'beverages'},
  ]);

  const getBuusinessCategories = async () => {
    const infoDoc = await getDoc(doc(db, `information/info`));
    const infoData = infoDoc.data();

    setItems(infoData.businesscategories)

  }

  
  useEffect(() => {
    const loadUserInfo = async () => {
      try {
        const storedUserInfo = await getData('@profile_info');
        setUserInfo(storedUserInfo);
        
        // Get current business details if already a business account
        if (storedUserInfo && storedUserInfo.uid) {
          const userDoc = await getDoc(doc(db, `users/${storedUserInfo.uid}`));
          const userData = userDoc.data();
          
          if (userData.business) {
            setIsBusiness(true);
            setBusinessName(userData.business.name || '');
            setEmail(userData.business.email || storedUserInfo.email || '');
            setPhoneNumber(userData.business.phoneNumber || '');
            setBio(userData.business.bio || userData.caption || '');
            setWebsite(userData.business.website || '');
            setAddress(userData.business.address || '');
            setCategory(userData.business.category || null);
            
            if (userData.business.coordinates) {
              setCoordinates(userData.business.coordinates);
            }
          }
        }
      } catch (error) {
        console.error("Error loading user info:", error);
        showToast("Couldn't load your account information");
      }
    };
    getBuusinessCategories();
    loadUserInfo();
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
  
  const handleGetLocation = async () => {
    try {
      setLocationFetching(true);
      let { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        showToast('Permission to access location was denied');
        setLocationFetching(false);
        return;
      }
      
      let location = await Location.getCurrentPositionAsync({});
      const newCoordinates = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      };
      
      // Update coordinates state
      setCoordinates(newCoordinates);

      // Update map location with animation
      const newRegion = { 
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005
      };
      
      setUserLocation(newRegion);
      
      // If the map ref exists, animate to the new region
      if (mapRef.current) {
        mapRef.current.animateToRegion(newRegion, 1000);
      }
    
      // Get address from coordinates (optional - you can remove this if not needed)
      try {
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
          
          // Optionally set the address if you want to auto-fill it
          // setAddress(formattedAddress);
        }
      } catch (geocodeError) {
        console.log("Geocoding failed:", geocodeError);
        // Don't fail the whole operation if geocoding fails
      }
      
      setLocationFetching(false);
    } catch (error) {
      console.error("Error getting location:", error);
      showToast("Couldn't get your location");
      setLocationFetching(false);
    }
  };

  const cleanString = (str) => {
    return str.replace(/\s+/g, '').toLowerCase();
  };
  
  const handleSaveBusiness = async () => {
    if (!businessName) {
      showToast("Please enter your business name");
      return;
    }
    
    if (!category) {
      showToast("Please select a business category");
      return;
    }

    if (!coordinates) {
      showToast("Please select a business location");
      return;
    }

    if (!address) {
      showToast("Please enter your business address");
      return;
    }
    
    
    try {
      setIsLoading(true);
      
      if (!userInfo || !userInfo.uid) {
        showToast("User information not found");
        setIsLoading(false);
        return;
      }

     
      const usersRef = collection(db, 'users');
      const q = query(
        usersRef,
        where("businessname", "==", cleanString(businessName)),
        limit(1)
      );
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        showToast("Business with same name already exists");
        setIsLoading(false)
        return;
      }   

      const businessData = {
        name: businessName,
        email,
        phonenumber,
        countrycode:countryCode,
        address,
        category,
        coordinates,
        approved: false,
      };

      
        
      // Update Firestore
      const userRef = doc(db, `users/${userInfo.uid}`);
      await updateDoc(userRef, {
        business: businessData,
        isbusinessaccount: false,
        businessname:cleanString(businessName)
      });
      
      // Update local storage
      const updatedUserInfo = {
        ...userInfo,
        isbusinessaccount: true,
        business: businessData
      };
      await storeData('@profile_info', updatedUserInfo);
      
      showToast("Business profile saved!");

      dispatch(setData({id:"pending", intent:'accountchange'}));
      
      // Go back to settings
      setTimeout(() => {
        router.back();
      }, 500);
      
    } catch (error) {
      console.error("Error updating business profile:", error);
      showToast("Couldn't update your business profile");
      setIsLoading(false);
    }
  };
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  
  // Keyboard state
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  
  // Listen for keyboard events
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
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);
  
  // Handle step transition with animation
  const handleStepTransition = (step) => {
    // Fade out
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: step > currentStep ? -50 : 50,
        duration: 200,
        useNativeDriver: true,
      })
    ]).start(() => {
      // Change step
      setCurrentStep(step);
      
      // Reset slide position for entry animation
      slideAnim.setValue(step < currentStep ? -50 : 50);
      
      // Fade in
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        })
      ]).start();
    });
  };

  const renderCategoryItem = ({ item }) => (
    <TouchableOpacity
      style={styles.categoryItem}
      onPress={() => {
        setCategory(item.value);
        setCategoryModalVisible(false);
      }}
    >
      <Text style={[styles.categoryName, {color: isDark ? Colors.light_main : Colors.dark_main}]}>
        {item.label}
      </Text>
    </TouchableOpacity>
  );

  

  const handleRegionChangeComplete = (region) => {
    console.log(region)
    setUserLocation(region);
    
    // Update coordinates to match the center of the map
    const newCoordinates = {
      latitude: region.latitude,
      longitude: region.longitude
    };
    setCoordinates(newCoordinates);
  };
  
  // Dismiss keyboard on press outside inputs
  const handlePressOutside = () => {
    Keyboard.dismiss();
  };
  
  return (
    <KeyboardAvoidingView
      style={[styles.container, {backgroundColor: isDark ? "#121212" : "#F9F9F9"}]}
      enabled={true}
    >
      <Stack.Screen
        options={{
          headerTitle: "Business Account",
          headerShadowVisible: false,
          headerRight: () => (
            isLoading ? (
              <ActivityIndicator color={isDark ? Colors.light_main : Colors.dark_main} />
            ) : (
              <TouchableOpacity onPress={handleSaveBusiness} style={styles.headerButton}>
                <Text style={styles.saveButton}>Create Account</Text>
              </TouchableOpacity>
            )
          ),
        }}
      />

      {/* Header card with step indicators - conditionally render based on keyboard */}
      {!keyboardVisible && (
        <View style={[styles.headerCard, { backgroundColor: isDark ? "#1E1E1E" : "#FFFFFF" }]}>
          <View style={styles.businessHeaderContent}>
            <View style={styles.headerIconContainer}>
              <Ionicons 
                name="business-outline" 
                size={28} 
                color={Colors.blue} 
              />
            </View>
            <View style={styles.headerTextContainer}>
              <Text style={[styles.headerTitle, {color: isDark ? Colors.light_main : Colors.dark_main}]}>
                {isBusiness ? 'Manage Business Account' : 'Switch to Business Account'}
              </Text>
              <Text style={styles.headerSubtitle}>
                Get discovered by customers in your local area
              </Text>
            </View>
          </View>
          
          {/* Step indicator */}
          <View style={styles.stepIndicatorContainer}>
            {Array.from({ length: totalSteps }).map((_, index) => (
              <View 
                key={index} 
                style={[
                  styles.stepDot, 
                  currentStep > index 
                    ? { backgroundColor: Colors.blue } 
                    : { backgroundColor: isDark ? '#333333' : '#DDDDDD' }
                ]} 
              />
            ))}
          </View>
        </View>
      )}

<ScrollView 
          style={[
            styles.scrollView, 
            { backgroundColor: isDark ? "#121212" : "#F9F9F9" },
            keyboardVisible && { paddingTop: 5 }
          ]} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          <Animated.View 
            style={{
              opacity: fadeAnim,
              transform: [{ translateX: slideAnim }],
              backgroundColor: isDark ? "#121212" : "#F9F9F9"
            }}
          >
            {currentStep === 1 ? (
              // Step 1: Business Information
              <View style={[styles.formContainer, { backgroundColor: isDark ? "#121212" : "#F9F9F9" }]}>
                <Text style={[styles.sectionTitle, {color: isDark ? Colors.light_main : Colors.dark_main}]}>
                  Tell us about your business
                </Text>
                
                <View style={[styles.formCard, { backgroundColor: isDark ? "#1E1E1E" : "#FFFFFF" }]}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Business Name</Text>
                    <TextInput
                      style={[
                        styles.textInput,
                        {
                          color: isDark ? Colors.light_main : Colors.dark_main,
                          backgroundColor: isDark ? "#2A2A2A" : "#F5F5F5"
                        }
                      ]}
                      value={businessName}
                      onChangeText={setBusinessName}
                      placeholder="Your business name"
                      placeholderTextColor={isDark ? "#888888" : "#999999"}
                      returnKeyType="next"
                      blurOnSubmit={false}
                    />
                  </View>
                  
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Category</Text>
                    <TouchableOpacity
                      style={[
                        styles.categorySelector,
                        {
                          backgroundColor: isDark ? "#2A2A2A" : "#F5F5F5",
                          borderColor: isCategoryListed ? (isDark ? '#444444' : '#DDDDDD') : '#FF3B30',
                        }
                      ]}
                      onPress={() => {
                        Keyboard.dismiss();
                        setCategoryModalVisible(true);
                      }}
                    >
                      <Text 
                        style={{ 
                          color: category ? (isDark ? Colors.light_main : Colors.dark_main) : '#999999',
                          flex: 1
                        }}
                      >
                        {category ? items.find(item => item.value === category)?.label : 'Select business category'}
                      </Text>
                      <Ionicons name="chevron-down" size={16} color={isDark ? "#BBBBBB" : "#666666"} />
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Business Email</Text>
                    <TextInput
                      style={[
                        styles.textInput,
                        {
                          color: isDark ? Colors.light_main : Colors.dark_main,
                          backgroundColor: isDark ? "#2A2A2A" : "#F5F5F5"
                        }
                      ]}
                      value={email}
                      onChangeText={setEmail}
                      placeholder="Enter your business email"
                      placeholderTextColor={isDark ? "#888888" : "#999999"}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      returnKeyType="next"
                      blurOnSubmit={false}
                    />
                  </View>
                  
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Phone Number</Text>
                    <View style={styles.phoneInputContainer}>
                      <TouchableOpacity
                        onPress={() => {
                          Keyboard.dismiss();
                          setShow(true);
                        }}
                        style={[
                          styles.countryCodeButton,
                          { backgroundColor: isDark ? "#2A2A2A" : "#F5F5F5" }
                        ]}
                      >
                        <Text style={{
                          color: isDark ? Colors.light_main : Colors.dark_main,
                          fontSize: 15
                        }}>
                          {countryInitial} {countryCode}
                        </Text>
                        <Ionicons 
                          name="chevron-down" 
                          size={16} 
                          color={isDark ? "#BBBBBB" : "#666666"} 
                          style={{ marginLeft: 5 }}
                        />
                      </TouchableOpacity>
                      
                      <TextInput 
                        style={[
                          styles.phoneInput,
                          {
                            color: isDark ? Colors.light_main : Colors.dark_main,
                            backgroundColor: isDark ? "#2A2A2A" : "#F5F5F5"
                          }
                        ]}
                        placeholder='Enter phone number'
                        placeholderTextColor={isDark ? "#888888" : "#999999"}
                        value={phonenumber}
                        onChangeText={setPhoneNumber}
                        keyboardType="phone-pad"
                        returnKeyType="done"
                        onSubmitEditing={Keyboard.dismiss}
                      />
                    </View>
                  </View>
                  
                  <TouchableOpacity 
                    style={styles.nextStepButton}
                    onPress={() => handleStepTransition(2)}
                  >
                    <Text style={styles.nextStepButtonText}>Continue</Text>
                    <Ionicons name="arrow-forward" size={20} color="#FFFFFF" style={{ marginLeft: 8 }} />
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              // Step 2: Location Information
              <View style={[styles.formContainer, { backgroundColor: isDark ? "#121212" : "#F9F9F9" }]}>
                <Text style={[styles.sectionTitle, {color: isDark ? Colors.light_main : Colors.dark_main}]}>
                  Where is your business located?
                </Text>
                
                <View style={[styles.formCard, { backgroundColor: isDark ? "#1E1E1E" : "#FFFFFF" }]}>
                  <View style={styles.mapContainer}>
                    <MapView
                      ref={mapRef}
                      style={styles.map}
                      initialRegion={userLocation || {
                        latitude: -1.2921,  // Nairobi coordinates as default
                        longitude: 36.8219,
                        latitudeDelta: 0.0922,
                        longitudeDelta: 0.0421,
                      }}
                      provider={PROVIDER_GOOGLE}
                      onRegionChangeComplete={handleRegionChangeComplete}
                      showsUserLocation={true}
                      showsMyLocationButton={false}
                    >
                      {coordinates && (
                        <Marker
                          coordinate={coordinates}
                          title={businessName || "Business Location"}
                        />
                      )}
                    </MapView>
                    
                    <View style={styles.markerFixed}>
                      <Image
                        style={styles.markerImage}
                        source={require('@/assets/icons/markerpin.png')}
                      />
                    </View>
                    
                    <TouchableOpacity
                      style={styles.getCurrentLocationButton}
                      onPress={handleGetLocation}
                      disabled={locationFetching}
                    >
                      {locationFetching ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <Ionicons name="locate" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
                          <Text style={styles.getCurrentLocationText}>Current Location</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Address</Text>
                    <TextInput
                      style={[
                        styles.textInput,
                        {
                          color: isDark ? Colors.light_main : Colors.dark_main,
                          backgroundColor: isDark ? "#2A2A2A" : "#F5F5F5"
                        }
                      ]}
                      value={address}
                      onChangeText={setAddress}
                      placeholder="Business address (building name, road etc)"
                      placeholderTextColor={isDark ? "#888888" : "#999999"}
                      returnKeyType="done"
                      onSubmitEditing={Keyboard.dismiss}
                      multiline={Platform.OS === 'ios'}
                      numberOfLines={Platform.OS === 'android' ? 2 : undefined}
                    />
                  </View>
                  
                  {coordinates && (
                    <View style={styles.coordinatesContainer}>
                      <Ionicons 
                        name="location" 
                        size={16} 
                        color={Colors.blue} 
                        style={{ marginRight: 6 }}
                      />
                      <Text style={styles.coordinatesText}>
                        {coordinates.latitude.toFixed(6)}, {coordinates.longitude.toFixed(6)}
                      </Text>
                      <Text style={[styles.coordinatesText, { marginLeft: 8, fontSize: 12, opacity: 0.7 }]}>
                        (Move map to adjust)
                      </Text>
                    </View>
                  )}
                  
                  <View style={styles.buttonsContainer}>
                    <TouchableOpacity 
                      style={styles.backButton}
                      onPress={() => handleStepTransition(1)}
                    >
                      <Ionicons name="arrow-back" size={20} color={isDark ? Colors.light_main : Colors.dark_main} style={{ marginRight: 8 }} />
                      <Text style={[styles.backButtonText, {color: isDark ? Colors.light_main : Colors.dark_main}]}>Back</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={styles.saveBusinessButton}
                      onPress={handleSaveBusiness}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <Text style={styles.saveBusinessButtonText}>Create Account</Text>
                          <Ionicons name="checkmark" size={20} color="#FFFFFF" style={{ marginLeft: 8 }} />
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
          </Animated.View>
        </ScrollView>
      {/* Country Picker Modal */}
      <CountryPicker
        show={show}
        style={{
          modal: {
            height: 500
          }
        }}
        onBackdropPress={() => {
          setShow(false)
        }}
        pickerButtonOnPress={(item) => {
          setCountryCode(item.dial_code);
          setCountryInitial(item.code)
          setShow(false);
        }}
      />

      {/* Category Picker Modal */}
      <Modal
        visible={categoryModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setCategoryModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? "#1E1E1E" : "#FFFFFF" }]}>
            <View style={[styles.modalHeader, { borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}>
              <Text style={[styles.modalTitle, { color: isDark ? Colors.light_main : Colors.dark_main }]}>
                Select Category
              </Text>
              <TouchableOpacity onPress={() => setCategoryModalVisible(false)}>
                <Ionicons name="close" size={24} color={isDark ? Colors.light_main : Colors.dark_main} />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={items}
              renderItem={renderCategoryItem}
              keyExtractor={(item) => item.value}
              showsVerticalScrollIndicator={false}
              style={styles.categoryList}
            />
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 120 : 80,
  },
  headerButton: {
    marginRight: 10,
  },
  saveButton: {
    color: Colors.blue,
    fontSize: 16,
    fontWeight: '600',
  },
  headerCard: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(200,200,200,0.2)',
    marginBottom: 5,
  },
  businessHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#888',
    lineHeight: 20,
  },
  stepIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginHorizontal: 4,
  },
  formContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    marginTop: 10,
  },
  formCard: {
    padding: 20,
    borderRadius: 12,

    shadowOffset: {
      width: 0,
      height: 2,
    },
   
    overflow: 'hidden',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    color: '#888',
    marginBottom: 8,
    fontWeight: '500',
  },
  textInput: {
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(200,200,200,0.3)',
    minHeight: 48,
  },
  dropdownContainer: {
    width: '100%',
    alignSelf: 'center',
    marginBottom: 15,
    zIndex: 100,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countryCodeButton: {
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(200,200,200,0.3)',
    width: 100,
    justifyContent: 'center',
  },
  phoneInput: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(200,200,200,0.3)',
  },
  nextStepButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 10,
    backgroundColor: Colors.blue,
    marginTop: 10,
  },
  nextStepButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  mapContainer: {
    height: 220,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  markerFixed: {
    position: 'absolute',
    left: '50%',
    marginLeft: -20,
    top: '50%',
    marginTop: -40,
  },
  markerImage: {
    height: 40,
    width: 40,
  },
  getCurrentLocationButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: Colors.blue,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  getCurrentLocationText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  coordinatesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,122,255,0.1)',
    padding: 10,
    borderRadius: 8,
    marginBottom: 20,
  },
  coordinatesText: {
    color: Colors.blue,
    fontSize: 14,
    fontWeight: '500',
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(200,200,200,0.3)',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  saveBusinessButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 10,
    backgroundColor: Colors.blue,
    minWidth: 160,
  },
  saveBusinessButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(200,200,200,0.2)',
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '500',
  },
  categorySelector: {
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(200,200,200,0.3)',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 15,
    marginBottom: 10,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  categoryList: {
    maxHeight: height * 0.5,
  },
});

export default BusinessAccountScreen; 