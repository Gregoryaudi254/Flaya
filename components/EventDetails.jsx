import React, { useEffect, useState, useRef } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

import { useRouter } from 'expo-router';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { getData } from '@/constants/localstorage';

import { db } from '@/constants/firebase';

import { doc, setDoc, collection, serverTimestamp , getDoc} from "firebase/firestore";
import EventCheckInSheet from './EventCheckInSheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

const { width } = Dimensions.get('window');
import { useToast } from 'react-native-toast-notifications';

const EventDetails = ({ event , setInvitationStatus, invitationStatus, checkInSheetRef}) => {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const isDark = colorScheme === 'dark';

  const toast = useToast();

  const [isLoading, setLoading] = useState(true);
  

  const checkAndAddUserToEvent = async (eventId) => {

    try {
      // Step 1: Get user info
      const userinfo = await getData("@profile_info");
  
      if (!userinfo) {
        console.log("User info not found.");
        setLoading(false)
        setInvitationStatus("Get Invitation")
        return;
      }

      setLoading(true);
  
      // Step 2: Reference the event document
      const eventRef = doc(db, "events", eventId);
      //console.log(eventId)
  
      // Step 3: Reference the user document in the "users" subcollection
      const userDocRef = doc(eventRef, "users", userinfo.uid);
  
      // Step 4: Check if the user document exists
      const userDoc = await getDoc(userDocRef);
  
      if (userDoc.exists()) {
        console.log("User already exists in the event.");

        if (userDoc.data().invited === true) {
            setInvitationStatus("Invitation Accepted")
            console.log("Accepted")
        }else {
            setInvitationStatus("Pending")
        }

      } else {
        setInvitationStatus("Get Invitation")
  
        console.log("User added to the event successfully!");
      }

      setLoading(false);
    } catch (error) {
      console.error("Error checking or adding user to event:", error);
    }
  };
  

  useEffect(() =>{
   checkAndAddUserToEvent(event.id);
  },[event])
  
  const showToast = (message) => {
    toast.show(message, {
      type: "normal",
      placement: "bottom",
      duration: 2000,
      offset: 30,
      animationType: "zoom-in",
    });
  };
  
  const handleGetDirection = async () => {

    if (!invitationStatus) return;

    if (event.eventType === "Private" && invitationStatus !== "Invitation Accepted") {
      showToast("You have to get an invitation first")
      return;
    }
    //
    // Implement navigation to maps
    if (event.location?.coordinates) {
      // Open maps with coordinates
      
      const latitude = event.location.coordinates._latitude;
      const longitude = event.location.coordinates._longitude;

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
          Alert.alert('Error', 'Google Maps is not installed on this device.');
        }
      } catch (error) {
        console.error('Error opening Google Maps:', error);
        Alert.alert('Error', 'Unable to open Google Maps.');
      }
    }
  };
  
  const handleCheckIn = () => {
    if (isLoading || invitationStatus === "Pending" || invitationStatus === "Invitation Accepted") return;
    checkInSheetRef.current?.snapToIndex(0);
  };

  return (
    <GestureHandlerRootView>
      <ScrollView 
      style={[
        styles.container, 
        {backgroundColor: isDark ? Colors.dark_background : Colors.light_background}
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header with Image and Title */}
      <View style={styles.headerContainer}>
        <Image 
          source={{ uri: event.poster }} 
          style={styles.headerImage}
          resizeMode="cover"
        />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)', 'rgba(0, 0, 0, 0.9)']}
          style={styles.headerGradient}
        >
          <View style={styles.headerContent}>
            <Text style={styles.title}>{event.name || "Title"}</Text>
            <Text style={styles.subtitle}>{event.subtitle || "Fun as Always"}</Text>
          </View>
        </LinearGradient>
        
        {/* Date circle overlay */}

      </View>
      
      {/* Date and Time Section */}

      <View style={{flexDirection:'row', alignItems:'center',marginStart:10}}>

        <View style={[styles.dateCircle, {backgroundColor: isDark ? '#2A2A2A' : '#FFFFFF'}]}>
            <View style={styles.dateMonthContainer}>
              <Text style={styles.dateMonth}>{event.dateMonth || 'Sep'}</Text>
            </View>
            <Text style={[styles.dateDay, {color: isDark ? 'white' : "black"}]}>{event.dateDay || '24'}</Text>
        </View>


            <View style={[styles.section, styles.dateTimeSection]}>
        <View style={styles.dateContainer}>
        
          <Text style={styles.sectionText}>
            {event.startDate || 'Sunday, September 2024'}
          </Text>
        </View>
        
        <View style={styles.timeContainer}>
          <Ionicons name="time-outline" size={18} color="#777" />
          <Text style={styles.timeText}>
            {event.startTime + " - " +event.endTime || '7:30am - 9:00am'}
          </Text>
        </View>
      </View>

      </View>

      {/* About Event Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, {color: isDark ? Colors.light_main : Colors.dark_main}]}>
          About Event
        </Text>
        <Text style={[styles.aboutText, {color: isDark ? '#CCC' : '#555'}]}>
          {event.description || 
           "Unlock Your Potential On The Court With Our Basketball Offline Class At Sritex! Designed For Players Of All Skill Levels, This Hands-On Class Will Help You Sharpen Your Fundamentals, Enhance Your Game Strategy, And Build Teamwork Skills In A Fun, Supportive Environment. Whether You're A Beginner Looking To Learn The Basics Or An Advanced Player Aiming To Elevate Your Performance, Our Experienced Coaches Will Guide You Through Drills, Exercises, And Live Games. Join Us And Become The Best Version Of Your Athletic Self!"
          }
        </Text>
      </View>
      
      
      {/* Location Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, {color: isDark ? Colors.light_main : Colors.dark_main}]}>
          Location
        </Text>
        <View style={styles.locationCard}>
          <View style={styles.locationHeader}>
            <View style={[styles.locationIconContainer, {backgroundColor: Colors.blue}]}>
              <Ionicons name="location-outline" size={20} color="#fff" />
            </View>
            <View style={styles.locationTextContainer}>
              <Text style={[styles.locationText, {color: isDark ? Colors.light_main : Colors.dark_main}]}>
                {event.location?.address || '4517 Washington Ave.'}
              </Text>
              <Text style={[styles.locationSubtext, {color: isDark ? '#CCC' : '#666'}]}>
                {event.location?.city || 'Manchester Lorem Ipsum'}
              </Text>
            </View>
          </View>
          
          <TouchableOpacity 
            style={styles.directionButton}
            onPress={handleGetDirection}
          >
            <Ionicons name="navigate-outline" size={16} color="white" style={{marginRight: 5}} />
            <Text style={styles.directionButtonText}>Get Direction</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Host Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, {color: isDark ? Colors.light_main : Colors.dark_main}]}>
          Hosted By
        </Text>
        <View style={styles.hostContainer}>
          <View style={styles.hostInfo}>
            <Image 
              source={{ uri: event.host?.profileImage || 'https://randomuser.me/api/portraits/men/32.jpg' }} 
              style={styles.hostImage} 
            />
            <View style={styles.hostDetails}>
              <Text style={[styles.hostName, {color: isDark ? Colors.light_main : Colors.dark_main}]}>
                {event.host?.name || 'Mike Wazowski'}
              </Text>
              <Text style={[styles.hostTitle, {color: isDark ? '#CCC' : '#666'}]}>
                Event Organizer
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.messageHostButton}>
            <Ionicons name="chatbubble-outline" size={18} color={Colors.blue} />
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Attendees Section */}

      {
        event.attendees?.length > 0 &&
        <View style={styles.section}>
          <View style={styles.attendeesHeader}>
            <Text style={[styles.sectionLabel, {color: isDark ? Colors.light_main : Colors.dark_main}]}>
              People Going ({event.attendeesnumber || event.attendees?.length || 24} People)
            </Text>
            {event.attendees?.length > 118 && (
              <TouchableOpacity style={styles.viewAllButton}>
                <Text style={styles.viewAllText}>View All</Text>
                <Ionicons name="chevron-forward" size={16} color={Colors.blue} />
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.attendeesContainer}>
            {event.attendees?.slice(0, 4).map((attendee, index) => (
              <Image 
                key={attendee.id || index}
                source={{ uri: attendee.profileImage }}
                style={[styles.attendeeImage, { marginLeft: index > 0 ? -15 : 0 }]} 
              />
            )) || 
            // Fallback if no attendees
            [1, 2, 3, 4].map((item, index) => (
              <Image 
                key={item}
                source={{ uri: `https://randomuser.me/api/portraits/${index % 2 === 0 ? 'men' : 'women'}/${20 + index}.jpg` }}
                style={[styles.attendeeImage, { marginLeft: index > 0 ? -15 : 0 }]} 
              />
            ))}
            {event.attendees?.length > 4 && (
              <View style={[styles.moreAttendeesCircle, { marginLeft: -15 }]}>
                <Text style={styles.moreAttendeesText}>+{event.attendees.length - 4}</Text>
              </View>
            )}
          </View>
        </View>
      }
      
      
      {/* Check In Button */}
      <View style={styles.checkInContainer}>

        <View style={[styles.priceContainer, {borderColor: isDark ? Colors.light_main : Colors.dark_main}]}>
          <View style={styles.priceHeader}>
            <Ionicons name="pricetag-outline" size={16} color={Colors.blue} />
            <Text style={[styles.priceLabel, {color: isDark ? '#CCC' : '#666'}]}>Price</Text>
          </View>
          <Text style={[styles.priceText, {color: isDark ? Colors.light_main : Colors.dark_main}]}>
            {event.price === "Free" || event.price === "0" ? "FREE" : `KSH ${event.price}`}
          </Text>
          {event.price !== "Free" && event.price !== "0" && (
            <Text style={[styles.priceSubtext, {color: isDark ? '#999' : '#888'}]}>per person</Text>
          )}
        </View>

        <TouchableOpacity 
          style={[
            styles.checkInButton, 
            
            invitationStatus === "Pending" ? styles.pendingButton : invitationStatus === "Invitation Accepted" ? {backgroundColor:"green"} :  {}
          ]} 
          onPress={handleCheckIn}
          disabled={invitationStatus === "Pending" || invitationStatus === "Invitation Accepted"}
        >
          <View style={styles.checkInButtonContent}>
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons 
                  name={invitationStatus === "Pending" ? "checkmark-circle" : "location-outline"} 
                  size={22} 
                  color="#FFFFFF" 
                  style={styles.checkInIcon} 
                />
                <Text style={styles.checkInButtonText}>
                  {invitationStatus === "Pending" ? "Invitation sent" : invitationStatus === "Get Invitation" ? "Get Invitation" : "Invited"}
                </Text>
              </>
            )}
          </View>
        </TouchableOpacity>
      </View>

     
    </ScrollView>
  
      
    </GestureHandlerRootView>
    
)};

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
    height: '60%',
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
  },
  subtitle: {
    fontSize: 16,
    color: 'white',
    opacity: 0.9,
  },
  dateCircle: {
    borderRadius: 12,
    width: 70,
    height: 70,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(128, 0, 128, 0.2)',
  },
  dateMonthContainer: {
    backgroundColor: '#800080',
    width: '101%',
    alignItems: 'center',
    borderTopRightRadius: 10,
    borderTopLeftRadius: 10,
    marginEnd: -1,
    marginStart: -1,
  },
  dateMonth: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#666',
  },
  dateDay: {
    fontSize: 22,
    marginTop:5,
    fontWeight: 'bold',
    
  },
  section: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  dateTimeSection: {
    flexDirection: 'column',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  dateNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    marginRight: 15,
    width: 35,
    textAlign: 'center',
  },
  sectionText: {
    fontSize: 16,
    color: '#666',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
   
  },
  timeText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 5,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  locationIconContainer: {
    width: 35,
    height: 35,
    borderRadius: 18,
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
  },
  directionButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 8,
    flexDirection: 'row',
    paddingHorizontal: 15,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginLeft: 50,
  },
  directionButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  hostContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(200,200,200,0.1)',
    padding: 12,
    borderRadius: 12,
  },
  hostInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hostImage: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 8,
  },
  hostDetails: {
    flexDirection: 'column',
  },
  hostName: {
    fontSize: 14,
    fontWeight: '500',
    marginRight: 5,
  },
  hostTitle: {
    fontSize: 12,
    color: '#666',
  },
  messageHostButton: {
    padding: 5,
  },
  attendeesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  attendeeImage: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    borderWidth: 2,
    borderColor: 'white',
  },
  aboutText: {
    fontSize: 14,
    lineHeight: 20,
  },
  checkInContainer: {
    padding: 20,
    flexDirection:'row',
    alignContent:'space-between',
    justifyContent:'space-evenly',
    alignItems: 'center',
  },
  checkInButton: {
    backgroundColor: Colors.blue,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    width: "60%",
    marginStart: 15,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  checkInIcon: {
    marginRight: 8,
  },
  checkInText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  pendingButton: {
    backgroundColor: '#FF6347',
  },
  checkInButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkInButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  priceContainer: {
    borderWidth: 1,
    borderColor: Colors.light_main,
    padding: 10,
    borderRadius: 10,
    marginRight: 10,
  },
  priceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  priceLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 5,
  },
  priceText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  priceSubtext: {
    fontSize: 12,
    color: '#666',
  },
  attendeesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllText: {
    color: Colors.blue,
    fontSize: 14,
    fontWeight: '600',
  },
  moreAttendeesCircle: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    backgroundColor: Colors.blue,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  moreAttendeesText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  locationCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
});

export default EventDetails; 