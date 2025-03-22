import React, { memo } from 'react';
import { View, TouchableOpacity, Image, Text, StyleSheet, Dimensions } from 'react-native';
import BottomSheet from '@gorhom/bottom-sheet'; // or whichever BottomSheet component you're using
const numColumns = 2;

const MemoizedBottomSheetUser = memo(({ bottomSheetRef, initialSnapIndex, snapPoins, handleBlockPress, handleReportPress }) => {
  return (
    <BottomSheet
        enablePanDownToClose={true}
        ref={bottomSheetRef}
        index={initialSnapIndex}
        backgroundStyle={{ backgroundColor: 'gray' }}
        handleIndicatorStyle={{ backgroundColor: '#fff' }}
        snapPoints={snapPoins}
      >
        <View style={{ marginHorizontal: 10 }}>
          <TouchableOpacity onPress={handleBlockPress} style={{ flexDirection: 'row' }}>
            <View style={styles.touchableView}>
              <Image style={styles.icons} source={require('@/assets/icons/block.png')} />
              <Text style={styles.text}>Block</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={{ flexDirection: 'row' }} onPress={handleReportPress}>
            <View style={styles.touchableView}>
              <Image style={styles.icons} source={require('@/assets/icons/report.png')} />
              <Text style={styles.text}>Report</Text>
            </View>
          </TouchableOpacity>
        </View>
      </BottomSheet>
  );
});

export default MemoizedBottomSheetUser;
const styles = StyleSheet.create({
    buttonText: {
        color: 'white',             // Text color
        fontSize: 16,  
        paddingHorizontal:10,             // Font size
        textAlign: 'center',        // Center the text
      },
      container: {
        flex: 1,
        marginTop:10,
       
      
        marginHorizontal:3
      },

      item: {
    
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        margin: 1,
        height: Dimensions.get('window').width / numColumns, // approximate a square
      },
      icons:{
        tintColor:'white',
        height:15,
        padding:5,
        width:15
    },
    text:{
        color:'#FF0000',fontSize:15,marginStart:10
      },
      touchableView:{
        flex:1,
        alignItems:'center',
        
       
        flexDirection:'row',
        marginVertical:10
      },
})
