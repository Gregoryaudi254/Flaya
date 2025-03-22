import { Image, Text, TouchableOpacity, View } from "react-native";
import Dialog from '@/components/CustomDialog';
import React from "react";

import { Colors } from "@/constants/Colors";

const MemoizedDialog = React.memo(({ dialog, setDialog, blockinguserinfo , handleBlockUserConfirmation }) => (
    <Dialog onclose={() => setDialog(false)} isVisible={dialog}>
      <View style={{ padding: 10, backgroundColor: Colors.dark_gray, borderRadius: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Image
            source={{ uri: blockinguserinfo.postcreatorimage || 'image' }}
            style={{
                width: 50,
                height: 50,
                borderColor: 'white',
                borderWidth: 3,
                borderRadius: 25,
                marginEnd: 10,
              }}
          />
          <Text style={{ color: 'white', fontSize: 20, marginStart: 3 }}>
            {blockinguserinfo.postcreatorusername || 'user'}
          </Text>
        </View>
  
        <Text style={{ color: 'white', margin: 5, fontSize: 20, marginBottom: 15 }}>
          Proceed to block user?
        </Text>
  
        <View style={{ flexDirection: "row", alignContent: "space-between" }}>
            <TouchableOpacity onPress={handleBlockUserConfirmation} style={{flex:1}} >

                <View  style={{flexDirection:'row'}}>

                <Image style={{width:30,height:30,tintColor:'red'}} source={require('@/assets/icons/block.png')}/>

                <Text style={{color:'red',fontSize:20}}>Proceed</Text>

                </View>

            </TouchableOpacity>
            <TouchableOpacity onPress={() => setDialog(false)}>
                <Text style={{ color: 'white', marginStart: 5, fontSize: 20 }}>Cancel</Text>
            </TouchableOpacity>
        </View>
      </View>
    </Dialog>
  ));

  export default MemoizedDialog;