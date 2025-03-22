import { StyleSheet, Text, View ,TextInput,TouchableOpacity,Image,ActivityIndicator} from 'react-native'
import React,{useEffect, useState} from 'react'
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';

import { useToast } from 'react-native-toast-notifications';
import { useAuth } from '@/constants/AuthContext';
import { useRouter } from 'expo-router';
import CustomDialog from '@/components/CustomDialog';

import { collection, query, where, getDocs} from 'firebase/firestore';

import { db } from '@/constants/firebase';
import { useColorScheme } from '@/hooks/useColorScheme';

const signIn = () => {


  const colorScheme = useColorScheme();

  const router = useRouter();
  const [passwordVisible,setPasswordVisible] = useState(false);

  const [name,setname] = useState('');
  const [password,setPassword] = useState('');

  const [queryinfo,setqueryinfo] = useState('');
  const [loading,setloading] = useState(false);

  const {signIn,signInGoogle,isAuthenticated,user} = useAuth();
  const [isgooglesign, setGoogleSignIn] = useState(false);

  const toggleSecureEntry = () => {
    setPasswordVisible(!passwordVisible);
  };

  useEffect(() => {

    if (user && isAuthenticated) {
      console.log("isauthenticated");
      router.replace('/(tabs)')
    }else if (user && isAuthenticated === false) {
      router.replace('/(profile)')
    }else if (user === null && isAuthenticated === false && loading) {
      setloading(false);
    }
    
   
  },[isAuthenticated,user, isgooglesign]);

  const checkinput = async () =>{

    if(!queryinfo){
      showToast('Enter your email,username or phone')
      return;
    }

   
    if(!password){
      showToast('Enter your password')
      return;
    }

  
    setloading(true);


    const infoResult = await queryUser(stringwithoutspaces(queryinfo).toLowerCase());

    if(infoResult){

      if(infoResult.signtype === 'gmail'){
        showToast('Continue with gmail sign in');

        setloading(false);

        return;
      }

    }else{
      showToast('user does not exist')

      setloading(false);
      return;
    }





    try {
      const result = await signIn(infoResult.email, password);

      if (result.status === 'failed') {
        showToast('signing failed')
        setloading(false);
        return;
      }

      //router.replace('/(tabs)')



    } catch (err) {
      // Catch and display the error message
     // setError(err.message || 'An error occurred while signing up.');
      console.log('Error in signUp:', err);
      setloading(false);
      showToast('Password or email does not match')
    }



  }

  const stringwithoutspaces = (str) =>{
    return str.replace(/\s+/g, '');
  }


  const queryUser = async (info) => {
    try {
      // Create a reference to the users collection
      const usersRef = collection(db, 'users');
  
      // Create a query to find users whose interests array contains the value
      const q = query(usersRef, where('infoarray', 'array-contains', info));
  
      // Execute the query and get the results
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        // Get the first document
        const user = querySnapshot.docs[0];
        
        // Access the document data
        const userData = user.data();
      


        return {
          email:userData.email,
          signtype:userData.signintype
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

  function showToast(message){
    toast.show(message, {
      type: "normal",
      placement: "bottom",
      duration: 2000,
      offset: 30,
      animationType: "zoom-in",
    });

  }

  const handleSignUpPress = ()=>{
    router.back()
  }

  const googlePress = async ()=>{

    setloading(true);

    setGoogleSignIn(true);
    
    const success = await signInGoogle();

    if(!success){
      setloading(false);
      showToast("something went wrong");
      setGoogleSignIn(false)
    }

  }

  const movetoForgotPassword = () => {
    router.push('/(auth)/forgotpassword')
  }




  return (

    <SafeAreaView style={{flex:1}}>

    <View style={{marginHorizontal:20,flex:1}}>


       <Text style={{fontSize:30,color:colorScheme === 'dark' ? Colors.light_main: Colors.dark_main,fontWeight:'bold',marginStart:15,margin:20}}>Sign in with mail</Text>


      


       <View style={styles.inputContainer}>

        <TextInput
        style={[styles.input, {color:colorScheme === 'dark' ? Colors.light_main: Colors.dark_main}]}
         onChangeText={setqueryinfo}
        
        value={queryinfo}

        keyboardType='email-address'
        autoCapitalize='none'


        placeholder="Email or username"
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
        { loading ? <ActivityIndicator style={{alignSelf:'center'}} size='small' color='white' /> :
         <Text style={{color:'white',alignSelf:'center'}}>Sign in</Text>
        }
          </TouchableOpacity>



          <TouchableOpacity onPress={movetoForgotPassword} style={{alignSelf:'center',flex:1,marginTop:10}}>

            <Text style={{color:'tomato',fontSize:15,fontWeight:'bold'}} >Forgot password?</Text>

          </TouchableOpacity>


          


          <TouchableOpacity onPress={googlePress} style={{width:'80%',padding:10,borderColor:Colors.blue,borderWidth:1,justifyContent:'center',borderRadius:10,alignSelf:'center',marginTop:40}} >
            { loading ? <ActivityIndicator style={{alignSelf:'center'}} size='small' color='white' /> :
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


            <TouchableOpacity style={{alignSelf:'center'}} onPress={handleSignUpPress}>
              <Text style={{color:'tomato',fontSize:15,fontWeight:'bold',marginStart:5}} >Sign up</Text>
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

export default signIn;

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
  fontSize: 16,},

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

}
})