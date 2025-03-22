import { View, Text, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import React, { useEffect, useState } from 'react'
import { getData, storeData } from '@/constants/localstorage';
import { doc, updateDoc } from 'firebase/firestore';

import { useDispatch } from 'react-redux';
import { setValues } from '@/slices/profileViewSlice';

import { db } from '@/constants/firebase';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';


const privacy = () => {

  const dispatch = useDispatch();

  const colorScheme = useColorScheme();

    const options = [
        { label: 'everyone', value: 1 },
        { label: 'friends', value: 2 },
        { label: 'no one', value: 3 },
      ];


      const [selectedOption,setSelectedOption] = useState(1);
      const [loading,setLoading] = useState(true);



      const RadioButton = ({ selected, onPress, label }) => (

        <TouchableOpacity style={styles.radioButtonContainer} onPress={onPress}>
          
            <Text style={styles.radioButtonText}>{label}</Text>

            <View style={{width: 20,
                height: 20,
                borderColor: !selected? 'gray':'tomato',
                borderWidth: 4,
                borderRadius: 10,
                }}/>



        </TouchableOpacity>
      );

      useEffect(() => {

        const getStatus = async () =>{

          let settings = await getData('@settings');

          settings = settings || {};

          console.log(JSON.stringify(settings));

          const item = options.find((item) => item.label === (settings.profileview || 'everyone'));

          console.log(JSON.stringify(item));

          setSelectedOption(item.value);

          setLoading(false);
        }

        getStatus();

      },[]);


      const changestatus = async (item) => {

        setLoading(true)

        const userInfo = await getData('@profile_info')
        const ref = doc(db,`users/${userInfo.uid}`);

        try {
          await updateDoc(ref, {
            [`settings.profileview`]: item.label.toLowerCase()
          });
          console.log("Notification setting successfully updated!");

          let settings = await getData('@settings');

          settings = settings || {}

      
          settings.profileview = item.label;

          await storeData('@settings',settings);

          setSelectedOption(item.value);

          dispatch(setValues(item.label))

        } catch (error) {
          console.log("Update failed: ", error);
        }

        setLoading(false)

      }





  return (
    <View style={{marginHorizontal:20,marginVertical:20}}>
      <Text style={{fontSize:15,color:colorScheme === 'dark' ? Colors.light_main: Colors.dark_main,fontWeight:'bold'}}>Who can view your profile</Text>


      {!loading ? <FlatList
        data={options}
        renderItem={({ item }) => (
        <RadioButton
            label={item.label}
            selected={item.value === selectedOption}
            onPress={() => changestatus(item)}
        />
        )}
        keyExtractor={(item) => item.value.toString()}
      /> : <ActivityIndicator style={{marginTop:20}} size="large" color={colorScheme === 'dark' ? Colors.light_main: Colors.dark_main}/>}
    </View>
  )
}

export default privacy

const styles = StyleSheet.create({
    radioButtonText: {
        marginLeft: 10,
        color:'gray',
        fontSize: 15,
      },
      radioButtonContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex:1,
        marginVertical:20,
       
        justifyContent:'space-between'
      },
})