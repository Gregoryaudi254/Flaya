import { StyleSheet, Text, View ,Image} from 'react-native'
import React, { useEffect } from 'react'
import { getDistance } from 'geolib'

import { LinearGradient } from 'expo-linear-gradient'
import { TouchableWithoutFeedback } from 'react-native-gesture-handler'
import { useColorScheme } from '@/hooks/useColorScheme'
import { Colors } from '@/constants/Colors'

const ActiveUsersItem = ({activeUser:{hasstories,coordinates,isshowingdistance,username,profilephoto,id},currentuserlocation, onPress}) => {

  const colorScheme = useColorScheme();

  const distance = getDistance(
    { latitude: currentuserlocation.coords.latitude, longitude: currentuserlocation.coords.longitude },
    { latitude: coordinates._latitude, longitude: coordinates._longitude }
  );


  return (

    <View style={{alignItems:'center',marginHorizontal:10}}>

        <TouchableWithoutFeedback onPress={() => onPress({id:id, username:username})}>

          <LinearGradient
          colors={['#FF7F50', '#FF6347', '#FF4500']} // Define your gradient colors here
          style={!hasstories ?{width:60,height:60,borderRadius:30,marginBottom:5}:styles.gradient}
          start={{ x: 0, y: 0 }} // Gradient start point (top-left)
          end={{ x: 1, y: 1 }} // Gradient end point (bottom-right)
          >
              <Image
              resizeMode="cover"
              source={{uri:profilephoto}}
              style={[styles.profileImage, !hasstories && {borderWidth:0}, {borderColor:colorScheme === 'dark' ? Colors.dark_main: Colors.light_main}] }
              />

        </LinearGradient>

        </TouchableWithoutFeedback>

        
      {isshowingdistance && 
      <Text style={{fontSize:10,color:'gray',marginTop:5}}>{distance} m</Text>}

      <Text style={{fontSize:10,color:colorScheme === 'dark' ? Colors.light_main: Colors.dark_main,marginTop:isshowingdistance?1:5}}>{username}</Text>
    </View>
  )
}

export default ActiveUsersItem

const styles = StyleSheet.create({
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