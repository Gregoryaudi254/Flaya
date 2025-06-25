import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { useToast } from 'react-native-toast-notifications';
import { db, geoFirestore } from '@/constants/firebase';
import { collection, addDoc, serverTimestamp, GeoPoint } from 'firebase/firestore';
import * as ImagePicker from 'expo-image-picker';
import MapView, { Marker } from 'react-native-maps';

const { width } = Dimensions.get('window');

const CreateEventScreen = () => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const toast = useToast();
  const mapRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState({
    latitude: -1.2921,  // Nairobi coordinates as default
    longitude: 36.8219,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });

  const [formData, setFormData] = useState({
    name: '',
    subtitle: '',
    description: '',
    category: '',
    eventType: 'Public',
    price: '',
    startDate: '',
    startTime: '',
    endTime: '',
    poster: '',
    host: {
      name: '',
      profileImage: ''
    },
    location: {
      address: '',
      city: '',
      coordinates: null
    }
  });

  const categories = [
    'Parties', 'Sports', 'Education', 'Business', 'Entertainment', 
    'Arts', 'Technology', 'Food & Drink', 'Health', 'Music', 'Other'
  ];

  const eventTypes = ['Public', 'Private'];

  const showToast = (message) => {
    toast.show(message, {
      type: "normal",
      placement: "bottom",
      duration: 2000,
      offset: 30,
      animationType: "zoom-in",
    });
  };

  const updateFormData = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setFormData(prev => ({ ...prev, poster: result.assets[0].uri }));
    }
  };

  const pickHostImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setFormData(prev => ({ 
        ...prev, 
        host: { ...prev.host, profileImage: result.assets[0].uri }
      }));
    }
  };

  const onMapPress = (event) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setSelectedLocation(prev => ({
      ...prev,
      latitude,
      longitude
    }));
    
    updateFormData('location.coordinates', { latitude, longitude });
  };

  const validateForm = () => {
    const required = ['name', 'description', 'category', 'startDate', 'startTime', 'endTime'];
    
    for (let field of required) {
      if (!formData[field] || formData[field].trim() === '') {
        showToast(`${field.charAt(0).toUpperCase() + field.slice(1)} is required`);
        return false;
      }
    }

    if (!formData.location.address || !formData.location.city) {
      showToast('Location address and city are required');
      return false;
    }

    if (!formData.host.name || formData.host.name.trim() === '') {
      showToast('Host name is required');
      return false;
    }

    if (!formData.location.coordinates) {
      showToast('Please select a location on the map');
      return false;
    }

    return true;
  };

  const createEvent = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);

      // Prepare event data with GeoPoint
      const eventData = {
        name: formData.name.trim(),
        subtitle: formData.subtitle.trim(),
        description: formData.description.trim(),
        category: formData.category,
        eventType: formData.eventType,
        price: formData.price.trim() || 'Free',
        startDate: formData.startDate.trim(),
        startTime: formData.startTime.trim(),
        endTime: formData.endTime.trim(),
        coordinates: new GeoPoint(
          formData.location.coordinates.latitude,
          formData.location.coordinates.longitude
        ),
        poster: formData.poster || 'https://via.placeholder.com/400x300',
        host: {
          name: formData.host.name.trim(),
          profileImage: formData.host.profileImage || 'https://randomuser.me/api/portraits/men/32.jpg'
        },
        location: {
          address: formData.location.address.trim(),
          city: formData.location.city.trim(),
          coordinates: new GeoPoint(
            formData.location.coordinates.latitude,
            formData.location.coordinates.longitude
          )
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      // Add to Firestore using GeoFirestore
      const eventsCollection = collection(db, 'pendingevents')

      await addDoc(eventsCollection, eventData)

      showToast('Event created successfully!');
      router.back();
    } catch (error) {
      console.error('Error creating event:', error);
      showToast('Failed to create event');
    } finally {
      setLoading(false);
    }
  };

  const renderInput = (label, field, placeholder, multiline = false, keyboardType = 'default') => (
    <View style={styles.inputContainer}>
      <Text style={[styles.label, { color: isDark ? '#FFFFFF' : '#000000' }]}>
        {label}
      </Text>
      <TextInput
        style={[
          styles.input,
          multiline && styles.multilineInput,
          {
            backgroundColor: isDark ? '#2A2A2A' : '#F5F5F5',
            color: isDark ? '#FFFFFF' : '#000000',
            borderColor: isDark ? '#444444' : '#DDDDDD'
          }
        ]}
        value={field.includes('.') ? 
          formData[field.split('.')[0]][field.split('.')[1]] : 
          formData[field]
        }
        onChangeText={(value) => updateFormData(field, value)}
        placeholder={placeholder}
        placeholderTextColor={isDark ? '#888888' : '#999999'}
        multiline={multiline}
        numberOfLines={multiline ? 4 : 1}
        keyboardType={keyboardType}
      />
    </View>
  );

  const renderPicker = (label, field, options) => (
    <View style={styles.inputContainer}>
      <Text style={[styles.label, { color: isDark ? '#FFFFFF' : '#000000' }]}>
        {label}
      </Text>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.pickerContainer}
      >
        {options.map((option) => (
          <TouchableOpacity
            key={option}
            style={[
              styles.pickerOption,
              {
                backgroundColor: formData[field] === option 
                  ? Colors.blue 
                  : (isDark ? '#2A2A2A' : '#F5F5F5'),
                borderColor: isDark ? '#444444' : '#DDDDDD'
              }
            ]}
            onPress={() => updateFormData(field, option)}
          >
            <Text
              style={[
                styles.pickerOptionText,
                {
                  color: formData[field] === option 
                    ? '#FFFFFF' 
                    : (isDark ? '#FFFFFF' : '#000000')
                }
              ]}
            >
              {option}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#121212' : '#F5F5F5' }]}>
      <Stack.Screen
        options={{
          headerTitle: "Create Event",
          headerTitleStyle: { color: isDark ? '#FFFFFF' : '#000000' },
          headerStyle: { backgroundColor: isDark ? '#121212' : '#F5F5F5' },
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color={isDark ? '#FFFFFF' : '#000000'} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Basic Information */}
        <View style={[styles.section, { backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF' }]}>
          <Text style={[styles.sectionTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
            Basic Information
          </Text>
          
          {renderInput('Event Name *', 'name', 'Enter event name')}
          {renderInput('Subtitle', 'subtitle', 'Enter event subtitle')}
          {renderInput('Description *', 'description', 'Enter event description', true)}
        </View>

        {/* Event Details */}
        <View style={[styles.section, { backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF' }]}>
          <Text style={[styles.sectionTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
            Event Details
          </Text>
          
          {renderPicker('Category *', 'category', categories)}
          {renderPicker('Event Type', 'eventType', eventTypes)}
          {renderInput('Price', 'price', 'Enter price (e.g., 300 KES or Free)')}
        </View>

        {/* Date & Time */}
        <View style={[styles.section, { backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF' }]}>
          <Text style={[styles.sectionTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
            Date & Time
          </Text>
          
          {renderInput('Start Date *', 'startDate', 'Friday, Apr 04 March 29th')}
          {renderInput('Start Time *', 'startTime', '5.00pm')}
          {renderInput('End Time *', 'endTime', '12.00am')}
        </View>

        {/* Media Section */}
        <View style={[styles.section, { backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF' }]}>
          <Text style={[styles.sectionTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
            📷 Media
          </Text>
          
          <TouchableOpacity 
            style={[styles.imagePicker, { borderColor: isDark ? '#444444' : '#DDDDDD' }]}
            onPress={pickImage}
          >
            {formData.poster ? (
              <Image source={{ uri: formData.poster }} style={styles.imagePreview} />
            ) : (
              <View style={styles.imagePickerContent}>
                <Text style={[styles.imagePickerText, { color: isDark ? '#888888' : '#CCCCCC' }]}>
                  📷 Add Event Poster
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Host Section */}
        <View style={[styles.section, { backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF' }]}>
          <Text style={[styles.sectionTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
            👤 Event Organizer
          </Text>
          
          <TextInput
            style={[styles.input, { backgroundColor: isDark ? '#2A2A2A' : '#F5F5F5', color: isDark ? '#FFFFFF' : '#000000', borderColor: isDark ? '#444444' : '#DDDDDD' }]}
            placeholder="Host Name *"
            placeholderTextColor={isDark ? '#888888' : '#999999'}
            value={formData.host.name}
            onChangeText={(text) => setFormData(prev => ({ 
              ...prev, 
              host: { ...prev.host, name: text }
            }))}
          />
          
          <TouchableOpacity 
            style={[styles.imagePicker, { borderColor: isDark ? '#444444' : '#DDDDDD', height: 80 }]}
            onPress={pickHostImage}
          >
            {formData.host.profileImage ? (
              <Image source={{ uri: formData.host.profileImage }} style={[styles.imagePreview, { borderRadius: 40 }]} />
            ) : (
              <View style={styles.imagePickerContent}>
                <Text style={[styles.imagePickerText, { color: isDark ? '#888888' : '#CCCCCC' }]}>
                  📷 Host Profile Picture
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Location */}
        <View style={[styles.section, { backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF' }]}>
          <Text style={[styles.sectionTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
            Location
          </Text>
          
          {renderInput('Address *', 'location.address', 'Enter full address')}
          {renderInput('City *', 'location.city', 'Enter city')}
          
          <Text style={[styles.label, { color: isDark ? '#FFFFFF' : '#000000' }]}>
            Select Location on Map *
          </Text>
          <View style={styles.mapContainer}>
            <MapView
              ref={mapRef}
              style={styles.map}
              initialRegion={selectedLocation}
              onPress={onMapPress}
              provider="google"
            >
              {formData.location.coordinates && (
                <Marker
                  coordinate={formData.location.coordinates}
                  title="Event Location"
                />
              )}
            </MapView>
          </View>
        </View>

        {/* Create Button */}
        <TouchableOpacity
          style={[styles.createButton, { backgroundColor: Colors.blue }]}
          onPress={createEvent}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="add-circle-outline" size={24} color="#FFFFFF" />
              <Text style={styles.createButtonText}>Create Event</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 15,
    paddingBottom: 30,
  },
  section: {
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  inputContainer: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  multilineInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    flexDirection: 'row',
  },
  pickerOption: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 10,
  },
  pickerOptionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  mapContainer: {
    height: 200,
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 5,
  },
  map: {
    flex: 1,
  },
  imagePicker: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#CCCCCC',
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    height: 150,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  imagePickerContent: {
    alignItems: 'center',
  },
  imagePickerText: {
    marginTop: 10,
    fontSize: 14,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 12,
    marginTop: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default CreateEventScreen; 