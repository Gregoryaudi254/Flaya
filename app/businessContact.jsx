import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Image,
  Linking,
  ActivityIndicator,
  ScrollView,
  Platform
} from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/constants/firebase';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { LinearGradient } from 'expo-linear-gradient';

export default function BusinessContactScreen() {
  const { businessId } = useLocalSearchParams();
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();

  useEffect(() => {
    const fetchBusinessData = async () => {
      try {
        if (!businessId) {
          throw new Error('Business ID is required');
        }

        const businessDoc = await getDoc(doc(db, `users/${businessId}`));
        
        if (!businessDoc.exists()) {
          throw new Error('Business not found');
        }

        const businessData = businessDoc.data();
        
        if (!businessData.business) {
          throw new Error('Not a business account');
        }

        setBusiness({
          ...businessData.business,
          username: businessData.username,
          profilePhoto: businessData.profilephoto
        });
      } catch (err) {
        console.error('Error fetching business data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchBusinessData();
  }, [businessId]);

  const handleCall = () => {
    if (business?.phonenumber) {
      Linking.openURL(`tel:${business.phonenumber}`);
    }
  };

  const handleEmail = () => {
    if (business?.email) {
      Linking.openURL(`mailto:${business.email}`);
    }
  };

  const handleWebsite = () => {
    if (business?.website) {
      let url = business.website;
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
      Linking.openURL(url);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.blue} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={[styles.errorText, {color: isDark ? 'white' : 'black'}]}>
          {error}
        </Text>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, {backgroundColor: isDark ? 'black' : 'white'}]}>
      <Stack.Screen 
        options={{
          title: "Contact Business",
          headerShadowVisible: false,
          headerStyle: {
            backgroundColor: isDark ? 'black' : 'white',
          },
          headerTintColor: isDark ? 'white' : 'black',
        }}
      />

      <ScrollView style={styles.scrollView}>
        <View style={styles.headerContainer}>
          <Image 
            source={{uri: business?.profilePhoto}} 
            style={styles.profileImage} 
          />
          
          <Text style={[styles.businessName, {color: isDark ? 'white' : 'black'}]}>
            {business?.name || business?.username}
          </Text>
          
          {business?.category && (
            <View style={styles.categoryContainer}>
              {business.category.icon ? (
                <Text style={styles.categoryIcon}>{business.category.icon}</Text>
              ) : null}
              <Text style={[styles.categoryText, {color: isDark ? '#ccc' : '#666'}]}>
                {business.category.name || business.category}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.divider} />

        <Text style={[styles.sectionTitle, {color: isDark ? 'white' : 'black'}]}>
          Contact Information
        </Text>

        <View style={styles.contactOptionsContainer}>
          {business?.phonenumber && (
            <TouchableOpacity 
              style={styles.contactOption}
              onPress={handleCall}
            >
              <LinearGradient
                colors={['#1E90FF', '#4169E1']}
                style={styles.contactIconContainer}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Image 
                  source={require('@/assets/icons/call.png')} 
                  style={styles.contactIcon} 
                />
              </LinearGradient>
              <View style={styles.contactTextContainer}>
                <Text style={[styles.contactLabel, {color: isDark ? '#ccc' : '#666'}]}>
                  Phone
                </Text>
                <Text style={[styles.contactValue, {color: isDark ? 'white' : 'black'}]}>
                  {business.phonenumber}
                </Text>
              </View>
              <Image 
                source={require('@/assets/icons/call.png')} 
                style={[styles.actionIcon, {tintColor: Colors.blue}]} 
              />
            </TouchableOpacity>
          )}

          {business?.email && (
            <TouchableOpacity 
              style={styles.contactOption}
              onPress={handleEmail}
            >
              <LinearGradient
                colors={['#FF7F50', '#FF6347']}
                style={styles.contactIconContainer}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Image 
                  source={require('@/assets/icons/email.png')} 
                  style={styles.contactIcon} 
                />
              </LinearGradient>
              <View style={styles.contactTextContainer}>
                <Text style={[styles.contactLabel, {color: isDark ? '#ccc' : '#666'}]}>
                  Email
                </Text>
                <Text style={[styles.contactValue, {color: isDark ? 'white' : 'black'}]}>
                  {business.email}
                </Text>
              </View>
              <Image 
                source={require('@/assets/icons/email.png')} 
                style={[styles.actionIcon, {tintColor: Colors.blue}]} 
              />
            </TouchableOpacity>
          )}

          {business?.website && (
            <TouchableOpacity 
              style={styles.contactOption}
              onPress={handleWebsite}
            >
              <LinearGradient
                colors={['#20B2AA', '#00CED1']}
                style={styles.contactIconContainer}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Image 
                  source={require('@/assets/icons/adding.png')} 
                  style={styles.contactIcon} 
                />
              </LinearGradient>
              <View style={styles.contactTextContainer}>
                <Text style={[styles.contactLabel, {color: isDark ? '#ccc' : '#666'}]}>
                  Website
                </Text>
                <Text 
                  style={[styles.contactValue, {color: isDark ? 'white' : 'black'}]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {business.website}
                </Text>
              </View>
              <Image 
                source={require('@/assets/icons/adding.png')} 
                style={[styles.actionIcon, {tintColor: Colors.blue}]} 
              />
            </TouchableOpacity>
          )}
        </View>

        {business?.address && (
          <>
            <View style={styles.divider} />
            
            <Text style={[styles.sectionTitle, {color: isDark ? 'white' : 'black'}]}>
              Location
            </Text>
            
            <View style={styles.addressContainer}>
              <Image 
                source={require('@/assets/icons/adding.png')} 
                style={[styles.locationIcon, {tintColor: isDark ? '#ccc' : '#666'}]} 
              />
              <Text style={[styles.addressText, {color: isDark ? '#ccc' : '#666'}]}>
                {business.address}
              </Text>
            </View>
            
            <TouchableOpacity 
              style={styles.directionsButton}
              onPress={() => {
                if (business.coordinates) {
                  const { latitude, longitude } = business.coordinates;
                  const url = Platform.select({
                    ios: `maps:0,0?q=${latitude},${longitude}`,
                    android: `geo:0,0?q=${latitude},${longitude}`
                  });
                  Linking.openURL(url);
                }
              }}
            >
              <Text style={styles.directionsButtonText}>Get Directions</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: Colors.blue,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  backButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  headerContainer: {
    alignItems: 'center',
    padding: 20,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 15,
  },
  businessName: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  categoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryIcon: {
    fontSize: 16,
    marginRight: 5,
  },
  categoryText: {
    fontSize: 14,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(150, 150, 150, 0.2)',
    marginVertical: 15,
    marginHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginHorizontal: 20,
    marginBottom: 15,
  },
  contactOptionsContainer: {
    marginHorizontal: 20,
  },
  contactOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  contactIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactIcon: {
    width: 20,
    height: 20,
    tintColor: 'white',
  },
  contactTextContainer: {
    flex: 1,
    marginLeft: 15,
  },
  contactLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  contactValue: {
    fontSize: 16,
  },
  actionIcon: {
    width: 24,
    height: 24,
  },
  addressContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 15,
  },
  locationIcon: {
    width: 20,
    height: 20,
    marginRight: 10,
  },
  addressText: {
    fontSize: 16,
    flex: 1,
    lineHeight: 22,
  },
  directionsButton: {
    backgroundColor: Colors.blue,
    marginHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 30,
  },
  directionsButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
}); 