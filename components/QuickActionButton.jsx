import React, { useState, useRef } from 'react';
import { 
  View, 
  TouchableOpacity, 
  Text, 
  StyleSheet, 
  Animated, 
  Image,
  Dimensions 
} from 'react-native';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

const { width, height } = Dimensions.get('window');

const QuickActionButton = ({ onComposePress, onSearchPress, onArchivePress }) => {
  const colorScheme = useColorScheme();
  const [isExpanded, setIsExpanded] = useState(false);
  const animation = useRef(new Animated.Value(0)).current;

  const toggleMenu = () => {
    const toValue = isExpanded ? 0 : 1;
    
    Animated.spring(animation, {
      toValue,
      friction: 5,
      useNativeDriver: true,
    }).start();
    
    setIsExpanded(!isExpanded);
  };

  const actionButtons = [
    {
      title: 'Compose',
      icon: require('@/assets/icons/edit.png'),
      onPress: onComposePress,
      color: Colors.blue,
    },
    {
      title: 'Search',
      icon: require('@/assets/icons/search.png'),
      onPress: onSearchPress,
      color: Colors.light_green,
    },
    {
      title: 'Archive',
      icon: require('@/assets/icons/archive.png'),
      onPress: onArchivePress,
      color: '#FF6347',
    },
  ];

  const renderActionButton = (item, index) => {
    const translateY = animation.interpolate({
      inputRange: [0, 1],
      outputRange: [0, -(60 * (index + 1))],
    });

    const opacity = animation.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0, 0, 1],
    });

    const scale = animation.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    });

    return (
      <Animated.View
        key={index}
        style={[
          styles.actionButton,
          {
            transform: [{ translateY }, { scale }],
            opacity,
            backgroundColor: item.color,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.actionButtonInner}
          onPress={() => {
            item.onPress();
            toggleMenu();
          }}
        >
          <Image source={item.icon} style={styles.actionIcon} />
        </TouchableOpacity>
        
        <Animated.View style={[styles.labelContainer, { opacity }]}>
          <Text style={styles.labelText}>{item.title}</Text>
        </Animated.View>
      </Animated.View>
    );
  };

  const mainButtonRotation = animation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  return (
    <View style={styles.container}>
      {actionButtons.map(renderActionButton)}
      
      <Animated.View
        style={[
          styles.mainButton,
          {
            backgroundColor: colorScheme === 'dark' ? Colors.light_main : Colors.dark_main,
            transform: [{ rotate: mainButtonRotation }],
          },
        ]}
      >
        <TouchableOpacity style={styles.mainButtonInner} onPress={toggleMenu}>
          <Image 
            source={require('@/assets/icons/plus.png')} 
            style={[
              styles.mainIcon,
              { tintColor: colorScheme === 'dark' ? Colors.dark_main : Colors.light_main }
            ]} 
          />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    alignItems: 'center',
  },
  mainButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  mainButtonInner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainIcon: {
    width: 24,
    height: 24,
  },
  actionButton: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButtonInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionIcon: {
    width: 20,
    height: 20,
    tintColor: 'white',
  },
  labelContainer: {
    marginLeft: 12,
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  labelText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default QuickActionButton; 