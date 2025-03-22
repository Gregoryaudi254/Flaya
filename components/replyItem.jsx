import { StyleSheet, Text, View,Image, TouchableOpacity } from 'react-native'
import React, { useEffect, useState } from 'react'

import { runTransaction ,doc, increment, setDoc} from 'firebase/firestore'
import { getData , storeData } from '@/constants/localstorage'
import { db } from '@/constants/firebase'
import { useRouter } from 'expo-router'

import { useColorScheme } from '@/hooks/useColorScheme'
import { Colors } from '@/constants/Colors'

const ReplyItem = ({reply,postid,commentId,postcreatorid}) => {

    const [isLiked,setLiked] = useState(false)

    const [likes,setLikes] = useState(reply.likes || 0)
    const router = useRouter()

    const colorScheme = useColorScheme();
  


    const handleOnLiked = async () => {

      if (isLiked) {
        return;
      }

      // Fetch liked replies from local storage
      let likedComments = await getData('@liked_replies');

      if (!likedComments) {
        likedComments = [];
      }


      setLiked(true);

      setLikes((likes) => likes+1);

      const userinfo = await getData('@profile_info');

      const likeRef = doc(db, `users/${postcreatorid}/posts/${postid}/comments/${commentId}/replies/${reply.id}/likes/${userinfo.uid}`);

      await setDoc(likeRef, userinfo);

      likedComments.push(reply.id);
        
      // Update the local storage with liked replies
      await storeData('@liked_replies', likedComments);
        

      // try {

      //   // Fetch liked replies from local storage
      //   let likedReplies = await getData('@liked_replies');

      //   if (!likedReplies) {
      //     likedReplies = [];
      //   }

      //   const repliRef = doc()
  
      //   // Firestore transaction to ensure safe updates
      //   await runTransaction(db, async (transaction) => {
      //     const commentSnapshot = await transaction.get();
          
      //     if (!commentSnapshot.exists()) {
      //       throw new Error("Comment does not exist!");
      //     }
          
      //     const commentData = commentSnapshot.data();
      //     const { replies } = commentData;
  
      //     // Map through replies to find the target reply and update its likes
      //     const updatedReplies = replies.map((r) => {
      //       if (r.id === reply.id) {

      //         let likes = r.likes;

      //         if (!likes) {
      //           likes = 0
      //         }


      //         const updatedLikes = likes + 1
      //         return {
      //           ...r,
      //           likes: updatedLikes// Firestore increment
      //         };
      //       }
      //       return r;
      //     });
  
      //     // Update the replies array with the incremented likes count
      //     transaction.update(commentRef, { replies: updatedReplies });
      //   });
  
      //   // Optimistic UI update: toggle like state
        
      //   likedReplies.push(reply.id);
  
      //   // Update the local storage with liked replies
      //   await storeData('@liked_replies', likedReplies);
  
      // } catch (error) {
      //   console.error("Error liking/unliking reply:", error);
      // }
    };


    const isAlreadyLiked = async () => {

      let likedposts = await getData('@liked_replies')

      if (!likedposts) {
        likedposts = []
      }

      setLiked(likedposts.includes(reply.id))
      }

    useEffect(() => {
      isAlreadyLiked();
    },[]);

    const handleProfilePress = async ()=> {
      const userinfo = await getData('@profile_info');
      console.log('uid'+reply.uid)

      if (reply.uid !== userinfo.uid) {
        router.push({
          pathname:'/oppuserprofile',
          params:{uid:reply.uid}
        });
      }   
    }


  return (


    <View key={reply.id} style={{flexDirection:'row',marginTop:5,marginEnd:40}}>
             
             <View style={{flexDirection:'row'}}>


             {reply.status === 'sending' && <Image
                
                source={require('@/assets/icons/loading.png')}
                style={[
                { width: 15, height: 15,tintColor:'gray' ,marginEnd:5, marginTop:3}
                ]}

               />}


               <TouchableOpacity onPress={handleProfilePress}>

                <Image
                  source={{ uri: reply.profileimage }}
                  style={styles.profileImage}
                />

               </TouchableOpacity>

              


               <View style={{flexDirection:'column'}}>

                <Text style={[styles.username, {color:colorScheme === 'dark' ? Colors.light_main : Colors.dark_main}]}>{reply.username}</Text>

                <Text style={styles.description}>{reply.reply}</Text>


               </View>


             </View>


             <TouchableOpacity onPress={() => handleOnLiked()}>

                <Image
                    resizeMode="contain"
                    source={!isLiked ?require('@/assets/images/heart.png') : require('@/assets/icons/heartliked.png')}
                    style={[{width:15,height:15,paddingRight:10,marginTop:5,marginLeft:5}, !isLiked && {tintColor:colorScheme === 'dark' ? Colors.light_main : Colors.dark_main}]}
                    />

             </TouchableOpacity>

             <Text style={{color:colorScheme === 'dark' ? Colors.light_main : Colors.dark_main,fontSize:15, marginStart:3}}>{likes}</Text>

             

        </View>
  )
}

export default ReplyItem

const styles = StyleSheet.create({
    username: {
        color: 'white',
        fontSize: 15,
        fontWeight: 'bold',
      },
      description: {
        color: 'gray',
        fontSize: 14,
        
      },
      profileImage: {
        width: 35,
        height: 35,
        marginBottom:5,
        borderColor: 'white',
        borderWidth: 3,
        borderRadius: 25,
        marginEnd: 10,
      },


})