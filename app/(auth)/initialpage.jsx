import { StyleSheet, Text, TouchableOpacity, View, Image, Dimensions, StatusBar, ImageBackground, ScrollView, Animated } from 'react-native'
import React, { useState, useEffect, useRef } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router';
import { useAuth } from '@/constants/AuthContext';
import * as Font from 'expo-font';
import { useColorScheme } from '@/hooks/useColorScheme';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';

const { width, height } = Dimensions.get('window');

const OnboardingScreen = () => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
    const router = useRouter();
  const { signUp } = useAuth();
  const [fontsLoaded, setFontsLoaded] = useState(false);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const mockupSlideAnim = useRef(new Animated.Value(100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  
  // Animation for floating bubbles
  const bubble1Anim = useRef(new Animated.Value(0)).current;
  const bubble2Anim = useRef(new Animated.Value(0)).current;

  const handleSignUp = () => {
      router.push('/(auth)/walkthrough')
    }

  const handleSignIn = () => {
    router.push('/(auth)/signIn')
  }

    const loadFonts = async () => {
      await Font.loadAsync({
      'Lato': require('@/assets/fonts/Lato.ttf'),
      });
      setFontsLoaded(true);
    };

  // Run floating animations
  const runBubbleAnimations = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(bubble1Anim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(bubble1Anim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        })
      ])
    ).start();
    
    Animated.loop(
      Animated.sequence([
        Animated.timing(bubble2Anim, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(bubble2Anim, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: true,
        })
      ])
    ).start();
    
    // Subtle rotation animation for phone
    Animated.loop(
      Animated.sequence([
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 7000,
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: 0,
          duration: 7000,
          useNativeDriver: true,
        })
      ])
    ).start();
    };
  
    useEffect(() => {
      loadFonts();
    
    // Start animations when component mounts
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(mockupSlideAnim, {
        toValue: 0,
        duration: 1000,
        delay: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 1200,
        delay: 300,
        useNativeDriver: true,
      })
    ]).start();
    
    // Start floating animations after initial animations
    setTimeout(runBubbleAnimations, 1000);
    }, []);
  
    if (!fontsLoaded) {
    return null
  }

  const backgroundGradient = isDark 
    ? ['#121212', '#1A1A1A', '#262626'] 
    : ['#FFFFFF', '#F8F8F8', '#F0F0F0'];
    
  // Interpolate rotation animation
  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['-2deg', '2deg']
  });
  
  // Interpolate bubble movements
  const bubble1Transform = bubble1Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -8]
  });
  
  const bubble2Transform = bubble2Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -12]
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <LinearGradient
        colors={backgroundGradient}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            
            {/* App name and logo header */}
            <View style={styles.header}>
              <View style={styles.logoContainer}>
                <LinearGradient
                  colors={[Colors.orange, '#FF5722', Colors.blue]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.logoBackground}
                >
                  <Ionicons name="flame" size={36} color="#FFFFFF" />
                </LinearGradient>
                <Text style={[styles.appName, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                  flaya
                </Text>
              </View>
            </View>
            
            {/* Mockup screens */}
            <Animated.View 
              style={[
                styles.mockupContainer,
                { 
                  opacity: opacityAnim,
                  transform: [
                    { translateY: mockupSlideAnim },
                    { rotate }
                  ]
                }
              ]}
            >
              <View style={styles.phoneFrame}>
                <Image 
                  source={require('@/assets/images/nearby.png')} 
                  style={styles.mockupImage}
                  resizeMode="cover"
                />
                <View style={[styles.phoneNotch, { backgroundColor: isDark ? '#121212' : '#FFFFFF' }]} />
                
                {/* Highlight overlays to show interaction */}
                <View style={[styles.interactionHighlight, { bottom: '20%', right: '20%' }]}>
                  <LinearGradient
                    colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.2)']}
                    style={styles.highlightGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  />
                </View>
                
                <View style={[styles.interactionHighlight, { top: '30%', left: '15%' }]}>
                  <LinearGradient
                    colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.15)']}
                    style={styles.highlightGradient}
                    start={{ x: 1, y: 0 }}
                    end={{ x: 0, y: 1 }}
                  />
                </View>
              </View>
              
              {/* Animated interaction bubbles */}
              <Animated.View 
                style={[
                  styles.interactionBubbles, 
                  { right: width * 0.1, transform: [{ translateY: bubble1Transform }] }
                ]}
              >
                <View style={[styles.interactionBubble, { backgroundColor: Colors.orange }]}>
                  <Ionicons name="heart" size={18} color="#FFFFFF" />
                </View>
                <View style={[styles.interactionBubble, { backgroundColor: Colors.blue }]}>
                  <Ionicons name="chatbubble" size={18} color="#FFFFFF" />
                </View>
              </Animated.View>
              
              <Animated.View 
                style={[
                  styles.interactionBubbles, 
                  { left: width * 0.1, transform: [{ translateY: bubble2Transform }] }
                ]}
              >
                <View style={[styles.interactionBubble, { backgroundColor: '#4ECDC4' }]}>
                  <Ionicons name="share-social" size={18} color="#FFFFFF" />
                </View>
                <View style={[styles.interactionBubble, { backgroundColor: '#FF6B6B' }]}>
                  <Ionicons name="bookmark" size={18} color="#FFFFFF" />
                </View>
              </Animated.View>
            </Animated.View>

            {/* Title and subtitle */}
            <Animated.View 
              style={[
                styles.textSection, 
                { 
                  opacity: fadeAnim, 
                  transform: [{ translateY: slideAnim }]
                }
              ]}
            >
              <View style={styles.titleContainer}>
                <Text style={[styles.title, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                  Discover your <Text style={{color: Colors.orange}}>local</Text> <Text style={{color: Colors.blue}}>community</Text>
            </Text>
          </View>

              <Text style={[styles.subtitle, { color: isDark ? '#AAAAAA' : '#666666' }]}>
                See what's happening nearby, connect with neighbors, and discover local businesses all in one place.
              </Text>
            </Animated.View>
            
            {/* Feature cards */}
            <View style={styles.featureCardsContainer}>
              <Animated.View 
                style={[
                  styles.featureCard, 
                  { 
                    backgroundColor: isDark ? '#2A2A2A' : '#FFFFFF',
                    opacity: opacityAnim,
                    transform: [{ translateY: mockupSlideAnim }]
                  }
                ]}
              >
                <LinearGradient
                  colors={[Colors.blue, Colors.blue, '#4F86F7']}
                  style={styles.featureIconContainer}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="people" size={22} color="#FFFFFF" />
                </LinearGradient>
                <View style={styles.featureTextContainer}>
                  <Text style={[styles.featureTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                    Connect Locally
                  </Text>
                  <Text style={[styles.featureDescription, { color: isDark ? '#AAAAAA' : '#666666' }]}>
                    Meet neighbors and make friends
                  </Text>
                </View>
              </Animated.View>
              
              <Animated.View 
                style={[
                  styles.featureCard, 
                  { 
                    backgroundColor: isDark ? '#2A2A2A' : '#FFFFFF',
                    opacity: opacityAnim,
                    transform: [{ translateY: mockupSlideAnim }]
                  }
                ]}
              >
                <LinearGradient
                  colors={['#FF6B6B', '#FF6B6B', '#FF8A8A']}
                  style={styles.featureIconContainer}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="compass" size={22} color="#FFFFFF" />
                </LinearGradient>
                <View style={styles.featureTextContainer}>
                  <Text style={[styles.featureTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                    Discover Events
                  </Text>
                  <Text style={[styles.featureDescription, { color: isDark ? '#AAAAAA' : '#666666' }]}>
                    Find what's happening nearby
                  </Text>
                </View>
              </Animated.View>
              
              <Animated.View 
                style={[
                  styles.featureCard, 
                  { 
                    backgroundColor: isDark ? '#2A2A2A' : '#FFFFFF',
                    opacity: opacityAnim,
                    transform: [{ translateY: mockupSlideAnim }]
                  }
                ]}
              >
                <LinearGradient
                  colors={['#4ECDC4', '#4ECDC4', '#2EE3D7']}
                  style={styles.featureIconContainer}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="business" size={22} color="#FFFFFF" />
                </LinearGradient>
                <View style={styles.featureTextContainer}>
                  <Text style={[styles.featureTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                    Local Businesses
                  </Text>
                  <Text style={[styles.featureDescription, { color: isDark ? '#AAAAAA' : '#666666' }]}>
                    Support shops in your community
                  </Text>
                </View>
              </Animated.View>
        </View>
     
            {/* Buttons */}
            <View style={styles.buttonSection}>
              <TouchableOpacity 
                style={styles.primaryButton} 
                onPress={handleSignUp}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={[Colors.blue, '#4F86F7']}
                  style={styles.buttonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.primaryButtonText}>Get Started</Text>
                </LinearGradient>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.secondaryButton, 
                  { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }
                ]} 
                onPress={handleSignIn}
                activeOpacity={0.8}
              >
                <Text style={[
                  styles.secondaryButtonText, 
                  { color: isDark ? '#FFFFFF' : '#000000' }
                ]}>
                  I already have an account
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  )
}

export default OnboardingScreen

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    paddingTop: 16,
  },
  header: {
    marginBottom: 20,
    alignItems: 'center',
    height: 60,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%',
  },
  logoBackground: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center'
  },
  appName: {
    fontSize: 32,
    fontWeight: '700',
    marginLeft: 8,
  },
  mockupContainer: {
    height: 300,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  phoneFrame: {
    width: '100%',
    height: width * 1.5,
    borderRadius: 36,
    overflow: 'hidden',
    borderWidth: 10,
    borderColor: '#2A2A2A',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  mockupImage: {
    width: '100%',
    height: '100%',
  },
  phoneNotch: {
    position: 'absolute',
    top: 0,
    width: 120,
    height: 30,
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
    alignSelf: 'center',
  },
  interactionHighlight: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
  },
  highlightGradient: {
    width: '100%',
    height: '100%',
  },
  interactionBubbles: {
    position: 'absolute',
    flexDirection: 'row',
  },
  interactionBubble: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.blue,
    marginHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  textSection: {
    marginTop: 20,
    marginBottom: 24,
  },
  titleContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
    fontFamily: 'Lato',
    lineHeight: 40,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
    marginTop: 16,
  },
  featureCardsContainer: {
    marginBottom: 32,
  },
  featureCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  featureIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  featureTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
  },
  buttonSection: {
    marginBottom: 24,
  },
  primaryButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: Colors.blue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryButton: {
    marginTop: 12,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
});