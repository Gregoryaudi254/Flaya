import { StyleSheet, Text, View, Animated,TouchableOpacity,Image} from 'react-native'
import React,{useLayoutEffect,useEffect} from 'react'

import SellerProductItem from '@/components/SellerProductItem'

import { Data } from '@/constants/Data'

import {useNavigation,useRouter} from 'expo-router'
import { Colors } from '@/constants/Colors'

import { useDispatch,useSelector } from 'react-redux'

import { setProducts } from '@/slices/sellerproductsSlice'


const store = () => {


  const dispatch = useDispatch();

 

  const list = useSelector(state => state.products.products);


  useEffect(
    () =>{
      dispatch(setProducts(Data.products))
    },
    [dispatch]
  )


  const navigation = useNavigation();


  const router =  useRouter()


  const handleHeaderRightPress = () =>{

    router.push({
      pathname: '/(tabs)/market/addproduct'
    })

  }

  const handleItemPress = (item) =>{

    router.push({
      pathname: '/(tabs)/market/product',
      params:{
        product: JSON.stringify(item)
      }
    })

  }


  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
       
        <TouchableOpacity 
        
        onPress={handleHeaderRightPress}>

          <View style={{backgroundColor:Colors.blue,borderRadius:10,padding:5,flexDirection:'row',alignItems:'center'}} >
            <Image
              resizeMode="contain"
              source={require('@/assets/icons/adding.png')}
              style={{ height: 20, tintColor: 'white' }}
            />


            <Text style={{
              color: 'white',
              marginEnd:10,
              fontSize: 13,
            
            }}>Add New</Text>
          </View>

          

      </TouchableOpacity>
      ),
    });
  }, [navigation]);


  return (



    <View>
       <Animated.FlatList
          bounces={true}
          keyExtractor={(product) => product.id}
          renderItem={({item}) =>(
            <TouchableOpacity onPress={()=>handleItemPress(item)} style={styles.item}>

              <SellerProductItem product={item}/>

            </TouchableOpacity>
            
          )}
          data={list}/>
    </View>
  )
}

export default store

const styles = StyleSheet.create({
    item:{}
})