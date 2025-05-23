import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Linking,
  Platform,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { StatusBar } from 'expo-status-bar';
import { db } from '@/constants/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { useToast } from 'react-native-toast-notifications';
import BusinessDetails from '@/components/BusinessDetails';

const { width } = Dimensions.get('window');

const BusinessDetailsPage = () => {
  const params = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const toast = useToast();
  
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const fetchBusinessData = async () => {
      try {
        setLoading(true);
        
        // If data is passed as a parameter, use that
        if (params.data) {
          const decodedData = JSON.parse(decodeURIComponent(params.data));
          setBusiness(decodedData);
          setLoading(false);
          return;
        }
        
        // Otherwise fetch from Firebase using the ID
        if (params.id) {
          const businessRef = doc(db, "businesses", params.id);
          const businessSnap = await getDoc(businessRef);
          
          if (businessSnap.exists()) {
            setBusiness({
              id: businessSnap.id,
              ...businessSnap.data()
            });
          } else {
            setError("Business not found");
            showToast("Business not found");
          }
        } else {
          setError("No business ID provided");
          showToast("No business ID provided");
        }
      } catch (err) {
        console.error("Error fetching business:", err);
        setError(err.message);
        showToast("Error loading business details");
      } finally {
        setLoading(false);
      }
    };
    
    fetchBusinessData();
  }, [params.id, params.data]);
  
  const showToast = (message) => {
    toast.show(message, {
      type: "normal",
      placement: "bottom",
      duration: 2000,
      offset: 30,
      animationType: "zoom-in",
    });
  };
  
  const handleBack = () => {
    router.back();
  };
  
  // Sample business data for development
  const sampleBusiness = {
    id: 'sample123',
    businessName: 'Coffee Corner',
    category: 'Restaurant',
    address: '123 Main Street, Downtown',
    description: 'A cozy coffee shop offering premium coffee, pastries, and light meals in a relaxed atmosphere. Perfect for work meetings or casual get-togethers.',
    phone: '+1 (555) 123-4567',
    email: 'contact@coffeecorner.com',
    website: 'www.coffeecorner.com',
    poster: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8Y29mZmVlJTIwc2hvcHxlbnwwfHwwfHx8MA%3D%3D&w=1000&q=80',
    ownerName: 'Sarah Johnson',
    ownerProfilePic: 'https://randomuser.me/api/portraits/women/22.jpg',
    coordinates: {
      _latitude: 40.712776,
      _longitude: -74.005974
    },
    distance: '1.2 km'
  };
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#121212' : '#F5F5F5' }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      
      {/* Transparent header with back button */}
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      
      {/* Back button */}
      <TouchableOpacity 
        style={[styles.backButton, { backgroundColor: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.5)' }]}
        onPress={handleBack}
      >
        <Ionicons name="arrow-back" size={24} color={isDark ? 'white' : 'black'} />
      </TouchableOpacity>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={isDark ? Colors.light_main : Colors.dark_main} />
          <Text style={[styles.loadingText, { color: isDark ? '#AAAAAA' : '#666666' }]}>
            Loading business details...
          </Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={60} color={isDark ? '#AAAAAA' : '#666666'} />
          <Text style={[styles.errorText, { color: isDark ? '#AAAAAA' : '#666666' }]}>
            {error}
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleBack}>
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <BusinessDetails business={business || sampleBusiness} />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backButton: {
    position: 'absolute',
    top: 10,
    left: 10,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: Colors.blue,
    borderRadius: 20,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: '600',
  },
});

export default BusinessDetailsPage; 