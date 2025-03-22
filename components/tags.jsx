import Modal from 'react-native-modal';
import React, { useState, useRef, useEffect,useCallback } from 'react';
import { Colors } from '@/constants/Colors';


import { Image, Animated ,Text,View,TouchableOpacity,ActivityIndicator, TextInput,StyleSheet,Dimensions} from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { debounce } from 'lodash';

import { db } from '@/constants/firebase';
import { collection, query, where, getDocs ,setDoc,doc, updateDoc} from 'firebase/firestore';
import TagItem from './tagProfile';
const numColumns = 2;
import { useToast } from 'react-native-toast-notifications';
import { getData } from '@/constants/localstorage';
const tags = ({handleClosing,isVisible,setUsers,users}) => {

    const colorScheme = useColorScheme();
    const [search, setSearch] = useState('')

     const latestValue = useRef(search);

     const [isfetchingUser, setFetchingUser] = useState(false);
     const [user, setUser] = useState(null)

    

    const getUser = async (username) => {
        // Simulate an API request
        // Replace this with your actual API request
       try {
        // Create a reference to the users collection
        const usersRef = collection(db, 'users');
    
        // Create a query against the collection where the username matches
        const q = query(usersRef, where('username', '==', username));
    
        // Execute the query and get the result
        const querySnapshot = await getDocs(q);
    
        // Check if any documents are returned
        if (!querySnapshot.empty) {
          console.log('Username exists');
          return querySnapshot.docs[0].data() // Username exists
        } else {
          console.log('Username does not exist');
          return null; // Username does not exist
        }
      } catch (error) {
        console.error('Error checking username: ', error);
        return null;
      }
      };

     // Debounced function to check availability
    const debouncedCheckAvailability = useCallback(
        debounce(async (text) => {
    
        if (latestValue.current !== text) return; 

        setUser(null);
    
        setFetchingUser(true);
        console.log('username '+text)
        const user = await getUser(text.trim().toLocaleLowerCase());

        const userinfo = await getData('@profile_info');
        setFetchingUser(false);
        if (user !== null && user.uid === userinfo.uid) {
          setUser(null);
        }else {
          setUser(user);
        }
        
        
        
        }, 800), // Adjust the debounce delay as needed
        []
    );

     useEffect(() => {
        latestValue.current = search
    
        if (search) {
          debouncedCheckAvailability(search);
        } 
      }, [search]);


      const handleRemove = useCallback((uid) => {
        setUsers((prevUsers) => prevUsers.filter((user) => user.uid !== uid));
      },[users]);

      const handleAddUser = useCallback(async () => {
        if (user) {

        
          if (users.length > 5) {
            showToast('maximum of 6 tags allowed')
            return;
          }

          setUsers((previousUsers) => {
            // Check if user already exists in the array
            const userExists = previousUsers.some((u) => u.uid === user.uid);
            if (userExists) {
              return previousUsers; // Return the same array if user exists
            }
            return [...previousUsers, user]; // Add user to the array if not exists
          });

          setUser(null);
          setSearch('');
        }
      }, [user,users]);

      const toast = useToast()


      function showToast(message){
        toast.show(message, {
          type: "normal",
          placement: "bottom",
          duration: 2000,
          offset: 30,
          animationType: "zoom-in",
        });
    
      }
    return (
        <Modal isVisible={isVisible} onBackdropPress={handleClosing}>

             <View style={{ height:'45%', backgroundColor: colorScheme === 'dark' ? Colors.dark_main : Colors.light_main , borderRadius:10}}>
                    <TouchableOpacity onPress={handleClosing}>
                      <Image style={{ width: 20, height: 20 , margin:15, tintColor: colorScheme === 'dark' ? Colors.light_main : Colors.dark_main}} source={require('@/assets/icons/cancel.png')} />
                    </TouchableOpacity>
            
                    <TextInput
                        placeholderTextColor="gray"
                        placeholder="search"
                        onChangeText={setSearch}
                        value={search}
                        style={{ color: 'white', padding: 10, marginRight: 10, borderRadius: 5, shadowColor: 'gray',backgroundColor:Colors.dark_gray,margin:10 }}


                    />

                    <View style={{height:60, margin:10}}>

                        {user !== null && <TouchableOpacity onPress={handleAddUser}>
                                <View style={{flexDirection:'row',alignItems:'center'}}>

                                <Image
                                resizeMode="cover"
                                source={{uri:user.profilephoto}}
                                style={styles.profileImage}
                                />

                                <View style={{flex:1}}>

                                   <View style={{flexDirection:"row",alignItems:'center'}}>

                                     <Text style={{fontSize:20,color:colorScheme === 'dark' ? Colors.light_main: Colors.dark_main,fontWeight:'bold'}}>{user.username}</Text>

                                     {user.verified && <Image
                                                        resizeMode="contain"
                                                        source={require('@/assets/icons/verified.png')}
                                                        style={{height:20,width:20,marginLeft:5}}
                                                      />}
                                   </View>
                                
                                    
                    
                                    <Text style={{fontSize:15,color:'gray'}}>{user.name}</Text>
                    
                                </View>
                    
                                <Image
                                resizeMode="cover"
                                source={require('@/assets/icons/add-user.png')}
                                style={{height:30,width:30,tintColor:colorScheme === 'dark' ? Colors.light_main: Colors.dark_main}}
                                />

                                
                            </View>

                        </TouchableOpacity> }


                        {user === null && isfetchingUser && <ActivityIndicator size="large" color={colorScheme === 'dark' ? Colors.light_main : Colors.dark_main}/>}

                    </View>

                    <View style={{height:0.7, alignSelf:'center' ,width:'80%',marginVertical:5,backgroundColor:colorScheme === 'dark' ? Colors.light_main : Colors.dark_main, marginHorizontal:5}}/>

                    <Animated.FlatList
                        
                        data={users}
                        showsVerticalScrollIndicator={false}
                       
                        style={{marginHorizontal:5}}
                        keyExtractor={(item) => item.uid}
                        horizontal={true}
                     
                        scrollEventThrottle={16}
                        
                       
                        renderItem={({item}) =>(
                            <View style={styles.item}>
                  
                            <TagItem user={item} handleRemove={handleRemove}/>
                  
                            </View>
                            
                        )}
                      />
            
                 
            
                    
            </View>
              
        </Modal>
    )

}

export default tags;

const styles = StyleSheet.create({
    profileImage: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginEnd: 10,
      },
    item: {
        
        alignItems: 'center',
        alignSelf:'center',
        justifyContent: 'center',
        height: Dimensions.get('window').width / numColumns, // approximate a square
      },
})