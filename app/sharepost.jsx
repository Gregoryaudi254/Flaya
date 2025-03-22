import { StyleSheet, Text, View,Image,TextInput,Switch ,TouchableOpacity, ActivityIndicator, TouchableWithoutFeedback, Keyboard,Platform, Animated} from 'react-native'
import React, { useEffect,useState ,useLayoutEffect,useRef} from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'

import * as ImagePicker from 'expo-image-picker';
import { setEnabled } from 'react-native/Libraries/Performance/Systrace';
import { ColorSpace } from 'react-native-reanimated';
import { Colors } from '@/constants/Colors';

import { useDispatch } from 'react-redux';
import { startUpload, updateProgress, finishUpload } from '@/slices/uploadSlice';


import { useRouter ,useNavigation} from 'expo-router';
import * as VideoThumbnails from 'expo-video-thumbnails';

import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { doc, setDoc,GeoPoint,serverTimestamp } from 'firebase/firestore'; // Import Firestore functions

import { storage } from '@/constants/firebase';
import { useAuth } from '@/constants/AuthContext';
import { db } from '@/constants/firebase';

import { useToast } from 'react-native-toast-notifications';

import * as Location from 'expo-location';

import { getData } from '@/constants/localstorage';
import { defaultProfileImage } from '@/constants/common';
import { useColorScheme } from '@/hooks/useColorScheme';

import Tags from '@/components/tags';

const sharepost = () => {

    const colorScheme = useColorScheme()

    const toast = useToast();

    const router = useRouter();

    const credentials =  useAuth() 

    const [pickedImages,setPickedImages] = useState(null)

    const [pickedVideos,setPickedVideos] = useState(null)

    const [uploadOk,setUploadOk] = useState(true)

    const [showLocation,setshowLocation] = useState(false)

    const [description,setdescription] = useState('')

    const [contentType,setcontentType] = useState(null);


    const [loading,setloading] = useState(false)

    const [thumbnail,setThumbnail] = useState(null);

    const [profileInfo,setProfileInfo] = useState(null);

    const initialize = async () => {
      const profileInfo = await getData('@profile_info');
      setProfileInfo(profileInfo)
    }

 
    useEffect(()=>{
       initialize();
       pickImageAsync();
    },[])

    const pickImageAsync = async () => {

        let result = await ImagePicker.launchImageLibraryAsync({
          
          //mediaTypes: ImagePicker.MediaTypeOptions.All,
          quality: 1,
          allowsMultipleSelection:true
        });
    
        if (!result.canceled) {

            setcontentType('image')

           const selectedImages = result.assets.map((asset) => asset.uri);

           setPickedImages(selectedImages)

           
           
        } 
      };

      
    const pickVideoAsync = async () => {

        let result = await ImagePicker.launchImageLibraryAsync({
          
          mediaTypes: ImagePicker.MediaTypeOptions.Videos,
          quality: 1,
          allowsEditing: true,
          allowsMultipleSelection:false
        });
    
        if (!result.canceled) {

            setcontentType('video')

           const selectedVideos = result.assets.map((asset) => asset.uri);

           console.log("video"+selectedVideos);

           generateThumbnail(selectedVideos[0]);

           setPickedVideos(selectedVideos);
 
        } 
      };


      function showToast(message){
        toast.show(message, {
          type: "normal",
          placement: "top",
          duration: 2000,
          offset: 30,
          animationType: "zoom-in",
        });
    
      }


      const generateThumbnail = async (uriV) => {
        try {
          const { uri } = await VideoThumbnails.getThumbnailAsync(
            uriV,
            {
              time: 2000,
            }
          );

          console.log('uri ' + uri)
          setThumbnail(uri);
        } catch (e) {
          console.warn(e);
        }
      };

        const dispatch = useDispatch();

        const [tags, setTags] = useState([]);

        const uploadItem = async (item,location) => {

          dispatch(startUpload(item));

          let thumbnailGenerated;
      
          try {

              const urls = []; // Array to hold the download URLs
      
              // Check if the content is an array of image URIs
              const content = item.content;

              console.log(content)
              if (item.contentType === 'image') {
                  // Upload each image URI
                  for (const uri of content) {

                      const fileName = uri.split('/').pop(); // Get the file name from the URI

                      const response = await fetch(uri);

                      const storageRef = ref(storage, `uploads/images/${credentials.user.uid}/${fileName}`);

                      if(!response.ok){
                        throw new Error("Failed")
                      }

                     const mediaBlob = await response.blob();
      
                      // Create the upload task
                      const uploadTask = uploadBytesResumable(storageRef, mediaBlob
                           // This assumes uri is in the correct format for upload
                      );
      
                      // Monitor the upload progress
                      await new Promise((resolve, reject) => {
              
                        uploadTask.on(
                              'state_changed',
                              (snapshot) => {
                                  const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                                 
                                  dispatch(updateProgress(progress)); // Update progress for the current image
                              },
                              (error) => {
                                  console.error('Upload error:', error);
                                  reject(error); // Reject the promise on error
                              },
                              async () => {
                                  const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                                  urls.push(downloadURL); // Add the download URL to the list
                                  resolve(); // Resolve the promise
                              }
                          );
                      });
                  }
              } else {
                  // If it's not an array, handle the single upload as previously discussed
                  const fileName = content[0].split('/').pop(); // Get the file name from the URI

                  const response = await fetch(content[0]);

                  const storageRef = ref(storage, `uploads/videos/${credentials.user.uid}/${fileName}`);

                  const blob = await response.blob();
      
                  const uploadTask = uploadBytesResumable(storageRef, blob);
      
                  

                  const fileNameImage = thumbnail.split('/').pop(); // Get the file name from the URI

                    const responseImage = await fetch(thumbnail);

                    const storageRefImage = ref(storage, `uploads/images/${credentials.user.uid}/${fileNameImage}`);

                    if(!response.ok){
                      throw new Error("Failed")
                    }

                    const mediaBlob = await responseImage.blob();

                    // Create the upload task
                    const uploadTaskImage = uploadBytesResumable(storageRefImage, mediaBlob);
                        // This assumes uri is in the correct format for upload

                    

                    // Monitor the upload progress
                    await new Promise((resolve, reject) => {

                      console.log("Going here")
            
                      uploadTaskImage.on(
                            'state_changed',
                            (snapshot) => {
                                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;

                                console.log('progress')
                                dispatch(updateProgress(progress)); // Update progress for the current image
                            },
                            (error) => {
                                console.error('Upload error:', error);
                                reject(error); // Reject the promise on error
                            },
                            async () => {
                                thumbnailGenerated = await getDownloadURL(uploadTaskImage.snapshot.ref);
                               
                                console.log("nail "+thumbnailGenerated)

                                dispatch(updateProgress(0));

                                
                                resolve(); // Resolve the promise
                            }
                        );
                    });

                    await new Promise((resolve, reject) => {

                      uploadTask.on(
                        'state_changed',
                        (snapshot) => {
                            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                            
                          
                            dispatch(updateProgress(progress));
                        },
                        (error) => {
                            console.error('Upload error:', error);
                            reject();
                            dispatch(finishUpload()); // Call finishUpload on error
                        },
                        async () => {
                            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                            urls.push(downloadURL); // Add the download URL to the list

                            console.log(urls +" urls")
                            resolve();
                             // Call finishUpload on successful upload
                        }
                      );

                    })


                    

              }


              
              const id = generateUniquePostId();
              // Once all uploads are complete, save URLs to Firestore
              const data =  {
                ...item,
                id:id,
                period:'latest',
                radius:500,
                interactions:0,
                likes:0,
                tags:tags.length > 0 ? tags.map(({ uid, profilephoto, username }) => ({
                  uid,
                  profilephoto,
                  username,
                })) : [],
                views:0,
                isshowinglocation:showLocation,
                content: contentType === 'image'? urls : urls[0],
                coordinates:new GeoPoint(location.coords.latitude,location.coords.longitude),
                createdAt: serverTimestamp() // Add a timestamp or any other required fields
               } 

               if (contentType !== 'image') {
                data.thumbnail = thumbnailGenerated;
               }

              await setDoc(doc(db, `users/${credentials.user.uid}/posts`, id),data);
      
              console.log('Files uploaded successfully:', urls);
          } catch (error) {
              console.error('Error uploading item:', error);
              dispatch(finishUpload()); // Call finishUpload in case of error
          }
      
          // Call finishUpload after all uploads are done for array content
          dispatch(finishUpload());
      };


      const generateUniquePostId = () => {
        return Math.random().toString(36).substr(2, 9); // Generate a random 9-character string
       };

        const handleSharePost = () =>{

            if(contentType === null){
                setUploadOk(false)
                return;
            }

            

            if (description !== null && description !== undefined) {
              if (description.length > 170) {
                showToast("Too many words")
                return
              }
            }

            setloading(true);


            handleUploadProcess();

        }

        async function handleUploadProcess(){
          let { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== 'granted') {
            showToast("Location is required");
            setloading(false)
            return;
          }

          // Get the user's current location
          let currentLocation = await Location.getCurrentPositionAsync({});

          const item = {
            content: contentType === 'image'? pickedImages : pickedVideos,
            description:description,
            contentType:contentType,
            user:credentials.user.uid,
            ...(contentType === 'video'? {thumbnail:thumbnail} : {} )
          }

          uploadItem(item,currentLocation);

          setTimeout(() => {

            setloading(false);

            router.back();

        }, 1000);


        }

        const navigation = useNavigation();


        const handleHeaderRightPress = () =>{
          pickVideoAsync()
        }


        useLayoutEffect(() => {
            navigation.setOptions({
              headerRight: () => (
               
                <TouchableOpacity style={{ alignSelf: 'flex-end' }} onPress={handleHeaderRightPress}>
        
                  <Image
                    resizeMode="contain"
                    source={require('@/assets/icons/add-video.png')}
                    style={{ height: 40, width:40, tintColor: colorScheme === 'dark' ? 'white' : "black", alignSelf: 'flex-end' }}
                  />
        
              </TouchableOpacity>
              ),
            });
          }, [navigation]);

          

          const [isTagsVisible, setTagsVisible] = useState(false)

          const [isKeyBoardVisible,setKeyBoardVisible] = useState(false);
          const opacity = useRef(new Animated.Value(1)).current;

          const fadeIn = () => {
            Animated.timing(opacity, {
              toValue: 1, // Fully visible
              duration: 500, // Duration in milliseconds
              useNativeDriver: true,
            }).start();
          };
        
          const fadeOut = () => {
            Animated.timing(opacity, {
              toValue: 0, // Fully invisible
              duration: 500, // Duration in milliseconds
              useNativeDriver: true,
            }).start();
          };
          useEffect(() => {
              const keyboardDidShowListener = Keyboard.addListener(
                Platform.OS === 'ios' ? 'keyboardDidShow' : 'keyboardDidShow',
                () => {
                  fadeOut()
                }
              );
            
              const keyboardDidHideListener = Keyboard.addListener(
                Platform.OS === 'ios' ? 'keyboardDidHide' : 'keyboardDidHide',
                () => {
                  fadeIn();
                }
              );
            
              // Cleanup the event listeners on unmount
              return () => {
                keyboardDidShowListener.remove();
                keyboardDidHideListener.remove();
              };
            }, [])

           

  return (
    <View style={{margin:15,flex:1}}>

      {(pickedImages || pickedVideos) ? (

        <View style={{height:180,width:'100%'}}>


          <TouchableWithoutFeedback onPress={pickImageAsync}>

            <Image 
                source={{ uri:contentType === 'image' ? pickedImages[0] : thumbnail }} 
                style={{ width: '100%', height: 180,borderRadius:10 }} 
            />


          </TouchableWithoutFeedback>
         
           {contentType !== 'image' && <Image 
            source={require("@/assets/icons/play.png")} 
            style={{ width: 20, height: 20,position:'absolute',right:10,marginTop:10 ,tintColor:'white'}} 
            />}


          {(contentType === 'image' && pickedImages.length > 1 )&&
                  <View 
                  style={{width:40,height:40,
                      elevation:10,
                      right:10,
                      marginTop:10,
                      shadowColor: 'black',
                      shadowOffset: { width: 0, height: 5 },
                      shadowOpacity: 3,
                      shadowRadius: 5,
                      borderRadius:20,position:'absolute',
                      justifyContent:'center',alignItems:'center',
                      backgroundColor:'white',}}>

                      <Text style={{fontSize:20,color:'black',fontWeight:'bold'}}>{pickedImages.length}</Text>

                  </View>
              }


        </View>
      
      ) : (
    <View style={{ width: '100%', height: 200, justifyContent: 'center', alignItems: 'center',
    borderRadius:10,borderColor:uploadOk?colorScheme === 'dark' ? 'white':"black":'red',borderWidth:2 }}>

        <TouchableOpacity onPress={pickImageAsync}>

          <Image 
          source={require('@/assets/icons/image-gallery.png')} 
          style={{ width: 50, height: 50 ,tintColor: colorScheme === 'dark' ? 'white' : "black"}} 
        />

        </TouchableOpacity>

    </View>
    )}

    <View style={{flexDirection:'row',marginTop:15,marginBottom:15}}>
        {profileInfo && <Image 
          source={{uri:profileInfo.profilephoto || defaultProfileImage}} 
          style={{ width: 30, height: 30 ,borderRadius:15}} 
          />}

        <TextInput
        style={{fontSize:16,color:colorScheme === 'dark' ? 'white' : "black",height:70,flex:1,textAlignVertical:'top',marginStart:5}}
        // onChangeText={setPassword}
       
        textAlign='flex-start'

        multiline={true}
        value={description}
        onChangeText={setdescription}

        placeholder="Say something.."
        placeholderTextColor='gray'

        />

    </View>


    <Animated.View style={[{flex:1,justifyContent:'flex-end'}, {opacity} ]}>

      <TouchableOpacity onPress={() => setTagsVisible(true)}>

      <View style={styles.viewLocation} >

        <View style={{flexDirection:'row',alignItems:'center'}} >
          <Image style={{ width: 30, height: 30, marginEnd:10 , tintColor:colorScheme === 'dark' ? Colors.light_main: Colors.dark_main}} source={require('@/assets/icons/user_tag.png')}/>

          <Text style={{color:colorScheme === 'dark' ? Colors.light_main: Colors.dark_main, fontSize:18}}>Tags</Text>


          <View style={{ flexDirection: 'row', marginStart: 10 }}>
            {tags.map((item, index) => (
              <Image 
              source={{uri:item.profilephoto || defaultProfileImage}} 
              style={{ width: 30, height: 30 ,borderRadius:15}} 
              />
            ))}
          </View>


        </View>



        <Image style={{ width: 25, height: 25, marginEnd:10 , tintColor:colorScheme === 'dark' ? Colors.light_main: Colors.dark_main}} source={require('@/assets/icons/next.png')}/>


        </View>

      </TouchableOpacity>

     

      <View style={styles.viewLocation} >

        <View style={{flexDirection:'row',alignItems:'center'}} >
          <Image style={{ width: 30, height: 30, marginEnd:10 , tintColor:colorScheme === 'dark' ? Colors.light_main: Colors.dark_main}} source={require('@/assets/icons/location_icon.png')}/>

          <Text style={{color:colorScheme === 'dark' ? Colors.light_main: Colors.dark_main, fontSize:18}}>Add location</Text>


        </View>

      

        <Switch  trackColor={{ false: 'gray', true: '#3897f0' }}
        thumbColor={showLocation ? '#f4f3f4' : '#f4f3f4'}
        value={showLocation} onValueChange={() => setshowLocation((previousState) => !previousState)}/>


      </View>

    </Animated.View>


   


    <TouchableOpacity


       onPress={handleSharePost}
        
            
        style={{
            width: '100%',
            height: 40,
            marginBottom:5,
            bottom:15,
            marginTop:25,
            alignItems:'center',
            borderRadius:5,
            backgroundColor:Colors.blue,
            
        }}
        >

        <View style={{flexDirection:'row',height:'100%'}}>


            {loading ? <ActivityIndicator style={{alignSelf:'center'}} size='small' color='white'/> :
             <Text style={{
                color: 'white',
                alignSelf:'center',
                fontSize: 15
            }}>Share post
            </Text>}

        </View>
        
    </TouchableOpacity>


    <Tags isVisible={isTagsVisible} handleClosing={() => setTagsVisible(false)} setUsers={setTags} users={tags}  />
     


        

    </View>

  )
}

export default sharepost

const styles = StyleSheet.create({
    inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:'space-between',    
    borderWidth: 0.6,
    alignSelf:'center',
    marginTop:10,
    width:'100%',
    paddingVertical:5,
  
    borderRadius: 5,
  
    paddingHorizontal: 10,
  }, viewLocation:{
    marginTop:25,
    alignItems:'center',
    flexDirection:'row',
    bottom:15,
  

    
    justifyContent:'space-between',
    marginBottom:10
  },})