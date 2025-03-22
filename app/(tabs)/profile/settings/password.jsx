import { StyleSheet, Text, View,TextInput,TouchableOpacity ,Image, ActivityIndicator} from 'react-native'
import React,{useState} from 'react'
import { Colors } from '@/constants/Colors'

import { useAuth } from '@/constants/AuthContext'

import { useToast } from 'react-native-toast-notifications';
import { router } from 'expo-router';
import { useColorScheme } from '@/hooks/useColorScheme';

const password = () => {

  const colorScheme = useColorScheme()

  const {updateUserPassword, user,handlePasswordReset} = useAuth()

  const [passwordVisible,setPasswordVisible] = useState(false)

  const [currentpassword,setcurrentpassword] = useState('')
  const [newpassword,setnewpassword] = useState('')
  const [confirmnewpassword,setconfirmnewpassword] = useState('')

  const [loading,setLoading] = useState(false)
   
  const toggleSecureEntry = () => {
    setPasswordVisible(!passwordVisible);
  };

  const isValidPassword = (password) => {
    return /^(?=.*\S).{8,}$/.test(password);
  };

  const removeSpaces = (str) => {
    return str.replace(/\s+/g, '');
  };
  

  const handleChangePassword = async () => {

    if(!currentpassword){
      showToast('Enter current password')
      return;
    }

    if(!newpassword){
      showToast('Enter new password')
      return;
    }

    if(!confirmnewpassword){
      showToast('Confirm new password')
      return;
    }

    
    if(!isValidPassword(removeSpaces(newpassword))){
      showToast('Password should contain atleast 1 character and minimum of 8 characters')
      return;
    }

    if (newpassword !== confirmnewpassword) {
      showToast('Password did not match');
      return;
    }

    setLoading(true);

    console.log(user.email)

    const changepasswordstatus = await updateUserPassword(user.email.trim(), currentpassword.trim(), newpassword.trim());

    if (changepasswordstatus.status === "passed") {
      console.log("passed")

      showToast("password changed successfully");

    }else {
      console.log("failed")
      showToast(changepasswordstatus.error);
    }

    setLoading(false);
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

  const onForgotPasswordPress = async () => {

    setLoading(true);

    const statusReset = await handlePasswordReset(user.email);

    if (statusReset.status === "passed") {
      showToast("Password reset link sent to your email!")
    }else {
      showToast(statusReset.error)
    }

    setLoading(false);
  }



  return (
    <View style={{flex:1,marginHorizontal:10,marginVertical:20}}>


      <Text style={{color:'gray',fontSize:15,fontWeight:'bold',marginTop:10}}>Your password should be atleast 8 characters long with some special symbols</Text>



        <View style={styles.inputContainer}>

            <TextInput
            style={[styles.input, {color:colorScheme === 'dark' ? Colors.light_main: Colors.dark_main}]}
         
          
            value={currentpassword}
            onChangeText={setcurrentpassword}
           
           
            placeholder="Enter current password"
            placeholderTextColor='gray'
            secureTextEntry={passwordVisible}
            
            
            />
            <TouchableOpacity onPress={toggleSecureEntry} style={styles.toggleButton}>
              <Image 
              source={passwordVisible? require('@/assets/icons/view.png') : require('@/assets/icons/hide.png')}
               style={styles.toggle}/>
            </TouchableOpacity>

        </View>


        <TouchableOpacity onPress={onForgotPasswordPress}>
         <Text style={{color:Colors.blue,fontSize:15,marginTop:5}}>Forgot password?</Text>

        </TouchableOpacity>

        <View style={styles.inputContainer}>

            <TextInput
              style={[styles.input, {color:colorScheme === 'dark' ? Colors.light_main: Colors.dark_main}]}
             onChangeText={setnewpassword}
         
            value={newpassword}



            placeholder="Enter new password"
            placeholderTextColor='gray'
            secureTextEntry={passwordVisible}


            />
            <TouchableOpacity onPress={toggleSecureEntry} style={styles.toggleButton}>
            <Image 
            source={passwordVisible? require('@/assets/icons/view.png') : require('@/assets/icons/hide.png')}
            style={styles.toggle}/>
            </TouchableOpacity>

        </View>  

        <View style={styles.inputContainer}>

            <TextInput
              style={[styles.input, {color:colorScheme === 'dark' ? Colors.light_main: Colors.dark_main}]}
             onChangeText={setconfirmnewpassword}
          
            value={confirmnewpassword}



            placeholder="Confirm new password"
            placeholderTextColor='gray'
            secureTextEntry={passwordVisible}


            />
            <TouchableOpacity onPress={toggleSecureEntry} style={styles.toggleButton}>
            <Image 
            source={passwordVisible? require('@/assets/icons/view.png') : require('@/assets/icons/hide.png')}
            style={styles.toggle}/>
            </TouchableOpacity>

        </View>



    


        <TouchableOpacity

            onPress={handleChangePassword}
            
            style={{
                width: '100%',
                height: 40,
                marginTop:40,
                alignSelf:'flex-end',
                alignItems:'center',
                borderRadius:5,
                backgroundColor:Colors.blue,
                
            }}
          >
    
            <View style={{flexDirection:'row',height:'100%'}}>

    
              {!loading ? <Text style={{
                  color: 'white',
                  alignSelf:'center',
                  fontSize: 15
              }}>Change password
              </Text> : <ActivityIndicator style={{alignSelf:'center'}} size="small" color="white" />}
    
            </View>
            
        </TouchableOpacity>

    </View>
  )
}

export default password

const styles = StyleSheet.create({
    input: {
        height: 40,
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

      }
     
})