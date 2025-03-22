import { StyleSheet, Text, View,ScrollView ,TouchableOpacity,Image,Switch, ActivityIndicator} from 'react-native'
import React,{useEffect, useState} from 'react'

import { useRouter } from 'expo-router';
import CustomDialog from '@/components/CustomDialog';
import { useAuth } from '@/constants/AuthContext';
import { Colors } from '@/constants/Colors';
import { getData, storeData } from '@/constants/localstorage';
import { db } from '@/constants/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useDispatch } from 'react-redux';
import { setValues } from '@/slices/profileViewSlice';

import { useSelector } from 'react-redux';
import { useColorScheme } from '@/hooks/useColorScheme';




const index = () => {

  const dispatch = useDispatch();
  const colorScheme = useColorScheme();

  const { viewstatus} = useSelector(state => state.profile);

  

  const [isLikes,setLikes] = useState(false);
  const [isComment,setComment] = useState(false)
  const [isNewSubscriber,setNewSubscriber] = useState(false)
  const [isDirectMessaging,setDirectMessaging] = useState(false)

  const [dialog,setDialog] = useState(false);


  const {user,logout} = useAuth();


useEffect(() =>{

  const getSettings = async () => {
    let settings = await getData("@settings");
    settings = settings || {}

    const notification = settings.notification || {};

    setLikes(notification.likes || false);
    setNewSubscriber(notification.subscribers || false);
    setDirectMessaging(notification.messages || false);
    setComment(notification.comments || false);

    dispatch(setValues(settings.profileview || 'everyone'))

  }

  getSettings();

},[dispatch])

  const router = useRouter();

  const handlePhonePress = () =>{
    router.push({
      pathname: '/(tabs)/profile/settings/phoneAuth'
    });
  }


  const handleEmaiPress = () =>{
    router.push({
      pathname: '/(tabs)/profile/settings/emailAuth'
    });
  }


  const handlePasswordPress = () =>{
    router.push({
      pathname: '/(tabs)/profile/settings/password'
    });
  }


  const handlePrivacyPress = () =>{
    router.push({
      pathname: '/(tabs)/profile/settings/privacy'
    });
  }


  const handlePolicyPress = () =>{
    router.push({
      pathname: '/(tabs)/profile/settings/policy'
    });
  }

  const handleIntellectualPress = () =>{
    router.push({
      pathname: '/(tabs)/profile/settings/intellectual'
    });
  }

  const handleTermsPress = () =>{
    router.push({
      pathname: '/(tabs)/profile/settings/terms'
    });
  }




  const handleDialogClose = () =>{
    setDialog(false)
  }

  

  const [onLoggingout,setlogginout] = useState(false);
  const onLogOutPress = async () =>{
    setlogginout(true)
    await logout(); 
    setDialog(false)
    router.replace('/(auth)')
  }

  const [authtype,setauthtype] = useState(null)

  useEffect(() => {

    const getauthtype = async () => {
      const authtype = await getData('@auth_type');
      setauthtype(authtype || "email")
    }

    getauthtype();

  },[]);


  const handleSettingsNotifiaction = async (value,status) => {
    const userInfo = await getData('@profile_info')
    const ref = doc(db,`users/${userInfo.uid}`);

    try {
      await updateDoc(ref, {
        [`settings.notification.${value}`]: !status
      });
      console.log("Notification setting successfully updated!");

      let settings = await getData('@settings');

      settings = settings || {}

      const notification = settings.notification || {}
      notification[value] = !status;

      settings.notification = notification

      await storeData('@settings',settings);

    } catch (error) {
      console.error("Update failed: ", error);
    }

  }





  return (

    <ScrollView style={styles.mainView}>

      <View style={{marginStart:10,marginTop:10,marginEnd:10}} >
        <Text style={{color:'gray',fontSize:15,fontWeight:'bold',marginBottom:10}}>ACCOUNT</Text>

        {/* <TouchableOpacity onPress={handlePhonePress}>
          <View style={styles.touchableView} >

            <Image style={styles.icons} source={require('@/assets/icons/phone.png')}/>

           <Text style={styles.text}>Phone</Text>

          </View>

        </TouchableOpacity> */}


       

        <TouchableOpacity>
          <View style={styles.touchableView} >

            <Image style={styles.icons} source={require('@/assets/icons/emailsettings.png')}/>

           <Text style={[styles.text, {flex:1,color:colorScheme === 'dark' ? Colors.light_main : Colors.dark_main}]}>Email</Text>

           <Text style={[styles.text, {color:colorScheme === 'dark' ? Colors.light_main : Colors.dark_main}]}>{user !== null ? user.email : ''}</Text>

          </View>

        </TouchableOpacity>

       

        {(authtype !== null && authtype === 'email') &&<TouchableOpacity onPress={handlePasswordPress}>
          <View style={styles.touchableView} >

            <Image style={styles.icons} source={require('@/assets/icons/padlocksettings.png')}/>

           <Text style={[styles.text, {color:colorScheme === 'dark' ? Colors.light_main : Colors.dark_main}]}>Password</Text>

          </View>

        </TouchableOpacity>}


        <Text style={{color:'gray',fontSize:15,fontWeight:'bold',marginBottom:20,marginTop:10}}>NOTIFICATION</Text>

        <View style={styles.viewNotification} >

          <View style={{flexDirection:'row',}}>

            <Image style={styles.icons} source={require('@/assets/images/heart.png')}/>

            <Text style={[styles.text, {color:colorScheme === 'dark' ? Colors.light_main : Colors.dark_main}]}>Likes</Text>

          </View>

          <Switch  trackColor={{ false: 'gray', true: '#3897f0' }}
           thumbColor={(isLikes !== null && isLikes) ? '#f4f3f4' : '#f4f3f4'}
           value={isLikes || false} onValueChange={() => {
            const newLikes = !isLikes; // Calculate new state
            handleSettingsNotifiaction("likes", !newLikes);
            setLikes(newLikes);
        }}/>

            

        </View>


        <View style={{
            flexDirection:'row',
            justifyContent:'space-between',
            marginTop:10
          }} >

          <View style={{flexDirection:'row', marginTop:5}}>

            <Image style={styles.icons} source={require('@/assets/icons/follow.png')}/>

            <Text style={[styles.text, {color:colorScheme === 'dark' ? Colors.light_main : Colors.dark_main}]}>New subscriber</Text>

          </View>

          <Switch  trackColor={{ false: 'gray', true: '#3897f0' }}
           thumbColor={(isNewSubscriber !== null && isNewSubscriber) ? '#f4f3f4' : '#f4f3f4'}
           onValueChange={() => {
             const newSubs = !isNewSubscriber
             handleSettingsNotifiaction("subscribers",!newSubs);
            setNewSubscriber(newSubs)} }
           value={isNewSubscriber || false}/>

            
        </View>

        
        <View style={{
            flexDirection:'row',
            justifyContent:'space-between',
            marginTop:10
          }} >

          <View style={{flexDirection:'row', marginTop:5}}>

            <Image style={styles.icons} source={require('@/assets/icons/messengersettings.png')}/>

            <Text style={[styles.text, {color:colorScheme === 'dark' ? Colors.light_main : Colors.dark_main}]}>Direct message</Text>

          </View>

          <Switch  trackColor={{ false: 'gray', true: '#3897f0' }}
           thumbColor={(isDirectMessaging !== null && isDirectMessaging) ? '#f4f3f4' : '#f4f3f4'}
           onValueChange={() => { 
            const directMess = !isDirectMessaging
            handleSettingsNotifiaction("messages",!directMess); 
            setDirectMessaging(directMess)} }
           value={isDirectMessaging || false} />

            

        </View>

        <View style={{
            flexDirection:'row',
            justifyContent:'space-between',
            marginTop:10
          }} >

          <View style={{flexDirection:'row',marginTop:5}}>

            <Image style={styles.icons} source={require('@/assets/icons/commentsettings.png')}/>

            <Text style={[styles.text, {color:colorScheme === 'dark' ? Colors.light_main : Colors.dark_main}]}>Comments</Text>

          </View>

          <Switch  trackColor={{ false: 'gray', true: '#3897f0' }}
           thumbColor={(isComment !== null && isComment) ? '#f4f3f4' : '#f4f3f4'}
           onValueChange={() => { 
            const comment = !isComment
            handleSettingsNotifiaction("comments",!comment); 
            setComment(comment)} }
           value={isComment || false} />

            
        </View>


        <Text style={{color:'gray',fontSize:15,fontWeight:'bold',marginBottom:20,marginTop:10}}>PRIVACY</Text>

        <View style={styles.viewNotification} >

          <View style={{flexDirection:'row'}}>

            <Image style={styles.icons} source={require('@/assets/icons/card.png')}/>

            <Text style={[styles.text, {color:colorScheme === 'dark' ? Colors.light_main : Colors.dark_main}]}>Profile</Text>

          </View>


          <TouchableOpacity onPress={handlePrivacyPress} style={{flexDirection:'row',alignItems:'center'}}>

            <Text style={{
              color:'gray',fontSize:15,marginStart:10,marginEnd:10
            }}>{viewstatus}</Text>

            <Image style={{ tintColor:'gray',
              height:15,
              width:15}} source={require('@/assets/icons/next.png')}/>

          </TouchableOpacity>

        </View>


        
        <Text style={{color:'gray',fontSize:15,fontWeight:'bold',marginBottom:10,marginTop:20}}>ABOUT</Text>


        <TouchableOpacity onPress={handleTermsPress}>
          <View style={styles.touchableView} >

            <Image style={styles.icons} source={require('@/assets/icons/terms-of-service.png')}/>

           <Text style={[styles.text, {color:colorScheme === 'dark' ? Colors.light_main : Colors.dark_main}]}>Terms of Service</Text>

          </View>

        </TouchableOpacity>

        <TouchableOpacity onPress={handlePolicyPress}>
          <View style={styles.touchableView} >

            <Image style={styles.icons} source={require('@/assets/icons/insurance.png')}/>

           <Text style={[styles.text, {color:colorScheme === 'dark' ? Colors.light_main : Colors.dark_main}]}>Privacy Policy</Text>

          </View>

        </TouchableOpacity>

        <TouchableOpacity onPress={handleIntellectualPress}>
          <View style={styles.touchableView} >

            <Image style={styles.icons} source={require('@/assets/icons/intellectual-property.png')}/>

           <Text style={[styles.text, {color:colorScheme === 'dark' ? Colors.light_main : Colors.dark_main}]}>Intellectual Property Policy</Text>

          </View>

        </TouchableOpacity>

        <View style={{flexDirection:'row',backgroundColor:'gray',height:1}}/>


        <TouchableOpacity onPress={()=>setDialog(true)}>
          <View style={styles.touchableView} >

            <Image style={styles.icons} source={require('@/assets/icons/exit.png')}/>

           <Text style={[styles.text, {color:colorScheme === 'dark' ? Colors.light_main : Colors.dark_main}]}>Log out</Text>

          </View>

        </TouchableOpacity>


        <CustomDialog onclose={handleDialogClose}  isVisible={dialog}>

        {!onLoggingout ?<View style={{padding:10,alignItems:'center',backgroundColor:Colors.dark_gray,borderRadius:10}}>

        

        <Text style={{color:'white',margin:5,fontSize:20,marginBottom:15}}>Log out account?</Text>


        <TouchableOpacity onPress={onLogOutPress}>

        <View  style={{flexDirection:'row'}}>

          <Image style={{width:30,height:30,tintColor:'red'}} source={require('@/assets/icons/exit.png')}/>

          <Text style={{color:'red',marginStart:5,fontSize:20}}>Log out</Text>

        </View>

        </TouchableOpacity>


        </View> : <ActivityIndicator size="large" color="white"/>}

        </CustomDialog>







      </View>

    </ScrollView>
    
  )
}

export default index

const styles = StyleSheet.create({
  mainView:{
    flex:1
  },
  touchableView:{
    flex:1,
    alignItems:'center',
   
    flexDirection:'row',
    marginVertical:10
  },
  icons:{
    tintColor:'gray',
    height:27,
    padding:5,
    width:27
  },
  text:{
    fontSize:15,marginStart:10
  },
  viewNotification:{
    flexDirection:'row',
    justifyContent:'space-between'
  },
  mainViewNotification:{
    flex:1,
    alignItems:'center',
    flexDirection:'row',
    marginVertical:10,
    justifyContent:'space-between'
  }


})