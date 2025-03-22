import { StyleSheet, Text, View,TouchableWithoutFeedback,Modal } from 'react-native'
import React from 'react'

const CustomDialog = ({ isVisible,onclose,children, ...rest}) => {



    const content = (

        <TouchableWithoutFeedback onPress={onclose}>

          <View style={{alignItems:'center',justifyContent:'center',flex:1,backgroundColor:'rgba(0, 0, 0, 0.5)'}}>

          {children}

          </View>

        </TouchableWithoutFeedback>
        
      )
 
    
      return (
        <Modal 
        visible={isVisible} 
        transparent
    
        statusBarTranslucent
        animationType='fade' 
        {...rest}
         >

          {content}
          
        </Modal>
      );
}

export default CustomDialog

const styles = StyleSheet.create({})