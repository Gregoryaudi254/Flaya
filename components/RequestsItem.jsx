import { StyleSheet, Text, View,Image } from 'react-native'
import React from 'react'
import { Colors } from '@/constants/Colors'

import { timeAgo } from '@/constants/timeAgo'

import { getDistance } from 'geolib';

const RequestsItem = ({request:{image,username,timestamp,address,requestType},productaddress}) => {

    
    const productLatLng = productaddress.latlng;

    

    const requestLatLng = address.latlng;

    console.log('request '+requestLatLng)

     const pointA = { latitude: productLatLng.latitude, longitude: productLatLng.longitude };
     const pointB = { latitude: requestLatLng.latitude, longitude: requestLatLng.longitude };


    


  return (
    <View style={{padding:10,backgroundColor:Colors.dark_gray,borderRadius:10,margin:10}}>

        <View style={{flexDirection:'row'}}>

            <Image
                resizeMode="cover"
                source={{uri:image}}
                style={styles.profileImage}
                />


                <View style={{marginStart:10}}>

                    <View style={{flexDirection:'row'}}>

                      <Text style={{fontSize:15,color:'white'}}>{username}</Text>

                      <Text style={{fontSize:15,color:'gray'}}> {timeAgo(timestamp)}</Text>

                    </View>


                    <View style={{flexDirection:'row',marginTop:5}}>


                        <Image
                            resizeMode="contain"
                            source={require('@/assets/images/location-pin.png')}
                            style={{width:20,height:20,tintColor:'gray'}}
                        />


                      <Text style={{fontSize:14,color:'gray',marginStart:5}}>{getDistance(pointA,pointB)}m</Text>

                    </View>

                  

                  

                </View>

        </View>


        <View style={{flexDirection:'row',padding:5,marginTop:10}}>

            <Image
            resizeMode="contain"
            source={require('@/assets/icons/lists.png')}
            style={{width:20,height:20,tintColor:'gray'}}/>

            <Text style={{fontSize:15,color:'white'}}>{requestType}</Text>

        </View>



      
    </View>
  )
}

export default RequestsItem

const styles = StyleSheet.create({
    profileImage: {
        width: 70,
        height: 70,
        borderRadius: 35,
        marginEnd: 10,
      }
})