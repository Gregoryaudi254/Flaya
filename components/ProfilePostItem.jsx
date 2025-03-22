import { StyleSheet, Text, View,Image ,TouchableWithoutFeedback, Dimensions} from 'react-native'
import React from 'react'

import {useRouter} from 'expo-router'
import { getData } from '@/constants/localstorage';


const ProfilePostItem = React.memo(({post,userinfo}) => {

  const router = useRouter();


  const handlePress = async () => {

    const profileInfo = await getData('@profile_info');
    
    const origin = post.user === profileInfo.uid ? 'currentuserprofile' : 'notcurrentuserprofile';

    const updatedPost = {...post,userinfo:userinfo,origin:origin}
    router.push({
      pathname: '/postpage',
      params: { data: encodeURIComponent(JSON.stringify(updatedPost)) }
    });
   
  };

  const getFormatedString = (number) => {

    return (number || 0) < 1000 
    ? `${number || 0}` 
    : `${(number / 1000).toFixed(1)}k`

  }


  return (

    <View style={styles.item}>

      <TouchableWithoutFeedback onPress={handlePress}>

      <View style={{height:200,width:'100%'}}>

        

        <Image source={{uri:post.contentType === 'image'? post.content[0]:post.thumbnail}} 
          style={{width:'100',height:"100%",borderRadius:10,marginBottom:5,marginHorizontal:2.5}} />


        <View style={{position:'absolute',margin:15, flexDirection:'row', alignItems:'center'}}>
          <Image
            resizeMode="contain"
            source={require('@/assets/icons/sharing_post.png')}
            style={[{tintColor:'white', width:25, height:25}]}
          />

                        
          <Text style={{fontSize:15, color:'white', marginStart:2}}>{getFormatedString(post.sharings || 0)}</Text> 
        </View>

        {(post.contentType === 'video' || 
          (post.contentType === 'image' && post.content.length > 1)) && (
          <Image 
            style={{
              tintColor: "white", 
              position: "absolute", 
              end: 5, 
              margin: 15, 
              width: 30, 
              height: 30
            }} 
            source={
              post.contentType === 'video' 
                ? require('@/assets/icons/clapperboard.png') 
                : require('@/assets/icons/video.png')
            }
          />
        )}


        <View style={{position:'absolute',bottom:'10%',width:'100%',flexDirection:'row',justifyContent:'space-evenly'}}>

          <View style={{flexDirection:'row'}}>

              <Image
              resizeMode="contain"
              source={require('@/assets/icons/heartliked.png')}
              style={styles.Icon}/>

              <Text style={styles.Text}>{getFormatedString(post.likes)}</Text>

          </View>

          <View style={{flexDirection:'row'}}>

              <Image
              resizeMode="contain"
              source={require('@/assets/icons/visibility.png')}
              style={styles.Icon}/>

              <Text style={styles.Text}>{getFormatedString(post.views)}</Text>

          </View>

        </View>

      </View>

      </TouchableWithoutFeedback>

    </View>
   
    
  )
}); 


export default ProfilePostItem

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