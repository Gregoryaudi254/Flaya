import { StyleSheet, Text, View,Dimensions } from 'react-native'
import React from 'react'
import { ImageSlider } from "react-native-image-slider-banner";
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const productBuyer = () => {
  return (
    <SafeAreaView style={{flex:1}}>

        <View style={{flex:1}}>

        <ImageSlider 

            caroselImageContainerStyle={{height:screenHeight/2}}
            caroselImageStyle={{resizeMode:'cover',height:screenHeight/2}}
            data={[
                {img: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ5a5uCP-n4teeW2SApcIqUrcQApev8ZVCJkA&usqp=CAU'},
                {img: 'https://thumbs.dreamstime.com/b/environment-earth-day-hands-trees-growing-seedlings-bokeh-green-background-female-hand-holding-tree-nature-field-gra-130247647.jpg'},
                {img: 'https://cdn.pixabay.com/photo/2015/04/19/08/32/marguerite-729510__340.jpg'}
            ]}
            autoPlay={false}

            onItemChanged={(item) => console.log("item", item)}
            closeIconColor="#fff"
            />

        </View>

        

      <Text>productBuyer</Text>
    </SafeAreaView>
  )
}

export default productBuyer

const styles = StyleSheet.create({})