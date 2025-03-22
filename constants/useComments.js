// useComments.js
import { useState, useCallback } from 'react';
import { collection, query, orderBy, limit, getDocs, startAfter, setDoc, doc, serverTimestamp,updateDoc,arrayUnion } from 'firebase/firestore';
import { getData } from './localstorage';
import { getRandomString } from './common';
export const useComments = (db, postId, userId) => {
  const [comments, setComments] = useState([]);
  const [isLoadingMore, setLoadingMore] = useState(false);
  const [isRefreshing, setRefreshing] = useState(false);
  

  const generateId = () =>{
    return Math.random().toString(36).substr(2, 9);
  }


  const handleReply = async (commentId, replyText, post) => {
    if (!replyText) return;  // Return early if there's no reply text

    // Generate a unique ID for the reply
    const id = generateId();

    try {
      
      const profileInfo = await getData('@profile_info');
      
      // Create the new reply object
      const newReply = {
        id, 
        reply: replyText,
        username: profileInfo.username,
        uid:profileInfo.uid,
        profileimage: profileInfo.profilephoto,
        status: 'sending'  // Set initial status to 'sending'
      };

      console.log(comments+" comments")
  
      // Optimistically update the UI with the new reply
      setComments(prevComments =>
        
        prevComments.map(comment =>
          comment.id === commentId
            ? { ...comment, replies: [...(comment.replies || []), newReply] } // Add the new reply to the list
            : comment
        )
      );

    
      const repliRef = doc(db, `users/${post.user}/posts/${post.id}/comments/${commentId}/replies/${id}`);

      await setDoc(repliRef, newReply);
  
      // // Send the reply to Firestore
      // await updateDoc(doc(db, `users/${post.user}/posts/${post.id}/comments/${commentId}`), {
      //   replies: arrayUnion({
      //     ...newReply,
         
      //     status: 'sent',  // Update status to 'sent' in Firestore
      //   }),
      // });
  
      // Once the reply is successfully added, update the status in the UI
      setComments(prevComments =>
        prevComments.map(comment =>
          comment.id === commentId
            ? {
                ...comment,
                replies: comment.replies.map(reply =>
                  reply.id === id ? { ...reply, status: 'sent' } : reply
                ),
              }
            : comment
        )
      );
    } catch (error) {
      console.error('Error sending reply:', error);
      
      // If there's an error, update the reply status to 'failed'
      setComments(prevComments =>
        prevComments.map(comment =>
          comment.id === commentId
            ? {
                ...comment,
                replies: comment.replies.map(reply =>
                  reply.id === id ? { ...reply, status: 'failed' } : reply
                ),
              }
            : comment
        )
      );
    }
  };
  

  const fetchInitialComments = useCallback(async () => {
    setRefreshing(true);
    try {
      const commentsRef = collection(db, `users/${userId}/posts/${postId}/comments`);
      const q = query(commentsRef, orderBy('createdAt', 'desc'), limit(20));
      const querySnapshot = await getDocs(q);
      const loadedComments = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log("comments size "+ loadedComments.length)
      setComments(loadedComments);
    } catch (error) {
      console.error('Error fetching initial comments:', error);
    } finally {
      setRefreshing(false);
    }
  }, [db, postId, userId]);

  const fetchMoreComments = useCallback(async (lastComment) => {
    if (!lastComment || isLoadingMore) return;
    setLoadingMore(true);
    try {
      const commentsRef = collection(db, `users/${userId}/posts/${postId}/comments`);
      const q = query(commentsRef, orderBy('createdAt', 'desc'), startAfter(lastComment.createdAt), limit(20));
      const querySnapshot = await getDocs(q);
      const moreComments = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setComments((prev) => [...prev, ...moreComments]);
    } catch (error) {
      console.error('Error fetching more comments:', error);
    } finally {
      setLoadingMore(false);
    }
  }, [db, postId, userId, isLoadingMore]);

  const sendComment = useCallback(async (newComment) => {
    const commentId = Math.random().toString(36).substr(2, 9);
    const commentToSend = {
      ...newComment,
      createdAt: serverTimestamp(),
      id: commentId,
      status: 'sending',
    };
    setComments((prev) => [commentToSend, ...prev]);


    try {
      await setDoc(doc(db, `users/${userId}/posts/${postId}/comments`, commentId), {
        ...commentToSend,
        status: 'sent',
      });
      setComments((prev) =>
        prev.map((comment) => (comment.id === commentToSend.id ? { ...comment, status: 'sent' } : comment))
      );
    } catch (error) {
      console.error('Error sending comment:', error);
      setComments((prev) =>
        prev.map((comment) => (comment.id === commentToSend.id ? { ...comment, status: 'failed' } : comment))
      );
    }
  }, [db, postId, userId]);

  return { comments, isLoadingMore, isRefreshing, fetchInitialComments, fetchMoreComments, sendComment ,setComments, handleReply};
};
