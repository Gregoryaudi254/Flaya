import { StyleSheet, Text, View, TextInput, TouchableOpacity, Image, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native'
import React, { useCallback, useState, useRef, useEffect } from 'react'
import { debounce } from 'lodash';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { db } from '@/constants/firebase';
import { collection, query, where, getDocs, setDoc, doc, updateDoc, getDoc } from 'firebase/firestore';

import { useToast } from 'react-native-toast-notifications';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getBlob } from 'expo-file-system';
import { useAuth } from '@/constants/AuthContext';
import { useRouter } from 'expo-router';
import CustomDialog from '@/components/CustomDialog';
import { storeData, getData } from '@/constants/localstorage';
import { useColorScheme } from '@/hooks/useColorScheme';
import { defaultProfileImage } from '@/constants/common';

const profileInfo = () => {
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark';
  
  const [usernameloading, setUsernameLoading] = useState(false);
  const [isAvailable, setIsAvailable] = useState(null);
  const [imageSource, setImageSource] = useState(null)
  const [username, setUsername] = useState('')
  const [referal, setReferal] = useState('')
  const latestValue = useRef(username);
  const [loading, setloading] = useState(false);
  const { user } = useAuth();
  const [ispromotion, setpromotion] = useState(false);

  useEffect(() => {
    const getPromostionStatus = async () => {
      const ref = doc(db, `information/info`);
      const document = await getDoc(ref);
      setpromotion(document.data().ispromoting)
    }

    getPromostionStatus();
  }, []);

  // Debounced function to check availability
  const debouncedCheckAvailability = useCallback(
    debounce(async (text) => {
      if (latestValue.current !== text) return;

      setUsernameLoading(true);
      const available = await checkAvailability(text.trim().toLocaleLowerCase());
      setIsAvailable(available);
      setUsernameLoading(false);
    }, 800), // Adjust the debounce delay as needed
    []
  );

  const checkAvailability = async (text) => {
    // Simulate an API request
    // Replace this with your actual API request
    try {
      // Create a reference to the users collection
      const usersRef = collection(db, 'users');

      // Create a query against the collection where the username matches
      const q = query(usersRef, where('username', '==', text));

      // Execute the query and get the result
      const querySnapshot = await getDocs(q);

      // Check if any documents are returned
      if (!querySnapshot.empty) {
        console.log('Username exists');
        return true; // Username exists
      } else {
        console.log('Username does not exist');
        return false; // Username does not exist
      }
    } catch (error) {
      console.error('Error checking username: ', error);
      return false;
    }
  };

  const pickImageAsync = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      //mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 1,
    });

    if (!result.canceled) {
      setImageSource(result.assets[0].uri)
      //setSelectedImage();
    }
  };

  useEffect(() => {
    latestValue.current = username

    if (username) {
      debouncedCheckAvailability(username);
    } else {
      setIsAvailable(null);
    }
  }, [username]);

  const router = useRouter();

  const hasSpacesOrSpecialChars = (str) => /[\s\W]/.test(str);

  const setInfoDatabase = async () => {
    if (!username) {
      showToast('Enter username')
      return;
    }

    if (username.length < 3) {
      showToast("Username is too short")
      return;
    }

    if (username.length > 14) {
      showToast("Username is too long")
      return;
    }

    if (hasSpacesOrSpecialChars(username.trim())) {
      showToast('Special characters and spaces are not allowed')
      return;
    }

    if (isAvailable) {
      showToast('Username not available')
      return;
    }

    setloading(true)

    const available = await checkAvailability(username);

    if (available) {
      showToast('Username not available')
      setloading(false)
      return;
    }

    // add settings to storage
    const settingsNotification = {
      comments: true,
      likes: true,
      subscribers: true,
      messages: true
    }

    const settings = {}
    settings.notification = settingsNotification;
    settings.profileview = 'everyone'
    settings.onlinestatusarea = false;

    console.log("existed signing in");

    let imageUrl;

    if (imageSource === null) {
      imageUrl = defaultProfileImage
    } else {
      imageUrl = await getImageDownLoadUrl();
    }

    const info = {
      username: username.toLocaleLowerCase().trim(),
      profilephoto: imageUrl,
      uid: user.uid,
      radius: 500,
      hasstories: false,
      settings: settings,
      likes: 0,
      popularity: 0,
      online: false,
      isshowingonlinearea: false
    }

    function cleanString(str) {
      return str.trim().replace(/\s+/g, ' ').toLowerCase();
    }

    // if user has promo code
    if (referal) {
      info.referal = cleanString(referal);
    }

    try {
      // Create a reference to the user's document in the "users" collection
      const userRef = doc(db, 'users', user.uid);

      // Set the document with user data
      await updateDoc(userRef, info, { merge: true });

      storeData('@profile_info', info);

      await storeData('@settings', settings)


      // 'merge: true' allows merging with existing data
      console.log('User document successfully written!' + getData('@profile_info'));


      router.replace('/(tabs)')


    } catch (error) {
      console.error('Error writing user document: ', error);
    }
  }

  const toast = useToast()

  function showToast(message) {
    toast.show(message, {
      type: "normal",
      placement: "bottom",
      duration: 2000,
      offset: 30,
      animationType: "zoom-in",
    });
  }

  const getImageDownLoadUrl = async () => {
    const blob = await fetch(imageSource).then((res) => res.blob());

    // Upload image to Firebase Storage
    const storage = getStorage();
    const storageRef = ref(storage, `images/${Date.now()}`);
    const snapshot = await uploadBytes(storageRef, blob);

    // Get download URL
    const url = await getDownloadURL(snapshot.ref);

    console.log(url)

    return url
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={isDark ? ['#121212', '#1E1E1E'] : ['#FFFFFF', '#F5F5F5']}
        style={styles.gradient}
      >
        <KeyboardAvoidingView 
         
          style={styles.keyboardView}
        >
           <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >

           <View style={styles.content}>
            <View style={styles.headerContainer}>
              <Text style={[styles.headerText, {color: isDark ? Colors.light_main : Colors.dark_main}]}>
                Create Your Profile
              </Text>
              <Text style={styles.subHeaderText}>
                Set up your profile to get started with Flaya
              </Text>
            </View>
            
            <View style={styles.profileImageContainer}>
              <TouchableOpacity style={styles.imagePickerContainer} onPress={pickImageAsync}>
                {imageSource ? (
                  <Image source={{ uri: imageSource }} style={styles.profileImage} />
                ) : (
                  <View style={[styles.profileImagePlaceholder, {backgroundColor: Colors.blue}]}>
                    <Ionicons name="person" size={40} color="#FFFFFF" />
                  </View>
                )}
                <View style={styles.editIconContainer}>
                  <Ionicons name="camera" size={16} color="#FFFFFF" />
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.formContainer}>
              <Text style={[styles.inputLabel, {color: isDark ? Colors.light_main : Colors.red_orange}]}>
                Username
              </Text>
              <View style={[styles.inputContainer, isAvailable === false && styles.validInput, isAvailable === true && styles.invalidInput]}>
                <Ionicons 
                  name="at-outline" 
                  size={20} 
                  color={isDark ? '#888888' : '#666666'} 
                  style={styles.inputIcon} 
                />
                <TextInput 
                  style={[styles.input, {color: isDark ? Colors.light_main : Colors.dark_main}]}
                  placeholder='Choose a unique username'
                  value={username}
                  onChangeText={setUsername}
                  placeholderTextColor='gray'
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {usernameloading && <ActivityIndicator size="small" color={Colors.blue} />}
                {!usernameloading && isAvailable !== null && (
                  <Ionicons 
                    name={!isAvailable ? "checkmark-circle" : "close-circle"} 
                    size={20} 
                    color={!isAvailable ? Colors.green : Colors.red_orange} 
                  />
                )}
              </View>
              
              {username.length > 0 && (
                <Text style={[styles.usernameHint, {
                  color: username.length < 3 ? Colors.red_orange : 
                         username.length > 14 ? Colors.red_orange :
                         hasSpacesOrSpecialChars(username.trim()) ? Colors.red_orange : 
                         isAvailable ? Colors.red_orange : 
                         Colors.green
                }]}>
                  {username.length < 3 ? "Username too short" : 
                   username.length > 14 ? "Username too long" :
                   hasSpacesOrSpecialChars(username.trim()) ? "No spaces or special characters" : 
                   isAvailable ? "Username already taken" : 
                   "Username available"}
                </Text>
              )}

              {ispromotion && (
                <View style={styles.promoContainer}>
                  <Text style={[styles.inputLabel, {color: isDark ? Colors.light_main : Colors.dark_main}]}>
                    Promo Code (Optional)
                  </Text>
                  <View style={styles.inputContainer}>
                    <Ionicons 
                      name="gift-outline" 
                      size={20} 
                      color={isDark ? '#888888' : '#666666'} 
                      style={styles.inputIcon} 
                    />
                    <TextInput 
                      style={[styles.input, {color: isDark ? Colors.light_main : Colors.dark_main}]}
                      placeholder='Enter referral code'
                      value={referal}
                      onChangeText={setReferal}
                      placeholderTextColor='gray'
                    />
                  </View>
                </View>
              )}
            </View>

            <TouchableOpacity 
              onPress={setInfoDatabase}
              style={styles.continueButton}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator size='small' color='white' />
              ) : (
                <>
                  <Text style={styles.continueButtonText}>Continue</Text>
                  <Ionicons name="arrow-forward" size={20} color="#FFFFFF" style={styles.buttonIcon} />
                </>
              )}
            </TouchableOpacity>
          </View>
           
          </ScrollView>
       
        </KeyboardAvoidingView>
      </LinearGradient>
      
      {loading && (
        <CustomDialog isVisible={loading}></CustomDialog>
      )}
    </SafeAreaView>
  )
}

export default profileInfo

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  headerContainer: {
    marginBottom: 30,
    alignItems: 'center',
  },
  headerText: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  subHeaderText: {
    fontSize: 16,
    color: 'gray',
    textAlign: 'center',
  },
  profileImageContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  imagePickerContainer: {
    position: 'relative',
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: Colors.blue,
  },
  profileImagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#CCCCCC',
  },
  editIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Colors.blue,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  formContainer: {
    marginBottom: 30,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 8,
  },
  validInput: {
    borderColor: Colors.green,
    borderWidth: 1.5,
  },
  invalidInput: {
    borderColor: Colors.red_orange,
    borderWidth: 1.5,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
  },
  usernameHint: {
    fontSize: 12,
    marginLeft: 5,
    marginBottom: 16,
  },
  promoContainer: {
    marginTop: 16,
  },
  continueButton: {
    backgroundColor: Colors.blue,
    borderRadius: 12,
    paddingVertical: 15,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  continueButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  buttonIcon: {
    marginLeft: 8,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  }
})