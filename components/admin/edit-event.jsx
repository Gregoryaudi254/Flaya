import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@react-navigation/native';
import { doc, updateDoc, deleteDoc, getDoc, GeoPoint } from 'firebase/firestore';

import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import MapView, { Marker } from 'react-native-maps';

import { db } from '@/constants/firebase';
import { useToast } from 'react-native-toast-notifications';

export default function EditEvent() {
  const theme = useTheme();
  const router = useRouter();
  const { eventId } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const toast = useToast();

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
    'Parties', 'Sports', 'Education', 'Business', 'Music',
    'Food & Drink', 'Health', 'Tech', 'Art', 'Fashion'
  ];

  const eventTypes = ['Public', 'Private'];

  useEffect(() => {
    loadEventData();
  }, []);

  const loadEventData = async () => {
    try {
      const eventDoc = await getDoc(doc(db, 'events', eventId));
      if (eventDoc.exists()) {
        const data = eventDoc.data();
        setFormData({
          name: data.name || '',
          subtitle: data.subtitle || '',
          description: data.description || '',
          category: data.category || '',
          eventType: data.eventType || 'Public',
          price: data.price || '',
          startDate: data.startDate || '',
          startTime: data.startTime || '',
          endTime: data.endTime || '',
          poster: data.poster || '',
          host: {
            name: data.host?.name || '',
            profileImage: data.host?.profileImage || ''
          },
          location: {
            address: data.location?.address || '',
            city: data.location?.city || '',
            coordinates: data.location?.coordinates || null
          }
        });
      } else {
        showToast('Event not found');
        router.back();
      }
    } catch (error) {
      console.error('Error loading event:', error);
      showToast('Failed to load event data');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type = 'error') => {
    toast.show(message, {
        type: "normal",
        placement: "bottom",
        duration: 2000,
        offset: 30,
        animationType: "zoom-in",
      });
  };

  const validateForm = () => {
    if (!formData.name || formData.name.trim() === '') {
      showToast('Event name is required');
      return false;
    }

    if (!formData.description || formData.description.trim() === '') {
      showToast('Event description is required');
      return false;
    }

    if (!formData.category) {
      showToast('Please select a category');
      return false;
    }

    if (!formData.startDate || !formData.startTime || !formData.endTime) {
      showToast('Please fill in all date and time fields');
      return false;
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

  const handleUpdateEvent = async () => {
    if (!validateForm()) return;

    setUpdating(true);
    try {
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
        updatedAt: new Date()
      };

      await updateDoc(doc(db, 'events', eventId), eventData);
      showToast('Event updated successfully!', 'success');
      router.back();
    } catch (error) {
      console.error('Error updating event:', error);
      showToast('Failed to update event');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteEvent = () => {
    Alert.alert(
      'Delete Event',
      'Are you sure you want to delete this event? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: confirmDelete }
      ]
    );
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await deleteDoc(doc(db, 'events', eventId));
      showToast('Event deleted successfully!', 'success');
      router.back();
    } catch (error) {
      console.error('Error deleting event:', error);
      showToast('Failed to delete event');
    } finally {
      setDeleting(false);
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

  const handleMapPress = (event) => {
    const { coordinate } = event.nativeEvent;
    setFormData(prev => ({
      ...prev,
      location: {
        ...prev.location,
        coordinates: coordinate
      }
    }));
  };

  const isDark = theme.dark;

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: theme.colors.text }}>Loading event...</Text>
        </View>
      </SafeAreaView>
    );
  }

 


  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Edit Event
        </Text>
        <TouchableOpacity onPress={handleDeleteEvent} disabled={deleting}>
          <Ionicons 
            name="trash-outline" 
            size={24} 
            color={deleting ? theme.colors.text + '50' : '#FF4444'} 
          />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Basic Information */}
        <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            📝 Basic Information
          </Text>
          
          <TextInput
            style={[styles.input, { backgroundColor: theme.colors.background, color: theme.colors.text, borderColor: theme.colors.border }]}
            placeholder="Event Name *"
            placeholderTextColor={theme.colors.text + '80'}
            value={formData.name}
            onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
          />
          
          <TextInput
            style={[styles.input, { backgroundColor: theme.colors.background, color: theme.colors.text, borderColor: theme.colors.border }]}
            placeholder="Subtitle"
            placeholderTextColor={theme.colors.text + '80'}
            value={formData.subtitle}
            onChangeText={(text) => setFormData(prev => ({ ...prev, subtitle: text }))}
          />
          
          <TextInput
            style={[styles.textArea, { backgroundColor: theme.colors.background, color: theme.colors.text, borderColor: theme.colors.border }]}
            placeholder="Event Description *"
            placeholderTextColor={theme.colors.text + '80'}
            value={formData.description}
            onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Event Details */}
        <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            🎯 Event Details
          </Text>
          
          <Text style={[styles.label, { color: theme.colors.text }]}>Category *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryContainer}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryButton,
                  { 
                    backgroundColor: formData.category === cat ? '#007AFF' : theme.colors.background,
                    borderColor: theme.colors.border
                  }
                ]}
                onPress={() => setFormData(prev => ({ ...prev, category: cat }))}
              >
                <Text style={[
                  styles.categoryText,
                  { color: formData.category === cat ? '#FFFFFF' : theme.colors.text }
                ]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={[styles.label, { color: theme.colors.text }]}>Event Type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryContainer}>
            {eventTypes.map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.categoryButton,
                  { 
                    backgroundColor: formData.eventType === type ? '#007AFF' : theme.colors.background,
                    borderColor: theme.colors.border
                  }
                ]}
                onPress={() => setFormData(prev => ({ ...prev, eventType: type }))}
              >
                <Text style={[
                  styles.categoryText,
                  { color: formData.eventType === type ? '#FFFFFF' : theme.colors.text }
                ]}>
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TextInput
            style={[styles.input, { backgroundColor: theme.colors.background, color: theme.colors.text, borderColor: theme.colors.border }]}
            placeholder="Price (e.g., 300 KES or Free)"
            placeholderTextColor={theme.colors.text + '80'}
            value={formData.price}
            onChangeText={(text) => setFormData(prev => ({ ...prev, price: text }))}
          />
        </View>

        {/* Date & Time */}
        <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            📅 Date & Time
          </Text>
          
          <TextInput
            style={[styles.input, { backgroundColor: theme.colors.background, color: theme.colors.text, borderColor: theme.colors.border }]}
            placeholder="Start Date * (e.g., Friday, Apr 04 March 29th)"
            placeholderTextColor={theme.colors.text + '80'}
            value={formData.startDate}
            onChangeText={(text) => setFormData(prev => ({ ...prev, startDate: text }))}
          />
          
          <View style={styles.timeRow}>
            <TextInput
              style={[styles.timeInput, { backgroundColor: theme.colors.background, color: theme.colors.text, borderColor: theme.colors.border }]}
              placeholder="Start Time *"
              placeholderTextColor={theme.colors.text + '80'}
              value={formData.startTime}
              onChangeText={(text) => setFormData(prev => ({ ...prev, startTime: text }))}
            />
            <TextInput
              style={[styles.timeInput, { backgroundColor: theme.colors.background, color: theme.colors.text, borderColor: theme.colors.border }]}
              placeholder="End Time *"
              placeholderTextColor={theme.colors.text + '80'}
              value={formData.endTime}
              onChangeText={(text) => setFormData(prev => ({ ...prev, endTime: text }))}
            />
          </View>
        </View>

        {/* Media Section */}
        <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            📷 Media
          </Text>
          
          <TouchableOpacity 
            style={[styles.imagePicker, { borderColor: theme.colors.border }]}
            onPress={pickImage}
          >
            {formData.poster ? (
              <Image source={{ uri: formData.poster }} style={styles.imagePreview} />
            ) : (
              <View style={styles.imagePickerContent}>
                <Text style={[styles.imagePickerText, { color: theme.colors.text }]}>
                  📷 Add Event Poster
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Host Section */}
        <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            👤 Event Organizer
          </Text>
          
          <TextInput
            style={[styles.input, { backgroundColor: theme.colors.background, color: theme.colors.text, borderColor: theme.colors.border }]}
            placeholder="Host Name *"
            placeholderTextColor={theme.colors.text + '80'}
            value={formData.host.name}
            onChangeText={(text) => setFormData(prev => ({ 
              ...prev, 
              host: { ...prev.host, name: text }
            }))}
          />
          
          <TouchableOpacity 
            style={[styles.imagePicker, { borderColor: theme.colors.border, height: 80 }]}
            onPress={pickHostImage}
          >
            {formData.host.profileImage ? (
              <Image source={{ uri: formData.host.profileImage }} style={[styles.imagePreview, { borderRadius: 40 }]} />
            ) : (
              <View style={styles.imagePickerContent}>
                <Text style={[styles.imagePickerText, { color: theme.colors.text }]}>
                  📷 Host Profile Picture
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Location */}
        <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            📍 Location
          </Text>
          
          <TextInput
            style={[styles.input, { backgroundColor: theme.colors.background, color: theme.colors.text, borderColor: theme.colors.border }]}
            placeholder="Address *"
            placeholderTextColor={theme.colors.text + '80'}
            value={formData.location.address}
            onChangeText={(text) => setFormData(prev => ({ 
              ...prev, 
              location: { ...prev.location, address: text }
            }))}
          />
          
          <TextInput
            style={[styles.input, { backgroundColor: theme.colors.background, color: theme.colors.text, borderColor: theme.colors.border }]}
            placeholder="City *"
            placeholderTextColor={theme.colors.text + '80'}
            value={formData.location.city}
            onChangeText={(text) => setFormData(prev => ({ 
              ...prev, 
              location: { ...prev.location, city: text }
            }))}
          />
          
          <Text style={[styles.mapLabel, { color: theme.colors.text }]}>
            Tap on map to select exact location *
          </Text>
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: formData.location.coordinates?.latitude || -1.2921,
              longitude: formData.location.coordinates?.longitude || 36.8219,
              latitudeDelta: 0.0922,
              longitudeDelta: 0.0421,
            }}
            onPress={handleMapPress}
          >
            {formData.location.coordinates && (
              <Marker
                key={`${formData.location.coordinates.latitude}-${formData.location.coordinates.longitude}`}
                coordinate={{
                  latitude: formData.location.coordinates.latitude,
                  longitude: formData.location.coordinates.longitude,
                  latitudeDelta: 0.0922,
                  longitudeDelta: 0.0421,
                }}
                title="Event Location"
                description={formData.location.address}
              />
            )}
          </MapView>
        </View>

        {/* Update Button */}
        <TouchableOpacity
          style={[styles.updateButton, { opacity: updating ? 0.5 : 1 }]}
          onPress={handleUpdateEvent}
          disabled={updating}
        >
          <Text style={styles.updateButtonText}>
            {updating ? 'Updating Event...' : 'Update Event'}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = {
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  container: {
    flex: 1,
    padding: 20,
  },
  section: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
    height: 100,
    textAlignVertical: 'top',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  categoryContainer: {
    marginBottom: 15,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 10,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '500',
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  timeInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  imagePicker: {
    borderWidth: 2,
    borderStyle: 'dashed',
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
  mapLabel: {
    fontSize: 14,
    marginBottom: 10,
    fontStyle: 'italic',
  },
  map: {
    height: 200,
    borderRadius: 8,
  },
  updateButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    marginBottom: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  updateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
}; 