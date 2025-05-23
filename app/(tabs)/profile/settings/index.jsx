import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Image, Switch, ActivityIndicator, Platform } from 'react-native'
import React, { useCallback, useEffect, useState } from 'react'

import { useRouter } from 'expo-router';
import CustomDialog from '@/components/CustomDialog';
import { useAuth } from '@/constants/AuthContext';
import { Colors } from '@/constants/Colors';
import { getData, storeData } from '@/constants/localstorage';
import { db } from '@/constants/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useDispatch } from 'react-redux';
import { setValues } from '@/slices/profileViewSlice';

import { useSelector } from 'react-redux';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Ionicons } from '@expo/vector-icons';

const SettingSection = ({ title, children }) => {
  const colorScheme = useColorScheme();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colorScheme === 'dark' ? '#AAAAAA' : '#666666' }]}>{title}</Text>
      <View style={[styles.sectionContent, { backgroundColor: colorScheme === 'dark' ? '#1A1A1A' : '#FFFFFF' }]}>
        {children}
      </View>
    </View>
  );
};

const SettingItem = ({ icon, customIcon, title, rightContent, onPress, showBorder = true, tintColor }) => {
  const colorScheme = useColorScheme();
  return (
    <TouchableOpacity 
      onPress={onPress} 
      style={[
        styles.settingItem, 
        showBorder && { borderBottomWidth: 0.5, borderBottomColor: colorScheme === 'dark' ? '#333333' : '#EEEEEE' }
      ]}
    >
      <View style={styles.settingContent}>
        {customIcon ? (
          customIcon
        ) : (
          <Image 
            style={[styles.settingIcon, { tintColor: tintColor || (colorScheme === 'dark' ? '#AAAAAA' : '#666666') }]} 
            source={icon} 
          />
        )}
        <Text style={[styles.settingText, { color: colorScheme === 'dark' ? '#FFFFFF' : '#333333' }]}>{title}</Text>
      </View>
      <View style={styles.settingRight}>
        {rightContent}
      </View>
    </TouchableOpacity>
  );
};

const index = () => {
  const dispatch = useDispatch();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const { viewstatus } = useSelector(state => state.profile);

  const [userInfo, setUserInfo] = useState(null);
  
  const [isLikes, setLikes] = useState(false);
  const [isComment, setComment] = useState(false);
  const [isNewSubscriber, setNewSubscriber] = useState(false);
  const [isDirectMessaging, setDirectMessaging] = useState(false);

  const [dialog, setDialog] = useState(false);

  const { user, logout } = useAuth();

  useEffect(() => {
    const getSettings = async () => {
      let settings = await getData("@settings");
      settings = settings || {};

      const notification = settings.notification || {};

      setLikes(notification.likes || false);
      setNewSubscriber(notification.subscribers || false);
      setDirectMessaging(notification.messages || false);
      setComment(notification.comments || false);

      dispatch(setValues(settings.profileview || 'everyone'));
      
      // Get user info
      const userInfo = await getData('@profile_info');
      setUserInfo(userInfo);
    }

    getSettings();
  }, [dispatch]);

  const router = useRouter();

  const handlePhonePress = () => {
    router.push({
      pathname: '/(tabs)/profile/settings/phoneAuth'
    });
  }

  const handleEmaiPress = () => {
    router.push({
      pathname: '/(tabs)/profile/settings/emailAuth'
    });
  }

  const handlePasswordPress = () => {
    router.push({
      pathname: '/(tabs)/profile/settings/password'
    });
  }

  const handlePrivacyPress = () => {
    router.push({
      pathname: '/(tabs)/profile/settings/privacy'
    });
  }

  const handlePolicyPress = () => {
    router.push({
      pathname: '/(tabs)/profile/settings/policy'
    });
  }

  const handleIntellectualPress = () => {
    router.push({
      pathname: '/(tabs)/profile/settings/intellectual'
    });
  }

  const handleTermsPress = () => {
    router.push({
      pathname: '/(tabs)/profile/settings/terms'
    });
  }

  const handleDialogClose = () => {
    setDialog(false);
  }

  const [onLoggingout, setlogginout] = useState(false);
  
  const onLogOutPress = async () => {
    setlogginout(true);
    await logout(); 
    setDialog(false);
    router.replace('/(auth)');
  }

  const [authtype, setauthtype] = useState(null);
  const [accountType, setAccountType] = useState(null);

  const getUserDetails = async () => {
    const userInfo = await getData('@profile_info');
    const ref = doc(db, `users/${userInfo.uid}`);

    const usersnap = await getDoc(ref);

    if (usersnap.data().business) {
      if (usersnap.data().isbusinessaccount) {
        setAccountType("business");
      } else {
        setAccountType("pending");
      }
    } else {
      setAccountType("personal");
    }
  }

  useEffect(() => {
    getUserDetails();

    const getauthtype = async () => {
      const authtype = await getData('@auth_type');
      setauthtype(authtype || "email");
    }

    getauthtype();
  }, []);

  const handleSettingsNotifiaction = async (value, status) => {
    const userInfo = await getData('@profile_info');
    const ref = doc(db, `users/${userInfo.uid}`);

    try {
      await updateDoc(ref, {
        [`settings.notification.${value}`]: !status
      });
      
      let settings = await getData('@settings');
      settings = settings || {};
      const notification = settings.notification || {};
      notification[value] = !status;
      settings.notification = notification;
      await storeData('@settings', settings);

    } catch (error) {
      console.error("Update failed: ", error);
    }
  }

  const handleBusinessAccountPress = () => {
    if (accountType !== "business" && accountType !== null) {
      router.push({
        pathname: '/(tabs)/profile/settings/businessAccount'
      });
    }
  };

  const { value } = useSelector(state => state.data);
  
  useEffect(() => {
    if (value !== null && value.intent === "accountchange") {
      getUserDetails();
    }
  }, [value]);

  const handleSubscriptionNav = useCallback(() => {
    router.push({
      pathname: '/subscriptionPage'
    });
  });

  const [monetizationInfo, setMonetizationInfo] = useState(null);
  
  const checkMonetization = async () => {
    const ref = doc(db, `information/info`);
    const monetizationInfo = await getDoc(ref);
    setMonetizationInfo(monetizationInfo.data().monetizationinfo.isfree);
  }

  useEffect(() => {
    checkMonetization();
  }, []);

  return (
    <ScrollView 
      style={[styles.mainView, { backgroundColor: isDark ? Colors.dark_main : '#F2F2F7' }]}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      <SettingSection title="ACCOUNT">
        <SettingItem
          icon={require('@/assets/icons/emailsettings.png')}
          title="Email"
          rightContent={
            <Text style={[styles.settingValue, { color: isDark ? '#AAAAAA' : '#8A8A8E' }]}>
              {user !== null ? user.email : ''}
            </Text>
          }
        />

        {(monetizationInfo !== null && monetizationInfo === false) && (
          <SettingItem
            icon={require('@/assets/icons/emailsettings.png')}
            customIcon={<Ionicons name="card-outline" size={22} color={isDark ? '#AAAAAA' : '#666666'} style={styles.settingIcon} />}
            title="Subscriptions"
            onPress={handleSubscriptionNav}
            rightContent={
              <Ionicons name="chevron-forward" size={18} color={isDark ? '#AAAAAA' : '#C8C8C8'} />
            }
          />
        )}

        {(authtype !== null && authtype === 'email') && (
          <SettingItem
            icon={require('@/assets/icons/padlocksettings.png')}
            title="Password"
            onPress={handlePasswordPress}
            rightContent={
              <Ionicons name="chevron-forward" size={18} color={isDark ? '#AAAAAA' : '#C8C8C8'} />
            }
          />
        )}

        <SettingItem
          icon={require('@/assets/icons/user_outline.png')}
          title="Manage Account"
          showBorder={false}
          onPress={handleBusinessAccountPress}
          rightContent={
            accountType === "business" ? (
              <View style={styles.businessBadge}>
                <Text style={styles.businessBadgeText}>Business</Text>
              </View>
            ) : accountType === "pending" ? (
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingBadgeText}>Pending</Text>
              </View>
            ) : (
              <View style={styles.settingRight}>
                <Text style={[styles.settingValue, { color: isDark ? '#AAAAAA' : '#8A8A8E', marginRight: 5 }]}>
                  Personal
                </Text>
                <Ionicons name="chevron-forward" size={18} color={isDark ? '#AAAAAA' : '#C8C8C8'} onPress={handleBusinessAccountPress} />
              </View>
            )
          }
        />
      </SettingSection>

      <SettingSection title="NOTIFICATIONS">
        <SettingItem
          customIcon={<Image style={[styles.settingIcon, { tintColor: '#FF3B30' }]} source={require('@/assets/images/heart.png')} />}
          title="Likes"
          rightContent={
            <Switch
              trackColor={{ false: isDark ? '#333333' : '#E9E9EA', true: '#34C759' }}
              thumbColor={Platform.OS === 'ios' ? '#FFFFFF' : (isLikes ? '#FFFFFF' : '#F4F3F4')}
              ios_backgroundColor={isDark ? '#333333' : '#E9E9EA'}
              onValueChange={() => {
                const newLikes = !isLikes;
                handleSettingsNotifiaction("likes", !newLikes);
                setLikes(newLikes);
              }}
              value={isLikes || false}
            />
          }
        />

        <SettingItem
          icon={require('@/assets/icons/follow.png')}
          title="New subscriber"
          rightContent={
            <Switch
              trackColor={{ false: isDark ? '#333333' : '#E9E9EA', true: '#34C759' }}
              thumbColor={Platform.OS === 'ios' ? '#FFFFFF' : (isNewSubscriber ? '#FFFFFF' : '#F4F3F4')}
              ios_backgroundColor={isDark ? '#333333' : '#E9E9EA'}
              onValueChange={() => {
                const newSubs = !isNewSubscriber;
                handleSettingsNotifiaction("subscribers", !newSubs);
                setNewSubscriber(newSubs);
              }}
              value={isNewSubscriber || false}
            />
          }
        />

        <SettingItem
          icon={require('@/assets/icons/messengersettings.png')}
          title="Direct message"
          rightContent={
            <Switch
              trackColor={{ false: isDark ? '#333333' : '#E9E9EA', true: '#34C759' }}
              thumbColor={Platform.OS === 'ios' ? '#FFFFFF' : (isDirectMessaging ? '#FFFFFF' : '#F4F3F4')}
              ios_backgroundColor={isDark ? '#333333' : '#E9E9EA'}
              onValueChange={() => {
                const directMess = !isDirectMessaging;
                handleSettingsNotifiaction("messages", !directMess);
                setDirectMessaging(directMess);
              }}
              value={isDirectMessaging || false}
            />
          }
        />

        <SettingItem
          icon={require('@/assets/icons/commentsettings.png')}
          title="Comments"
          showBorder={false}
          rightContent={
            <Switch
              trackColor={{ false: isDark ? '#333333' : '#E9E9EA', true: '#34C759' }}
              thumbColor={Platform.OS === 'ios' ? '#FFFFFF' : (isComment ? '#FFFFFF' : '#F4F3F4')}
              ios_backgroundColor={isDark ? '#333333' : '#E9E9EA'}
              onValueChange={() => {
                const comment = !isComment;
                handleSettingsNotifiaction("comments", !comment);
                setComment(comment);
              }}
              value={isComment || false}
            />
          }
        />
      </SettingSection>

      <SettingSection title="PRIVACY">
        <SettingItem
          icon={require('@/assets/icons/card.png')}
          title="Profile"
          onPress={handlePrivacyPress}
          showBorder={false}
          rightContent={
            <TouchableOpacity 
              onPress={handlePrivacyPress} 
              style={styles.settingRight}
            >
              <Text style={[styles.settingValue, { color: isDark ? '#AAAAAA' : '#8A8A8E', marginRight: 5 }]}>
                {viewstatus}
              </Text>
              <Ionicons name="chevron-forward" size={18} color={isDark ? '#AAAAAA' : '#C8C8C8'} />
            </TouchableOpacity>
          }
        />
      </SettingSection>

      <SettingSection title="ABOUT">
        <SettingItem
          icon={require('@/assets/icons/terms-of-service.png')}
          title="Terms of Service"
          onPress={handleTermsPress}
          rightContent={
            <Ionicons name="chevron-forward" size={18} color={isDark ? '#AAAAAA' : '#C8C8C8'} />
          }
        />

        <SettingItem
          icon={require('@/assets/icons/insurance.png')}
          title="Privacy Policy"
          onPress={handlePolicyPress}
          rightContent={
            <Ionicons name="chevron-forward" size={18} color={isDark ? '#AAAAAA' : '#C8C8C8'} />
          }
        />

        <SettingItem
          icon={require('@/assets/icons/intellectual-property.png')}
          title="Intellectual Property Policy"
          showBorder={false}
          onPress={handleIntellectualPress}
          rightContent={
            <Ionicons name="chevron-forward" size={18} color={isDark ? '#AAAAAA' : '#C8C8C8'} />
          }
        />
      </SettingSection>

      <TouchableOpacity 
        style={[styles.logoutButton, { backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF' }]} 
        onPress={() => setDialog(true)}
      >
        <Ionicons name="log-out" size={20} color="#FF3B30" style={{ marginRight: 8 }} />
        <Text style={styles.logoutText}>Log out</Text>
      </TouchableOpacity>

      <CustomDialog onclose={handleDialogClose} isVisible={dialog}>
        {!onLoggingout ? (
          <View style={{
            padding: 20, 
            alignItems: 'center', 
            backgroundColor: isDark ? Colors.dark_gray : Colors.light_main, 
            borderRadius: 14
          }}>
            <Text style={{
              color: isDark ? Colors.light_main : Colors.dark_main,
              fontSize: 18,
              fontWeight: '600',
              marginBottom: 24,
              textAlign: 'center'
            }}>
              Are you sure you want to log out?
            </Text>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%' }}>
              <TouchableOpacity 
                style={{
                  padding: 12,
                  borderRadius: 10,
                  flex: 1,
                  marginRight: 8,
                  backgroundColor: isDark ? '#333333' : '#F2F2F7'
                }}
                onPress={handleDialogClose}
              >
                <Text style={{
                  color: isDark ? '#FFFFFF' : '#000000',
                  textAlign: 'center',
                  fontWeight: '600'
                }}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={{
                  padding: 12,
                  borderRadius: 10,
                  flex: 1,
                  marginLeft: 8,
                  backgroundColor: '#FF3B30'
                }}
                onPress={onLogOutPress}
              >
                <Text style={{
                  color: '#FFFFFF',
                  textAlign: 'center',
                  fontWeight: '600'
                }}>
                  Log Out
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <ActivityIndicator size="large" color="white" />
        )}
      </CustomDialog>
    </ScrollView>
  );
};

export default index;

const styles = StyleSheet.create({
  mainView: {
    flex: 1,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    marginHorizontal: 16,
    letterSpacing: 0.5,
  },
  sectionContent: {
    borderRadius: 10,
    overflow: 'hidden',
    marginHorizontal: 16,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  settingContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIcon: {
    width: 22,
    height: 22,
    marginRight: 12,
  },
  settingText: {
    fontSize: 16,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingValue: {
    fontSize: 16,
  },
  businessBadge: {
    backgroundColor: Colors.blue,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  businessBadgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
  },
  pendingBadge: {
    backgroundColor: '#FF9500',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  pendingBadgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginTop: 20,
    paddingVertical: 15,
    borderRadius: 10,
  },
  logoutText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
  },
});