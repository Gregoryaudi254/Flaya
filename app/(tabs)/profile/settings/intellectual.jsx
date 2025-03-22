import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import policy from '@/constants/intellectualproperty';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

const intellectual = () => {
  const colorScheme = useColorScheme();
  return (
    <View>
      <ScrollView contentContainerStyle={{margin:15}}>
        <Text style={{color:colorScheme === 'dark' ? Colors.light_main: Colors.dark_main,fontSize:20}}>
          {policy}
        </Text>
      </ScrollView>
    </View>
  );
};

export default intellectual;