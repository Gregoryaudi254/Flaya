import { StyleSheet, Text, View,TextInput,Image,Animated,FlatList,TouchableOpacity ,ActivityIndicator} from 'react-native'
import React,{useEffect, useState} from 'react'
import DropDownPicker from 'react-native-dropdown-picker';
import { Colors } from '@/constants/Colors';

import * as ImagePicker from 'expo-image-picker';
import { useDispatch } from 'react-redux';

import { addProduct } from '@/slices/sellerproductsSlice';
import CustomDialog from '@/components/CustomDialog';

const addproduct = () => {

    const dispatch = useDispatch()
    
    const maxCaptionCount = 25
    const maxDescriptionCount = 100
    const maxtitleCount = 20

    const [photos,setPhotos] = useState([{id:'adcss',photo:'https://m.media-amazon.com/images/I/61+r3+JstZL.jpg'},{id:'add'}])


    const [open, setOpen] = useState(false);
    const [value, setValue] = useState(null);
    const [items, setItems] = useState([
        {label: 'Clothing', value: 'clothing'},
        {label: 'Groceries', value: 'groceries'},
        {label: 'Electronics', value: 'electronics'},
        {label: 'Food', value: 'food'},
        {label: 'Home', value: 'home'},
        {label: 'Services', value: 'services'},
        {label: 'Beverages', value: 'beverages'},
    ]);

    const [openCurrency, setOpenCurrency] = useState(false);
    const [valueCurrency, setValueCurreny] = useState(null);
    const [itemsCurrency, setItemsCurrency] = useState([
        {label: 'KES', value: 'kes'},
        {label: 'USD', value: 'usd'},
        {label: 'TZS', value: 'tzs'},
        {label: 'EUR', value: 'eur'},
      
    ]);

    const [title,setTitle] = useState('')
    const [caption,setCaption] = useState('')
    const [description,setdescription] = useState('')

    const [showLoading,setShowLoading] = useState(false)



    

    const foodAndServices = ['food','services']


    const [activeCondition,setActiveCondition] = useState('BrandNew');

    const [delivery , setDelivery] = useState(true)
    const [price , setPrice] = useState('')

    const [titleOk , settitleOk] = useState(true)

    const [captionOk , setcaptionOk] = useState(true)
    const [descriptionOk , setdescriptionOk] = useState(true)
    const [priceOk , setpriceOk] = useState(true)

    const [photosOk , setphotosOk] = useState(true)

    const [currencyOk , setcurrencyOk] = useState(true)

    const [categoryOk , setcategoryOk] = useState(true)




    const onConditionSelected = (condition) =>{
        setActiveCondition(condition)
    }


    const onDeliverySelected = (selection)=>{
      setDelivery(selection)
    }


    


    useEffect(() =>{
    
      if(title.length < maxtitleCount){
        settitleOk(true)
      }else{
        settitleOk(false)
      }

      if(description.length < maxDescriptionCount){
        setdescriptionOk(true)
      }else{
        setdescriptionOk(false)
      }

      if(caption.length < maxCaptionCount){
        setcaptionOk(true)
      }else{
        setcaptionOk(false)
      }


      if(price.length > 1){
        setpriceOk(true)
      }
    },[title,caption,description,price])


    const pickImageAsync = async () => {

      let result = await ImagePicker.launchImageLibraryAsync({
        
        //mediaTypes: ImagePicker.MediaTypeOptions.All,
        quality: 1,
        allowsMultipleSelection:true
      });
  
      if (!result.canceled) {

        setphotosOk(true)

        const selectedImages = result.assets.map((asset) => ({
          id: Math.random().toString(36).substring(7), // Generate a random ID
          photo: asset.uri
        }));
        

         setPhotos((previous) =>[...selectedImages,...previous])
         
       
      } 
    };


    const onDeleteImage= (item) =>{
      setPhotos(photos.filter(photo=> photo.id !== item.id))
    }

    const handleBottomPress = () =>{

      if(title.length < 2 || title.length > maxtitleCount){
        settitleOk(false);
        return;
      }

      if(price.length < 1){
        setpriceOk(false);
        return;
      }

      if(caption.length < 2 || caption.length > maxCaptionCount){
        setcaptionOk(false);
        return;
      }

      if(description.length < 2 || description.length > maxDescriptionCount){
        setdescriptionOk(false);
        return;
      }

      if(photos.length < 2){
        setphotosOk(false);
        return;
      }

      if(value === null){
        setcategoryOk(false)
        return;
      }

      if(valueCurrency === null){
        setcurrencyOk(false)
        return;
      }

      const images = photos

      images.pop();

    
      const product = {
        images:images.map((image) => image.photo),
        title:title,
        caption:caption,
        price:valueCurrency +' '+price,
        id:getRandomString(5),
        category:value,
        condition:!foodAndServices.includes(value)? activeCondition:null,
        ...(value === 'services') ? { inhouse: delivery } : { delivery: delivery }
      }

      setShowLoading(true)


      setTimeout(() => {
        dispatch(addProduct(product));
        setShowLoading(false)
      }, 4000);


      

    }

    const handleCloseDialog = () => {
      setShowLoading(false);
    };


    function getRandomString(length) {
      const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      let result = '';
      const charactersLength = characters.length;
      for (let i = 0; i < length; i++) {
          result += characters.charAt(Math.floor(Math.random() * charactersLength));
      }
      return result;
  }





  return (


    <View style={{width:'100%'}}>

        <View style={[styles.inputContainer,{borderColor:titleOk?'gray':'red'}]}>

        <TextInput
        style={[styles.input]}
        // onChangeText={setPassword}
        underlineColorAndroid='black'
        value={title}
        onChangeText={setTitle}
        placeholder="Title"
        placeholderTextColor='gray'
       


        />
    

        </View>


         <View style={{flexDirection:'row',marginStart:10,alignItems:'center'}}>

          <DropDownPicker

            open={openCurrency}
            value={valueCurrency}
            textStyle={{color:'white'}}

            placeholder='Currency'
            
          
            containerStyle={{width:'30%',alignSelf:'center',marginTop:10}}
            selectedItemContainerStyle={{backgroundColor:'black'}}
            dropDownContainerStyle={{backgroundColor:'black',borderWidth:1,borderColor:'gray',borderRadius:10}}
            items={itemsCurrency}
            style={{borderWidth:1,borderColor:currencyOk?'gray':'red',borderRadius:10,backgroundColor:'black'}}
            setOpen={setOpenCurrency}
            setValue={setValueCurreny}
            setItems={setItemsCurrency}
            />



             <View style={[styles.inputContainerCurrency,{borderColor:priceOk?'gray':'red'}]}>

              <TextInput
              style={styles.input}
              // onChangeText={setPassword}
              underlineColorAndroid='black'
              value={price}
              onChangeText={setPrice}

              placeholder="Price"
              placeholderTextColor='gray'
            


              />
          

              </View>

         </View>


        <View style={[styles.inputContainer,{borderColor:captionOk?'gray':'red'}]}>

        <TextInput
        style={styles.input}
        // onChangeText={setPassword}
        underlineColorAndroid='black'
        value={caption}


        onChangeText={setCaption}

        placeholder="Caption"
        placeholderTextColor='gray'
        


        />
      
        </View>  

        <View style={[styles.inputContainer,{borderColor:descriptionOk?'gray':'red'}]}>

        <TextInput
        style={{fontSize:16,color:'white',height:70,width:'100%',textAlignVertical:'top'}}
        // onChangeText={setPassword}
        underlineColorAndroid='black'
        textAlign='flex-start'


        multiline={true}
        value={description}
        onChangeText={setdescription}


        placeholder="Description"
        placeholderTextColor='gray'
       
        />
       
        </View>

        

        <Text style={{color:photosOk? 'gray':'red',fontSize:10,marginStart:10,marginTop:10}}>*Add atleast one photo</Text>


        <FlatList
          data={photos}
          style={{marginStart:10,marginTop:10,marginEnd:10}}
          renderItem={ ({ item }) => (
            item.photo ? (
              <View style={{height:100,width:100,borderRadius:10,marginEnd:5}}>

                <Image source={{uri:item.photo}} 
                        style={{width:'100%',height:'100%',borderRadius:10}} />


                  <TouchableOpacity style={{height:25,width:25,borderRadius:10,backgroundColor:'rgba(0, 0, 0, 0.5)',
                    position:'absolute',justifyContent:'center',margin:5,alignItems:'center'}} onPress={() => onDeleteImage(item)}>

                   <Image source={require('@/assets/icons/cancel.png')} 
                    style={{width:15,height:15,tintColor:'white'}} />

                  </TouchableOpacity>     

                  
                
              </View>
            ) : (

              <TouchableOpacity onPress={pickImageAsync}>

                <View 
                  style={{height:100,width:100,borderRadius:10,backgroundColor:'tomato',alignItems:'center',justifyContent:'center'}}>

                    <Image source={require('@/assets/icons/adding.png')} 
                    style={{width:25,height:25,tintColor:'white',position:'absolute'}} />

                    
                  
                  </View>

              </TouchableOpacity>
             
            )
          )}
        
          keyExtractor={(item) => item.id}
          horizontal={true}           // Enables horizontal scrolling
          showsHorizontalScrollIndicator={false} // Hides the horizontal scroll indicator
        />

       

        <DropDownPicker

            open={open}
            value={value}
            textStyle={{color:'white'}}

            placeholder='Select category'
            
          
            containerStyle={{width:'95%',alignSelf:'center',marginTop:10}}
            selectedItemContainerStyle={{backgroundColor:'black'}}
            dropDownContainerStyle={{backgroundColor:'black',borderWidth:1,borderColor:'gray',borderRadius:10}}
            items={items}
            style={{borderWidth:1,borderColor:categoryOk?'gray':'red',borderRadius:10,backgroundColor:'black'}}
            setOpen={setOpen}
            setValue={setValue}
            setItems={setItems}
            />


        

        


        {!foodAndServices.includes(value) && 
         <View>
            <Text style={{color:'gray',fontSize:15,marginStart:10,marginTop:10}}>Condition</Text>


            <View style={{flexDirection:'row',marginStart:10,marginTop:15}}>

              <TouchableOpacity onPress={() => onConditionSelected('BrandNew')}>

                  <View style={{backgroundColor:activeCondition === 'BrandNew' ? Colors.blue: 'gray',
                  borderRadius:5,padding:5,alignItems:'center'
                  ,alignSelf:'flex-end',marginEnd:25}}>
          
                  <Text style={{fontSize:12,color:'white'}}>Brand new</Text>
          
                  </View>
              
              </TouchableOpacity>

              <TouchableOpacity onPress={() => onConditionSelected('Refurbished')}>

                  <View style={{backgroundColor:activeCondition === 'Refurbished' ? Colors.blue: 'gray',
                  borderRadius:5,padding:5,alignItems:'center'
                  ,alignSelf:'flex-end',marginEnd:25}}>
          
                  <Text style={{fontSize:12,color:'white'}}>Refurbished</Text>
          
                  </View>
              
              </TouchableOpacity>

              <TouchableOpacity onPress={() => onConditionSelected('Used')}>

                  <View style={{backgroundColor:activeCondition === 'Used' ? Colors.blue: 'gray',
                  borderRadius:5,padding:5,alignItems:'center'
                  ,alignSelf:'flex-end',marginEnd:25}}>
          
                  <Text style={{fontSize:12,color:'white'}}>Used</Text>
          
                  </View>
              
              </TouchableOpacity>


            

              

            </View>

         </View>
         }


        <Text style={{color:'gray',fontSize:15,marginStart:10,marginTop:10}}>{value === 'services'?'In house service?':'Delivery?'}</Text>


        <View style={{flexDirection:'row',marginStart:10,marginTop:15}}>

            <TouchableOpacity onPress={() => onDeliverySelected(true)}>

                <View style={{backgroundColor:delivery? Colors.blue: 'gray',
                borderRadius:5,padding:5,alignItems:'center'
                ,alignSelf:'flex-end',marginEnd:25}}>
        
                <Text style={{fontSize:12,color:'white'}}>Yes</Text>
        
                </View>
            
            </TouchableOpacity>

            <TouchableOpacity onPress={() => onDeliverySelected(false)}>

                <View style={{backgroundColor:!delivery? Colors.blue: 'gray',
                borderRadius:5,padding:5,alignItems:'center'
                ,alignSelf:'flex-end',marginEnd:25}}>
        
                <Text style={{fontSize:12,color:'white'}}>No</Text>
        
                </View>
            
            </TouchableOpacity>

           


           

            

        </View>


        <TouchableOpacity
                  onPress={handleBottomPress}
                
                style={{
                    width: '90%',
                    height: 40,
                    marginBottom:5,
                    marginTop:15,
                    alignSelf:'center',
                
                    alignItems:'center',
                    borderRadius:5,
                    
                    backgroundColor:Colors.blue,
                    
                }}
              >
        
                <View style={{flexDirection:'row',height:'100%'}}>
        
                  <Text style={{
                      color: 'white',
                      alignSelf:'center',
                      fontSize: 15
                  }}>  POST PRODUCT
                  </Text>
        
                </View>
                
            </TouchableOpacity>


            <CustomDialog onclose={handleCloseDialog} isVisible={showLoading}>
              <ActivityIndicator  size="large" color="white" />
            </CustomDialog>


      </View>
    
  )
}

export default addproduct

const styles = StyleSheet.create({
    input: {
    height: 40,
    fontSize: 16,
    
    color: 'white',
    width:'100%'
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:'space-between',
    
    borderWidth: 1,
    alignSelf:'center',
    marginTop:10,
    width:'95%',
    paddingVertical:5,
  
    borderRadius: 5,
  
    paddingHorizontal: 10,
  },
  inputContainerCurrency: {
    flexDirection: 'row',
    alignItems: 'center',
    marginStart:15,
    justifyContent:'space-between',
    borderColor: 'gray',
    borderWidth: 1,
   
    marginTop:10,
    flex:1,
    paddingVertical:5,
    marginEnd:10,
    
    

    borderRadius: 10,
   
    paddingHorizontal: 10,
  },})