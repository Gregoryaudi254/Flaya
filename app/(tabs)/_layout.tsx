import { Tabs } from 'expo-router';
import React from 'react';

import { TabBarIcon } from '@/components/navigation/TabBarIcon';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

import {View,Image,StyleSheet,Text,ImageSourcePropType, TouchableOpacity} from 'react-native'

import {Icons} from '../../constants/Icons'

import { useRouter } from 'expo-router';

interface TabIconProps {
  icon: ImageSourcePropType;
  color: string;
  name: string;
  focused: boolean;
}


export default function TabLayout() {
  const colorScheme = useColorScheme();
 
  const router = useRouter();
 

  const TabIcon: React.FC<TabIconProps> = ({icon,color,name,focused}) =>{

   

    return(

      

      <View style = {styles.TabIcon}>
        <Image style = {{width:25,height:25,tintColor:focused?colorScheme === 'dark'? 'white':'black':'gray'}}
        source={icon}
        />

      </View>
    )

  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarShowLabel:false,
        
      }}>
      <Tabs.Screen
        name="index"
        options={{
          tabBarShowLabel:false,
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon icon={Icons.home} name='Home' color={color} focused={focused} />
          ),
        }}
      />

      <Tabs.Screen
        name="updates"
        options={{
          title: 'updates',
          tabBarShowLabel:false,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon icon={Icons.updates} name='updates' color={color} focused={focused} />
          ),
        }}
      />

      
     
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarShowLabel:false,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon icon={Icons.profile} name='Profile' color={color} focused={focused} />
          ),
        }}
      />

      
    </Tabs>
  );
}


const styles = StyleSheet.create({
  TabIcon:{
    alignItems:'center',
    marginTop:'auto',
    flexDirection:'row',
    height:'100%',
   
  },
  TabText:{


  }


})
