import { StyleSheet, Text, View, Image, TextInput, Switch, TouchableOpacity, ActivityIndicator, TouchableWithoutFeedback, ScrollView, Platform } from 'react-native'
import Modal from 'react-native-modal';
import React, { useEffect, useState, useLayoutEffect } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import AsyncStorage from '@react-native-async-storage/async-storage';

import * as ImagePicker from 'expo-image-picker';
import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';

import { useDispatch, useSelector } from 'react-redux';
import { startUpload, updateProgress, finishUpload } from '@/slices/uploadSlice';

import { useRouter, useNavigation, useLocalSearchParams } from 'expo-router';
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

// Import the compressor
import { Image as ImageCompressor, Video as VideoCompressor } from 'react-native-compressor';
import { clearTextImageData } from '@/slices/textImageSlice';
import { httpsCallable } from 'firebase/functions';

// Add the Community Guidelines Promise Modal component
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
          Flaya is a family-friendly platform. Before sharing your first story, please promise to follow these guidelines:
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

const ShareStoryScreen = () => {
    const toast = useToast();
    const router = useRouter();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    
    const credentials = useAuth();
    
    const [pickedImages, setPickedImages] = useState(null);
    const [pickedVideos, setPickedVideos] = useState(null);
    const [uploadOk, setUploadOk] = useState(true);
    const [showLocation, setshowLocation] = useState(false);
    const [caption, setcaption] = useState('');
    const [contentType, setcontentType] = useState(null);
    const [loading, setloading] = useState(false);
    const [compressing, setCompressing] = useState(false);
    const [thumbnail, setThumbnail] = useState(null);
    const [profileInfo, setUserinfo] = useState({});
    const [showGuidelinesPromise, setShowGuidelinesPromise] = useState(false);
    const [hasAcceptedGuidelines, setHasAcceptedGuidelines] = useState(null);
    const [isTextImage, setIsTextImage] = useState(false);
    const params = useLocalSearchParams();

    const getUserInfo = async () => {
      const profileInfo = await getData('@profile_info');
      setUserinfo(profileInfo);
      
      // Check if user has already accepted guidelines
      try {
        const hasAccepted = await AsyncStorage.getItem('has_accepted_guideliness');
        setHasAcceptedGuidelines(hasAccepted === 'true');
      } catch (error) {
        console.error('Error checking guidelines acceptance:', error);
        setHasAcceptedGuidelines(false);
      }
    }

    const {imageUri} = useSelector(state => state.textImage);

    useEffect(() => {
       getUserInfo();

       return () => {
        dispatch(clearTextImageData());
       }
    }, []);

 
    
    // Handle text image coming back from textToImage screen
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
        await AsyncStorage.setItem('has_accepted_guideliness', 'true');
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
          maxHeight: 1920 // Stories can be taller
        });
        setCompressing(false);
        return result;
      } catch (e) {
        console.error('Image compression failed:', e);
        setCompressing(false);
        return uri; // Return original if compression fails
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
        return uri; // Return original if compression fails
      }
    };

    const pickImageAsync = async () => {
        try {
        let result = await ImagePicker.launchImageLibraryAsync({
          quality: 1,
            allowsMultipleSelection: false
        });
    
        if (!result.canceled) {
              setcontentType('image');
           const selectedImages = result.assets.map((asset) => asset.uri);
              setPickedImages(selectedImages);
          }
        } catch (error) {
          showToast("Error selecting image: " + error.message);
        } 
      };
      
    const pickVideoAsync = async () => {
        try {
        let result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Videos,
          quality: 1,
            allowsMultipleSelection: false
        });
    
        if (!result.canceled) {
              setcontentType('video');
           const selectedVideos = result.assets.map((asset) => asset.uri);
              await generateThumbnail(selectedVideos[0]);
           setPickedVideos(selectedVideos);
          }
        } catch (error) {
          showToast("Error selecting video: " + error.message);
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
        console.warn("Failed to generate thumbnail:", e);
        showToast("Failed to generate video thumbnail");
        }
      };

        const dispatch = useDispatch();

    const uploadItem = async (item, location) => {
          dispatch(startUpload(item));
          let thumbnailGenerated;
      
          try {
              const urls = []; // Array to hold the download URLs
              const content = item.content;

              // Return to home screen immediately when upload starts
              router.back();

              if (item.contentType === 'image') {
                  // Compress and upload image
                  const compressedUri = await compressImage(content[0]);

                  const fileName = compressedUri.split('/').pop();
                  const response = await fetch(compressedUri);
                      const storageRef = ref(storage, `uploads/images/${credentials.user.uid}/${fileName}`);

                  if (!response.ok) {
                    throw new Error("Failed to fetch image");
                      }

                     const mediaBlob = await response.blob();
                  const uploadTask = uploadBytesResumable(storageRef, mediaBlob);
      
                      // Monitor the upload progress
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
              } else {
                  // Compress and upload video
                  const compressedVideoUri = await compressVideo(content[0]);
                  
                  const fileName = compressedVideoUri.split('/').pop();
                  const response = await fetch(compressedVideoUri);
                  const storageRef = ref(storage, `uploads/videos/${credentials.user.uid}/${fileName}`);
                  
                  if (!response.ok) {
                    throw new Error("Failed to fetch video");
                  }
                  
                  const blob = await response.blob();
                  const uploadTask = uploadBytesResumable(storageRef, blob);

                  // First upload the thumbnail
                  const fileNameImage = thumbnail.split('/').pop();
                  const responseImage = await fetch(thumbnail);
                  const storageRefImage = ref(storage, `uploads/images/${credentials.user.uid}/${fileNameImage}`);
                  
                  if (!responseImage.ok) {
                    throw new Error("Failed to fetch thumbnail");
                  }
                  
                  const mediaBlob = await responseImage.blob();
                  const uploadTaskImage = uploadBytesResumable(storageRefImage, mediaBlob);
                  
                  // Upload thumbnail
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

                  // Upload video
                  await new Promise((resolve, reject) => {
                    uploadTask.on(
                      'state_changed',
                      (snapshot) => {
                          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                          dispatch(updateProgress(progress));
                      },
                      (error) => {
                          console.error('Upload error:', error);
                          dispatch(finishUpload());
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

              const id = generateUniquePostId();

              // Prepare data for Firestore
              const data = {
                ...item,
                threadId: id,
                views: 0,
                replies: 0,
                isshowinglocation: showLocation,
                content: urls[0],
                coordinates: new GeoPoint(location.coords.latitude, location.coords.longitude),
                createdAt: serverTimestamp()
              };

              if (contentType !== 'image') {
                data.thumbnail = thumbnailGenerated;
               }

              // Save to Firestore
              await setDoc(doc(db, `users/${credentials.user.uid}/stories`, id), data);
              console.log('Story uploaded successfully');
          } catch (error) {
              console.error('Error uploading story:', error);
              showToast("Failed to upload story: " + error.message);
              dispatch(finishUpload());
          }
      
          dispatch(finishUpload());
      };

      const generateUniquePostId = () => {
      return Math.random().toString(36).substr(2, 9);
       };

    const handleShareStory = () => {
      if (contentType === null) {
        setUploadOk(false);
        showToast("Please select an image or video first");
        return;
      }

      if (caption && caption.length > 100) {
        showToast("Caption is too long (max 100 characters)");
        return;
      }
      
      // Check if user has accepted community guidelines
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
          showToast("Location access is required to share stories");
          setloading(false);
            return;
          }

          // Get the user's current location
          let currentLocation = await Location.getCurrentPositionAsync({});

          const item = {
          content: contentType === 'image' ? pickedImages : pickedVideos,
          caption: caption,
          contentType: contentType,
          ...(contentType === 'video' ? { thumbnail: thumbnail } : {})
        };

        // Start the upload process - this will navigate back in the uploadItem function
        await uploadItem(item, currentLocation);
      } catch (error) {
        console.error("Upload process error:", error);
        showToast("Failed to share story: " + error.message);
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

    // Add function to navigate to text image creator
    const goToTextImageCreator = () => {
      router.push({
        pathname: '/textToImage',
        params: { returnTo: 'sharestory' }
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
      <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? '#121212' : '#FFFFFF' }}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 8 }}>
          {/* Media preview */}
      {(pickedImages || pickedVideos) ? (
            <View style={styles.mediaPreviewContainer}>
           <TouchableWithoutFeedback onPress={pickImageAsync}>
              <Image 
                  source={{ uri: contentType === 'image' ? pickedImages[0] : thumbnail }} 
                  style={styles.mediaPreview} 
              />
            </TouchableWithoutFeedback>

              {/* Video indicator */}
              {contentType !== 'image' && (
                <View style={styles.videoIndicator}>
                  <Ionicons name="play" size={20} color="white" />
                </View>
              )}

              {/* Media selection buttons */}
              <View style={styles.mediaButtonsContainer}>
                {isTextImage ? (
                  <TouchableOpacity 
                    style={[styles.mediaButton, isDark ? styles.darkButton : styles.lightButton]} 
                    onPress={goToTextImageCreator}
                  >
                    <Ionicons name="pencil" size={20} color={isDark ? 'white' : '#333'} />
                    <Text style={[styles.mediaButtonText, { color: isDark ? 'white' : '#333' }]}>
                      Edit Text
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity 
                    style={[styles.mediaButton, isDark ? styles.darkButton : styles.lightButton]} 
                    onPress={pickImageAsync}
                  >
                    <Ionicons name="images" size={20} color={isDark ? 'white' : '#333'} />
                    <Text style={[styles.mediaButtonText, { color: isDark ? 'white' : '#333' }]}>
                      Change Image
                    </Text>
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
                  <Text style={[styles.mediaButtonText, { color: isDark ? 'white' : '#333' }]}>
                    Video
                  </Text>
                </TouchableOpacity>
                  </View>
        </View>
      ) : (
            <View style={[styles.mediaSelector, { borderColor: uploadOk ? (isDark ? '#444' : "#ddd") : '#FF3B30' }]}>
              <View style={styles.mediaSelectorOptions}>
                <TouchableOpacity style={styles.mediaSelectorButton} onPress={pickImageAsync}>
                  <View style={[styles.mediaSelectorIconContainer, { backgroundColor: isDark ? '#333' : '#f0f0f0' }]}>
                    <Ionicons 
                      name="images" 
                      size={22} 
                      color={isDark ? '#FFFFFF' : "#333333"} 
                    />
                  </View>
                  <Text style={{ color: isDark ? '#FFFFFF' : "#333333", marginTop: 8 }}>
                    Photo
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.mediaSelectorButton} onPress={pickVideoAsync}>
                  <View style={[styles.mediaSelectorIconContainer, { backgroundColor: isDark ? '#333' : '#f0f0f0' }]}>
                    <Ionicons 
                      name="videocam" 
                      size={22} 
                      color={isDark ? '#FFFFFF' : "#333333"} 
                    />
                  </View>
                  <Text style={{ color: isDark ? '#FFFFFF' : "#333333", marginTop: 8 }}>
                    Video
                  </Text>
        </TouchableOpacity>
       
                <TouchableOpacity style={styles.mediaSelectorButton} onPress={goToTextImageCreator}>
                  <View style={[styles.mediaSelectorIconContainer, { backgroundColor: isDark ? '#333' : '#f0f0f0' }]}>
                    <Ionicons 
                      name="text" 
                      size={22} 
                      color={isDark ? '#FFFFFF' : "#333333"} 
                    />
                  </View>
                  <Text style={{ color: isDark ? '#FFFFFF' : "#333333", marginTop: 8 }}>
                    Text
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Compression indicator */}
          {compressing && (
            <View style={styles.compressionIndicator}>
              <ActivityIndicator size="small" color={Colors.blue} />
              <Text style={{ color: isDark ? 'white' : 'black', marginLeft: 8 }}>
                Processing media...
              </Text>
    </View>
    )}

          {/* Caption input */}
          <View style={styles.captionContainer}>
        <Image 
              source={{ uri: profileInfo.profilephoto || defaultProfileImage }} 
              style={styles.profileImage} 
          />

        <TextInput
              style={[styles.captionInput, { color: isDark ? 'white' : 'black' }]}
              placeholder="Add a caption..."
              placeholderTextColor={isDark ? '#888' : 'gray'}
        value={caption}
        onChangeText={setcaption}
              multiline={true}
              maxLength={100}
            />
          </View>

          {/* Character count */}
          <Text style={[styles.characterCount, { color: isDark ? '#888' : '#888' }]}>
            {caption.length}/100
          </Text>

          {/* Story options */}
          <View style={styles.optionsContainer}>
            {/* Location option */}
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
    </View>

          {/* Story privacy info */}
          <View style={styles.privacyInfoContainer}>
            <Ionicons 
              name="information-circle-outline" 
              size={20} 
              color={isDark ? '#AAA' : '#666'} 
            />
            <Text style={[styles.privacyInfoText, { color: isDark ? '#AAA' : '#666' }]}>
              Your story will be visible to others for 24 hours.
            </Text>
          </View>


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

          {/* Share button */}
   { (subscriptionStatus !== null && subscriptionStatus === "active") && <TouchableOpacity
            style={[
              styles.shareButton,
              loading || compressing ? styles.disabledButton : null
            ]}
       onPress={handleShareStory}
            disabled={loading || compressing}
          >
            {loading ? (
              <ActivityIndicator size="small" color="white" />
            ) : compressing ? (
              <Text style={styles.shareButtonText}>Compressing...</Text>
            ) : (
              <>
                <Ionicons name="share-outline" size={20} color="white" style={{ marginRight: 8 }} />
                <Text style={styles.shareButtonText}>Share Story</Text>
              </>
            )}
          </TouchableOpacity>}
        </ScrollView>
        
        {/* Community Guidelines Promise Modal */}
        <CommunityGuidelinesModal 
          isVisible={showGuidelinesPromise} 
          onAccept={() => {
            handleAcceptGuidelines();
            // After accepting, continue with upload
            setloading(true);
            handleUploadProcess();
          }}
        />
      </SafeAreaView>
    );
};

export default ShareStoryScreen;

const styles = StyleSheet.create({
  mediaPreviewContainer: {
    width: '100%',
    aspectRatio: 1, // Stories are typically in portrait mode
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
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    marginBottom: 16,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaSelectorOptions: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
    paddingVertical: 16,
  },
  mediaSelectorButton: {
    alignItems: 'center',
    marginVertical: 16,
  },
  mediaSelectorIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  captionContainer: {
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
  captionInput: {
    flex: 1,
    fontSize: 16,
    paddingTop: 0, // Fixes alignment on iOS
    textAlignVertical: 'top',
    minHeight: 60,
    maxHeight: 100,
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
  privacyInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 8,
  },
  privacyInfoText: {
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
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
  // Community Guidelines Modal Styles
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
  },subscriptionAlert: {
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