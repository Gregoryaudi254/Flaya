import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import privacypolicy from '@/constants/privacypolicy';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

const policy = () => {
  const colorScheme = useColorScheme();
  return (
    <View>
      <ScrollView contentContainerStyle={{margin:15}}>
        <Text style={{color:colorScheme === 'dark' ? Colors.light_main: Colors.dark_main,fontSize:20}}>
          {privacypolicy}
        </Text>
      </ScrollView>
    </View>
  );
};

export default policy;