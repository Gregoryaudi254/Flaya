import { StyleSheet, Text, View, TextInput, TouchableOpacity, Image, ActivityIndicator, KeyboardAvoidingView, Platform, StatusBar, ScrollView } from 'react-native'
import React, { useEffect, useState } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';
import { useToast } from 'react-native-toast-notifications';
import { useAuth } from '@/constants/AuthContext';
import { useRouter } from 'expo-router';
import CustomDialog from '@/components/CustomDialog';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/constants/firebase';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Ionicons } from '@expo/vector-icons';

const signIn = () => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [queryinfo, setqueryinfo] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setloading] = useState(false);
  const { signIn, signInGoogle, isAuthenticated, user } = useAuth();
  const [isgooglesign, setGoogleSignIn] = useState(false);

  const toggleSecureEntry = () => {
    setPasswordVisible(!passwordVisible);
  };

  useEffect(() => {
    if (user && isAuthenticated) {
      console.log("isauthenticated");
      router.replace('/(tabs)')
    } else if (user && isAuthenticated === false) {
      router.replace('/(profile)')
    } else if (user === null && isAuthenticated === false && loading) {
      setloading(false);
    }
  }, [isAuthenticated, user, isgooglesign]);

  const checkinput = async () => {
    if (!queryinfo) {
      showToast('Enter your email or username')
      return;
    }

    if (!password) {
      showToast('Enter your password')
      return;
    }

    setloading(true);

    const infoResult = await queryUser(stringwithoutspaces(queryinfo).toLowerCase());

    if (infoResult) {
      if (infoResult.signtype === 'gmail') {
        showToast('Continue with gmail sign in');
        setloading(false);
        return;
      }
    } else {
      showToast('User does not exist')
      setloading(false);
      return;
    }

    try {
      const result = await signIn(infoResult.email, password);

      if (result.status === 'failed') {
        showToast('Signing failed')
        setloading(false);
        return;
      }
    } catch (err) {
      console.log('Error in signUp:', err);
      setloading(false);
      showToast('Password or email does not match')
    }
  }

  const stringwithoutspaces = (str) => {
    return str.replace(/\s+/g, '');
  }

  const queryUser = async (info) => {
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('infoarray', 'array-contains', info));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const user = querySnapshot.docs[0];
        const userData = user.data();
        return {
          email: userData.email,
          signtype: userData.signintype
        }
      } else {
        console.log('No matching documents found.');
        return null;
      }
    } catch (error) {
      console.log('Error querying users:', error);
      return null;
    }
  };

  const removeSpaces = (str) => {
    return str.replace(/\s+/g, '');
  };

  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const isValidPassword = (password) => {
    return /^(?=.*\S).{8,}$/.test(password);
  };

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

  const handleSignUpPress = () => {
    router.back()
  }

  const googlePress = async () => {
    setloading(true);
    setGoogleSignIn(true);
    
    const success = await signInGoogle();

    if (!success) {
      setloading(false);
      showToast("Something went wrong");
      setGoogleSignIn(false)
    }
  }

  const movetoForgotPassword = () => {
    router.push('/(auth)/forgotpassword')
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <ScrollView>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollView}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => router.back()}
          >
            <Ionicons 
              name="arrow-back" 
              size={24} 
              color={isDark ? Colors.light_main : Colors.dark_main} 
            />
          </TouchableOpacity>
          
          <View style={styles.headerSection}>
            <Text style={[styles.headerTitle, {color: isDark ? Colors.light_main : Colors.dark_main}]}>
              Welcome Back
            </Text>
            <Text style={styles.headerSubtitle}>
              Sign in to your account
            </Text>
          </View>

          <View style={styles.formSection}>
            <View style={[
              styles.inputContainer, 
              {borderColor: isDark ? '#444444' : '#DDDDDD', backgroundColor: isDark ? '#2A2A2A' : '#F5F5F5'}
            ]}>
              <Ionicons name="person-outline" size={20} color="gray" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, {color: isDark ? Colors.light_main : Colors.dark_main}]}
                onChangeText={setqueryinfo}
                value={queryinfo}
                keyboardType='email-address'
                autoCapitalize='none'
                placeholder="Email or username"
                placeholderTextColor='gray'
              />
            </View>

            <View style={[
              styles.inputContainer, 
              {borderColor: isDark ? '#444444' : '#DDDDDD', backgroundColor: isDark ? '#2A2A2A' : '#F5F5F5'}
            ]}>
              <Ionicons name="lock-closed-outline" size={20} color="gray" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, {color: isDark ? Colors.light_main : Colors.dark_main}]}
                onChangeText={setPassword}
                value={password}
                placeholder="Password"
                placeholderTextColor='gray'
                secureTextEntry={!passwordVisible}
              />
              <TouchableOpacity onPress={toggleSecureEntry} style={styles.toggleButton}>
                <Ionicons 
                  name={passwordVisible ? "eye-off-outline" : "eye-outline"} 
                  size={20} 
                  color="gray" 
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={movetoForgotPassword} style={styles.forgotPasswordButton}>
              <Text style={styles.forgotPasswordText}>Forgot password?</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={checkinput} 
              style={styles.signInButton}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator size='small' color='white' />
              ) : (
                <Text style={styles.signInButtonText}>Sign In</Text>
              )}
            </TouchableOpacity>

            <View style={styles.dividerContainer}>
              <View style={[styles.divider, {backgroundColor: isDark ? '#444444' : '#DDDDDD'}]} />
              <Text style={[styles.dividerText, {color: isDark ? '#AAAAAA' : '#777777'}]}>OR</Text>
              <View style={[styles.divider, {backgroundColor: isDark ? '#444444' : '#DDDDDD'}]} />
            </View>

            <TouchableOpacity 
              onPress={googlePress} 
              style={[
                styles.googleButton, 
                {borderColor: isDark ? '#444444' : '#DDDDDD', backgroundColor: isDark ? '#2A2A2A' : '#FFFFFF'}
              ]}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator size='small' color={isDark ? Colors.light_main : Colors.dark_main} />
              ) : (
                <View style={styles.googleButtonContent}>
                  <Image source={require('@/assets/icons/google.png')} style={styles.googleIcon} />
                  <Text style={[styles.googleButtonText, {color: isDark ? Colors.light_main : Colors.dark_main}]}>
                    Continue with Google
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.footerSection}>
            <Text style={[styles.footerText, {color: isDark ? Colors.light_main : Colors.dark_main}]}>
              Don't have an account?
            </Text>
            <TouchableOpacity onPress={handleSignUpPress}>
              <Text style={styles.signUpText}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      </ScrollView>
    

      {loading && (
        <CustomDialog isVisible={loading}>
        </CustomDialog>
      )}
    </SafeAreaView>
  )
}

export default signIn;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    marginTop: 10,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerSection: {
    marginVertical: 40,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'gray',
  },
  formSection: {
    marginBottom: 30,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
    height: 55,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 16,
  },
  toggleButton: {
    padding: 8,
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginBottom: 20,
  },
  forgotPasswordText: {
    color: Colors.blue,
    fontSize: 14,
    fontWeight: '500',
  },
  signInButton: {
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
  },
  signInButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  divider: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 10,
    fontSize: 14,
  },
  googleButton: {
    borderWidth: 1,
    borderRadius: 12,
    height: 55,
    justifyContent: 'center',
    alignItems: 'center',
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
  },
  footerSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 'auto',
    paddingVertical: 20,
  },
  footerText: {
    fontSize: 14,
  },
  signUpText: {
    color: Colors.orange,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 5,
  },
})