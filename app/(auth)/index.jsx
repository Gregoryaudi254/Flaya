import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Dimensions,
  TouchableOpacity,
  FlatList,
  Animated,
  StatusBar,
  Image,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/constants/AuthContext';
import { useToast } from 'react-native-toast-notifications';

// Animated dot indicator component
const Indicator = ({ scrollX, data }) => {
  const { width } = Dimensions.get('window');
  const inputRange = data.map((_, i) => i * width);
  
  return (
    <View style={styles.indicatorContainer}>
      {data.map((_, i) => {
        const scale = scrollX.interpolate({
          inputRange: [
            (i - 1) * width,
            i * width,
            (i + 1) * width
          ],
          outputRange: [0.8, 1.4, 0.8],
          extrapolate: 'clamp'
        });
        
        const opacity = scrollX.interpolate({
          inputRange: [
            (i - 1) * width,
            i * width,
            (i + 1) * width
          ],
          outputRange: [0.4, 1, 0.4],
          extrapolate: 'clamp'
        });
        
        const dotWidth = scrollX.interpolate({
          inputRange: [
            (i - 1) * width,
            i * width,
            (i + 1) * width
          ],
          outputRange: [8, 24, 8],
          extrapolate: 'clamp'
        });
        
        return (
          <Animated.View
            key={`indicator-${i}`}
            style={[
              styles.indicator,
              { opacity, transform: [{ scale }], width: dotWidth }
            ]}
          />
        );
      })}
    </View>
  );
};

const WalkthroughScreen = () => {
  const { width, height } = Dimensions.get('window');
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const scrollX = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Animation values
  const imageAnim = useRef(new Animated.Value(0)).current;
  const textAnim = useRef(new Animated.Value(0)).current;
  
  // Walkthrough data
  const data = [
    {
      id: '1',
      title: 'Explore businesses near you',
      description: 'Discover local businesses, explore their products and services, and find the best options for your needs.',
      iconName: 'basket',
      backgroundColor: Colors.blue,
      color1: Colors.blue,
      color2: '#4F86F7'
    },
    {
      id: '2',
      title: 'Share Your Moments',
      description: 'Post photos, videos, and stories that matter to you. Connect with friends and make new ones in your neighborhood.',
      iconName: 'images',
      backgroundColor: Colors.orange,
      color1: Colors.orange,
      color2: '#FF8A65'
    },
    {
      id: '3',
      title: 'Join Local Conversations',
      description: 'Engage in discussions about topics that matter to your community. Your voice matters here!',
      iconName: 'chatbubbles',
      backgroundColor: '#4ECDC4',
      color1: '#4ECDC4',
      color2: '#2EE3D7'
    }
  ];
  
  // Animation for icon pulse
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const {isAuthenticated, user, signanonymously} = useAuth();

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user) {
      router.replace('/(tabs)')
    }
  }, [isAuthenticated,user]);
  
  // Start pulsing animation
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true
        })
      ])
    ).start();
  }, []);

  // Handle animation for new slide
  useEffect(() => {
    // Reset animations
    imageAnim.setValue(0);
    textAnim.setValue(0);
    
    // Start animations
    Animated.sequence([
      Animated.timing(imageAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true
      }),
      Animated.timing(textAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true
      })
    ]).start();
  }, [currentIndex]);
  
  const handleNext = () => {
    if (currentIndex < data.length - 1) {
      flatListRef.current.scrollToIndex({
        index: currentIndex + 1,
        animated: true
      });

      setCurrentIndex(currentIndex + 1);
    } else {
      finishOnboarding();
    }
  };

  const toast = useToast();

  function showToast(message) {
    toast.show(message, {
      type: "normal",
      placement: "bottom",
      duration: 2000,
      offset: 30,
      animationType: "zoom-in",
    });
  }
  
  const finishOnboarding = async () => {
    setIsLoading(true);

    const success = await signanonymously();

    if (!success) {
      showToast("Something went wrong");
      setIsLoading(false);
    }
  };
  
  const renderItem = ({ item, index }) => {
    const { width } = Dimensions.get('window');
    const translateYImage = imageAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [50, 0]
    });
    
    const opacityImage = imageAnim;
    
    const translateYText = textAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [20, 0]
    });
    
    const opacityText = textAnim;
    
    return (
      <View style={[styles.slide, { width }]}>
        <LinearGradient
          colors={[item.color1, item.color2]}
          style={styles.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.slideContent}>
            <Animated.View
              style={[
                styles.imageContainer,
                {
                  opacity: opacityImage,
                  transform: [{ translateY: translateYImage }],
                  width: width * 0.7,
                  height: width * 0.7,
                }
              ]}
            >
              <Animated.View 
                style={[
                  styles.iconCircle,
                  { 
                    transform: [{ scale: pulseAnim }],
                    backgroundColor: 'rgba(255, 255, 255, 0.2)'
                  }
                ]}
              >
                <View style={styles.iconInnerCircle}>
                  <Ionicons name={item.iconName} size={60} color={item.color1} />
                </View>
              </Animated.View>
            </Animated.View>
            
            <Animated.View
              style={[
                styles.textContainer,
                {
                  opacity: opacityText,
                  transform: [{ translateY: translateYText }]
                }
              ]}
            >
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.description}>{item.description}</Text>
            </Animated.View>
            
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.skipButton}
                disabled={isLoading}
                onPress={finishOnboarding}
              >
                <Text style={styles.skipButtonText}>Skip</Text>
            </TouchableOpacity>

              <TouchableOpacity
                style={styles.nextButton}
                onPress={handleNext}
                disabled={isLoading}
              > 
                {isLoading ? (
                  <ActivityIndicator size="small" color='black' />
                ) : (
                  <Text style={styles.nextButtonText}>
                    {currentIndex === data.length - 1 ? 'Get Started' : 'Next'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      </View>
    );
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      
      <FlatList
        ref={flatListRef}
        data={data}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        onMomentumScrollEnd={(event) => {
          const screenWidth = Dimensions.get('window').width;
          const index = Math.round(event.nativeEvent.contentOffset.x / screenWidth);
          setCurrentIndex(index);
        }}
        scrollEventThrottle={16}
      />
      
      <View style={styles.indicatorWrapper}>
        <Indicator scrollX={scrollX} data={data} />
        </View>
    </SafeAreaView>
  );
};

export default WalkthroughScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    
  },
  slide: {
    flex: 1
  },
  gradient: {
    ...StyleSheet.absoluteFillObject
  },
  slideContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24
  },
  imageContainer: {
    marginBottom: 40,
    justifyContent: 'center',
    alignItems: 'center'
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain'
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 60
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
    fontFamily: 'Lato'
  },
  description: {
    fontSize: 18,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 26,
    opacity: 0.9,
    paddingHorizontal: 16,
    fontFamily: 'Lato'
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 16,
    position: 'absolute',
    bottom: 40
  },
  nextButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4
  },
  nextButtonText: {
    color: Colors.blue,
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Lato'
  },
  skipButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center'
  },
  skipButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Lato'
  },
  indicatorWrapper: {
    position: 'absolute',
    bottom: 120,
    left: 0,
    right: 0,
    alignItems: 'center'
  },
  indicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  indicator: {
    height: 8,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 4,
    borderRadius: 4
  },
  iconCircle: {
    width: 180,
    height: 180,
    borderRadius: 90,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)'
  },
  iconInnerCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)'
  }
}); 