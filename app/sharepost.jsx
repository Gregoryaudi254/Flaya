import { StyleSheet, Text, View, Image, TextInput, Switch, TouchableOpacity, ActivityIndicator, TouchableWithoutFeedback, Keyboard, Platform, Animated, ScrollView } from 'react-native'
import Modal from 'react-native-modal';
import React, { useEffect, useState, useLayoutEffect, useRef } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'

import * as ImagePicker from 'expo-image-picker';
import { Colors } from '@/constants/Colors';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

import { useDispatch } from 'react-redux';
import { startUpload, updateProgress, finishUpload } from '@/slices/uploadSlice';

import { useRouter, useNavigation } from 'expo-router';
import * as VideoThumbnails from 'expo-video-thumbnails';

import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { doc, setDoc, GeoPoint, serverTimestamp } from 'firebase/firestore';

import { functions, storage } from '@/constants/firebase';
import { useAuth } from '@/constants/AuthContext';
import { db } from '@/constants/firebase';

import { useToast } from 'react-native-toast-notifications';

import * as Location from 'expo-location';

import { getData } from '@/constants/localstorage';
import { defaultProfileImage } from '@/constants/common';
import { useColorScheme } from '@/hooks/useColorScheme';

import Tags from '@/components/tags';
import { Image as ImageCompressor, Video as VideoCompressor } from 'react-native-compressor';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams } from 'expo-router';
import { useSelector } from 'react-redux';
import { setImageUri, clearTextImageData } from '@/slices/textImageSlice';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { httpsCallable } from 'firebase/functions';

const CommunityGuidelinesModal = ({ isVisible, onAccept }) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  return (
    <Modal
      isVisible={isVisible}
      backdropOpacity={0.8}
      animationIn="fadeIn"
      animationOut="fadeOut"
      useNativeDriver
      style={styles.guidelinesModal}
    >
      <View style={[
        styles.guidelinesContainer,
        { backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF' }
      ]}>
        <View style={styles.guidelinesHeader}>
          <Ionicons 
            name="shield-checkmark" 
            size={40} 
            color={Colors.blue} 
            style={styles.guidelinesIcon}
          />
          <Text style={[
            styles.guidelinesTitle,
            { color: isDark ? '#FFFFFF' : '#000000' }
          ]}>
            Community Promise
          </Text>
        </View>
        
        <Text style={[
          styles.guidelinesDescription,
          { color: isDark ? '#CCCCCC' : '#555555' }
        ]}>
          Flaya is a family-friendly platform. Before sharing your first post, please promise to follow these guidelines:
        </Text>
        
        <View style={styles.guidelinesRules}>
          <View style={styles.guidelineRule}>
            <Ionicons name="eye-off-outline" size={24} color={Colors.blue} style={styles.ruleIcon} />
            <View style={styles.ruleContent}>
              <Text style={[styles.ruleTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                No Inappropriate Content
              </Text>
              <Text style={[styles.ruleDescription, { color: isDark ? '#BBBBBB' : '#666666' }]}>
                I will not post nudity, explicit, or harmful content
              </Text>
            </View>
          </View>
          
          <View style={styles.guidelineRule}>
            <Ionicons name="people-outline" size={24} color={Colors.blue} style={styles.ruleIcon} />
            <View style={styles.ruleContent}>
              <Text style={[styles.ruleTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                Respect Privacy
              </Text>
              <Text style={[styles.ruleDescription, { color: isDark ? '#BBBBBB' : '#666666' }]}>
                I will respect others' privacy and personal boundaries
              </Text>
            </View>
          </View>
          
          <View style={styles.guidelineRule}>
            <Ionicons name="heart-outline" size={24} color={Colors.blue} style={styles.ruleIcon} />
            <View style={styles.ruleContent}>
              <Text style={[styles.ruleTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                Be Kind
              </Text>
              <Text style={[styles.ruleDescription, { color: isDark ? '#BBBBBB' : '#666666' }]}>
                I will interact with others respectfully and kindly
              </Text>
            </View>
          </View>
        </View>
        
        <TouchableOpacity
          style={styles.promiseButton}
          onPress={onAccept}
        >
          <Text style={styles.promiseButtonText}>
            I PROMISE
          </Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

const SharePostScreen = () => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const toast = useToast();
    const router = useRouter();
    const credentials = useAuth();
    const [pickedImages, setPickedImages] = useState(null);
    const [pickedVideos, setPickedVideos] = useState(null);
    const [uploadOk, setUploadOk] = useState(true);
    const [showLocation, setshowLocation] = useState(false);
    const [description, setdescription] = useState('');
    const [contentType, setcontentType] = useState(null);
    const [loading, setloading] = useState(false);
    const [compressing, setCompressing] = useState(false);
    const [thumbnail, setThumbnail] = useState(null);
    const [profileInfo, setProfileInfo] = useState(null);
    const [showGuidelinesPromise, setShowGuidelinesPromise] = useState(false);
    const [hasAcceptedGuidelines, setHasAcceptedGuidelines] = useState(null);
    const [isTextImage, setIsTextImage] = useState(false);

   

    const initialize = async () => {
      const profileInfo = await getData('@profile_info');
      setProfileInfo(profileInfo);
      
      // Check if user has already accepted guidelines
      try {
        const hasAccepted = await AsyncStorage.getItem('has_accepted_guidelines');
        setHasAcceptedGuidelines(hasAccepted === 'true');
      } catch (error) {
        console.error('Error checking guidelines acceptance:', error);
        setHasAcceptedGuidelines(false);
      }
    }

    const {imageUri} = useSelector(state => state.textImage);

    useEffect(() => {
       initialize();

       return () => {
        dispatch(clearTextImageData());
       }
    }, []);
    
    // Handle text image coming from textToImage component
    useEffect(() => {
      if (imageUri !== null) {
        setcontentType('image');
        setPickedImages([imageUri]);
        setIsTextImage(true);

        console.log('imageUri', imageUri);
      }
    }, [imageUri]);

    const handleAcceptGuidelines = async () => {
      try {
        await AsyncStorage.setItem('has_accepted_guidelines', 'true');
        setHasAcceptedGuidelines(true);
        setShowGuidelinesPromise(false);
      } catch (error) {
        console.error('Error saving guidelines acceptance:', error);
        setHasAcceptedGuidelines(true);
        setShowGuidelinesPromise(false);
      }
    };

    const compressImage = async (uri) => {
      try {
        setCompressing(true);
        const result = await ImageCompressor.compress(uri, {
          compressionMethod: 'auto',
          quality: 0.7,
          maxWidth: 1080,
          maxHeight: 1080
        });
        setCompressing(false);
        return result;
      } catch (e) {
        console.error('Image compression failed:', e);
        setCompressing(false);
        return uri;
      }
    };

    const compressVideo = async (uri) => {
      try {
        setCompressing(true);
        const result = await VideoCompressor.compress(
          uri,
          {
            compressionMethod: 'manual',
            bitrate: 800000,
            maxWidth: 1080,
            maxHeight: 1080
          }
        );
        setCompressing(false);
        return result;
      } catch (e) {
        console.error('Video compression failed:', e);
        setCompressing(false);
        return uri;
      }
    };

    const pickImageAsync = async () => {
        setIsTextImage(false);
        let result = await ImagePicker.launchImageLibraryAsync({
          quality: 1,
          allowsMultipleSelection: true
        });
    
        if (!result.canceled) {
           setcontentType('image');
           const selectedImages = result.assets.map((asset) => asset.uri);
           setPickedImages(selectedImages);
        } 
    };
      
    const pickVideoAsync = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Videos,
          quality: 1,
          allowsEditing: true,
          allowsMultipleSelection: false
        });
    
        if (!result.canceled) {
           setcontentType('video');
           const selectedVideos = result.assets.map((asset) => asset.uri);
           generateThumbnail(selectedVideos[0]);
           setPickedVideos(selectedVideos);
        } 
      };

    function showToast(message) {
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
          setThumbnail(uri);
        } catch (e) {
          console.warn(e);
        }
      };

        const dispatch = useDispatch();
        const [tags, setTags] = useState([]);

    const uploadItem = async (item, location) => {
          dispatch(startUpload(item));
          let thumbnailGenerated;
      
          try {
              const urls = [];
              const content = item.content;

              // Return to home screen immediately when upload starts
              router.back();

              if (item.contentType === 'image') {
                  for (const uri of content) {
                    const compressedUri = await compressImage(uri);
                    
                    const fileName = compressedUri.split('/').pop();
                    const response = await fetch(compressedUri);
                    const storageRef = ref(storage, `uploads/images/${credentials.user.uid}/${fileName}`);

                    if (!response.ok) {
                      throw new Error("Failed to fetch image");
                    }

                    const mediaBlob = await response.blob();
                    const uploadTask = uploadBytesResumable(storageRef, mediaBlob);
  
                    await new Promise((resolve, reject) => {
                        uploadTask.on(
                            'state_changed',
                            (snapshot) => {
                                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                                dispatch(updateProgress(progress));
                            },
                            (error) => {
                                console.error('Upload error:', error);
                                reject(error);
                            },
                            async () => {
                                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                                urls.push(downloadURL);
                                resolve();
                            }
                        );
                    });
                  }
              } else {
                  const compressedVideoUri = await compressVideo(content[0]);

                  const fileName = compressedVideoUri.split('/').pop();
                  const response = await fetch(compressedVideoUri);
                  const storageRef = ref(storage, `uploads/videos/${credentials.user.uid}/${fileName}`);
                  const blob = await response.blob();
                  const uploadTask = uploadBytesResumable(storageRef, blob);
      
                  const fileNameImage = thumbnail.split('/').pop();
                  const responseImage = await fetch(thumbnail);
                  const storageRefImage = ref(storage, `uploads/images/${credentials.user.uid}/${fileNameImage}`);

                  if (!responseImage.ok) {
                    throw new Error("Failed to fetch thumbnail");
                  }

                  const mediaBlob = await responseImage.blob();
                  const uploadTaskImage = uploadBytesResumable(storageRefImage, mediaBlob);

                  await new Promise((resolve, reject) => {
                    uploadTaskImage.on(
                        'state_changed',
                        (snapshot) => {
                            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                            dispatch(updateProgress(progress));
                        },
                        (error) => {
                            console.error('Upload error:', error);
                            reject(error);
                        },
                        async () => {
                            thumbnailGenerated = await getDownloadURL(uploadTaskImage.snapshot.ref);
                            dispatch(updateProgress(0));
                            resolve();
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
                          dispatch(finishUpload());
                      },
                      async () => {
                          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                          urls.push(downloadURL);
                          resolve();
                      }
                    );
                  });
              }
              
              const id = generateUniquePostId();
              const data = {
                ...item,
                id: id,
                period: 'latest',
                radius: 500,
                interactions: 0,
                likes: 0,
                tags: tags.length > 0 ? tags.map(({ uid, profilephoto, username }) => ({
                    uid,
                    profilephoto,
                    username,
                })) : [],
                views: 0,
                isshowinglocation: showLocation,
                content: contentType === 'image'? urls : urls[0],
                coordinates: new GeoPoint(location.coords.latitude, location.coords.longitude),
                createdAt: serverTimestamp()
              };

              if (contentType !== 'image') {
                data.thumbnail = thumbnailGenerated;
              }

              await setDoc(doc(db, `users/${credentials.user.uid}/posts`, id), data);
              console.log('Files uploaded successfully:', urls);
          } catch (error) {
              console.error('Error uploading item:', error);
              dispatch(finishUpload());
              showToast("Upload failed: " + error.message);
          }
      
          dispatch(finishUpload());
      };

      const generateUniquePostId = () => {
      return Math.random().toString(36).substr(2, 9);
    };

    const handleSharePost = () => {
      if (contentType === null) {
        setUploadOk(false);
        showToast("Please select an image or video first");
        return;
      }

      if (description !== null && description !== undefined) {
        if (description.length > 170) {
          showToast("Description too long (max 170 characters)");
          return;
        }
      }

      if (hasAcceptedGuidelines === false) {
        setShowGuidelinesPromise(true);
        return;
      }

      setloading(true);
      handleUploadProcess();
    };

    async function handleUploadProcess() {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          showToast("Location access is required");
          setloading(false);
          return;
        }

        let currentLocation = await Location.getCurrentPositionAsync({});

        const item = {
          content: contentType === 'image' ? pickedImages : pickedVideos,
          description: description,
          contentType: contentType,
          user: credentials.user.uid,
          ...(contentType === 'video' ? { thumbnail: thumbnail } : {})
        };

        // Start the upload process - this will navigate back in the uploadItem function
        await uploadItem(item, currentLocation);
      } catch (error) {
        console.error("Error starting upload:", error);
        showToast("Failed to start upload: " + error.message);
        setloading(false);
      }
    }



        const navigation = useNavigation();
    const handleHeaderRightPress = () => {
      pickVideoAsync();
    };

        useLayoutEffect(() => {
            navigation.setOptions({
              headerRight: () => (
          <TouchableOpacity style={{ marginHorizontal: 16 }} onPress={handleHeaderRightPress}>
            <Ionicons
              name="videocam"
              size={24}
              color={isDark ? 'white' : "black"}
            />
              </TouchableOpacity>
              ),
            });
          }, [navigation]);

    const [isTagsVisible, setTagsVisible] = useState(false);
    const [isKeyBoardVisible, setKeyBoardVisible] = useState(false);
          const opacity = useRef(new Animated.Value(1)).current;

          const fadeIn = () => {
            Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
              useNativeDriver: true,
            }).start();
          };
        
          const fadeOut = () => {
            Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
              useNativeDriver: true,
            }).start();
          };

          useEffect(() => {
              const keyboardDidShowListener = Keyboard.addListener(
                Platform.OS === 'ios' ? 'keyboardDidShow' : 'keyboardDidShow',
                () => {
          fadeOut();
                }
              );
            
              const keyboardDidHideListener = Keyboard.addListener(
                Platform.OS === 'ios' ? 'keyboardDidHide' : 'keyboardDidHide',
                () => {
                  fadeIn();
                }
              );
            
              return () => {
                keyboardDidShowListener.remove();
                keyboardDidHideListener.remove();
              };
    }, []);

    // Update the goToTextImageCreator function to handle both creation and editing
    const goToTextImageCreator = () => {
      router.push({
        pathname: '/textToImage',
        params: { returnTo: 'sharepost' }
      });
    };

     const handleSubscriptionPress = () => {
      router.push({
        pathname: '/subscriptionPage'
      });
    };

    const [subscriptionStatus, setSubscriptionStatus] = useState(null);

    const getSubscriptionStatus = async () => {
      const profileInfo = await getData('@profile_info');
      const callbackFunction = httpsCallable(functions, 'getSubscriptionStatus');
      const response = await callbackFunction({ userid: profileInfo.uid, postpage: true });
      setSubscriptionStatus(response.data.status);
    };
           

    useEffect(() => {
      getSubscriptionStatus();
    }, []);

    const { value } = useSelector(state => state.data);
  
  useEffect(() => {
    if (value !== null && (value.intent === "subscriptionchange")) {
      console.log("subscriptionchangePostPage");
      getSubscriptionStatus();
    }
  },[value])

  return (
      <GestureHandlerRootView style={{ flex: 1 }}>

<SafeAreaView style={{ flex: 1, backgroundColor: isDark ? '#121212' : '#FFFFFF' }}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 8 }}>
      {(pickedImages || pickedVideos) ? (
            <View style={styles.mediaPreviewContainer}>
          <TouchableWithoutFeedback onPress={pickImageAsync}>
            <Image 
                  source={{ uri: contentType === 'image' ? pickedImages[0] : thumbnail }} 
                  style={styles.mediaPreview} 
            />
          </TouchableWithoutFeedback>
         
              {contentType !== 'image' && (
                <View style={styles.videoIndicator}>
                  <Ionicons name="play" size={20} color="white" />
                </View>
              )}

              {(contentType === 'image' && pickedImages.length > 1) && (
                <View style={styles.multipleImagesIndicator}>
                  <Text style={styles.multipleImagesText}>{pickedImages.length}</Text>
                </View>
              )}

              <View style={styles.mediaButtonsContainer}>
                {isTextImage ? (
                  <TouchableOpacity 
                    style={[styles.mediaButton, isDark ? styles.darkButton : styles.lightButton]} 
                    onPress={goToTextImageCreator}
                  >
                    <Ionicons name="pencil" size={20} color={isDark ? 'white' : '#333'} />
                    <Text style={[styles.mediaButtonText, { color: isDark ? 'white' : '#333' }]}>Edit Text</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity 
                    style={[styles.mediaButton, isDark ? styles.darkButton : styles.lightButton]} 
                    onPress={pickImageAsync}
                  >
                    <Ionicons name="images" size={20} color={isDark ? 'white' : '#333'} />
                    <Text style={[styles.mediaButtonText, { color: isDark ? 'white' : '#333' }]}>Change</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity 
                  style={[styles.mediaButton, isDark ? styles.darkButton : styles.lightButton]} 
                  onPress={isTextImage ? pickImageAsync : goToTextImageCreator}
                >
                  <Ionicons name={isTextImage ? 'images' : 'text'} size={20} color={isDark ? 'white' : '#333'} />
                  <Text style={[styles.mediaButtonText, { color: isDark ? 'white' : '#333' }]}>{isTextImage ? 'Photo' : 'Text'}</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.mediaButton, isDark ? styles.darkButton : styles.lightButton]} 
                  onPress={pickVideoAsync}
                >
                  <Ionicons name="videocam" size={20} color={isDark ? 'white' : '#333'} />
                  <Text style={[styles.mediaButtonText, { color: isDark ? 'white' : '#333' }]}>Video</Text>
                </TouchableOpacity>
                  </View>
            </View>
          ) : (
            
            <View style={[styles.mediaSelector, { borderColor: uploadOk ? (isDark ? '#444' : "#ddd") : '#FF3B30' }]}>
              <TouchableOpacity style={[styles.mediaSelectorButton, {marginRight: 10}]} onPress={pickImageAsync}>
                  <View style={[styles.mediaSelectorIconContainer, { backgroundColor: isDark ? '#333' : '#f0f0f0' }]}>
                    <Ionicons 
                      name="images" 
                      size={28} 
                      color={isDark ? '#FFFFFF' : "#333333"} 
                    />
        </View>
                  <Text style={{ color: isDark ? '#FFFFFF' : "#333333", marginTop: 8 }}>
                    Photo
                  </Text>
                </TouchableOpacity>
                
              
                
                <TouchableOpacity style={[styles.mediaSelectorButton, {marginLeft: 10}]} onPress={goToTextImageCreator}>
                  <View style={[styles.mediaSelectorIconContainer, { backgroundColor: isDark ? '#333' : '#f0f0f0' }]}>
                    <Ionicons 
                      name="text" 
                      size={28} 
                      color={isDark ? '#FFFFFF' : "#333333"} 
                    />
                  </View>
                  <Text style={{ color: isDark ? '#FFFFFF' : "#333333", marginTop: 8 }}>
                    Text
                  </Text>
        </TouchableOpacity>
       


    </View>
    )}

          {compressing && (
            <View style={styles.compressionIndicator}>
              <ActivityIndicator size="small" color={Colors.blue} />
              <Text style={{ color: isDark ? 'white' : 'black', marginLeft: 8 }}>
                Processing media...
              </Text>
    </View>
    )}

          <View style={styles.descriptionContainer}>
            {profileInfo && (
              <Image 
                source={{ uri: profileInfo.profilephoto || defaultProfileImage }} 
                style={styles.profileImage} 
              />
            )}

        <TextInput
              style={[
                styles.descriptionInput, 
                { color: isDark ? 'white' : "black" }
              ]}
              placeholderTextColor={isDark ? '#888' : 'gray'}
              placeholder="What's on your mind?"
        multiline={true}
        value={description}
        onChangeText={setdescription}
              maxLength={170}
            />
          </View>

          <Text style={[styles.characterCount, { color: isDark ? '#888' : '#888' }]}>
            {description.length}/170
          </Text>

          <Animated.View style={[styles.optionsContainer, { opacity }]}>
            <TouchableOpacity 
              style={styles.optionButton} 
              onPress={() => setTagsVisible(true)}
            >
              <View style={styles.optionContent}>
                <Ionicons 
                  name="people" 
                  size={24} 
                  color={isDark ? Colors.light_main : Colors.dark_main} 
                  style={styles.optionIcon} 
                />
                <Text style={[styles.optionText, { color: isDark ? Colors.light_main : Colors.dark_main }]}>
                  Tag People
                </Text>
    </View>

              <View style={styles.taggedPeopleContainer}>
            {tags.map((item, index) => (
              <Image 
              key={item.uid || index}
                    source={{ uri: item.profilephoto || defaultProfileImage }} 
                    style={styles.taggedPersonImage} 
              />
            ))}
                <Ionicons 
                  name="chevron-forward" 
                  size={20} 
                  color={isDark ? Colors.light_main : Colors.dark_main}
                />
          </View>
      </TouchableOpacity>

            <TouchableOpacity 
              style={styles.optionButton}
              onPress={() => setshowLocation(!showLocation)}
            >
              <View style={styles.optionContent}>
                <Ionicons 
                  name="location" 
                  size={24} 
                  color={isDark ? Colors.light_main : Colors.dark_main} 
                  style={styles.optionIcon} 
                />
                <Text style={[styles.optionText, { color: isDark ? Colors.light_main : Colors.dark_main }]}>
                  Add Location
                </Text>
        </View>

              <Switch  
                trackColor={{ false: isDark ? '#333' : '#ddd', true: Colors.blue }}
                thumbColor={Platform.OS === 'ios' ? '#FFFFFF' : (showLocation ? '#FFFFFF' : '#f4f3f4')}
                ios_backgroundColor={isDark ? '#333' : '#ddd'}
                value={showLocation} 
                onValueChange={() => setshowLocation(!showLocation)}
              />
            </TouchableOpacity>
    </Animated.View>

    { (subscriptionStatus !== null && subscriptionStatus === "inactive") && <TouchableOpacity 
                          style={[styles.subscriptionAlert]}
                onPress={handleSubscriptionPress}
                >
                  <View style={{flexDirection: 'row', alignItems: 'center', alignSelf:'center', backgroundColor:'#FF6347', borderRadius:10, paddingHorizontal:10, paddingVertical:5}}>

                  <Ionicons 
                    name={
                      "arrow-up-circle"
                    }
                    size={18} 
                    color="white" 
                    style={styles.alertIcon}
                  />
                  <Text style={styles.alertText}>Upgrade your account</Text>
                  <Ionicons name="chevron-forward" size={16} color="white" />

                  </View>
                 
                </TouchableOpacity>}
{ (subscriptionStatus !== null && subscriptionStatus === "active") && 
    <TouchableOpacity
            style={[
              styles.shareButton,
              loading || compressing ? styles.disabledButton : null
            ]}
       onPress={handleSharePost}
            disabled={loading || compressing}
          >
            {loading ? (
              <ActivityIndicator size="small" color="white" />
            ) : compressing ? (
              <Text style={styles.shareButtonText}>Processing...</Text>
            ) : (
              <>
                <Ionicons name="share-outline" size={20} color="white" style={{ marginRight: 8 }} />
                <Text style={styles.shareButtonText}>Share Post</Text>
              </>
            )}
    </TouchableOpacity>}
        </ScrollView>

        <Tags isVisible={isTagsVisible} handleClosing={() => setTagsVisible(false)} setUsers={setTags} users={tags} />
        
        <CommunityGuidelinesModal 
          isVisible={showGuidelinesPromise} 
          onAccept={() => {
            handleAcceptGuidelines();
            setloading(true);
            handleUploadProcess();
          }} 
        />
      </SafeAreaView>

      </GestureHandlerRootView>
      
    );
};

export default SharePostScreen;

const styles = StyleSheet.create({
  mediaPreviewContainer: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  mediaPreview: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  videoIndicator: {
    position: 'absolute',
    right: 12,
    top: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  multipleImagesIndicator: {
    position: 'absolute',
    right: 12,
    top: 12,
    backgroundColor: 'white',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  multipleImagesText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'black',
  },
  mediaButtonsContainer: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  mediaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 1,
  },
  darkButton: {
    backgroundColor: 'rgba(30,30,30,0.8)',
  },
  lightButton: {
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  mediaButtonText: {
    marginLeft: 6,
    fontWeight: '500',
  },
  mediaSelector: {
    width: '100%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingTop: 16,
    flexDirection: 'row',
    borderWidth: 2,
    borderStyle: 'dashed',
    marginBottom: 16,
    overflow: 'hidden',
  },
  mediaSelectorInner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  descriptionContainer: {
    flexDirection: 'row',
    marginBottom: 4,
    paddingBottom: 8,
  },
  profileImage: {
    width: 40, 
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  descriptionInput: {
    flex: 1,
    fontSize: 16,
    paddingTop: 0,
    textAlignVertical: 'top',
    minHeight: 100,
  },
  characterCount: {
    textAlign: 'right',
    fontSize: 12,
    marginBottom: 16,
  },
  optionsContainer: {
    marginBottom: 16,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#333',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionIcon: {
    marginRight: 12,
  },
  optionText: {
    fontSize: 16,
  },
  taggedPeopleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  taggedPersonImage: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginLeft: -8,
    borderWidth: 2,
    borderColor: 'white',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.blue,
    borderRadius: 8,
    paddingVertical: 14,
    marginTop: 8,
    marginBottom: 16,
  },
  disabledButton: {
    opacity: 0.7,
  },
  shareButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  compressionIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
    padding: 8,
    borderRadius: 8,
  },
  guidelinesModal: {
    justifyContent: 'center',
    margin: 0,
  },
  guidelinesContainer: {
    margin: 20,
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.34,
    shadowRadius: 6.27,
    elevation: 10,
  },
  guidelinesHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  guidelinesIcon: {
    marginBottom: 12,
  },
  guidelinesTitle: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  guidelinesDescription: {
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
  },
  guidelinesRules: {
    marginBottom: 24,
  },
  guidelineRule: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  ruleIcon: {
    marginRight: 16,
  },
  ruleContent: {
    flex: 1,
  },
  ruleTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  ruleDescription: {
    fontSize: 14,
    lineHeight: 18,
  },
  promiseButton: {
    backgroundColor: Colors.blue,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  promiseButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },

  mediaSelectorButton: {
    alignItems: 'center',
    
    marginVertical: 16,
  },
  mediaSelectorIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },

  subscriptionAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    alignSelf:'center',
    paddingVertical: 6,
    borderRadius: 20,
  
  },
  alertText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
    marginRight: 8,
  },
  alertIcon: {
    marginRight: 4,
  },
});