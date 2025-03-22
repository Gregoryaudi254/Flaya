import { StyleSheet, Text, View ,Image,TouchableOpacity,FlatList,TextInput,KeyboardAvoidingView,Platform,ActivityIndicator,ScrollView,Linking} from 'react-native'
import React ,{useState,useRef,useMemo, useEffect,useCallback}from 'react'

import { useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '@/constants/Colors';

import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';

import { GestureHandlerRootView } from 'react-native-gesture-handler';

import CustomDialog from '@/components/CustomDialog';

import { useDispatch } from 'react-redux';

import { editProduct, removeProduct } from '@/slices/sellerproductsSlice';
import {LinearGradient} from 'expo-linear-gradient'

import RequestsItem from '@/components/RequestsItem';
import { Data } from '@/constants/Data';
import { getDistance } from 'geolib';

import { timeAgo } from '@/constants/timeAgo';

import MapView, { Circle } from 'react-native-maps';


const product = () => {

  const dispatch = useDispatch()

  const { product } = useLocalSearchParams();
  const [productDetails,setProductDetails] = useState(JSON.parse(product));
  const [showLoading,setShowDialog] = useState(false);

  const [requests,setRequests] = useState(Data.requests)



  const [showingRequest,setShowingRequest] = useState('edit')
  const [activeRequest,setActiveRequest] = useState(null)

  const bottomSheetRef = useRef(null);
  const initialSnapIndex = -1;

  const foodAndServices = ['food','services']

  const photos = productDetails.images.map((image) => ({
    id: Math.random().toString(36).substring(7), // Generate a random ID
    photo: image
  }));

  console.log('images '+photos)

  const [images,setImages] = useState([...photos,{id:'add'}])




  const pickImageAsync = async () => {

    let result = await ImagePicker.launchImageLibraryAsync({
      
      //mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 1,
      allowsMultipleSelection:true
    });

    if (!result.canceled) {

      const selectedImages = result.assets.map((asset) => ({
        id: Math.random().toString(36).substring(7), // Generate a random ID
        photo: asset.uri
      }));

      const updatedPhotos = [...images];
      updatedPhotos.pop();

      // Update the state with the new list of images
      setImages((previous) => [...selectedImages, ...previous]);

      // Save the images (map to URIs only)
      onEditSavePress('images', [
        ...selectedImages.map((item) => item.photo),
        ...updatedPhotos.map((item) => item.photo),
      ]);



    } 

   }



   const delivery = productDetails.delivery !== undefined ? productDetails.delivery : productDetails.inHouse


   console.log(delivery)
   

   const [deliveryInhouse,setDeliveryInhouse] = useState(delivery);

   const handleDeliveryInhousePress = (value) =>{

    setDeliveryInhouse(value);

   }


   const [bottomInputText,setBottomInputText] = useState(null)

   const [bottomTextTitle,setBottomTextTitle] = useState(null)

   const snapPoinst = useMemo(() => ['40%','60%'],[])

   const onEditPress = (title,input) =>{

    setShowingRequest('edit')

    setBottomInputText(input)

    setBottomTextTitle(title);

    bottomSheetRef.current?.snapToIndex(0);

   }

   const onEditSavePress =  (name,value) =>{

    console.log('value '+value)

    setShowDialog(true)

    setTimeout(()=>{
      productDetails[name.toLowerCase()] = value;

      setProductDetails(productDetails)

      setShowDialog(false)

      dispatch(editProduct({id:productDetails.id,newContent:productDetails}))

    },2000)


   }


   const isFirstRender = useRef(true);
  

   useEffect(()=>{

    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const name = productDetails.delivery !== null ? 'delivery' : 'inHouse'

    console.log(name+' '+deliveryInhouse)

    onEditSavePress(name,deliveryInhouse)
   },[deliveryInhouse])



   const renderItem = useCallback(

    ({ item }) => (

      <TouchableOpacity onPress={()=>onRequestPress(item)}>
        <RequestsItem request={item} productaddress={productDetails.address}/>
      </TouchableOpacity>
      
    )
  );

  const add = false;

  function getDistanceInM (){

    const productLatLng = productDetails.address.latlng

    const pointA = { latitude: productLatLng.latitude, longitude: productLatLng.longitude };
    const pointB = { latitude: activeRequest.latitude, longitude: activeRequest.longitude }; 


    return getDistance(pointA,pointB);

  }


  const onRequestPress = (item)=>{


    setShowingRequest('request')

    const request = {
      id:item.id,
      username:item.username,
      image:item.image,
      timestamp:item.timestamp,
      latitude:item.address.latlng.latitude,
      longitude:item.address.latlng.longitude,
      requestType:item.requestType,
      instruction:item.instruction
    }

    setActiveRequest(request)

    bottomSheetRef.current?.snapToIndex(0);

  }


  const openGoogleMaps = (latitude,longitude) => {
    const url = Platform.select({
      ios: `maps://app?saddr=${latitude},${longitude}`,
      android: `geo:${latitude},${longitude}?q=${latitude},${longitude}`,
    });

    Linking.openURL(url).catch(err => console.error('An error occurred', err));
  };


  const productLatitude = productDetails.address.latlng.latitude
  const productLongitude = productDetails.address.latlng.longitude


  const onProductLocationPress = () =>{

    setShowingRequest('map')

    bottomSheetRef.current?.snapToIndex(0);

  }


  const handleDeleteRequest = () =>{

    setShowDialog(true)

    setTimeout(()=>{
      setShowDialog(false)
      setRequests((prevRequests) => prevRequests.filter(request => request.id !== activeRequest.id));
      bottomSheetRef.current?.close()
    },2000)
    
  }


  const onProductDelete = () =>{

    setShowDialog(true)

    setTimeout(()=>{
      dispatch(removeProduct(productDetails.id))
      setShowDialog(false)
    },2000)



    


  }

  return (

    <GestureHandlerRootView style={{flex:1}}>

        <ScrollView stickyHeaderIndices={[add ? 0: 1]}>


         {add && <View style={{backgroundColor:'black'}}>


          <Text style={{fontSize:15,color:'gray',marginStart:10}}>Requests</Text>

          <FlatList
              bounces={true}
              keyExtractor={(request) => request.id}
              horizontal
              renderItem={renderItem}
              data={requests}/>

          </View>}



         

          <View style={{margin:15}}>


            

          <LinearGradient
            colors={['#FF7F50', '#FF6347', '#FF4500']} // Define your gradient colors here
            style={{borderRadius:10,flexDirection:'column',padding:15}}
            start={{ x: 0, y: 0 }} // Gradient start point (top-left)
            end={{ x: 1, y: 1 }} // Gradient end point (bottom-right)
          >

            <View style={{flexDirection:'row',justifyContent:'space-between'}}>


              <TouchableOpacity style={{maxWidth:'60%'}} onPress={onProductLocationPress}>

                <View style={{flexDirection:'row',alignItems:'center',padding:10,borderRadius:10,backgroundColor:'rgba(0, 0, 0, 0.5)'}}>


                <Image
                    resizeMode="contain"
                    source={require('@/assets/icons/pin.png')}
                    style={{height:35,width:35,tintColor:'white'}}
                  />


                  <View style={{marginStart:10}}>

                  <Text style={{fontSize:15,color:'white'}}>Product location</Text>

                  <Text numberOfLines={1} style={{fontSize:15,color:'gray',marginTop:5}}>{productDetails.address.info}</Text>

                  </View>

                </View>

              </TouchableOpacity>


              
            <View style={{flexDirection:'row'}}>

              <Image
              resizeMode="contain"
              source={require('@/assets/icons/visibility.png')}
              style={{height:25,width:25,tintColor:'white'}}/>

              <Text style={{
              color: 'white',
              fontSize: 15,
              marginLeft: 5,
              }}>19</Text>

              </View>

              


             

            </View>


            <View style={{marginTop:15}}>

           

              <View style={{flexDirection:'row',alignItems:'center'}}>

                <Image
                    resizeMode="contain"
                    source={require('@/assets/icons/clocking.png')}
                    style={{height:15,width:15,tintColor:Colors.dark_gray,marginEnd:5}}/>

                <Text style={{color:Colors.dark_gray,fontSize:15}}>{productDetails.timestamp}</Text>

              
              </View>

            </View>
          


          </LinearGradient>

          
          <Text style={styles.title}>Title</Text>


          <View style={{flexDirection:'row'}}>

            <Text style={styles.contentText}>{productDetails.title}</Text>

            <TouchableOpacity onPress={() => onEditPress('Title',productDetails.title)}>

            <Image source={require('@/assets/icons/editing.png')}
                  style={{height:20,width:20,tintColor:'gray'}}
            />

            </TouchableOpacity>

          </View>

          <View style={{width:'100%',height:0.8,backgroundColor:'white',marginTop:10}}/>

          <Text style={styles.title}>Price</Text>


          <View style={{flexDirection:'row'}}>

            <Text style={styles.contentText}>{productDetails.price}</Text>

            <TouchableOpacity onPress={() => onEditPress('Price',productDetails.price)}>

              <Image source={require('@/assets/icons/editing.png')}
                    style={{height:20,width:20,tintColor:'gray'}}
              />

              </TouchableOpacity>

          </View>

          <View style={{width:'100%',height:0.8,backgroundColor:'white',marginTop:10}}/>

          <Text style={styles.title}>Caption</Text>

          <View style={{flexDirection:'row'}}>

          <Text style={styles.contentText}>{productDetails.caption}</Text>

          <TouchableOpacity onPress={() => onEditPress('Caption',productDetails.caption)}>

            <Image source={require('@/assets/icons/editing.png')}
                  style={{height:20,width:20,tintColor:'gray'}}
            />

            </TouchableOpacity>


          </View>


          <View style={{width:'100%',height:0.8,backgroundColor:'white',marginTop:10}}/>

          <Text style={styles.title}>Description</Text>

          <View style={{flexDirection:'row'}}>

          <Text style={styles.contentText}>{productDetails.description}</Text>


          <TouchableOpacity onPress={() => onEditPress('Description',productDetails.description)}>

            <Image source={require('@/assets/icons/editing.png')}
                  style={{height:20,width:20,tintColor:'gray'}}
            />

          </TouchableOpacity>

          


          </View>

          <View style={{width:'100%',height:0.8,backgroundColor:'white',marginTop:10}}/>

          <FlatList
              data={images}
              style={{marginTop:10,marginEnd:10}}
              renderItem={ ({ item }) => (
                item.photo ? (
                  <View style={{height:100,width:100,borderRadius:10,marginEnd:5}}>

                    <Image source={{uri:item.photo}} 
                            style={{width:'100%',height:'100%',borderRadius:10}} />


                      <TouchableOpacity style={{height:25,width:25,borderRadius:10,backgroundColor:'rgba(0, 0, 0, 0.5)',
                        position:'absolute',justifyContent:'center',margin:5,alignItems:'center'}} onPress={() => onDeleteImage(item)}>

                      <Image source={require('@/assets/icons/cancel.png')} 
                        style={{width:15,height:15,tintColor:'white'}} />

                      </TouchableOpacity>     

                      
                    
                  </View>
                ) : (

                  <TouchableOpacity onPress={pickImageAsync}>

                    <View 
                      style={{height:100,width:100,borderRadius:10,backgroundColor:'tomato',alignItems:'center',justifyContent:'center'}}>

                        <Image source={require('@/assets/icons/adding.png')} 
                        style={{width:25,height:25,tintColor:'white',position:'absolute'}} />

                        
                      
                      </View>

                  </TouchableOpacity>
                
                )
              )}
            
              keyExtractor={(item) => item.id}
              horizontal={true}           // Enables horizontal scrolling
              showsHorizontalScrollIndicator={false} // Hides the horizontal scroll indicator
            />


            {!foodAndServices.includes(productDetails.category) && <View>

              


                <View style={{flexDirection:'row',marginTop:10}}> 

                <Text style={{color:'white',fontSize:15,flex:1,marginEnd:10}}>Condition</Text>

                <View style={{backgroundColor:Colors.blue,
                        borderRadius:5,padding:5,alignItems:'center'
                        ,alignSelf:'flex-end',marginEnd:25}}>

                    <Text style={{fontSize:12,color:'white'}}>{productDetails.condition}</Text>

                </View>



                </View>


            </View>}


            <View style={{flexDirection:'row',marginTop:15}}> 

                <Text style={{color:'white',fontSize:15,flex:1,marginEnd:10}}>
                  {productDetails.delivery !== undefined  ? 'Delivery':'Inhouse service'}</Text>


                <TouchableOpacity onPress={()=>handleDeliveryInhousePress(true)}>

                  <View style={{backgroundColor:deliveryInhouse? Colors.blue :'gray',
                          borderRadius:5,padding:5,alignItems:'center'
                          ,alignSelf:'flex-end',marginEnd:25}}>

                      <Text style={{fontSize:12,color:'white'}}>Yes</Text>

                  </View>

                </TouchableOpacity>


                <TouchableOpacity onPress={()=>handleDeliveryInhousePress(false)}>

                  <View style={{backgroundColor:!deliveryInhouse? Colors.blue :'gray',
                          borderRadius:5,padding:5,alignItems:'center'
                          ,alignSelf:'flex-end',marginEnd:25}}>

                      <Text style={{fontSize:12,color:'white'}}>No</Text>

                  </View>

                </TouchableOpacity>
                

                



            </View>


            <TouchableOpacity


                    onPress={onProductDelete}

                  
                    style={{
                        width: '90%',
                        height: 40,
                        marginBottom:5,
                        marginTop:15,
                        alignSelf:'center',
                    
                        alignItems:'center',
                        borderRadius:5,

                        borderWidth:2,
                        borderColor:'red'
                        
                        
                        
                    }}
                  >
            
                    <View style={{flexDirection:'row',height:'100%'}}>
            
                      <Text style={{
                          color: 'red',
                          alignSelf:'center',
                          fontSize: 15
                      }}>DELETE PRODUCT
                      </Text>
            
                    </View>
                    
                </TouchableOpacity>



              

            


          




          </View>

        

        </ScrollView>

        

      <BottomSheet  
            enablePanDownToClose={true} 
            ref={bottomSheetRef}
            index={initialSnapIndex}
            backgroundStyle={{backgroundColor:'#141414'}}
            handleIndicatorStyle={{backgroundColor:'#fff'}}
            snapPoints={snapPoinst}>


              {
                showingRequest === 'edit' ? (

                  <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
               style={{ flex: 1 }}>

                
                <View>

                <Text style={{color:'gray',fontSize:15,marginTop:10,marginStart:10}}>{bottomTextTitle}</Text>


                <View style={[styles.inputContainer,{borderColor:'gray'}]}>

                <TextInput
                style={{fontSize:16,color:'white',width:'100%',textAlignVertical:'top'}}
                // onChangeText={setPassword}
                underlineColorAndroid={Colors.dark_gray}
                textAlign='flex-start'


                multiline={true}
                value={bottomInputText}
                onChangeText={setBottomInputText}   

                />

                </View>


                <TouchableOpacity


                  onPress={()=>onEditSavePress(bottomTextTitle,bottomInputText)}
                    
                  style={{
                      width: '90%',
                      height: 40,
                      marginBottom:5,
                      marginTop:15,
                      alignSelf:'center',
                  
                      alignItems:'center',
                      borderRadius:5,
                      backgroundColor:Colors.blue,

                    
                        
                  }}
                >
          
                  <View style={{flexDirection:'row',height:'100%'}}>
          
                    <Text style={{
                        color: 'white',
                        alignSelf:'center',
                        fontSize: 15
                    }}>EDIT
                    </Text>
          
                  </View>
                  
              </TouchableOpacity>

                  

                </View>

                  </KeyboardAvoidingView>

                ): showingRequest === 'request' ?
                (
                  <View style={{margin:10,flex:1}}>

                    <View style={{flexDirection:'row'}}>

                    <Image
                        resizeMode="cover"
                        source={{uri:activeRequest.image}}
                        style={styles.profileImage}
                        />


                      <View style={{marginStart:10,flex:1}}>

                          <View style={{flexDirection:'row'}}>

                            <Text style={{fontSize:15,color:'white'}}>{activeRequest.username}</Text>

                            <Text style={{fontSize:15,color:'gray'}}> {timeAgo(activeRequest.timestamp)}</Text>

                          </View>


                          <View style={{flexDirection:'row',marginTop:5,alignItems:'center'}}>


                              <Image
                                  resizeMode="contain"
                                  source={require('@/assets/images/location-pin.png')}
                                  style={{width:20,height:20,tintColor:'gray'}}
                              />


                            <Text style={{fontSize:14,color:'gray',marginStart:5}}>{getDistanceInM()}m</Text>

                          </View>


                          <View style={{flexDirection:'row',padding:5,marginTop:5}}>

                              <Image
                              resizeMode="contain"
                              source={require('@/assets/icons/lists.png')}
                              style={{width:20,height:20,tintColor:'gray'}}/>

                              <Text style={{fontSize:15,color:'gray'}}> {activeRequest.requestType}</Text>

                          </View>

                        

                        

                      </View>



                      <TouchableOpacity onPress={()=> openGoogleMaps(activeRequest.latitude,activeRequest.longitude)}>

                        <View style={{flexDirection:'row',alignItems:'center',borderRadius:5,backgroundColor:'rgba(0, 0, 0, 0.5)',padding:5,height:40}}>

                          <Image
                              resizeMode="contain"
                              source={require('@/assets/icons/map.png')}
                              style={{width:20,height:20}}
                          />


                          <Text style={{fontSize:15,color:'white'}}> Map</Text>

                        </View>



                      </TouchableOpacity>


                      
                    </View>


                    <Text style={{fontSize:15,color:'gray'}}>Contact info</Text>


                    <View style={[{flexDirection:'row'},!activeRequest.instruction && {flex:1}]}>

                      
                        <TouchableOpacity

                              
                          style={{
                             
                              height: 40,
                              marginBottom:5,
                              marginTop:15,
                              backgroundColor:'green',
                              paddingHorizontal:10,
                    
                              alignItems:'center',
                              borderRadius:5
                          }}
                          >

                          <View style={{flexDirection:'row',height:'100%'}}>

                          <Image
                                  resizeMode="contain"
                                  source={require('@/assets/icons/telephone-call.png')}
                                  style={{width:20,height:20,tintColor:'white',alignSelf:'center'}}
                              />

                            <Text style={{
                                color: 'white',
                                alignSelf:'center',
                                fontSize: 15
                            }}> Call
                            </Text>

                          </View>

                         </TouchableOpacity>

                         <TouchableOpacity

                              
                          style={{
                            
                              height: 40,
                              marginBottom:5,
                              marginTop:15,
                              marginStart:20,
                              paddingHorizontal:10,
                              backgroundColor:Colors.blue,

                              alignItems:'center',
                              borderRadius:5
                          }}
                          >

                          <View style={{flexDirection:'row',height:'100%'}}>

                          <Image
                                  resizeMode="contain"
                                  source={require('@/assets/icons/sendM.png')}
                                  style={{width:20,height:20,tintColor:'white',alignSelf:'center'}}
                              />

                            <Text style={{
                                color: 'white',
                                alignSelf:'center',
                                fontSize: 15
                            }}> Message
                            </Text>

                          </View>

                         </TouchableOpacity>


                    </View>


                    {activeRequest.instruction && <View style={{flex:1,marginTop:5}}>

                        <Text style={{fontSize:15,color:'gray'}}>Special instruction</Text>

                        <Text style={{fontSize:15,color:'white'}}>{activeRequest.instruction}</Text>

                    </View>}


                    <TouchableOpacity
                     onPress={handleDeleteRequest}
                  
                      style={{
                          width: '90%',
                          height: 40,
                          marginBottom:5,
                          marginTop:15,
                          bottom:10,
                          alignSelf:'center',
                          

                          alignItems:'center',
                          borderRadius:5,

                          borderWidth:2,
                          borderColor:'red'
                          
                          
                          
                      }}
                      >

                      <View style={{flexDirection:'row',height:'100%'}}>

                        <Text style={{
                            color: 'red',
                            alignSelf:'center',
                            fontSize: 15
                        }}>DELETE REQUEST
                        </Text>

                      </View>

                      </TouchableOpacity>







                  </View>
                ):(

                  <MapView
                    style={styles.map}
                    zoomEnabled={true}
                    scrollEnabled={true}
                    minZoomLevel={1}  // Adjust this to set the minimum zoom level
                    maxZoomLevel={30}
                    initialRegion={{
                      latitude: productDetails.address.latlng.latitude,
                      longitude: productDetails.address.latlng.longitude,
                      latitudeDelta: 0.02, // Smaller delta for closer zoom
                      longitudeDelta: 0.02
                    }}
                  >
                    <Circle
                      center={{ latitude:productLatitude, longitude:productLongitude }}
                      radius={500}
                      strokeWidth={2}
                      strokeColor={'rgba(255, 0, 0, 0.5)'}
                      fillColor={'rgba(255, 0, 0, 0.2)'}
                    />
                  </MapView>
                
                
                
                )


              }


              



              

            </BottomSheet>


            <CustomDialog onclose={null} isVisible={showLoading}>
              <ActivityIndicator  size="large" color="white" />
            </CustomDialog>

    </GestureHandlerRootView>

   
  )
}

export default product

const styles = StyleSheet.create({
 contentText:{color:'gray',
 fontSize:15,flex:1,
 marginEnd:10},

   inputContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent:'space-between',
  
  borderWidth: 1,
  alignSelf:'center',
  marginTop:10,
  width:'95%',
  paddingVertical:5,

  borderRadius: 5,

  paddingHorizontal: 10,
},profileImage: {
  width: 70,
  height: 70,
  borderRadius: 35,
  marginEnd: 10,
},
map:{
  width:'100%',
  height:'100%'

},title:{color:'white',
fontSize:15,marginTop:10}})