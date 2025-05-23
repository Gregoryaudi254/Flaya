import React, { useState, useEffect, useRef, forwardRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Keyboard
} from 'react-native';
import BottomSheet from '@gorhom/bottom-sheet';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { getData } from '@/constants/localstorage';
import { db } from '@/constants/firebase';
import { doc, collection, setDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from 'react-native-toast-notifications';
import DropDownPicker from 'react-native-dropdown-picker';

const EventCheckInSheet = forwardRef(({ eventId, onCheckInComplete, eventType }, ref) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const toast = useToast();
  const snapPoints = ['60%'];
  
  // Form state
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  
  // Gender dropdown state
  const [open, setOpen] = useState(false);
  const [gender, setGender] = useState(null);
  const [items, setItems] = useState([
    { label: 'Male', value: 'male' },
    { label: 'Female', value: 'female' },
  ]);
  
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
    
    if (!gender) {
      showToast("Please select your gender");
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Get user info
      const userinfo = await getData("@profile_info");
    
      if (!userinfo) {
        console.error("User info not found.");
        showToast("User information not found");
        setIsLoading(false);
        return;
      }
      
      // Reference the event document
      const eventRef = doc(db, "events", eventId);
      
      // Reference the "users" subcollection inside the event document
      const usersCollectionRef = collection(eventRef, "users");
      
      // Add or update the user info in the "users" subcollection
      await setDoc(doc(usersCollectionRef, userinfo.uid), {
        ...userinfo,
        phoneNumber: phoneNumber,
        gender: gender,
        invited: eventType === "Public" ? true : false,
        timestamp: serverTimestamp(),
      });
      
      showToast("Check-in successful!");
      
      // Reset form
      setPhoneNumber('');
      setGender(null);
      
      // Close bottom sheet
      ref.current?.close();
      
      // Call the completion callback
      if (onCheckInComplete) {

        onCheckInComplete(eventType === "Public" ? "Invitation Accepted" : "Pending");
      }
    } catch (error) {
      console.error("Error during check-in:", error);
      showToast("Check-in failed. Please try again.");
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
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.contentContainer}
        keyboardVerticalOffset={80}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: isDark ? '#FFFFFF' : '#000000' }]}>
            Event Check-In
          </Text>
          <Text style={styles.subtitle}>
            Please provide the following information to get an invite
          </Text>
        </View>
        
        <View style={styles.form}>
          <Text style={[styles.label, { color: isDark ? '#FFFFFF' : '#000000' }]}>
            Phone Number
          </Text>
          
          <TextInput 
            style={[
              styles.input,
              { 
                color: isDark ? '#FFFFFF' : '#000000',
                backgroundColor: isDark ? '#333333' : '#F5F5F5',
                borderColor: isDark ? 'gray' : '#DDDDDD'
              }
            ]}
            placeholder="Enter your phone number"
            placeholderTextColor="#999999"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
          />
          
          <Text style={[styles.label, { color: isDark ? '#FFFFFF' : '#000000', marginTop: 20 }]}>
            Gender
          </Text>
          
          <DropDownPicker
            open={open}
            value={gender}
            items={items}
              dropDownDirection='BOTTOM'
            setOpen={setOpen}
            setValue={setGender}
            setItems={setItems}
            placeholder="Select your gender"
            style={{
              backgroundColor: isDark ? '#333333' : '#F5F5F5',
              borderColor: isDark ? 'gray' : '#DDDDDD',
              marginTop: 5,
            }}
            textStyle={{
              color: isDark ? '#FFFFFF' : '#000000',
              fontSize: 16,
            }}
            dropDownContainerStyle={{
              backgroundColor: isDark ? '#333333' : '#F5F5F5',
              borderColor: isDark ? 'gray' : '#DDDDDD',
            }}
            theme={isDark ? "DARK" : "LIGHT"}
            zIndex={3000}
            zIndexInverse={1000}
          />
          
          <TouchableOpacity
            style={[
              styles.submitButton, 
              isLoading && styles.disabledButton,
              { marginTop: open ? 100 : 30 } // Add extra margin when dropdown is open
            ]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>Get Invite</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </BottomSheet>
  );
});

const styles = StyleSheet.create({
  contentContainer: {
    flex: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 25,
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
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
  },
  submitButton: {
    backgroundColor: Colors.blue,
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 30,
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

export default EventCheckInSheet; 