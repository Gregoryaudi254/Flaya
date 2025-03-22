import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const Demo = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>🚀 Hello World!</Text>
    </View>
  );
};

export default Demo;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  text: {
    fontSize: 24,
    color: '#333',
  },
});
