import { StyleSheet, Text, View,Image,TextInput, TouchableOpacity,ActivityIndicator } from 'react-native'
import React,{useState,useLayoutEffect,useCallback,useEffect,useRef} from 'react'
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '@/constants/Colors';

import {useNavigation} from 'expo-router'

import { debounce } from 'lodash';
import { collection, doc, getDoc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { db } from '@/constants/firebase';
import { getData, storeData } from '@/constants/localstorage';
import { useToast } from 'react-native-toast-notifications';
import { getImageDownloadUrl } from '@/constants/common';
import { useColorScheme } from '@/hooks/useColorScheme';



function cleanString(str) {
  return str.trim()           // Remove spaces from start and end
            .replace(/\s+/g, ' ')  // Replace multiple spaces with a single space
            .toLowerCase();        // Convert to lowercase
}

const profileedit = () => {

  const colorScheme = useColorScheme()

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

  

 

 

  const getUserData = useCallback(async()=>{
    const userInfo = await getData('@profile_info')

    const ref = doc(db, `users/${userInfo.uid}`);

    const snap = await getDoc(ref);
    const data = snap.data()

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





 

  return (


    <View >
      {isLoaded ? <View style={{marginHorizontal:10,marginVertical:20}}> 


      <TouchableOpacity onPress={pickImageAsync}>

        <Image  source={{uri:imageSource}} 
            style={styles.profileImage} />

      </TouchableOpacity>



      <Text style={{fontSize:15,color:'gray',marginTop:10}}>Name</Text>


      <View style={{flexDirection:'row',marginTop:10}}>


          <TextInput 
              style={{color:colorScheme === 'dark'? Colors.light_main:Colors.dark_main,flex:1}}
              placeholder='Enter your full name'
              placeholderTextColor='gray'
              value={name}
              onChangeText={setName}
          />


      </View>


      <View style={{height:1,width:'100%',backgroundColor:colorScheme === 'dark'? Colors.light_main:Colors.dark_main,marginTop:10,marginBottom:10}}/>


      <Text style={{fontSize:15,color:'gray'}}>username</Text>


      <View style={{flexDirection:'row',marginTop:10}}>


          <TextInput 
                  style={{color:colorScheme === 'dark'? Colors.light_main:Colors.dark_main,flex:1}}
                  placeholder='Name that is unique'
                  value={username}
                  onChangeText={setUsername}
                  
                  placeholderTextColor='gray'
              />



              
          {usernameloading && <ActivityIndicator style={{marginEnd:10}} color={Colors.blue} />}

          {!usernameloading&& isAvailable !== null && (
            <View style={{height:20,width:20}}>

                <Image
                style={{height:20,width:20,marginEnd:10,paddingRight:5,marginRight:10,marginTop:5,alignSelf:'center'}} 
                source={isAvailable ? require('@/assets/icons/check.png') : require('@/assets/icons/incorrect.png')}/>

            </View>
            
          )}

      </View>


      <View style={{height:1,width:'100%',backgroundColor:colorScheme === 'dark'? Colors.light_main:Colors.dark_main,marginTop:10,marginBottom:10}}/>


      <Text style={{fontSize:15,color:'gray'}}>Brief caption</Text>


      <View style={{flexDirection:'row',marginTop:10}}>


          <TextInput 
                  style={{color:colorScheme === 'dark'? Colors.light_main:Colors.dark_main,flex:1}}
                  placeholder='Caption..'
                  value={caption}
                  onChangeText={setCaption}
                  placeholderTextColor='gray'
              />

      </View>


      <View style={{height:1,width:'100%',backgroundColor:colorScheme === 'dark'? Colors.light_main:Colors.dark_main,marginTop:10}}/>



      

      </View> : <ActivityIndicator style={{alignSelf:'center',marginTop:70}} size="large" color={colorScheme === 'dark'? Colors.light_main:Colors.dark_main}/>}

    </View>

    
  )
}

export default profileedit

const styles = StyleSheet.create({
  profileImage:{width:100,height:100,
    borderColor:'white',
    borderWidth:3,borderRadius:50,marginEnd:10,
    marginStart:20,alignSelf:'center'}
})