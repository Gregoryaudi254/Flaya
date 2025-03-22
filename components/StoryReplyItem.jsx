import { StyleSheet, Text, View,TouchableOpacity,Image, TouchableWithoutFeedback } from 'react-native'
import React from 'react'

import { getDistance } from 'geolib';
import { timeAgo } from '@/constants/timeAgo';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

const StoryReplyItem = ({viewer:{coordinates,username,response,createdAt,image,id},threadCoordinates,handleChatPress,handleUserPress}) => {



    const colorScheme = useColorScheme();

   
    const distance = getDistance(
        { latitude: coordinates.latitude || 0, longitude: coordinates.longitude || 0 },
        { latitude: threadCoordinates.latitude || 0, longitude: threadCoordinates.longitude || 0 }
    );

  return (
    <View>
      <View style={{flexDirection:'row',flex:1,margin:10,alignItems:'center'}}>


      <TouchableWithoutFeedback onPress={() => handleUserPress(id)}>

        <Image
          resizeMode="cover"
          source={{uri:image}}
          style={{width:40,height:40,borderRadius:20}}
          />

      </TouchableWithoutFeedback>
      



        <TouchableWithoutFeedback onPress={() => handleUserPress(id)}>

        <View style={{flex:1,marginStart:10}}>

        

          <View style={{flexDirection:'row'}}>

            <Text style={{fontSize:15,color:colorScheme === 'dark' ? Colors.light_main: Colors.dark_main,fontWeight:'bold'}}>{username}</Text>

            <Text style={{fontSize:15,color:'gray',marginStart:5}}>{timeAgo(createdAt)}</Text>
            
          </View>

          <View style={{flexDirection:'row',marginTop:5,alignItems:'center'}}>

              <Image
              resizeMode="cover"
              source={require('@/assets/images/location-pin.png')}
              style={{height:14,width:14}}
              />

              <Text style={{fontSize:13,color:'gray'}}>{` ${distance} m`}</Text>

          </View>



        </View>

        </TouchableWithoutFeedback>

      


        <TouchableOpacity onPress={() => handleChatPress(id,username)} style={{
          // Background color
            padding: 5, 
            paddingHorizontal:10,               // Padding around the text
            borderRadius: 5,
            height:40
                // Rounded corners
        }} >
            <Image source={require('@/assets/icons/sendM.png')} style={{width:20,height:20,tintColor:'orange',alignSelf:'center'}}/>
        </TouchableOpacity>

      </View>

      {response && <View style={{marginHorizontal:15,flexDirection:'row'}}>

        <Image source={require('@/assets/icons/respond.png')} style={{width:15,height:15,tintColor:colorScheme === 'dark' ? Colors.light_main: Colors.dark_main}}/>
        <Text style={{fontSize:15,color:colorScheme === 'dark' ? Colors.light_main: Colors.dark_main,marginStart:5}} >{response}</Text>

      </View>
      
      }


      <View style={{width:'100%',height:0.6,backgroundColor:colorScheme === 'dark' ? Colors.light_main: Colors.dark_main,marginTop:10}}/>
    </View>
  )
}

export default StoryReplyItem

const styles = StyleSheet.create({})