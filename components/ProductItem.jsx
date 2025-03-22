import { StyleSheet, Text, View ,TouchableWithoutFeedback,Image} from 'react-native'
import React from 'react'
import { Colors } from '@/constants/Colors'

import { useRouter } from 'expo-router'

const ProductItem = ({product:{title,caption,price,images,category},shouldShowCategory}) => {


  const router = useRouter()


    const handlePress = () =>{

      router.push({
        pathname: '/(tabs)/market/productBuyer'
      });

    }



  return (
    <TouchableWithoutFeedback onPress={handlePress}>

      <View style={{width:'100%',marginHorizontal:10,borderRadius:10,backgroundColor:Colors.dark_gray,padding:5}}>

    
      <Image source={{uri:images[0]}} 
        style={{width:'100%',height:200,borderRadius:10}} />


        <Text style={{fontSize:15,fontWeight:'bold',color:'white'}}>{title}</Text>

        <Text style={{fontSize:12,color:'gray'}}>{caption}</Text>

        <Text style={{fontSize:12,color:'white'}}>{price}</Text>


        { shouldShowCategory &&
             <View style={{position:'absolute',backgroundColor:'tomato',
             borderRadius:5,padding:5,alignItems:'center',
             margin:10,marginRight:10,alignSelf:'flex-end',right:5}}>
     
               <Text style={{fontSize:12,color:'white'}}>{category}</Text>
     
             </View>

        }


       


      </View>


      

    </TouchableWithoutFeedback>
  )
}

export default ProductItem

const styles = StyleSheet.create({})