
import React, { memo } from 'react';
import { View, TouchableOpacity, Image, Text, StyleSheet, Dimensions } from 'react-native';
import BottomSheet from '@gorhom/bottom-sheet'; // or whichever BottomSheet component you're using
import { Colors } from '@/constants/Colors';

const MemoizedBottomSheetMessaging = memo(({ 
  selectedMessage, 
  initialSnapIndex, 
  snapPoinst, 
  bottomSheetRef, 
  handleMarkAsRead, 
  handleDelete, 
  handleBlock 
}) => (
  <BottomSheet  
    enablePanDownToClose={true} 
    ref={bottomSheetRef}
    index={initialSnapIndex}
    backgroundStyle={{ backgroundColor: Colors.dark_gray }}
    handleIndicatorStyle={{ backgroundColor: '#fff' }}
    snapPoints={snapPoinst}
  >
    <View style={{ margin: 10 }}>
      <Text style={{ fontSize: 20, color: 'white', fontWeight: 'bold', alignSelf: 'center', marginBottom: 10 }}>
        {selectedMessage?.username}
      </Text>

      <View style={{ width: '100%', height: 1, backgroundColor: 'white' }} />

      {(selectedMessage !== null && !selectedMessage.isread) && (
        <TouchableOpacity onPress={handleMarkAsRead}>
          <Text style={{ fontSize: 20, color: 'white', marginTop: 10 }}>
            Mark as read
          </Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity onPress={handleDelete}>
        <Text style={{ fontSize: 20, color: 'white', marginTop: 10 }}>
          Delete
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={handleBlock}>
        <Text style={{ fontSize: 20, color: 'red', marginTop: 10 }}>
          Block
        </Text>
      </TouchableOpacity>
    </View>
  </BottomSheet>
));

// Export the memoized component
export default MemoizedBottomSheetMessaging;
