import { StyleSheet, Text, View ,Image,TouchableOpacity} from 'react-native'
import React, { useState, useEffect } from 'react'
import ReplyItem from './replyItem'

import { runTransaction, doc, setDoc,  } from 'firebase/firestore'
import { db } from '@/constants/firebase'

import { getData, storeData } from '@/constants/localstorage'
import { router } from 'expo-router'
import { useColorScheme } from '@/hooks/useColorScheme'
import { Colors } from '@/constants/Colors'
import { set } from 'firebase/database'


const commentItem = ({profileImage,username,comment,replies,status, commentid, handleReplyPress, postcreatorid, postid, likes,commentcreatorid, setIsFullWidthModalVisible}) => {

    const colorScheme = useColorScheme();

    const [isLiked,setLiked] = useState(false);

    const [likess, setLikes] = useState(likes || 0)
    
    const handleOnLiked = async () => {

      if (isLiked) {
        return;
      }

      setLiked(true);

      setLikes((likes) => likes+1)

     
      const commentRef = doc(db, `users/${postcreatorid}/posts/${postid}/comments/${commentid}`);

      try {

        // Fetch liked replies from local storage
        let likedComments = await getData('@liked_comments');

        if (!likedComments) {
          likedComments = [];
        }

       const userInfo = await getData('@profile_info')
       const commentLikeRef =  doc(db, `users/${postcreatorid}/posts/${postid}/comments/${commentid}/likes/${userInfo.uid}`);

       await setDoc(commentLikeRef, userInfo);
  
        // // Firestore transaction to ensure safe updates
        // await runTransaction(db, async (transaction) => {
        //   const commentSnapshot = await transaction.get(commentRef);
          
        //   if (!commentSnapshot.exists()) {
        //     throw new Error("Comment does not exist!");
        //   }
          
        //   const commentData = commentSnapshot.data();
        //   const { likes } = commentData;

        //   const updatedLikes = (likes || 0) + 1;

        

        //   // Update the replies array with the incremented likes count
        //   transaction.update(commentRef, { likes: updatedLikes });
        // });
  
        // Optimistic UI update: toggle like state
        
        likedComments.push(commentid);
  
        // Update the local storage with liked replies
        await storeData('@liked_comments', likedComments);
  
      } catch (error) {
        console.error("Error liking/unliking reply:", error);
      }
    };


    const isAlreadyLiked = async () => {

      let likedcomments = await getData('@liked_comments');

      if (!likedcomments) {
        likedcomments = []
      }
      setLiked(likedcomments.includes(commentid))
      }

    useEffect(() => {
      isAlreadyLiked();
    },[])

    const handleProfilePress = async () => {
      const userinfo = await getData('@profile_info');
      
      if (commentcreatorid !== userinfo.uid) {
        router.push({
          pathname:'/oppuserprofile',
          params:{uid:commentcreatorid}
        });
      }
      
      setIsFullWidthModalVisible(false);
    }


  return (

    <View style={{flexDirection:'column',padding:10, marginVertical:10}}>
      <View style={{flexDirection:'row',justifyContent:'space-between'}}>
             
            <View style={{flexDirection:'row'}}>

               {status === 'sending' && <Image
                
                source={require('@/assets/icons/loading.png')}
                style={[
                { width: 15, height: 15,tintColor:'gray' ,marginEnd:5, marginTop:3}
                ]}

               />}

               <TouchableOpacity onPress={handleProfilePress}>

                <Image
                      source={{ uri: profileImage }}
                      style={styles.profileImage}
                  />

               </TouchableOpacity>

                

                <View style={{flexDirection:'column',maxWidth:250}}>

                    <Text style={[styles.username, {color:colorScheme === 'dark' ? Colors.light_main : Colors.dark_main}]}>{username}</Text>

                    <Text style={styles.description}>{comment}</Text>

                    <View style={{flexDirection:'row',alignItems:'center'}}>
                      <TouchableOpacity onPress={() => handleReplyPress(commentid, username, commentcreatorid)}>
                        <Image
                          resizeMode="contain"
                          source={require('@/assets/icons/reply.png')}
                          style={{width:30,height:30,tintColor:colorScheme === 'dark' ? Colors.light_main : Colors.dark_main}}
                        />
                      </TouchableOpacity>
                      <Text style={{color:colorScheme === 'dark' ? Colors.light_main : Colors.dark_main,marginStart:3}}>{replies ? replies.length :  0}</Text>
                    </View>


                    { replies &&

                        replies.map((reply) =>(
                            <ReplyItem key={reply.id} reply={reply} postcreatorid={postcreatorid} commentId={commentid} postid={postid}/>
                        ))
                    }

    


                </View>


            

            
            </View>

            <View style={{flexDirection:'row'}}>

            <TouchableOpacity onPress={handleOnLiked}>

              <Image
                  resizeMode="contain"
                  source={!isLiked ?require('@/assets/images/heart.png') : require('@/assets/icons/heartliked.png')}
                  style={[{width:15,height:15,paddingRight:10,marginTop:5}, !isLiked && {tintColor:colorScheme === 'dark' ? Colors.light_main : Colors.dark_main}]}
                  />

              </TouchableOpacity>

              <Text style={{color:colorScheme === 'dark' ? Colors.light_main : Colors.dark_main,fontSize:15, marginStart:3}}>{likess}</Text>

            </View>

            

        </View>


        
    </View>
  )
}

export default commentItem

const styles = StyleSheet.create({
    username: {
        
        fontSize: 15, 
        fontWeight: 'bold',
      },
      description: {
        color: 'gray',
        fontSize: 14,
        marginBottom:10
        
      },
      profileImage: {
        width: 35,
        height: 35,
        borderColor: 'white',
        borderWidth: 2,
        borderRadius: 25,
        marginEnd: 10,
      },

})