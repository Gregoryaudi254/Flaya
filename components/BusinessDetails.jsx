import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Linking,
  Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { useToast } from 'react-native-toast-notifications';

const { width } = Dimensions.get('window');

const BusinessDetails = ({ business }) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const toast = useToast();

  const handleCall = async () => {
    if (!business.phone) {
      showToast("No phone number available");
      return;
    }
    
    let phoneNumber = business.phone;
    if (Platform.OS !== 'android') {
      phoneNumber = `telprompt:${business.phone}`;
    } else {
      phoneNumber = `tel:${business.phone}`;
    }
    
    try {
      await Linking.openURL(phoneNumber);
    } catch (error) {
      showToast("Couldn't open phone app");
    }
  };
  
  const handleEmail = async () => {
    if (!business.email) {
      showToast("No email address available");
      return;
    }
    
    try {
      await Linking.openURL(`mailto:${business.email}`);
    } catch (error) {
      showToast("Couldn't open email app");
    }
  };
  
  const handleWebsite = async () => {
    if (!business.website) {
      showToast("No website available");
      return;
    }
    
    let website = business.website;
    if (!website.startsWith('http://') && !website.startsWith('https://')) {
      website = `https://${website}`;
    }
    
    try {
      await Linking.openURL(website);
    } catch (error) {
      showToast("Couldn't open website");
    }
  };
  
  const handleGetDirection = async () => {
    if (!business.coordinates) {
      showToast("Location information not available");
      return;
    }
    
    const latitude = business.coordinates._latitude;
    const longitude = business.coordinates._longitude;
    
    const url = Platform.select({
      ios: `https://maps.apple.com/?q=${latitude},${longitude}`,
      android: `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`,
      default: `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`,
    });
    
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        showToast("Maps app is not installed");
      }
    } catch (error) {
      showToast("Couldn't open maps app");
    }
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

  return (
    <ScrollView 
      style={[styles.container, {backgroundColor: isDark ? Colors.dark_background : Colors.light_background}]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header with Image and Title */}
      <View style={styles.headerContainer}>
        <Image 
          source={{ uri: business.poster }} 
          style={styles.headerImage}
          resizeMode="cover"
        />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,0.9)']}
          style={styles.headerGradient}
        >
          <View style={styles.headerContent}>
            <Text style={styles.title}>{business.businessName || "Business Name"}</Text>
            <View style={styles.categoryContainer}>
              <View style={[styles.categoryBadge, { backgroundColor: '#1E90FF' }]}>
                <Text style={styles.categoryText}>{business.category || "Category"}</Text>
              </View>
              {business.distance && (
                <Text style={styles.distanceText}>{business.distance} away</Text>
              )}
            </View>
          </View>
        </LinearGradient>
      </View>
      
      {/* Contact Buttons Section */}
      <View style={styles.contactButtonsContainer}>
        <TouchableOpacity
          style={[styles.contactButton, { backgroundColor: '#4CAF50' }]}
          onPress={handleCall}
        >
          <Ionicons name="call" size={22} color="#FFFFFF" />
          <Text style={styles.contactButtonText}>Call</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.contactButton, { backgroundColor: '#2196F3' }]}
          onPress={handleEmail}
        >
          <Ionicons name="mail" size={22} color="#FFFFFF" />
          <Text style={styles.contactButtonText}>Email</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.contactButton, { backgroundColor: '#FF9800' }]}
          onPress={handleWebsite}
        >
          <Ionicons name="globe" size={22} color="#FFFFFF" />
          <Text style={styles.contactButtonText}>Website</Text>
        </TouchableOpacity>
      </View>
      
      {/* About Business Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, {color: isDark ? Colors.light_main : Colors.dark_main}]}>
          About
        </Text>
        <Text style={[styles.aboutText, {color: isDark ? '#CCC' : '#555'}]}>
          {business.description || 
           "No description available."
          }
        </Text>
      </View>
      
      {/* Location Section */}
      <View style={styles.section}>
        <View style={styles.locationHeader}>
          <View style={styles.locationIconContainer}>
            <Ionicons name="location-outline" size={24} color="#fff" />
          </View>
          <View style={styles.locationTextContainer}>
            <Text style={[styles.locationText, {color: isDark ? Colors.light_main : Colors.dark_main}]}>
              {business.address || 'Address not provided'}
            </Text>
            {business.distance && (
              <Text style={styles.locationSubtext}>
                {business.distance} from your location
              </Text>
            )}
          </View>
        </View>
        
        <TouchableOpacity 
          style={styles.directionButton}
          onPress={handleGetDirection}
        >
          <Text style={styles.directionButtonText}>Get Directions</Text>
        </TouchableOpacity>
      </View>
      
      {/* Business Owner Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, {color: isDark ? Colors.light_main : Colors.dark_main}]}>
          Business Owner
        </Text>
        <View style={styles.ownerContainer}>
          <Image 
            source={{ uri: business.ownerProfilePic || 'https://randomuser.me/api/portraits/men/32.jpg' }} 
            style={styles.ownerImage} 
          />
          <Text style={[styles.ownerName, {color: isDark ? Colors.light_main : Colors.dark_main}]}>
            {business.ownerName || 'Owner'}
          </Text>
        </View>
      </View>
      
      {/* Contact Information Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, {color: isDark ? Colors.light_main : Colors.dark_main}]}>
          Contact Information
        </Text>
        
        {business.phone && (
          <View style={styles.contactInfoRow}>
            <Ionicons name="call-outline" size={20} color={isDark ? '#CCC' : '#555'} />
            <Text style={[styles.contactInfoText, {color: isDark ? '#CCC' : '#555'}]}>
              {business.phone}
            </Text>
          </View>
        )}
        
        {business.email && (
          <View style={styles.contactInfoRow}>
            <Ionicons name="mail-outline" size={20} color={isDark ? '#CCC' : '#555'} />
            <Text style={[styles.contactInfoText, {color: isDark ? '#CCC' : '#555'}]}>
              {business.email}
            </Text>
          </View>
        )}
        
        {business.website && (
          <View style={styles.contactInfoRow}>
            <Ionicons name="globe-outline" size={20} color={isDark ? '#CCC' : '#555'} />
            <Text style={[styles.contactInfoText, {color: isDark ? '#CCC' : '#555'}]}>
              {business.website}
            </Text>
          </View>
        )}
      </View>
      
      {/* Space at the bottom */}
      <View style={styles.bottomSpace} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    height: 300,
    width: '100%',
    position: 'relative',
  },
  headerImage: {
    height: '100%',
    width: '100%',
  },
  headerGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
    padding: 15,
    justifyContent: 'flex-end',
  },
  headerContent: {
    padding: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  categoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    alignSelf: 'flex-start',
    marginRight: 10,
  },
  categoryText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  distanceText: {
    color: 'white',
    fontSize: 14,
    opacity: 0.9,
  },
  contactButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 25,
    minWidth: width / 4,
  },
  contactButtonText: {
    color: 'white',
    marginLeft: 5,
    fontWeight: '600',
  },
  section: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  sectionLabel: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  aboutText: {
    fontSize: 15,
    lineHeight: 22,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  locationIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#555',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  locationTextContainer: {
    flex: 1,
  },
  locationText: {
    fontSize: 16,
    fontWeight: '600',
  },
  locationSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  directionButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginLeft: 55,
  },
  directionButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  ownerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(200,200,200,0.2)',
    padding: 10,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  ownerImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  ownerName: {
    fontSize: 16,
    fontWeight: '500',
  },
  contactInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  contactInfoText: {
    fontSize: 15,
    marginLeft: 10,
  },
  bottomSpace: {
    height: 40,
  },
});

export default BusinessDetails; 