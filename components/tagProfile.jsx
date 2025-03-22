import { StyleSheet, Text, View,Image ,TouchableOpacity} from 'react-native'
import React from 'react'

import {useRouter} from 'expo-router'
import { getData } from '@/constants/localstorage';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

const tagItem = ({user:{profilephoto, username, verified,uid},handleRemove}) => {

 
  const colorScheme = useColorScheme();

 
  return (
    <View style={{height:100,width:100}}>

        

        <Image source={{uri:profilephoto}} 
          style={{width:60,height:60,borderRadius:30,marginBottom:5,marginHorizontal:2.5}} />

       
        <View style={{width:'100%',flexDirection:'row',alignItems:'center'}}>

            <Text style={[{fontSize:17}, {color:colorScheme === 'dark' ? 'white' : 'black'}]}>{username}</Text>

            {verified && <Image
                              resizeMode="contain"
                              source={require('@/assets/icons/verified.png')}
                              style={{height:17,width:17,marginLeft:5}}
                            />}
        

        </View>

        <View style={{ position:'absolute',top:2,alignSelf:'flex-end'}}>
          <TouchableOpacity onPress={() => handleRemove(uid)}>
           <Image style={{tintColor:colorScheme === 'dark' ? Colors.light_main : Colors.dark_main,height:20 ,width:20, marginEnd:10,alignSelf:'flex-end'}} source={require('@/assets/icons/close.png')} />

          </TouchableOpacity>
        

        </View>

        

      </View>
    
  )
}

export default tagItem;

const styles = StyleSheet.create({
    Icon: {
        width: 20,
        height: 20,
        tintColor:'white',
        paddingRight: 5,
      },
      Text: {
        color: 'white',
        fontSize: 13,
        marginLeft: 5,
      },
})