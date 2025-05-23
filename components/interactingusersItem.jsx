import { StyleSheet, Text, View,TouchableOpacity,Image } from 'react-native'
import React from 'react'

import { getDistance } from 'geolib';
import { timeAgo } from '@/constants/timeAgo';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

const interactingusersItem = React.memo(({userinfo:{coordinates,username,createdAt,profilephoto,senderid,uid},postcoordinate,handleChatPress,handleUserPress}) => {

  const colorScheme = useColorScheme();


  const distance = getDistance(
      { latitude: coordinates.latitude || coordinates._latitude, longitude: coordinates.longitude || coordinates._longitude },
      { latitude: postcoordinate._latitude || postcoordinate.latitude, longitude: postcoordinate._longitude || postcoordinate.longitude }
  );


return (
  <View>
    <View style={{flexDirection:'row',flex:1,margin:10,alignItems:'center'}}>

    <TouchableOpacity onPress={() => handleUserPress(senderid)}>
      <Image
        resizeMode="cover"
        source={{uri:profilephoto}}
        style={{width:50,height:50,borderRadius:25}}
        />

    </TouchableOpacity>
    

      <TouchableOpacity style={{flex:1}} onPress={() => handleUserPress(senderid)}>

        
      <View style={{flex:1,marginStart:10}}>

    
          <View style={{flexDirection:'row'}}>

            <Text style={{fontSize:15,color:colorScheme === 'dark' ? Colors.light_main : Colors.dark_main,fontWeight:'bold'}}>{username}</Text>

          </View>

          <View style={{flexDirection:'row',marginTop:5,alignItems:'center'}}>

              <Image
              resizeMode="cover"
              source={require('@/assets/images/location-pin.png')}
              style={{height:14,width:14, tintColor:colorScheme === 'dark' ? Colors.light_main : Colors.dark_main}}
              />

              <Text style={{fontSize:13,color:'gray'}}>{` ${distance} m`}</Text>

          </View>



        </View>


      </TouchableOpacity>


      <TouchableOpacity onPress={() => handleChatPress(senderid || uid,username)} style={{
        // Background color
          padding: 5, 
          paddingHorizontal:10,               // Padding around the text
          borderRadius: 15,
          justifyContent:'center',
          marginEnd:10,
          height:40,
          backgroundColor:"gray"
              // Rounded corners
      }} > 
       <Image source={require('@/assets/icons/sendM.png')} style={{width:20,height:20,tintColor:'white',alignSelf:'center'}}/>
          
      </TouchableOpacity>




    </View>

   


  
  </View>
)
})
 

export default interactingusersItem

const styles = StyleSheet.create({})