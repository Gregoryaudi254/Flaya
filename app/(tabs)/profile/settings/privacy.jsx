import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator,
  Image,
  Animated
} from 'react-native';
import React, { useEffect, useState, useRef } from 'react'
import { getData, storeData } from '@/constants/localstorage';
import { doc, updateDoc } from 'firebase/firestore';
import { useDispatch } from 'react-redux';
import { setValues } from '@/slices/profileViewSlice';
import { db } from '@/constants/firebase';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const privacy = () => {
  const dispatch = useDispatch();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

    const options = [
    { 
      label: 'everyone', 
      value: 1,
      icon: 'globe-outline',
      description: 'Anyone can view your profile'
    },
    { 
      label: 'friends', 
      value: 2,
      icon: 'people-outline',
      description: 'Only people you follow can view your profile'
    },
    { 
      label: 'no one', 
      value: 3,
      icon: 'lock-closed-outline',
      description: 'No one can view your profile except you'
    },
  ];

  const [selectedOption, setSelectedOption] = useState(1);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;

      useEffect(() => {
    const getStatus = async () => {
          let settings = await getData('@settings');
          settings = settings || {};

          const item = options.find((item) => item.label === (settings.profileview || 'everyone'));
      if (item) {
          setSelectedOption(item.value);
      }

          setLoading(false);
        }

        getStatus();
  }, []);

  const animateSelection = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const changeStatus = async (item) => {
    if (item.value === selectedOption) return;
    
    animateSelection();
    setSavingId(item.value);
    setLoading(true);

        const userInfo = await getData('@profile_info')
    const ref = doc(db, `users/${userInfo.uid}`);

        try {
          await updateDoc(ref, {
            [`settings.profileview`]: item.label.toLowerCase()
          });

          let settings = await getData('@settings');
      settings = settings || {};
          settings.profileview = item.label;
      await storeData('@settings', settings);

          setSelectedOption(item.value);
      dispatch(setValues(item.label));
        } catch (error) {
          console.log("Update failed: ", error);
        }

    setSavingId(null);
    setLoading(false);
      }

  return (
    <View style={[styles.container, {backgroundColor: isDark ? Colors.dark_main : Colors.light_main}]}>
      <Stack.Screen
        options={{
          title: "Privacy Settings",
          headerShadowVisible: false,
        }}
      />

      <View style={styles.headerSection}>
        <View style={styles.iconContainer}>
          <Ionicons 
            name="shield-checkmark-outline" 
            size={32} 
            color={Colors.blue} 
          />
        </View>
        <Text style={[styles.headerTitle, {color: isDark ? Colors.light_main : Colors.dark_main}]}>
          Profile Privacy
        </Text>
        <Text style={[styles.headerDescription, {color: isDark ? '#999999' : '#666666'}]}>
          Control who can view your profile and content
        </Text>
      </View>

      {loading && !savingId ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={isDark ? Colors.light_main : Colors.dark_main} />
        </View>
      ) : (
        <Animated.View style={[styles.optionsContainer, {transform: [{scale: scaleAnim}]}]}>
          {options.map((item) => (
            <TouchableOpacity
              key={item.value}
              style={[
                styles.optionCard,
                selectedOption === item.value && styles.selectedCard,
                {
                  backgroundColor: isDark ? 
                    (selectedOption === item.value ? '#2A2A2A' : '#1E1E1E') : 
                    (selectedOption === item.value ? '#F5F5F7' : '#FFFFFF')
                }
              ]}
              onPress={() => changeStatus(item)}
              disabled={savingId !== null}
            >
              <View style={styles.optionContent}>
                <View style={[
                  styles.iconWrapper,
                  {backgroundColor: selectedOption === item.value ? 
                    'rgba(0, 122, 255, 0.1)' : isDark ? '#333333' : '#F0F0F0'}
                ]}>
                  <Ionicons 
                    name={item.icon} 
                    size={24} 
                    color={selectedOption === item.value ? Colors.blue : isDark ? '#999999' : '#666666'} 
                  />
                </View>
                
                <View style={styles.textContainer}>
                  <Text style={[
                    styles.optionTitle, 
                    {color: isDark ? Colors.light_main : Colors.dark_main}
                  ]}>
                    {item.label.charAt(0).toUpperCase() + item.label.slice(1)}
                  </Text>
                  <Text style={[
                    styles.optionDescription,
                    {color: isDark ? '#999999' : '#666666'}
                  ]}>
                    {item.description}
                  </Text>
                </View>
              </View>

              {savingId === item.value ? (
                <ActivityIndicator size="small" color={Colors.blue} />
              ) : (
                selectedOption === item.value && (
                  <View style={styles.checkmarkContainer}>
                    <Ionicons name="checkmark-circle" size={22} color={Colors.blue} />
                  </View>
                )
              )}
            </TouchableOpacity>
          ))}
        </Animated.View>
      )}

      <View style={styles.footerSection}>
        <Text style={[styles.footerText, {color: isDark ? '#888888' : '#666666'}]}>
          These settings only affect who can view your profile. You can set more specific privacy controls for individual posts.
        </Text>
      </View>
    </View>
  )
}

export default privacy;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  headerSection: {
    marginBottom: 24,
    alignItems: 'center',
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  headerDescription: {
        fontSize: 15,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionsContainer: {
    marginTop: 16,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3.84,
    elevation: 3,
  },
  selectedCard: {
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.3)',
  },
  optionContent: {
        flexDirection: 'row',
        alignItems: 'center',
    flex: 1,
  },
  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
  },
  checkmarkContainer: {
    marginLeft: 12,
  },
  footerSection: {
    marginTop: 24,
    padding: 16,
  },
  footerText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});