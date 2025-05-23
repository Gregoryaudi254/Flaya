import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import EventDetails from '@/components/EventDetails';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { getData } from '@/constants/localstorage';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/constants/firebase';
import EventCheckInSheet from '@/components/EventCheckInSheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

const EventDetailsPage = () => {
  const params = useLocalSearchParams();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [eventData, setEventData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadEvent = async () => {
      try {
        setLoading(true);
        
        // First check if event data was passed directly via params
        if (params.data) {
          const decodedData = JSON.parse(decodeURIComponent(params.data));
          setEventData(decodedData);
          setLoading(false);
          return;
        }
        
        // If not, fetch the event from Firestore using the ID
        if (params.id) {
          const eventRef = doc(db, 'events', params.id);
          const eventDoc = await getDoc(eventRef);
          
          if (eventDoc.exists()) {
            setEventData({ id: eventDoc.id, ...eventDoc.data() });
          } else {
            console.log('Event not found');
            // Here you could navigate back or show an error message
          }
        }
      } catch (error) {
        console.error('Error loading event:', error);
      } finally {
        setLoading(false);
      }
    };

    loadEvent();
  }, []);


  const [invitationStatus, setInvitationStatus] = useState("");

  const checkInSheetRef = useRef(null);
 
  return (
    <GestureHandlerRootView>

<SafeAreaView style={[
      styles.container, 
      {backgroundColor: isDark ? Colors.dark_background : Colors.light_background}
    ]}>
      <Stack.Screen 
        options={{
          headerShown: true,
          headerTransparent: true,
          headerTitle: "",
          headerLeft: () => (
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
          ),
        }}
      />
      
      <StatusBar style="light" />
      
      {eventData && <EventDetails checkInSheetRef={checkInSheetRef} invitationStatus={invitationStatus} setInvitationStatus={setInvitationStatus} event={eventData} />}


      {eventData && <EventCheckInSheet
        ref={checkInSheetRef}
        eventId={eventData.id}
        eventType={eventData.eventType}
        onCheckInComplete={(status) => {
          setInvitationStatus(status);
        }}
      />}


    </SafeAreaView>

    </GestureHandlerRootView>
    
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
});

export default EventDetailsPage; 