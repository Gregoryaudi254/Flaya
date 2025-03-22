import { StyleSheet, Text, View ,TextInput,TouchableOpacity,Image,ActivityIndicator} from 'react-native'
import React,{useState,useEffect} from 'react'
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';

import { useToast } from 'react-native-toast-notifications';
import { useAuth } from '@/constants/AuthContext';
import { useRouter } from 'expo-router';
import CustomDialog from '@/components/CustomDialog';
import { useColorScheme } from '@/hooks/useColorScheme';
import DeviceInfo from 'react-native-device-info';
import { collection, getDocs, query, where } from 'firebase/firestore';

import { db } from '@/constants/firebase';


const signUp = () => {

  const colorScheme = useColorScheme();

  const router = useRouter();
  const [passwordVisible,setPasswordVisible] = useState(false);

  const [name,setname] = useState('');
  const [password,setPassword] = useState('');

  const [email,setemail] = useState('');
  const [loading,setloading] = useState(false);

  const {signUp,signInGoogle,isAuthenticated,user} = useAuth();

  const [isgooglesign, setGoogleSignIn] = useState(false)

  useEffect(() => {
   
    if (isgooglesign) {
      
      if (user && isAuthenticated) {
        console.log("isauthenticated");
        router.replace('/(tabs)')
      }else if (user && isAuthenticated === false) {
        router.replace('/(profile)')
      }

    }
  },[isAuthenticated,user])

   
  const toggleSecureEntry = () => {
    setPasswordVisible(!passwordVisible);
  };


  const DeviceGood = async () =>{
    const uniqueID = await DeviceInfo.getUniqueId();
    console.log("unique "+ uniqueID)
    const usersRef = collection(db, 'users');
    // Create a query to find users whose interests array contains the value
    const q = query(usersRef, where('devicecreatorid', '==', uniqueID));

    // Execute the query and get the results
    const snapshot = await getDocs(q);

    return snapshot.docs.length < 4;
  }


  const checkinput = async () =>{

    if(!name){
      showToast('Enter your name')
      return;
    }

    if(!email){
      showToast('Enter your email')
      return;
    }

    if(!isValidEmail(email)){
      showToast('Invalid email')
      return;
    }
    if(!password){
      showToast('Enter your password')
      return;
    }

    if(!isValidPassword(removeSpaces(password))){
      showToast('Password should contain atleast 1 character and minimum of 8 characters')
      return;
    }

    setloading(true);

    // check device has already signed up
    const isDeviceGood = await DeviceGood();

    if (!isDeviceGood) {
      setloading(false);
      showToast("something went wrong. Try again later")
      return;
    }


    try {
      const result = await signUp(email, password, name);
     
      if (result.status === 'failed') {
        showToast(result.error);
        setloading(false);

        return;
      }

      router.replace('/(profile)')

    } catch (err) {
      // Catch and display the error message
      setError(err.message || 'An error occurred while signing up.');
      console.error('Error in signUp:', err);
    }



  }

  

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

  function showToast(message){
    toast.show(message, {
      type: "normal",
      placement: "bottom",
      duration: 2000,
      offset: 30,
      animationType: "zoom-in",
    });

  }


  const handleLoginPress = ()=>{
    router.push('/(auth)/signIn')
  }

  const googlePress = async ()=>{

    setloading(true)

    setGoogleSignIn(true)
    const success = await signInGoogle();

    if (!success) {
      showToast("something went wrong")
      setloading(false)

      setGoogleSignIn(false)
    }
  }



  return (

    <SafeAreaView style={{flex:1}}>

    <View style={{marginHorizontal:20,flex:1}}>


       <Text style={{fontSize:30,color:colorScheme === 'dark' ? Colors.light_main: Colors.dark_main,fontWeight:'bold',marginStart:15,margin:20}}>Sign up with mail</Text>


       <View style={styles.inputContainer}>

        <TextInput
        style={[styles.input, {color:colorScheme === 'dark' ? Colors.light_main: Colors.dark_main}]}
         onChangeText={setname}
       
        placeholder="Name"
        value={name}
        placeholderTextColor='gray'
        secureTextEntry={passwordVisible}
        />
        

       </View>


       <View style={styles.inputContainer}>

        <TextInput
        style={[styles.input, {color:colorScheme === 'dark' ? Colors.light_main: Colors.dark_main}]}
         onChangeText={setemail}
        
        value={email}

        keyboardType='email-address'
        autoCapitalize='none'


        placeholder="Email"
        placeholderTextColor='gray'
        secureTextEntry={passwordVisible}


        />
      

        </View> 

        <View style={styles.inputContainer}>

        <TextInput
        style={[styles.input, {color:colorScheme === 'dark' ? Colors.light_main: Colors.dark_main}]}
         onChangeText={setPassword}
        value={password}
     
        placeholder="Password"
        placeholderTextColor='gray'
        secureTextEntry={passwordVisible}


        />
        <TouchableOpacity onPress={toggleSecureEntry} style={styles.toggleButton}>
        <Image 
        source={passwordVisible? require('@/assets/icons/view.png') : require('@/assets/icons/hide.png')}
        style={styles.toggle}/>
        </TouchableOpacity>

        </View>


        <TouchableOpacity onPress={checkinput} style={{width:'80%',padding:10,backgroundColor:Colors.blue,borderRadius:10,alignSelf:'center',marginTop:40}} >
        { loading ? <ActivityIndicator style={{alignSelf:'center'}} size='small' color={colorScheme === 'dark' ? Colors.light_main: Colors.dark_main} /> :
         <Text style={{color:'white',alignSelf:'center'}}>Sign up</Text>
        }
          </TouchableOpacity>


          <Text style={{color:'tomato',fontSize:15,fontWeight:'bold',flex:1}} ></Text>


          <TouchableOpacity onPress={googlePress} style={{width:'80%',padding:10,borderColor:Colors.blue,borderWidth:1,justifyContent:'center',borderRadius:10,alignSelf:'center',marginTop:40}} >
            { loading ? <ActivityIndicator style={{alignSelf:'center'}} size='small' color={colorScheme === 'dark' ? Colors.light_main: Colors.dark_main} /> :
            <View style={{flexDirection:'row',alignItems:'center',alignSelf:'center'}}>
                <Image source={require('@/assets/icons/google.png')} style={{width:20,height:20,marginEnd:5}}/>
                <Text style={{color:colorScheme === 'dark' ? Colors.light_main: Colors.dark_main,alignSelf:'center'}}>Continue with Google</Text>
            </View> 
            }
          </TouchableOpacity>



          <View style={{flexDirection:'row',alignSelf:'center',margin:10}}>
            <Text
            style={{color:colorScheme === 'dark' ? Colors.light_main: Colors.dark_main,flexDirection:'row',alignSelf:'center',
            fontWeight:'condensed',fontSize:15,textAlign:'center'}}>Don't have an account?</Text>


            <TouchableOpacity style={{alignSelf:'center'}} onPress={handleLoginPress}>
              <Text style={{color:'tomato',fontSize:15,fontWeight:'bold',marginStart:5}} >Login</Text>
              </TouchableOpacity>
          </View>







          {loading && (
            <CustomDialog isVisible={loading}>

            </CustomDialog>
              
          )}
    </View>

    </SafeAreaView>
    
  )
}

export default signUp

const styles = StyleSheet.create({
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    // semi-transparent background
  },
  input: {
  height: 40,
  width:'80%',
  fontSize: 16,
},
inputContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent:'space-between',
  borderColor: 'gray',
  borderWidth: 1,
  marginTop:15,

  borderRadius: 5,
 
  paddingHorizontal: 10,
},
toggle:{
  width:20,height:20,tintColor:'gray'

}})