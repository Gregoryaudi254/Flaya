import { StyleSheet, Text, View,Image ,TouchableWithoutFeedback, Dimensions, TouchableOpacity} from 'react-native'
import React, { useCallback } from 'react'

import {useRouter} from 'expo-router'
import { getData } from '@/constants/localstorage';
import { Colors } from '@/constants/Colors';


const DownLoadMediaItem = React.memo(({item,handleSharePress}) => {

 


  const handlePress = useCallback(async () => {
    handleSharePress(item);
  });




  return (

    <View style={styles.item}>

        <View style={{height:200,width:'100%'}}>

                
            <Image source={{uri:item}} 
            style={{width:'100',height:"100%",borderRadius:10,marginBottom:5,marginHorizontal:2.5}} />

            <TouchableOpacity onPress={handlePress} style={{position:'absolute', borderRadius:10, backgroundColor:Colors.blue, padding:5, margin:10}} >

                <Text style={{fontSize:15, color:'white'}}>Share</Text>

            </TouchableOpacity>

        </View>

    </View>
   
    
  )
}); 


export default DownLoadMediaItem;

const styles = StyleSheet.create({
    item: {
      
          alignItems: 'center',
          justifyContent: 'center',
          flex: 1,
          margin: 1,
          height: Dimensions.get('window').width / 2, // approximate a square
        },
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