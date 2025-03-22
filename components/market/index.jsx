import { StyleSheet, Text, View,FlatList ,Image,TextInput,TouchableWithoutFeedback,Animated,TouchableOpacity} from 'react-native'
import React,{useState,useCallback,useMemo,useLayoutEffect} from 'react'

import { SafeAreaView } from 'react-native-safe-area-context'

import { Tabs } from 'expo-router';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';

import { Gesture, GestureHandlerRootView } from 'react-native-gesture-handler';
import { Colors } from '@/constants/Colors';

import { Data } from '@/constants/Data';

const Tab = createMaterialTopTabNavigator();

import ProductItem from '@/components/ProductItem';

import {useNavigation,useRouter} from 'expo-router'


const numColumns = 2;

const index = () => {

  const router = useRouter();

  const [products,setProducts] = useState();

  const categories = [
    'explore','clothing','shoes','groceries','beverages','electronics','services'
  ]

  const [selectedCategory,setSelectedCategry] = useState('explore')


  const handleTabPress  = (category) =>{
    setSelectedCategry(category)
  }


  const renderItem = useCallback(
    ({ item }) => (


      <TouchableWithoutFeedback onPress={()=> handleTabPress(item)}>

          
        <View style={[styles.tabs,
        selectedCategory === item ?{backgroundColor:Colors.blue}:
        {borderWidth:2,borderColor:'gray'}]}>

          <Text style={[styles.tabText,]}>
            {item}
          </Text>


        </View>

      </TouchableWithoutFeedback>
     
    )
  );


  const listHeaderComponent = useMemo(
    () => (
      <View style={{ flexDirection: 'column', marginBottom: 10,marginTop:10 }}>
        <View style={{flexDirection:'row'}}>

        <View style={{flexDirection:'row',padding:'10',paddingHorizontal:10,backgroundColor:Colors.dark_gray,borderRadius:10,alignItems:'center',flex:1,marginRight:10}}>

          <Image source={require('@/assets/icons/search.png')} 
          style={{width:20,height:20,tintColor:'white'}}/>

          <Text style={{marginStart:10,color:'gray'}}>Search</Text>

        </View>

        <View style={{width:40,height:40,borderRadius:20,backgroundColor:'tomato',justifyContent:'center',alignItems:'center'}}>

          <Image source={require('@/assets/icons/filter.png')} 
          style={{width:25,height:25,tintColor:'white'}}/>

        </View>

        </View>

        <Animated.FlatList
          data={categories}
          renderItem={ ({ item }) => (


            <TouchableWithoutFeedback onPress={()=> handleTabPress(item)}>
      
                
              <View style={[styles.tabs,
              selectedCategory === item ?{backgroundColor:Colors.blue}:
              {borderWidth:2,borderColor:'gray'}]}>
      
                <Text style={[styles.tabText,]}>
                  {item}
                </Text>
      
      
              </View>
      
            </TouchableWithoutFeedback>
           
          )}
          style={{marginTop:15}}
          keyExtractor={(item) => item}
          horizontal={true}           // Enables horizontal scrolling
          showsHorizontalScrollIndicator={false} // Hides the horizontal scroll indicator
        />
      </View>
    ),
    [selectedCategory]
  );

  const navigation = useNavigation();

  const handleHeaderRightPress = useCallback(() => {
    router.push({
      pathname: '/(tabs)/market/store'
    });
   
  }, []);


  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
       
        <TouchableOpacity style={{ alignSelf: 'flex-end' }} onPress={handleHeaderRightPress}>

          <Image
            resizeMode="contain"
            source={require('@/assets/icons/control.png')}
            style={{ height: 20, tintColor: 'green', alignSelf: 'flex-end' }}
          />

      </TouchableOpacity>
      ),
    });
  }, [navigation]);
    

  
  
  return (

      <View style={{marginHorizontal:15}}>

        


        <Animated.FlatList
          bounces={true}
          keyExtractor={(product) => product.id}
          numColumns={2}
          style={styles.container}
         ListHeaderComponent={listHeaderComponent}
          
          renderItem={({item}) =>(
            <View style={styles.item}>

              <ProductItem product={item} shouldShowCategory={item.category !== selectedCategory}/>

            </View>
            
          )}
          data={Data.products}/>



      </View>

          
  )
}

export default index

const styles = StyleSheet.create({ 
    tabContainer:{
    flexDirection: 'row',
    flex:1
   
  
}, titleContainer: {

    backgroundColor:'blue',
    
    flexDirection: 'row',
    height:200,
    flex:1,
    
  },
  tabs:{
    borderRadius:10,
    marginRight:10,
    padding:10
  },tabText:{
    fontSize:15,fontWeight:'bold',color:'white'
  },
  item: {
    
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    margin: 1,
   // approximate a square
  },
   container: {
  
   
  
    
  }
})