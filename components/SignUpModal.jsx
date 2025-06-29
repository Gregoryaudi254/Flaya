import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image
} from 'react-native';
import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/constants/AuthContext';
import { useToast } from 'react-native-toast-notifications';
import DeviceInfo from 'react-native-device-info';
import { collection, getDocs, query, where, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '@/constants/firebase';
import * as ImagePicker from 'expo-image-picker';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { defaultProfileImage } from '@/constants/common';
import { storeData } from '@/constants/localstorage';
import { debounce } from 'lodash';

const SignUpModal = ({ visible, onClose, onComplete, loading: externalLoading }) => {
  // Step state
  const [step, setStep] = useState(1);
  // Step 1: Sign up details
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  // Step 2: Username/profile
  const [username, setUsername] = useState('');
  const [referal, setReferal] = useState('');
  const [profileImage, setProfileImage] = useState(null);
  const [isPromotion, setPromotion] = useState(false);
  // Username check
  const [usernameLoading, setUsernameLoading] = useState(false);
  const [isAvailable, setIsAvailable] = useState(null);
  const latestValue = useRef(username);
  // General
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const slideAnim = useRef(new Animated.Value(0)).current;
  const { signUp, signInGoogle, user } = useAuth();
  const toast = useToast();

  // Validation helpers
  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isValidPassword = (password) => /^(?=.*\S).{8,}$/.test(password);
  const hasSpacesOrSpecialChars = (str) => /[\s\W]/.test(str);
  const removeSpaces = (str) => str.replace(/\s+/g, '');

  // Slide animation
  const goToStep = (nextStep) => {
    Animated.timing(slideAnim, {
      toValue: -(nextStep - 1) * 400, // 400 is width, adjust as needed
      duration: 300,
      useNativeDriver: true,
    }).start(() => setStep(nextStep));
  };

  // Device check
  const DeviceGood = async () => {
    const uniqueID = await DeviceInfo.getUniqueId();
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('devicecreatorid', '==', uniqueID));
    const snapshot = await getDocs(q);
    return snapshot.docs.length < 4;
  };

  // Toast
  function showToast(message) {
    toast.show(message, {
      type: "normal",
      placement: "bottom",
      duration: 2000,
      offset: 30,
      animationType: "zoom-in",
    });
  }

  // Google sign in
  const handleGoogleSignIn = async () => {
    setLoading(true);
    const success = await signInGoogle();
    if (!success) {
      showToast("Something went wrong");
      setLoading(false);
      return;
    }
    setLoading(false);
    if (onComplete) onComplete();
  };

  // Step 1: Handle sign up
  const handleSignUp = async () => {
    setError('');
    if (!name) return setError('Enter your name');
    if (!email) return setError('Enter your email');
    if (!isValidEmail(email)) return setError('Invalid email');
    if (!password) return setError('Enter your password');
    if (!isValidPassword(removeSpaces(password))) return setError('Password should be at least 8 characters');
    setLoading(true);
    // Device check
    const isDeviceGood = await DeviceGood();
    if (!isDeviceGood) {
      setLoading(false);
      showToast("Something went wrong. Try again later");
      return;
    }
    try {
      const result = await signUp(email, password, name);
      if (result.status === 'failed') {
        setError(result.error);
        setLoading(false);
        return;
      }
      setLoading(false);
      goToStep(2);
    } catch (err) {
      setLoading(false);
      setError(err.message || 'An error occurred while signing up.');
    }
  };

  // Username availability check
  const checkAvailability = async (text) => {
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('username', '==', text));
      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty;
    } catch (error) {
      return false;
    }
  };

  // Debounced username check
  const debouncedCheckAvailability = useCallback(
    debounce(async (text) => {
      if (latestValue.current !== text) return;
      setUsernameLoading(true);
      const available = await checkAvailability(text.trim().toLocaleLowerCase());
      setIsAvailable(available);
      setUsernameLoading(false);
    }, 800),
    []
  );

  useEffect(() => {
    latestValue.current = username;
    if (username) {
      debouncedCheckAvailability(username);
    } else {
      setIsAvailable(null);
    }
  }, [username]);

  // Promotion status
  useEffect(() => {
    const getPromotionStatus = async () => {
      const ref = doc(db, `information/info`);
      const document = await getDoc(ref);
      setPromotion(document.data()?.ispromoting || false);
    };
    getPromotionStatus();
  }, []);

  // Image picker
  const pickImageAsync = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      quality: 1,
    });
    if (!result.canceled) {
      setProfileImage(result.assets[0].uri);
    }
  };

  // Upload image to Firebase Storage
  const getImageDownLoadUrl = async () => {
    if (!profileImage) return defaultProfileImage;
    const blob = await fetch(profileImage).then((res) => res.blob());
    const storage = getStorage();
    const storageRef = ref(storage, `images/${Date.now()}`);
    const snapshot = await uploadBytes(storageRef, blob);
    const url = await getDownloadURL(snapshot.ref);
    return url;
  };

  // Step 2: Handle username/profile
  const handleUsernameSubmit = async () => {
    setError('');
    if (!username) return setError('Enter username');
    if (username.length < 3) return setError('Username too short');
    if (username.length > 20) return setError('Username too long');
    if (hasSpacesOrSpecialChars(username.trim())) return setError('No spaces or special characters');
    if (isAvailable) return setError('Username already taken');
    setLoading(true);
    const available = await checkAvailability(username);
    if (available) {
      setError('Username already taken');
      setLoading(false);
      return;
    }
    // Add settings to storage
    const settingsNotification = {
      comments: true,
      likes: true,
      subscribers: true,
      messages: true
    };
    const settings = {
      notification: settingsNotification,
      profileview: 'everyone',
      onlinestatusarea: false
    };
    let imageUrl;
    try {
      imageUrl = await getImageDownLoadUrl();
    } catch {
      imageUrl = defaultProfileImage;
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
    };
    function cleanString(str) {
      return str.trim().replace(/\s+/g, ' ').toLowerCase();
    }
    if (referal) {
      info.referal = cleanString(referal);
    }
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, info, { merge: true });
      await storeData('@profile_info', info);
      await storeData('@settings', settings);
      setLoading(false);
      if (onComplete) onComplete({ name, email, password, username, profileImage: imageUrl, referal });
    } catch (error) {
      setError('Error saving profile.');
      setLoading(false);
    }
  };

  // UI
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <Animated.View style={[styles.container, { transform: [{ translateX: slideAnim }] }]}> 
            {/* Step 1: Sign Up */}
            <View style={styles.stepView}>
              <Text style={styles.headerTitle}>Create Account</Text>
              <Text style={styles.headerSubtitle}>Join Flaya today</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="person-outline" size={20} color="gray" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  onChangeText={setName}
                  value={name}
                  placeholder="Name"
                  placeholderTextColor='gray'
                />
              </View>
              <View style={styles.inputContainer}>
                <Ionicons name="mail-outline" size={20} color="gray" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  onChangeText={setEmail}
                  value={email}
                  keyboardType='email-address'
                  autoCapitalize='none'
                  placeholder="Email"
                  placeholderTextColor='gray'
                />
              </View>
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color="gray" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  onChangeText={setPassword}
                  value={password}
                  placeholder="Password"
                  placeholderTextColor='gray'
                  secureTextEntry={!passwordVisible}
                />
                <TouchableOpacity onPress={() => setPasswordVisible(!passwordVisible)} style={styles.toggleButton}>
                  <Ionicons 
                    name={passwordVisible ? "eye-off-outline" : "eye-outline"} 
                    size={20} 
                    color="gray" 
                  />
                </TouchableOpacity>
              </View>
              <Text style={styles.passwordHint}>Password must be at least 8 characters</Text>
              {error && step === 1 ? <Text style={styles.errorText}>{error}</Text> : null}
              <TouchableOpacity 
                onPress={handleSignUp} 
                style={styles.signUpButton}
                activeOpacity={0.8}
                disabled={loading || externalLoading}
              >
                {(loading || externalLoading) ? (
                  <ActivityIndicator size='small' color='white' />
                ) : (
                  <Text style={styles.signUpButtonText}>Next</Text>
                )}
              </TouchableOpacity>
              <View style={styles.dividerContainer}>
                <View style={styles.divider} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.divider} />
              </View>
              <TouchableOpacity 
                onPress={handleGoogleSignIn} 
                style={styles.googleButton}
                activeOpacity={0.8}
                disabled={loading || externalLoading}
              >
                {(loading || externalLoading) ? (
                  <ActivityIndicator size='small' color={Colors.light_main} />
                ) : (
                  <View style={styles.googleButtonContent}>
                    <Image source={require('@/assets/icons/google.png')} style={styles.googleIcon} />
                    <Text style={styles.googleButtonText}>Continue with Google</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
            {/* Step 2: Username/Profile */}
            <View style={styles.stepView}>
              <Text style={styles.headerTitle}>Set up your profile</Text>
              <Text style={styles.headerSubtitle}>Choose a unique username</Text>
              <TouchableOpacity style={styles.profileImagePicker} onPress={pickImageAsync}>
                {profileImage ? (
                  <Image source={{ uri: profileImage }} style={styles.profileImage} />
                ) : (
                  <View style={styles.profileImagePlaceholder}>
                    <Ionicons name="person" size={40} color="#CCCCCC" />
                  </View>
                )}
                <View style={styles.editIconContainer}>
                  <Ionicons name="camera" size={16} color="#FFFFFF" />
                </View>
              </TouchableOpacity>
              <View style={styles.inputContainer}>
                <Ionicons name="at-outline" size={20} color="gray" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder='Username'
                  value={username}
                  onChangeText={setUsername}
                  placeholderTextColor='gray'
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {usernameLoading && <ActivityIndicator size="small" color={Colors.blue} />}
                {!usernameLoading && isAvailable !== null && (
                  <Ionicons 
                    name={!isAvailable ? "checkmark-circle" : "close-circle"} 
                    size={20} 
                    color={!isAvailable ? Colors.green : Colors.red_orange} 
                  />
                )}
              </View>
              <Text style={styles.passwordHint}>No spaces or special characters. 3-20 characters.</Text>
              {isPromotion && (
                <View style={styles.inputContainer}>
                  <Ionicons name="gift-outline" size={20} color="gray" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder='Referral code (optional)'
                    value={referal}
                    onChangeText={setReferal}
                    placeholderTextColor='gray'
                  />
                </View>
              )}
              {error && step === 2 ? <Text style={styles.errorText}>{error}</Text> : null}
              <TouchableOpacity 
                onPress={handleUsernameSubmit} 
                style={styles.signUpButton}
                activeOpacity={0.8}
                disabled={loading || externalLoading}
              >
                {(loading || externalLoading) ? (
                  <ActivityIndicator size='small' color='white' />
                ) : (
                  <Text style={styles.signUpButtonText}>Finish</Text>
                )}
              </TouchableOpacity>
            </View>
          </Animated.View>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={28} color="#888" />
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyboardView: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flexDirection: 'row',
    width: 800, // 2 steps * 400px each
    height: 540,
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 10,
  },
  stepView: {
    width: 400,
    padding: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    color: Colors.blue,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'gray',
    marginBottom: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
    height: 55,
    borderColor: '#DDDDDD',
    backgroundColor: '#F5F5F5',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    color: '#222',
  },
  toggleButton: {
    padding: 8,
  },
  passwordHint: {
    fontSize: 12,
    color: 'gray',
    marginLeft: 5,
    marginBottom: 20,
  },
  signUpButton: {
    backgroundColor: Colors.blue,
    borderRadius: 12,
    height: 55,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    width: '100%',
    marginTop: 10,
  },
  signUpButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    color: Colors.red_orange,
    marginBottom: 10,
    fontSize: 14,
    textAlign: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 4,
    elevation: 2,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    width: '100%',
    justifyContent: 'center',
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#DDDDDD',
  },
  dividerText: {
    marginHorizontal: 10,
    fontSize: 14,
    color: '#888',
  },
  googleButton: {
    borderWidth: 1,
    borderRadius: 12,
    height: 55,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  googleButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleIcon: {
    width: 24,
    height: 24,
    marginRight: 10,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.dark_main,
  },
  profileImagePicker: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  profileImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
    borderColor: Colors.blue,
  },
  profileImagePlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#EEEEEE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Colors.red_orange,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
});

export default SignUpModal; 