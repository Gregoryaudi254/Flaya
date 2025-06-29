import React, { memo, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import BottomSheet from '@gorhom/bottom-sheet';
import MapView from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';



const LocationPickerBottomSheet = 

({
  bottomSheetRef,
  initialSnapIndex,
  snapPoints,
  userLocation,
  address,
  colorScheme,
  handleRegionChangeComplete,
  handleOnSendLocationPress,
}) => {
  const containerStyle = useMemo(() => ({
    backgroundColor: colorScheme === 'dark' ? '#1F1F1F' : '#FFFFFF',
  }), [colorScheme]);

  const borderStyle = useMemo(() => ({
    backgroundColor: containerStyle.backgroundColor,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  }), [containerStyle]);

  const indicatorStyle = useMemo(() => ({
    backgroundColor: colorScheme === 'dark' ? '#666' : '#CCC',
    width: 40,
    height: 4,
  }), [colorScheme]);

  const defaultRegion = useMemo(() => ({
    latitude: -1.2921,
    longitude: 36.8219,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  }), []);

  console.log("Damn")

  return (
    <BottomSheet
      enablePanDownToClose={true}
      ref={bottomSheetRef}
      index={initialSnapIndex}
      backgroundStyle={borderStyle}
      handleIndicatorStyle={indicatorStyle}
      snapPoints={snapPoints}
    >
      <View style={[styles.modernBottomSheetContainer, containerStyle]}>
        {/* Header */}
        <View style={styles.bottomSheetHeader}>
          <View style={[styles.bottomSheetIconContainer, {
            backgroundColor: colorScheme === 'dark'
              ? 'rgba(34, 197, 94, 0.2)'
              : 'rgba(34, 197, 94, 0.1)',
          }]}>
            <Ionicons name="location" size={24} color="#22C55E" />
          </View>
          <View style={styles.bottomSheetHeaderText}>
            <Text style={[styles.bottomSheetTitle, {
              color: colorScheme === 'dark' ? Colors.light_main : Colors.dark_main,
            }]}>Share Location</Text>
            <Text style={[styles.bottomSheetSubtitle, {
              color: colorScheme === 'dark' ? '#888' : '#666',
            }]}>Drag the map to select precise location</Text>
          </View>
        </View>

        {/* Map */}
        <View style={styles.modernMapContainer}>
          <View style={[styles.mapWrapper, {
            backgroundColor: colorScheme === 'dark'
              ? 'rgba(255, 255, 255, 0.05)'
              : 'rgba(0, 0, 0, 0.02)',
            borderColor: colorScheme === 'dark'
              ? 'rgba(255, 255, 255, 0.1)'
              : 'rgba(0, 0, 0, 0.1)',
          }]}>
            <MapView
              style={styles.modernMapView}
              initialRegion={userLocation || defaultRegion}
              provider="google"
              showsUserLocation={true}
              showsMyLocationButton={false}
              mapType="standard"
              onRegionChangeComplete={handleRegionChangeComplete}
            />
            <View style={styles.modernMarkerFixed}>
              <View style={styles.markerShadow}>
                <Ionicons name="location" size={32} color="#22C55E" />
              </View>
              <View style={styles.markerPulse} />
            </View>
          </View>
        </View>

        {/* Address */}
        <View style={[styles.modernAddressSection, {
          backgroundColor: colorScheme === 'dark'
            ? 'rgba(255, 255, 255, 0.05)'
            : 'rgba(0, 0, 0, 0.02)',
          borderColor: colorScheme === 'dark'
            ? 'rgba(255, 255, 255, 0.1)'
            : 'rgba(0, 0, 0, 0.1)',
        }]}>
          <View style={styles.addressHeader}>
            <Ionicons name="location-outline" size={20} color={Colors.blue} />
            <Text style={[styles.addressLabel, {
              color: colorScheme === 'dark' ? Colors.light_main : Colors.dark_main,
            }]}>
              Selected Location
            </Text>
          </View>

          {address && (
            <Text style={[styles.addressText, {
              color: colorScheme === 'dark' ? '#AAA' : '#666',
            }]}>
              {address.formattedAddress}
            </Text>
          )}
        </View>

        {/* Send Button */}
        <TouchableOpacity
          onPress={handleOnSendLocationPress}
          style={[styles.modernSendLocationButton, { backgroundColor: Colors.blue }]}
          activeOpacity={0.8}
        >
          <Ionicons name="send" size={20} color="white" />
          <Text style={styles.sendLocationText}>Send Location</Text>
        </TouchableOpacity>
      </View>
    </BottomSheet>
  );
};

export default memo(LocationPickerBottomSheet);

const styles = StyleSheet.create({
    floatingButton: {
      position: 'absolute',
      bottom: 20,
      right: 20,
      backgroundColor: 'blue',
      borderRadius: 25,
      width: 50,
      height: 50,
      justifyContent: 'center',
      alignItems: 'center',
    },
    button: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    buttonContainer:{backgroundColor:'gray',
    padding:5,borderRadius:5,
    justifyContent:'center',paddingHorizontal:20},
    modalSelection:{

      flexDirection:'row',
      width:"80%",
      alignItems:'center',
      justifyContent:'space-between'
      ,marginTop:10

    },
    dialog:{
      shadowColor: 'gray', // Shadow color
      shadowOffset: { width: 0, height: 10 }, // Shadow offset
      shadowOpacity: 0.15, // Shadow opacity
      shadowRadius: 5, // Shadow radius
      elevation: 5, 
      width:'60%',height:180,
          backgroundColor:Colors.dark_gray,alignSelf:'center',
          justifyContent:'center',borderRadius:30,alignItems:'center'

    },
    markerFixed: {
      position: 'absolute',
      alignSelf:'center',
      top:'50%',
      marginTop:-40,
     
  
       // Half of the marker's height
    },
    iconsView: {
      padding: 10,
      flexDirection:'row',
    
      borderRadius: 5,
    },
    textInput: {
    
      padding: 10,
      marginRight: 10,
      flex: 1,
      borderRadius: 10,
      borderColor: 'white',
      shadowColor: 'gray',
    },
    selectedItem: {
      backgroundColor: 'rgba(0, 150, 250, 0.3)', // Light blue background for selected items
    },
    sendIcon: {
      width: 20,
      marginEnd:15,
      height: 20,
    },
    inputIcons:{
      width: 20,
      height: 20,
      marginHorizontal:8

    },
    requestContainer: {
      backgroundColor: Colors.dark_gray, // Replace with Colors.dark_gray if it's defined
      alignItems: 'center',
    },
    buttonsContainer:{
      flexDirection:'row',width:'100%',
      justifyContent:'space-evenly',
      alignItems:'center',
      marginTop:10,
      marginBottom:10

    },
    container: {
      height: 50,
      flexDirection: 'row',
      alignSelf: 'flex-end',
  
      alignItems: 'center',
    },
    profileImage: {
        width: 30,
        height: 30,
        alignSelf:'center',
        borderWidth:2,
        overflow:'hidden',
       
        borderRadius: 15,
       
      }, 


      gradient: {
        width: 37,
        height: 37,
        
        flexDirection:'column',
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
      },
      item:{
        margin:10
      },
      modernInputContainer: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderTopWidth: 1,
        minHeight: 70,
      },
      typingIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        marginBottom: 8,
        borderRadius: 20,
        alignSelf: 'flex-start',
      },
      typingDots: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 8,
      },
      typingDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginHorizontal: 1,
        opacity: 0.7,
      },
      typingText: {
        fontSize: 13,
        fontStyle: 'italic',
      },
      inputRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 12,
      },
      enhancedInputContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 24,
        borderWidth: 1,
        minHeight: 48,
        maxHeight: 120,
      },
      modernTextInput: {
        flex: 1,
        fontSize: 16,
        lineHeight: 20,
        maxHeight: 80,
        paddingVertical: 0,
      },
      modernIconsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 8,
        gap: 8,
      },
      modernIconButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
      },
      sendButtonContainer: {
        marginBottom: 2,
      },
      modernSendButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
      },
      modernFloatingButton: {
        position: 'absolute',
        bottom: 50,
        right: 20,
        borderRadius: 25,
        width: 50,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
      },
      floatingButtonContent: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
      },
      newMessageBadge: {
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: 'red',
        borderRadius: 12,
        width: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
      },
      newMessageDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: 'white',
      },
      modernRequestContainer: {
        padding: 16,
        borderTopWidth: 1,
        minHeight: 100,
      },
      requestCard: {
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 10,
        padding: 16,
      },
      requestHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
      },
      requestIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
      },
      requestInfo: {
        flex: 1,
      },
      requestTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 4,
      },
      requestSubtitle: {
        fontSize: 16,
      },
      requestDescription: {
        fontSize: 14,
        marginBottom: 16,
      },
      modernButtonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 8,
      },
      modernActionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        flex: 1,
        minHeight: 44,
      },
      blockButton: {
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.3)',
      },
      blockButtonText: {
        marginLeft: 6,
        fontSize: 15,
        fontWeight: '600',
        color: '#EF4444',
      },
      deleteButton: {
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.3)',
      },
      deleteButtonText: {
        marginLeft: 6,
        fontSize: 15,
        fontWeight: '600',
        color: '#EF4444',
      },
      acceptButton: {
        backgroundColor: Colors.blue,
        borderWidth: 1,
        borderColor: Colors.blue,
      },
      acceptButtonText: {
        marginLeft: 6,
        fontSize: 15,
        fontWeight: '600',
        color: 'white',
      },
      modernReplyContainer: {
        padding: 16,
        borderLeftWidth: 2,
        minHeight: 100,
      },
      replyHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
      },
      replyLabel: {
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 12,
      },
      closeReplyButton: {
        marginLeft: 'auto',
      },
      replyContent: {
        marginBottom: 16,
      },
      replyImageContainer: {
        marginBottom: 8,
      },
      replyImage: {
        width: 100,
        height: 100,
        borderRadius: 5,
      },
      replyText: {
        fontSize: 14,
      },
      replyLocationContainer: {
        flexDirection: 'row',
        alignItems: 'center',
      },
      modernBottomSheetContainer: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 20,
      },
      bottomSheetHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
      },
      bottomSheetIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
      },
      bottomSheetHeaderText: {
        flex: 1,
      },
      bottomSheetTitle: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 4,
      },
      bottomSheetSubtitle: {
        fontSize: 14,
        lineHeight: 18,
      },
      modernMapContainer: {
        height: 200,
        marginBottom: 20,
      },
      mapWrapper: {
        flex: 1,
        borderWidth: 2,
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
      },
      modernMapView: {
        flex: 1,
        borderRadius: 14,
      },
      modernMarkerFixed: {
        position: 'absolute',
        alignSelf: 'center',
        top: '50%',
        marginTop: -16,
        zIndex: 1000,
      },
      markerShadow: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.8,
        shadowRadius: 2,
        elevation: 5,
      },
      markerPulse: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: 'rgba(34, 197, 94, 0.3)',
        position: 'absolute',
        top: 6,
        left: 6,
      },
      modernAddressSection: {
        padding: 16,
        borderWidth: 1,
        borderRadius: 12,
        marginBottom: 20,
      },
      addressHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
      },
      addressLabel: {
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 8,
      },
      addressText: {
        fontSize: 14,
        lineHeight: 20,
      },
      modernSendLocationButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
      },
      sendLocationText: {
        fontSize: 16,
        fontWeight: '600',
        color: 'white',
        marginLeft: 8,
      },
      modernDialog: {
        width: '85%',
        maxWidth: 400,
        backgroundColor: 'transparent',
        borderRadius: 20,
        borderWidth: 1,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 10,
      },
      dialogHeader: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
      },
      dialogTitle: {
        fontSize: 18,
        fontWeight: '700',
        textAlign: 'center',
      },
      dialogActions: {
        paddingVertical: 8,
      },
      modernDialogAction: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 20,
        marginHorizontal: 8,
        marginVertical: 4,
        borderRadius: 12,
      },
      dialogActionIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
      },
      dialogActionText: {
        flex: 1,
        fontSize: 16,
        fontWeight: '500',
      },
      modernLoadingDialog: {
        width: 160,
        height: 160,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 10,
      },
      loadingDialogText: {
        fontSize: 14,
        fontWeight: '500',
        marginTop: 16,
        textAlign: 'center',
      },
      modernStatusContainer: {
        padding: 16,
        borderTopWidth: 1,
        minHeight: 100,
      },
      statusCard: {
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 10,
        padding: 16,
      },
      statusIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
      },
      
      statusTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 4,
      },
      statusSubtitle: {
        fontSize: 16,
      },
      pulseContainer: {
        width: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
      },
      pulseRing: {
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: 'rgba(34, 197, 94, 0.3)',
      },
      modernHeaderContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
      },
      modernBackButton: {
        padding: 10,
        borderRadius: 20,
      },
      modernProfileSection: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
      },
      profileRow: {
        flexDirection: 'row',
        alignItems: 'center',
      },
      profileImageContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 10,
      },
      modernGradient: {
        flex: 1,
        borderRadius: 20,
      },
      modernProfileImage: {
        width: '100%',
        height: '100%',
        borderRadius: 20,
      },
      modernUserInfo: {
        flex: 1,
      },
      usernameRow: {
        flexDirection: 'row',
        alignItems: 'center',
      },
      modernUsername: {
        fontSize: 16,
        fontWeight: 'bold',
      },
      verifiedBadge: {
        backgroundColor: Colors.blue,
        borderRadius: 10,
        padding: 2,
        marginLeft: 5,
      },
      statusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
      },
      typingStatusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
      },
      miniTypingDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginHorizontal: 2,
        opacity: 0.7,
      },
      modernStatusText: {
        fontSize: 14,
      },
      onlineStatusIndicator: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 12,
        height: 12,
        borderRadius: 6,
        borderWidth: 2,
      },
})
