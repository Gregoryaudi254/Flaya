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

const forgotpassword = () => {

  const colorScheme = useColorScheme();

  const router = useRouter();
  const [passwordVisible,setPasswordVisible] = useState(false);

  const {handlePasswordReset} = useAuth()

  const [queryinfo,setqueryinfo] = useState('');
  const [loading,setloading] = useState(false);

 
  
  

  const checkinput = async () =>{

    if(!queryinfo){
      showToast('Enter your email or username')
      return;
    }

    setloading(true);


    const infoResult = await queryUser(stringwithoutspaces(queryinfo.toLocaleLowerCase()));

    if(infoResult){

      if(infoResult.signtype === 'gmail'){
        showToast('Continue with gmail sign in');

        setloading(false);

        return;
      }


        const statusReset = await handlePasswordReset(infoResult.email.trim());

        if (statusReset.status === "passed") {
        showToast("Password reset link sent to your email!")
        }else {
        showToast(statusReset.error)
        }

        setloading(false);

    }else{
      showToast('User does not exist')
      setloading(false);
      return;
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

  




  return (

    <SafeAreaView style={{flex:1}}>

    <View style={{marginHorizontal:20,flex:1}}>


       <Text style={{fontSize:30,color:colorScheme === 'dark' ? Colors.light_main: Colors.dark_main,fontWeight:'bold',marginStart:15,margin:20}}>Enter your email</Text>


      
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


        <TouchableOpacity onPress={checkinput} style={{width:'80%',padding:10,backgroundColor:Colors.blue,borderRadius:10,alignSelf:'center',marginTop:40}} >
        { loading ? <ActivityIndicator style={{alignSelf:'center'}} size='small' color='white' /> :
         <Text style={{color:'white',alignSelf:'center'}}>Send link</Text>
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

export default forgotpassword;

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