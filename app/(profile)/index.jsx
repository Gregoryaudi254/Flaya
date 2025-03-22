import { StyleSheet, Text, View ,TextInput,TouchableOpacity,Image,ActivityIndicator} from 'react-native'
import React ,{useCallback, useState,useRef,useEffect}from 'react'
import { debounce } from 'lodash';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';

import { db } from '@/constants/firebase';
import { collection, query, where, getDocs ,setDoc,doc, updateDoc, getDoc} from 'firebase/firestore';

import { useToast } from 'react-native-toast-notifications';
import { getStorage, ref, uploadBytes, getDownloadURL} from 'firebase/storage';
import { getBlob } from 'expo-file-system';
import { useAuth } from '@/constants/AuthContext';
import { useRouter } from 'expo-router';
import CustomDialog from '@/components/CustomDialog';
import { storeData ,getData} from '@/constants/localstorage';
import { useColorScheme } from '@/hooks/useColorScheme';
import { defaultProfileImage } from '@/constants/common';



const profileInfo = () => {

  const colorScheme = useColorScheme()
 
  const [usernameloading, setUsernameLoading] = useState(false);
  const [isAvailable, setIsAvailable] = useState(null);

  const [imageSource,setImageSource] = useState(null)

  
  const [username,setUsername] = useState('')

  const [referal,setReferal] = useState('')

  const latestValue = useRef(username);

  const [loading,setloading] = useState(false);

  const {user} = useAuth();

  const [ispromotion, setpromotion] = useState(false);

  useEffect(() =>{
    const getPromostionStatus = async () => {
      const ref = doc(db, `information/info`);
      const document = await getDoc(ref);
      setpromotion(document.data().ispromoting)
    }

    getPromostionStatus();

  },[]);

  

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



  const setInfoDatabase = async ()=>{

   
    if(!username){
      showToast('Enter username')
      return;
    }

    if (username.length < 3) {
      showToast("username is too short")
      return;
    }

    if (username.length > 14) {
      showToast("username is too long")
      return;
    }

    if (hasSpacesOrSpecialChars(username.trim())) {
      showToast('special characters and spaces are not allowed')
      return;
    }

    if(isAvailable){
      showToast('Username not available')
      return;
    }

    setloading(true)

    const available = await checkAvailability(username);

    if(available){
      showToast('Username not available')
      setloading(false)

      return;
    }

     // add settings to storage
     const settingsNotification = {
      comments:true,
      likes:true,
      subscribers:true,
      messages:true
     }

    const settings = {}
    settings.notification = settingsNotification;
    settings.profileview = 'everyone'
    settings.onlinestatusarea =  false;

    console.log("existed signing in");

    let imageUrl;

    if (imageSource === null) {
      imageUrl = defaultProfileImage
    } else {
      imageUrl = await getImageDownLoadUrl();
    }
   
  

    const info = {
      username:username.toLocaleLowerCase().trim(),
      profilephoto:imageUrl,
      uid:user.uid,
      radius:500,
      hasstories:false,
      settings:settings,
      likes:0,
      popularity:0,
      online:false,
      isshowingonlinearea:false
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

      storeData('@profile_info',info);

      await storeData('@settings',settings)


 // 'merge: true' allows merging with existing data
      console.log('User document successfully written!'+getData('@profile_info'));


      router.replace('/(tabs)')

      
    } catch (error) {
      console.error('Error writing user document: ', error);
    }

  }

  const toast = useToast()

  function showToast(message){
    toast.show(message, {
      type: "normal",
      placement: "bottom",
      duration: 2000,
      offset: 30,
      animationType: "zoom-in",
    });

  }

  


  const getImageDownLoadUrl = async () =>{

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
    
    <SafeAreaView>

      <View style={{marginHorizontal:25}}>

      <Text style={{fontSize:30,color:colorScheme === 'dark' ? Colors.light_main: Colors.dark_main,fontWeight:'bold',marginStart:15,margin:20}}>Set profile info</Text>

      <TouchableOpacity onPress={pickImageAsync}>

        <Image  source={imageSource ? { uri: imageSource } : require('@/assets/icons/user.png')} 
          style={[styles.profileImage, !imageSource && {tintColor:colorScheme === 'dark' ? Colors.light_main: Colors.dark_main,borderColor:colorScheme === 'dark' ? Colors.light_main: Colors.dark_main} ]} />

      </TouchableOpacity>


      <View style={styles.inputContainer}>


      <TextInput 
              style={{color:colorScheme === 'dark' ? Colors.light_main: Colors.dark_main,flex:1}}
              placeholder='Enter new username'
              value={username}
              onChangeText={setUsername}
              placeholderTextColor='gray'
          />



          
      {usernameloading && <ActivityIndicator style={{marginEnd:10}} color={Colors.blue} />}

      {!usernameloading&& isAvailable !== null && (
        <View style={{height:20,width:20}}>

          <Image
            style={{height:20,width:20,marginEnd:10,paddingRight:5,marginRight:10,marginTop:5,alignSelf:'center'}} 
            source={!isAvailable ? require('@/assets/icons/check.png') : require('@/assets/icons/incorrect.png')}/>

        </View>
        
      )}

      </View>

      {ispromotion && <View style={{marginTop:15}}>
        <Text style={{fontSize:16,color:colorScheme === 'dark' ? Colors.light_main: Colors.dark_main,fontWeight:'bold'}}>Promo code</Text>

        <View style={[styles.inputContainer, {width:'70%'}]}>

          <TextInput 
                  style={{color:colorScheme === 'dark' ? Colors.light_main: Colors.dark_main,flex:1}}
                  placeholder='Referal(optional)'
                  value={referal}
                  onChangeText={setReferal}
                  placeholderTextColor='gray'
              />

        </View>

          
      </View>
      }
      
      

      <TouchableOpacity onPress={setInfoDatabase}
      style={{width:'80%',padding:10,backgroundColor:Colors.blue,borderRadius:10,
      alignSelf:'center',marginTop:40}} >
        { loading ? <ActivityIndicator style={{alignSelf:'center'}} size='small' color='white' /> :
         <Text style={{color:'white',alignSelf:'center'}}>Continue</Text>
        }
          </TouchableOpacity>


          
          {loading && (
            <CustomDialog isVisible={loading}>

            </CustomDialog>
              
          )}




      </View>


    </SafeAreaView>
   
  )
}

export default profileInfo

const styles = StyleSheet.create({inputContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent:'space-between',
  borderColor: 'gray',
  borderWidth: 1,
  paddingVertical:10,

  marginTop:15,

  borderRadius: 5,
 
  paddingHorizontal: 10,
}, profileImage:{width:100,height:100,
  
  borderWidth:3,borderRadius:50,marginEnd:10,
  marginStart:20,alignSelf:'center'},loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    // semi-transparent background
  }})