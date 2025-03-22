import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import policy from '@/constants/termsofservice';

import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

const terms = () => {
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

export default terms;