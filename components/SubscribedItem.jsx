import { StyleSheet, Text, View,Image,TouchableOpacity } from 'react-native'
import React, {useState} from 'react'
import { useRouter } from 'expo-router'
import { db } from '@/constants/firebase'
import { getData } from '@/constants/localstorage'
import { setDoc, deleteDoc ,doc, serverTimestamp} from 'firebase/firestore'
import { useColorScheme } from '@/hooks/useColorScheme'
import { Colors } from '@/constants/Colors'

const SubscribedItem = React.memo(({user:{username,profilephoto,name,mutual,id}}) => {

  const colorScheme = useColorScheme();

  const router = useRouter();

  console.log('photo '+profilephoto);

    const [isSubscribed,setSubscribed] =  useState(true)



    const handleSuPbscribePress = async () =>{
      const userinfo = await getData('@profile_info')
      //check if is opp user is subscribed
      const ref = doc(db, `users/${id}/subscribers/${userinfo.uid}`);

      if (!isSubscribed) {

        const currentuserinfo = {
          profilephoto:userinfo.profilephoto,
          username:userinfo.username,
          id:userinfo.uid,
          createdAt:serverTimestamp()
        }
  
        await setDoc(ref, currentuserinfo);

      }else {
        await deleteDoc(ref);

      }
  
      setSubscribed(!isSubscribed);

    }


    function getText (){
        return mutual? 'friends':'subscribed'
    }

    const handleProfilePress = () =>{
      router.push({
        pathname: '/(tabs)/profile/userprofile',
        params: {uid:id}

      });
  

    }



  return (


          <View style={{flexDirection:'row',flex:1,margin:10}}>


            <TouchableOpacity onPress={handleProfilePress}>

              <Image
              resizeMode="cover"
              source={{uri:profilephoto}}
              style={styles.profileImage}
              />

            </TouchableOpacity>

            <TouchableOpacity style={{flex:1}} onPress={handleProfilePress}>

              <View style={{flex:1}}>

              <Text style={{fontSize:20,color:colorScheme === 'dark' ? Colors.light_main: Colors.dark_main,fontWeight:'bold'}}>{username}</Text>

              <Text style={{fontSize:15,color:'gray'}}>{name}</Text>

              </View>

            </TouchableOpacity>
           


            <TouchableOpacity style={{
                backgroundColor: isSubscribed ? 'gray': '#3897f0', // Background color
                padding: 5, 
                paddingHorizontal:10,               // Padding around the text
                borderRadius: 5,
                height:40
                    // Rounded corners
            }} onPress={handleSuPbscribePress}>
                <Text style={styles.buttonText}>{isSubscribed ? getText():'subscribe'}</Text>
            </TouchableOpacity>

          

      
    </View>
  )
})


export default SubscribedItem

const styles = StyleSheet.create({
    profileImage: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginEnd: 10,
      },
      button: {
        backgroundColor:  'gray', // Background color
        padding: 5,                // Padding around the text
        borderRadius: 5,
        height:40
              // Rounded corners
      },
      buttonText: {
        color: 'white',             // Text color
        fontSize: 16,               // Font size
        textAlign: 'center',        // Center the text
      },
})