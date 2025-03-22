import { StyleSheet, Text, View ,Image,TouchableWithoutFeedback} from 'react-native'
import React,{useState,useEffect} from 'react'

import { Colors } from '@/constants/Colors'
import {LinearGradient} from 'expo-linear-gradient'



import { useRouter } from 'expo-router'
import { timeAgo } from '@/constants/timeAgo'
import { useColorScheme } from '@/hooks/useColorScheme'

const MessageItem = ({message:{photo,username,stamp,message,senderid,isread,isoppread,hasstories,isrequestaccepted,unreadcount,id},page, currentuserid}) => {


  const router = useRouter();

    const colorScheme = useColorScheme();
   

    const [isSenderIdSame,setSenderSame] = useState(null);

    const [isOppReadU,setOppRead] = useState(isoppread);

    const [isCurrentUserRead,setCurrectUserRead] = useState(isread)

    useEffect(() => {
        setSenderSame(senderid === currentuserid);

        setOppRead(isoppread);

        console.log("oppread "+isoppread)

        setCurrectUserRead(isread)
      }, [senderid,isoppread,isread]);


    

  return (
    <View style={{flexDirection:'row',margin:15}}>


      <LinearGradient
        colors={['#FF7F50', '#FF6347', '#FF4500']} // Define your gradient colors here
        style={!hasstories ?{width:60,height:60,borderRadius:30}:styles.gradient}
        start={{ x: 0, y: 0 }} // Gradient start point (top-left)
        end={{ x: 1, y: 1 }} // Gradient end point (bottom-right)
      >
        <Image
        resizeMode="cover"
        source={{uri:photo}}
        style={[styles.profileImage, !hasstories && {borderWidth:0}, {borderColor:colorScheme === 'dark' ? Colors.dark_main: Colors.light_main}] }
        />

      </LinearGradient>




    
       <View style={{flex:1,marginStart:15}}>

       <View style={{flex:1,marginStart:15}}>

      <View style={{flexDirection:'row',justifyContent:'space-between'}}>

      <Text style={{fontSize:20,fontWeight:'bold',color:colorScheme === 'dark' ? Colors.light_main: Colors.dark_main}}>{username}</Text>


      <Text style={styles.stampText}>{timeAgo(stamp)}</Text>




      </View>

        <View style={{flexDirection:'row',justifyContent:'space-between',marginTop:5}}>

        <View style={{flexDirection:'row'}}>

        {(isSenderIdSame && isOppReadU) &&
          <Image style={{tintColor:Colors.blue,width:25,height:25}} source={require('@/assets/icons/check-mark.png')}/>
        } 
        <Text numberOfLines={1} style={[{fontSize:15,color:colorScheme === 'dark' ? Colors.light_main: Colors.dark_main}, (isSenderIdSame || isCurrentUserRead || isSenderIdSame === null) && {color:'gray'}]}>{message}</Text>

        </View>

        { (isSenderIdSame !== null && !isSenderIdSame && !isCurrentUserRead && page === 'primary') && (
        <View style={styles.circle}>
          <Text style={styles.text}>{unreadcount || 1}</Text>
        </View>
        )
        }



</View>



  </View>

       </View>


       
        
    </View>
  )
}

export default MessageItem

const styles = StyleSheet.create({
    messageText:{
        fontSize:15,
    },
    text: {
        color: 'white', // Text color
        fontSize: 10, // Text size
      },
      stampText: {
        color: 'gray', // Text color
        fontSize: 15, // Text size
      },
    circle: {
        width: 20, // Width of the circle
        height: 20, // Height of the circle
        borderRadius: 5, // Half of the width/height to make it circular
        backgroundColor: Colors.blue, // Background color
        justifyContent: 'center', // Center the text horizontally
        alignItems: 'center', // Center the text vertically
      },
      profileImage: {
        width: 65,
        height: 65,
        alignSelf:'center',
        borderWidth:3,
        overflow:'hidden',
       
        borderRadius: 32.5,
       
      }, 
      gradient: {
        width: 72,
        height: 72,
        
        flexDirection:'column',
        borderRadius: 36,
        justifyContent: 'center',
        alignItems: 'center',
      },
})