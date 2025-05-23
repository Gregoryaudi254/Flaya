import { StyleSheet, Text, View,Image,TextInput, TouchableOpacity,ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform, Dimensions } from 'react-native'
import React,{useState,useLayoutEffect,useCallback,useEffect,useRef} from 'react'
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '@/constants/Colors';

import {router, useNavigation, Stack} from 'expo-router'

import { debounce } from 'lodash';
import { collection, doc, getDoc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { db } from '@/constants/firebase';
import { getData, storeData } from '@/constants/localstorage';
import { useToast } from 'react-native-toast-notifications';
import { getImageDownloadUrl } from '@/constants/common';
import { useColorScheme } from '@/hooks/useColorScheme';

import BusinessInfoEditSheet from '@/components/BusinessInfoEditSheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import CustomDialog from '@/components/CustomDialog';
import { setData } from '@/slices/dataChangeSlice';
import { useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';

import { useSelector } from 'react-redux';

const { width } = Dimensions.get('window');

function cleanString(str) {
  return str.trim()           // Remove spaces from start and end
            .replace(/\s+/g, ' ')  // Replace multiple spaces with a single space
            .toLowerCase();        // Convert to lowercase
}

const ProfileEditScreen = () => {
  const dispatch = useDispatch();

  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark';

  const [selectedImage, setSelectedImage] = useState(null);
  const [isLoaded,setLoaded] = useState(false)

  const [loading, setLoading] = useState(false);

  const navigation = useNavigation();

  const [changed, setChanged] = useState(false);

  const [username,setUsername] = useState('')
  const [name,setName] = useState('');
  const [imageSource,setImageSource] = useState(null)
 

  const [caption,setCaption] = useState('');


  const toast = useToast()

  function showToast(message){
    toast.show(message, {
      type: "normal",
      placement: 'bottom',
      duration: 2000,
      offset: 30,
      animationType: "zoom-in",
    });

  }


  const checkAvailability = async (text) => {
    // Simulate an API request
    // Replace this with your actual API request
  
    const usersRef = collection(db,'users');
    const q = query(usersRef, where("username", "==", cleanString(text)));
  
    const snap = await getDocs(q);

    console.log("hehe "+username)
  
    if (snap.empty) {
      console.log("does not exist")
      return true;
    }
  
    const currentUserInfo = await getData('@profile_info');
  
    if (currentUserInfo.uid === snap.docs[0].data().uid) {
      console.log("exists but current user")
      return true;
    }
  
    return false;
  
  };




  const hasSpacesOrSpecialChars = (str) => /[\s\W]/.test(str);

  const handleSave = async () => {
    
  
    // Get the latest username value directly instead of relying on useCallback
    const currentUsername = username;  
    console.log("username :", currentUsername);

    if (!name) {
      showToast("Enter name");
      return;
    }

    if (currentUsername.length < 4) {
      showToast("username is too short")
      return;
    }

    if (hasSpacesOrSpecialChars(currentUsername.trim())) {
      showToast('special characters and spaces are not allowed')
      return;
    }


    if (!currentUsername) {
      showToast("Enter username");
      return;
    }


    let newdata = {};

    if (caption !== null && caption !== undefined) {
      newdata.caption = caption;

      if (caption.length > 80) {
        showToast("Too many words on caption");
        return;
      }
    }

  
    setLoading(true);

    const userinfo =  await getData('@profile_info')
  
    const isusernamegood = await checkAvailability(currentUsername);
    
    if (!isusernamegood) {
      showToast("username already exists");
      setLoading(false);
      return;
    }
  
    


    if (selectedImage !== null) {
      const image = await getImageDownloadUrl(selectedImage);
      newdata.profilephoto = image;

      userinfo.profilephoto = image;
    }
  
    newdata.username = currentUsername.toLocaleLowerCase().trim();
    userinfo.username = currentUsername;

    
    newdata.name = name;
  
    
    const reference = doc(db, `users/${userinfo.uid}`);
    
    await updateDoc(reference, newdata);
    setLoading(false);

    dispatch(setData({id:"profileedit", intent:"accountinfochange"}))

    await storeData('@profile_info',userinfo)

  };
  

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => {
       
        if (loading) {
          return (
            <ActivityIndicator style={{ alignSelf: 'center', marginEnd: 20 }} size="small" color={colorScheme === 'dark' ? Colors.light_main : Colors.dark_main} />
          );
        }

        if (changed) {
          return (
            <TouchableOpacity style={{ alignSelf: 'flex-end' }} onPress={handleSave}>

              <Image
                resizeMode="contain"
                source={require('@/assets/icons/saveprofile.png')}
                style={{ height: 20, tintColor: Colors.blue, alignSelf: 'flex-end' }}
              />

            </TouchableOpacity>
          );
        }

        return null;
      },
    });
  }, [loading, navigation,changed,username,caption,selectedImage,name]);

  

 

 
  const [userdata, setUserData] = useState(null);

  const getUserData = useCallback(async()=>{
    const userInfo = await getData('@profile_info');

    const ref = doc(db, `users/${userInfo.uid}`);

    const snap = await getDoc(ref);
    const data = snap.data();

    setUserData(data);

    setUsername(data.username);
    setCaption(data.caption);
    setName(data.name);
    setImageSource(data.profilephoto);
    
    setLoaded(true)

  });


  useEffect(() => {
    getUserData();
  },[])


 



 

  const pickImageAsync = async () => {

    let result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      //mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 1,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
      setImageSource(result.assets[0].uri)
    } 
  };



  const [usernameloading, setUsernameLoading] = useState(false);
  const [isAvailable, setIsAvailable] = useState(null);

  const latestValue = useRef(username);


  // Debounced function to check availability
  const debouncedCheckAvailability = useCallback(
    debounce(async (text) => {
      if (latestValue.current !== text) return; 

      setUsernameLoading(true);
      const available = await checkAvailability(text.toLocaleLowerCase().trim());
      setIsAvailable(available);
      setUsernameLoading(false);
    }, 800), // Adjust the debounce delay as needed
    []
  );


  
  useEffect(() => {

    latestValue.current = username


    if (username) {
      debouncedCheckAvailability(username);

      console.log("user " +username)

      setChanged(true)

      console.log(changed)
    } else {
      setIsAvailable(null);
    }
  }, [username]);




  const handleEditPress = () => {
    handleEditBusinessInfo();
  };

  const truncateText = (text) => {
    return text.length > 10 ? text.slice(0, 10) + "..." : text;
  };

  const businessInfoSheetRef = useRef(null);
  
  const [editSection, setEditSection] = useState(null);

  const handleBusinessInfoUpdate = (updatedInfo) => {
    setUserData(prev => ({
      ...prev,
      business: {
        ...prev.business,
        ...updatedInfo
      }
    }));
  };
  
  const handleEditBusinessInfo = () => {
    if (businessInfoSheetRef.current) {
      businessInfoSheetRef.current.snapToIndex(1);
    }
  };

  const [dialog, setDialog] = useState(false);
  const [isDeletingAccount, setDeletingAccount] = useState(false);

  const onDeleteAccount = useCallback(async() =>{
    setDeletingAccount(true);

    setLoading(true)
    const userinfo = await getData('@profile_info')
    const userRef = doc(db, `users/${userinfo.uid}`);

    await updateDoc(userRef, {business:null, isbusinessaccount:null});

    dispatch(setData({id:"pending", intent:'accountchange'}));

    router.back();
  });


  const handleDialogClose = () =>{
    setDialog(false)
  }

  const [isLoadingDeleteProcess, setLoadingDeleteAccount] = useState(false);
  const [isDropdownvisible, setDropDownVisible] = useState(false);
  const openDialog = () =>{
    setDropDownVisible(false)
    setDialog(true)
  }

  const { value } = useSelector(state => state.data);

  useEffect(() => {
    if (value !== null && value.intent === "categorychange") {

       // Update local state
    setUserData(prev => ({
      ...prev,
      business: {
        ...prev?.business,
        category: value.category
      }
    }));
     
    }
  },[value]);


  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack.Screen
        options={{
          title: "Edit Profile",
          headerRight: () => {
            if (loading) {
              return (
                <ActivityIndicator style={{ marginEnd: 20 }} size="small" color={isDark ? Colors.light_main : Colors.dark_main} />
              );
            }

            if (changed) {
              return (
                <TouchableOpacity
                  style={{ marginRight: 15 }}
                  onPress={handleSave}
                >
                  <Text style={{ color: Colors.blue, fontWeight: '600', fontSize: 16 }}>Save</Text>
                </TouchableOpacity>
              );
            }
            return null;
          },
        }}
      />

      <KeyboardAvoidingView 
        style={{ flex: 1, backgroundColor: isDark ? Colors.dark_main : Colors.light_main }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView 
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 50 }}
          showsVerticalScrollIndicator={false}
        >
          {isLoaded ? (
            <View style={{ padding: 16 }}>
              <View style={[styles.profileSection, { backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF' }]}>
                <TouchableOpacity 
                  style={styles.profileImageContainer}
                  onPress={pickImageAsync}
                >
                  <Image 
                    source={{ uri: imageSource }} 
                    style={styles.profileImage}
                  />
                  <View style={styles.cameraIconContainer}>
                    <Ionicons name="camera" size={18} color="#FFFFFF" />
                  </View>
                </TouchableOpacity>
                
                <Text style={[styles.usernameDisplay, { color: isDark ? '#BBBBBB' : '#666666' }]}>
                  @{username}
                </Text>
              </View>

              <View style={[styles.formCard, { backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF' }]}>
                <Text style={[styles.sectionTitle, { color: isDark ? Colors.light_main : Colors.dark_main }]}>
                  Personal Information
                </Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Name</Text>
                  <TextInput 
                    style={[
                      styles.textInput,
                      { 
                        color: isDark ? Colors.light_main : Colors.dark_main,
                        backgroundColor: isDark ? '#2A2A2A' : '#F5F5F5'
                      }
                    ]}
                    placeholder='Enter your full name'
                    placeholderTextColor='gray'
                    value={name}
                    onChangeText={(text) => {
                      setName(text);
                      setChanged(true);
                    }}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Username</Text>
                  <View style={styles.usernameInputContainer}>
                    <TextInput 
                      style={[
                        styles.textInput,
                        { 
                          color: isDark ? Colors.light_main : Colors.dark_main,
                          backgroundColor: isDark ? '#2A2A2A' : '#F5F5F5',
                          paddingRight: 40
                        }
                      ]}
                      placeholder='Choose a unique username'
                      placeholderTextColor='gray'
                      value={username}
                      onChangeText={setUsername}
                    />
                    <View style={styles.usernameStatusContainer}>
                      {usernameloading && 
                        <ActivityIndicator color={Colors.blue} size="small" />
                      }
                      {!usernameloading && isAvailable !== null && username.length > 0 && (
                        <Ionicons 
                          name={isAvailable ? "checkmark-circle" : "close-circle"} 
                          size={22} 
                          color={isAvailable ? "#34C759" : "#FF3B30"}
                        />
                      )}
                    </View>
                  </View>
                  {!isAvailable && !usernameloading && username.length > 0 && (
                    <Text style={styles.errorMessage}>Username already taken</Text>
                  )}
                  {hasSpacesOrSpecialChars(username) && username.length > 0 && (
                    <Text style={styles.errorMessage}>No spaces or special characters allowed</Text>
                  )}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Bio</Text>
                  <TextInput 
                    style={[
                      styles.textInput,
                      styles.bioInput,
                      { 
                        color: isDark ? Colors.light_main : Colors.dark_main,
                        backgroundColor: isDark ? '#2A2A2A' : '#F5F5F5'
                      }
                    ]}
                    placeholder='Write something about yourself...'
                    placeholderTextColor='gray'
                    value={caption}
                    onChangeText={(text) => {
                      setCaption(text);
                      setChanged(true);
                    }}
                    multiline={true}
                    numberOfLines={Platform.OS === 'ios' ? undefined : 4}
                    maxLength={80}
                  />
                  <Text style={[
                    styles.charCount, 
                    caption && caption.length > 70 ? { color: '#FF9500' } : {}
                  ]}>
                    {caption ? caption.length : 0}/80
                  </Text>
                </View>
              </View>

              {userdata?.isbusinessaccount === true && (
                <View style={[styles.formCard, { backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF', marginTop: 16 }]}>
                  <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: isDark ? Colors.light_main : Colors.dark_main }]}>
                      Business Information
                    </Text>
                    <View style={[styles.badge, { backgroundColor: isDark ? 'rgba(0, 122, 255, 0.2)' : 'rgba(0, 122, 255, 0.1)' }]}>
                      <Text style={styles.badgeText}>Business</Text>
                    </View>
                  </View>

                  <TouchableOpacity 
                    style={styles.businessInfoItem}
                    onPress={() => router.push('/profile/businesscategory')}
                  >
                    <View>
                      <Text style={[styles.infoLabel, { color: isDark ? '#BBBBBB' : '#666666' }]}>
                        Category
                      </Text>
                      <Text style={[styles.infoValue, { color: isDark ? Colors.light_main : Colors.dark_main }]}>
                        {userdata?.business?.category || "Not set"}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={isDark ? '#BBBBBB' : '#666666'} />
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.businessInfoItem}
                    onPress={handleEditPress}
                  >
                    <View>
                      <Text style={[styles.infoLabel, { color: isDark ? '#BBBBBB' : '#666666' }]}>
                        Business Name
                      </Text>
                      <Text style={[styles.infoValue, { color: isDark ? Colors.light_main : Colors.dark_main }]}>
                        {userdata?.business?.name || "Not set"}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={isDark ? '#BBBBBB' : '#666666'} />
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.businessInfoItem}
                    onPress={handleEditPress}
                  >
                    <View>
                      <Text style={[styles.infoLabel, { color: isDark ? '#BBBBBB' : '#666666' }]}>
                        Address
                      </Text>
                      <Text style={[styles.infoValue, { color: isDark ? Colors.light_main : Colors.dark_main }]}>
                        {userdata?.business?.address ? truncateText(userdata?.business?.address) : "Not set"}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={isDark ? '#BBBBBB' : '#666666'} />
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.businessInfoItem, { borderBottomWidth: 0 }]}
                    onPress={handleEditPress}
                  >
                    <View>
                      <Text style={[styles.infoLabel, { color: isDark ? '#BBBBBB' : '#666666' }]}>
                        Contact Information
                      </Text>
                      <Text style={[styles.infoValue, { color: isDark ? Colors.light_main : Colors.dark_main }]}>
                        Email, phone number
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={isDark ? '#BBBBBB' : '#666666'} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.deleteBusinessButton}
                    onPress={openDialog}
                    disabled={loading}
                  >
                    <Ionicons name="trash-outline" size={20} color="#FFFFFF" style={{ marginRight: 10 }} />
                    <Text style={styles.deleteButtonText}>Delete Business Account</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ) : (
            <ActivityIndicator 
              style={{ marginTop: 100 }} 
              size="large" 
              color={isDark ? Colors.light_main : Colors.dark_main} 
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {userdata && (
        <BusinessInfoEditSheet
          ref={businessInfoSheetRef}
          userId={userdata.uid}
          business={userdata?.business}
          onUpdate={handleBusinessInfoUpdate}
        />
      )}

      <CustomDialog onclose={handleDialogClose} isVisible={dialog}>
        {!isDeletingAccount ? (
          <View style={styles.dialogContent}>
            <Ionicons name="alert-circle" size={50} color="#FF3B30" style={{ marginBottom: 16 }} />
            <Text style={styles.dialogTitle}>Delete Business Account?</Text>
            <Text style={styles.dialogMessage}>
              This process is irreversible. All your business information will be permanently deleted.
            </Text>
            
            <View style={styles.dialogButtonsContainer}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={handleDialogClose}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.confirmDeleteButton}
                onPress={onDeleteAccount}
              >
                <Text style={styles.confirmDeleteButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={[styles.dialogContent, { minHeight: 200, justifyContent: 'center' }]}>
            <ActivityIndicator size="large" color="white" />
            <Text style={[styles.dialogMessage, { marginTop: 20, marginBottom: 0 }]}>Deleting business account...</Text>
          </View>
        )}
      </CustomDialog>
    </GestureHandlerRootView>
  )
}

export default ProfileEditScreen

const styles = StyleSheet.create({
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderColor: 'rgba(255,255,255,0.3)',
    borderWidth: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
  },
  saveButton: {
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal:50,
    marginTop: 20,
    marginBottom: 30,
    flexDirection: 'row',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  }, 
  saveIcon: {
    marginRight: 10,
  },
  formGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    marginBottom: 6,
    fontWeight: '500',
  },
  text: {
    fontSize: 16,
  },
  categoryUpdateButton: {
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 15,
    alignSelf: 'flex-end',
  },
  categoryUpdateButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  profileSection: {
    alignItems: 'center',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  cameraIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Colors.blue,
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  usernameDisplay: {
    fontSize: 16,
    fontWeight: '500',
    color: '#888888',
    marginTop: 8,
  },
  formCard: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    color: '#888888',
  },
  textInput: {
    minHeight: 48,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(200,200,200,0.3)',
    fontSize: 16,
  },
  usernameInputContainer: {
    position: 'relative',
  },
  usernameStatusContainer: {
    position: 'absolute',
    right: 12,
    top: 12,
  },
  errorMessage: {
    color: '#FF3B30',
    fontSize: 12,
    marginTop: 4,
  },
  bioInput: {
    minHeight: 100,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  charCount: {
    alignSelf: 'flex-end',
    marginTop: 4,
    fontSize: 12,
    color: '#888888',
  },
  businessInfoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(200,200,200,0.15)',
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
  },
  deleteBusinessButton: {
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    backgroundColor: '#FF3B30',
    flexDirection: 'row',
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  dialogContent: {
    padding: 20,
    backgroundColor: Colors.dark_gray,
    borderRadius: 12,
    alignItems: 'center',
  },
  dialogTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: 'white',
    textAlign: 'center',
  },
  dialogMessage: {
    fontSize: 16,
    marginBottom: 24,
    color: '#DDDDDD',
    textAlign: 'center',
    lineHeight: 22,
  },
  dialogButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 10,
  },
  cancelButton: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#444444',
    marginRight: 10,
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmDeleteButton: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FF3B30',
    marginLeft: 10,
  },
  confirmDeleteButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  badge: {
    padding: 4,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: Colors.blue,
  },
})