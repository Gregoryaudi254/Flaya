import { StyleSheet, Text, Image } from 'react-native'
import React from 'react'
import { View } from 'react-native-animatable'

const SellerProductItem = ({product:{title,caption,price,images,category}}) => {


  return (

    <View>

        

        <View style={{flexDirection:'row',height:170,margin:15}}>

        <Image source={{uri:images[0]}} 
        style={{width:'50%',height:170,borderRadius:10,marginEnd:10}} />

        <View style={{flex:1}}>

            <Text style={{fontSize:20,fontWeight:'bold',color:'white',alignSelf:'flex-end'}}>{title}</Text>

            <Text style={{fontSize:15,color:'gray',alignSelf:'flex-end'}}>{price}</Text>


            <View style={{backgroundColor:'tomato',
             borderRadius:5,padding:5,alignItems:'center',marginTop:10
            ,alignSelf:'flex-end'}}>
     
               <Text style={{fontSize:12,color:'white'}}>{category}</Text>
     
             </View>


             <Text style={{fontSize:15,color:'gray',alignSelf:'flex-end',flex:1}}></Text>


            <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginStart:15,bottom:0}}>


                <View style={{flexDirection:'row'}}>

                    <Image
                    resizeMode="contain"
                    source={require('@/assets/icons/visibility.png')}
                    style={styles.Icon}/>

                    <Text style={styles.Text}>200</Text>

                </View>

                <View style={{flexDirection:'row',backgroundColor:'orange',borderRadius:5,padding:5}}>

                    <Image
                    resizeMode="contain"
                    source={require('@/assets/icons/lists.png')}
                    style={styles.Icon}/>

                    <Text style={styles.Text}>19</Text>

                </View>

            </View>




        </View>

        </View>

        <View style={{width:'100%',height:1,backgroundColor:'white'}}/>

    </View>
    
  )
}

export default SellerProductItem

const styles = StyleSheet.create({
     Icon: {
    width: 20,
    height: 20,
    tintColor:'white',
    paddingRight: 5,
  }, Text: {
    color: 'white',
    fontSize: 13,
    marginLeft: 5,
  },})