import { StyleSheet, Text, View, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, StatusBar, ScrollView } from 'react-native'
import React, { useState } from 'react'
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

const forgotpassword = () => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const { handlePasswordReset } = useAuth();
  const [queryinfo, setqueryinfo] = useState('');
  const [loading, setloading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const checkinput = async () => {
    if (!queryinfo) {
      showToast('Enter your email or username');
      return;
    }

    setloading(true);

    const infoResult = await queryUser(stringwithoutspaces(queryinfo.toLowerCase()));

    if (infoResult) {
      if (infoResult.signtype === 'gmail') {
        showToast('Continue with gmail sign in');
        setloading(false);
        return;
      }

        const statusReset = await handlePasswordReset(infoResult.email.trim());

        if (statusReset.status === "passed") {
        setEmailSent(true);
        showToast("Password reset link sent to your email!");
      } else {
        showToast(statusReset.error);
        }

        setloading(false);
    } else {
      showToast('User does not exist');
      setloading(false);
      return;
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

  const isValidPassword = (password) => {
    return /^(?=.*\S).{8,}$/.test(password);
  };

  const toast = useToast();

  function showToast(message) {
    toast.show(message, {
      type: "normal",
      placement: "bottom",
      duration: 2000,
      offset: 30,
      animationType: "zoom-in",
    });
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
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
              Reset Password
            </Text>
            <Text style={styles.headerSubtitle}>
              {emailSent 
                ? "Check your email for a reset link"
                : "Enter your email and we'll send you a reset link"
              }
            </Text>
          </View>

          {!emailSent ? (
            <View style={styles.formSection}>
              <View style={[
                styles.inputContainer, 
                {borderColor: isDark ? '#444444' : '#DDDDDD', backgroundColor: isDark ? '#2A2A2A' : '#F5F5F5'}
              ]}>
                <Ionicons name="mail-outline" size={20} color="gray" style={styles.inputIcon} />
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

              <TouchableOpacity 
                onPress={checkinput} 
                style={styles.resetButton}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator size='small' color='white' />
                ) : (
                  <Text style={styles.resetButtonText}>Send Reset Link</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.successSection}>
              <View style={styles.successIconContainer}>
                <Ionicons name="checkmark-circle" size={80} color={Colors.blue} />
              </View>
              <Text style={styles.successText}>
                We've sent a password reset link to your email. Please check your inbox and follow the instructions to reset your password.
              </Text>

              <TouchableOpacity 
                style={styles.returnButton}
                onPress={() => router.back()}
                activeOpacity={0.8}
              >
                <Text style={styles.returnButtonText}>Return to Sign In</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.footerSection}>
            <Text style={[styles.footerText, {color: isDark ? Colors.light_main : Colors.dark_main}]}>
              Remember your password?
            </Text>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={styles.signInText}>Sign In</Text>
          </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

          {loading && (
            <CustomDialog isVisible={loading}>
            </CustomDialog>
          )}
    </SafeAreaView>
  )
}

export default forgotpassword;

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
    marginBottom: 24,
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
  resetButton: {
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
  resetButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  successSection: {
    alignItems: 'center',
    marginBottom: 30,
},
  successIconContainer: {
    marginBottom: 20,
  },
  successText: {
    textAlign: 'center',
    color: 'gray',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 30,
  },
  returnButton: {
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
  },
  returnButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
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
  signInText: {
    color: Colors.blue,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 5,
  },
})