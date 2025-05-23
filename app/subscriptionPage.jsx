import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useColorScheme, ActivityIndicator, ScrollView, Alert, Image, Linking } from 'react-native';

import { Ionicons, Feather, MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { db, functions } from '@/constants/firebase';
import { getData } from '@/constants/localstorage';
import { httpsCallable } from 'firebase/functions';
import { Colors } from '@/constants/Colors';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import PhoneInputBottomSheet from '@/components/inputPhoneBottomSheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useToast } from 'react-native-toast-notifications';
import { useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { setData } from '@/slices/dataChangeSlice';
import { Stack } from 'expo-router';

import * as Clipboard from 'expo-clipboard';


// Demo subscription data
const PLANS = {
  MONTHLY: {
    id: 'monthly',
    name: 'Monthly Plan',
    price: '$9.99',
    period: 'month',
    features: [
      'Store visible to people nearby',
      'Receive and manage orders',
      'Post unlimited products',
      'Business insights'
    ]
  },
  YEARLY: {
    id: 'yearly',
    name: 'Yearly Plan',
    price: '$99.99',
    period: 'year',
    savings: '16%',
    features: [
      'Store visible to people nearby',
      'Receive and manage orders',
      'Post unlimited products',
      'Business insights',
      'Priority customer support'
    ]
  }
};

export default function SubscriptionComponent() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [plans, setPlans] = useState({});
  const [isSubscribed, setIsSubscribed] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState("monthly");
  const [currentPlan, setCurrentPlan] = useState({});
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  
  const [paymentError, setPaymentError] = useState(null);

  const paymentSuccess = useRef(false);
  const toast = useToast();
  const router = useRouter();
  const dispatch = useDispatch();
  const user = useSelector(state => state.user);

  const snapPoints = useMemo(() => ['40%'], []);
  const bottomSheetRef = useRef(null);

  // Open the payment bottom sheet
  const openPaymentSheet = () => {
    paymentSuccess.current = false;
    setPaymentError(null);
   bottomSheetRef.current?.snapToIndex(0);
  };

  // Show toast message
  const showToast = (message) => {
    toast.show(message, {
      type: "normal",
      placement: "bottom",
      duration: 3000,
      offset: 30,
      animationType: "zoom-in",
    });
  };

  // Helper function to determine button text based on subscription status
  const getRenewButtonText = (subscription) => {
    if (!subscription || subscription.status !== 'active') {
      return "Renew Subscription";
    }
    
    const now = new Date();
    const endDate = subscription.endDate?.toDate?.() || new Date(subscription.endDate) || new Date(0);

    // Get difference in milliseconds
    const diffMs = endDate - now;

    // Convert to days (rounded down)
    const daysLeft = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    // If in grace period (subscription ended but grace period active)
    if (daysLeft < 0) {
      return "Pay Now";
    }
    // If close to expiry (5 days or less)
    if (daysLeft <= 5) {
      return "Pay Early";
    }
    
    // Otherwise normal renew text
    return "Renew Subscription";
  };

  // Function to check if a plan upgrade is available
  const isUpgradeAvailable = (currentPlan) => {
    return currentPlan && currentPlan.subscriptionType === "monthly";
  };

  // Check and get subscription status
  const subscriptionStatus = async () => {
    try {
      const userinfo = await getData('@profile_info');
      setUserInfo(userinfo);
      
      if (!userinfo || !userinfo.uid) {
        console.error("User info not available");
        setIsSubscribed(false);
        return;
    }

     // Get payment plans
     const callbackPlans = httpsCallable(functions, 'getPaymentPlans');
     const responseplans = await callbackPlans({ userid: userinfo.uid });
     console.log("payment plans", JSON.stringify(responseplans));

     if (responseplans.data.plans) {
       setPlans(responseplans.data.plans);
     }else {
       setPlans({
           MONTHLY: {
             id: 'monthly',
             name: 'Monthly Plan',
             price: 'Ksh 500',
             period: 'month',
             features: [
               'Store visible to people nearby',
               'Receive and manage orders',
               'Post unlimited products',
               'Business insights'
             ]
           },
           YEARLY: {
             id: 'yearly',
             name: 'Yearly Plan',
             price: 'Ksh 5000',
             period: 'year',
             savings: '20%',
             features: [
               'Store visible to people nearby',
               'Receive and manage orders',
               'Post unlimited products',
               'Business insights',
               'Priority customer support'
             ]
           }
         });
     }

      // Always fetch the latest status from the backend
      const callbackFunction = httpsCallable(functions, 'getSubscriptionStatus');
      const response = await callbackFunction({ userid: userinfo.uid });
      
      // Store subscription data from the backend
      if (response.data.subscriptionType === null) {
        setIsSubscribed(false);
      } else {

        
        setCurrentPlan(response.data);
        setIsSubscribed(true);

        console.log("current plan", JSON.stringify(response.data));
        
        // If the user was on monthly, pre-select monthly for simplicity
        if (response.data.subscriptionType === "monthly") {
          setSelectedPlan("monthly");
        }
      }
      // Listen for real-time updates from Firestore for UI refresh
      const userRef = doc(db, "users", userinfo.uid);
      const unsubscribe = onSnapshot(userRef, (doc) => {
        if (doc.exists()) {
          const userData = doc.data();

          dispatch(setData({
            intent: "subscriptionchange",
          }));

          console.log("payment response", paymentSuccess.current);
          // Refresh subscription status after payment
          callbackFunction({ userid: userinfo.uid }).then(updatedResponse => {
            if (updatedResponse.data.subscriptionType !== null) {
              setCurrentPlan(updatedResponse.data);
              setIsSubscribed(true);
            }
          });
        
        }
      });
      
      

    
      // Return cleanup function
      return unsubscribe;
    } catch (error) {
      console.error("Error fetching subscription status:", error);
      showToast("Failed to load subscription information");
      setIsSubscribed(false);
    }
  };

  useEffect(() => {
    const unsubscribe = subscriptionStatus();
    return () => {
      // Clean up listener on unmount
      if (unsubscribe && typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  // Handle M-Pesa payment
  const handlePayment = async (phoneNumber) => {
    setIsProcessingPayment(true);
    setPaymentError(null);
    
    try {
      const callbackFunction = httpsCallable(functions, 'mpesaPush');
      
      if (!userInfo || !userInfo.uid) {
        throw new Error("User information not available");
      }
      
      // When upgrading from monthly to yearly
      const isUpgrading = isSubscribed && isUpgradeAvailable(currentPlan) && selectedPlan === "yearly";
      
      // Add plan information to the payment request
      const info = {
        userid: userInfo.uid,
        phone: phoneNumber,
        plan: selectedPlan, // Pass selected plan to cloud function
        isUpgrade: false // Tell backend if this is an upgrade
      };

      // Call the function with the payment info
      const response = await callbackFunction(info);
      console.log("payment response", JSON.stringify(response));
      
      if (response.data && (response.data.data && response.data.data.ResponseCode === "0" || response.data.ResponseCode === "0")) {
        // Success case - M-Pesa request sent successfully
        paymentSuccess.current = true;
        showToast("Payment request sent to your phone. Please check your M-Pesa.");
        
        // Poll for subscription changes or wait for real-time updates
        return true;
      } else {
        // Handle other response codes
        console.log("Payment error", JSON.stringify(response));
        const errorMessage = response.data?.error || "Payment request failed. Please try again.";
        setPaymentError(errorMessage);
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error("Payment error:", error);
      setPaymentError(error.message || "Payment failed. Please try again.");
      throw error;
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleUpgradeToYearly = async () => {
    
    Alert.alert(
      'Upgrade to Yearly Plan',
      'Would you like to upgrade to the yearly plan? You will get a 20% discount and your remaining days from the monthly plan will be credited.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Upgrade', 
          onPress: async () => {
            try {
              setIsProcessingPayment(true);
              
              const callbackFunction = httpsCallable(functions, 'mpesaPush');
              const response = await callbackFunction({
                userid: userInfo.uid,
                phone: currentPlan.lastPaymentDetails.phoneNumber,
                plan: 'yearly',
                isUpgrade: true
              });
              
              if (response.data.success) {
                showToast("Upgrade initiated. Please check your M-Pesa for payment instructions.");
                paymentSuccess.current = true;
              } else {
                showToast(response.data.message || 'Failed to initiate upgrade payment');
              }
            } catch (error) {
              console.error('Upgrade error:', error);
              Alert.alert('Error', error.message || 'An error occurred while processing your upgrade');
            } finally {
              setIsProcessingPayment(false);
              
              // Refresh subscription data after payment attempt
              setTimeout(subscriptionStatus, 5000);
            }
          }
        }
      ]
    );
  };

  const handleDownGradeToMonhly = async () => {
    
    
    Alert.alert(
      'Downgrade to Monthly Plan',
      'Would you like to downgrade to the monthly plan? You will lose the benefits of the yearly plan and your remaining days from the yearly plan will be credited.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Downgrade', 
          onPress: async () => {
            try {
              setIsProcessingPayment(true);
              
              const callbackFunction = httpsCallable(functions, 'mpesaPush');
              const response = await callbackFunction({
                userid: userInfo.uid,
                phone: currentPlan.lastPaymentDetails.phoneNumber,
                plan: 'monthly',
                isUpgrade: true
              });
              
              if (response.data.success) {
                showToast("Downgrade initiated. Please check your M-Pesa for payment instructions.");
                paymentSuccess.current = true;
              } else {
                showToast(response.data.message || 'Failed to initiate downgrade payment');
              }
            } catch (error) {
              console.error('Upgrade error:', error);
              Alert.alert('Error', error.message || 'An error occurred while processing your upgrade');
            } finally {
              setIsProcessingPayment(false);
              
              // Refresh subscription data after payment attempt
              setTimeout(subscriptionStatus, 5000);
            }
          }
        }
      ]
    );
  };


  // Colors based on theme
  const colors = {
    background: isDark ? '#121212' : '#FFFFFF',
    card: isDark ? '#1E1E1E' : '#F5F5F7',
    activeCard: isDark ? '#2A2A2A' : '#EAEAEB',
    text: isDark ? '#FFFFFF' : '#1A1A1A',
    subtext: isDark ? '#A0A0A0' : '#6E6E73',
    accent: '#3D6DFF', // Primary accent color that works in both themes
    border: isDark ? '#333333' : '#DDDDDD',
    success: '#4CAF50'
  };

  if (isSubscribed === null) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center' }}>
        <ActivityIndicator style={{ alignSelf: 'center' }} size="large" color={isDark ? Colors.light_main : Colors.dark_main} />
        </SafeAreaView>
    );
  }
  
  // If user is subscribed, show the current plan details
  if (isSubscribed) {
    const message = currentPlan.period === "safe_period" ? "Expires on" : 
                   currentPlan.period === "grace_period" ? "Grace period ends on" : "Expired on";

    // Pre-select plan based on current subscription
    const shouldShowChangePlan = isUpgradeAvailable(currentPlan);

    // Logic for showing renewal buttons based on status
    const showRenewButton = currentPlan.status !== "active" || 
                           (currentPlan.period === "grace_period") ||
                           (currentPlan.period === "safe_period" && currentPlan.days <= 5);

    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaView style={{ flex: 1 }}>
        <View style={[styles.container, { backgroundColor: colors.background }]}>

            <View style={[styles.currentPlanCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.currentPlanHeader}>

                 <TouchableOpacity onPress={() => router.back()} >
                   <Image style={{width:20,height:20,tintColor:colorScheme === 'dark' ? Colors.light_main: Colors.dark_main}} source={require('@/assets/icons/arrow.png')}></Image>
                  </TouchableOpacity>

                <Text style={[styles.currentPlanTitle, { color: colors.text }]}>Current Subscription</Text>
                <View style={[styles.activeBadge, { 
                  backgroundColor: currentPlan.status === "active" ? colors.success + '20' : Colors.red_orange + '20' 
                }]}>
                  <Text style={[styles.activeBadgeText, { 
                    color: currentPlan.status === "active" ? colors.success : Colors.red_orange 
                  }]}>
                    {currentPlan.status === "active" ? "Active" : "Expired"}
                  </Text>
                </View>
            </View>
            
            <View style={styles.planInfoRow}>
                <Ionicons name="storefront-outline" size={24} color={Colors.blue} />
                <Text style={[styles.planInfoText, { color: colors.text }]}>{currentPlan.plan}</Text>
            </View>
            
            <View style={styles.planInfoRow}>
                <Ionicons name="calendar-outline" size={24} color={Colors.blue} />
                <Text style={[styles.planInfoText, { color: colors.text }]}>
                 {message} {currentPlan.endDate}
                </Text>
            </View>

              {currentPlan.period === "safe_period" && currentPlan.days > 0 && (
                <View style={styles.planInfoRow}>
                  <Ionicons name="time-outline" size={24} color={currentPlan.days <= 5 ? Colors.red_orange : Colors.blue} />
                  <Text style={[
                    styles.planInfoText, 
                    { 
                      color: currentPlan.days <= 5 ? Colors.red_orange : colors.text,
                      fontWeight: currentPlan.days <= 5 ? '600' : 'normal'
                    }
                  ]}>
                    {currentPlan.days} days remaining
                  </Text>
                </View>
              )}
            
            <View style={styles.benefitsContainer}>
                <Text style={[styles.benefitsTitle, { color: colors.text }]}>Your Benefits</Text>
                
                <View style={styles.benefitRow}>
                  <Ionicons name="location-outline" size={24} color={Colors.green} />
                <Text style={[styles.benefitText, { color: colors.text }]}>{plans.features[0]}</Text>
                </View>
                
                <View style={styles.benefitRow}>
                  <Ionicons name="cube-outline" size={24} color={colors.text} />
                <Text style={[styles.benefitText, { color: colors.text }]}>{plans.features[1]}</Text>
                </View>
                
                <View style={styles.benefitRow}>
                  <Ionicons name="notifications-outline" size={24} color={colors.text} />
                <Text style={[styles.benefitText, { color: colors.text }]}>{plans.features[2]}</Text>
                </View>
            </View>
            
              {showRenewButton && (
                <TouchableOpacity
                  style={[styles.renewButton, { backgroundColor: Colors.blue }]}
                  onPress={openPaymentSheet}>
                  <Ionicons name="refresh" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.renewButtonText}>
                    {getRenewButtonText(currentPlan)}
                  </Text>
                </TouchableOpacity>
              )}


             {(showRenewButton && currentPlan.subscriptionType === "yearly") && (
                <TouchableOpacity
                  style={[styles.buttonOutline, { borderColor: colors.border }]}
                  onPress={handleDownGradeToMonhly}>
                  <Text style={[styles.buttonOutlineText, { color: colors.text }]}>Downgrade to Monthly Plan</Text>
                </TouchableOpacity>
              )}

              {shouldShowChangePlan && (
            <TouchableOpacity
                style={[styles.buttonOutline, { borderColor: colors.border }]}
                  onPress={handleUpgradeToYearly}>
                  <Text style={[styles.buttonOutlineText, { color: colors.text }]}>Upgrade to Yearly Plan</Text>
            </TouchableOpacity>
              )}
            </View>
      </View>

          <PhoneInputBottomSheet 
            handleButtonPress={handlePayment} 
            bottomSheetRef={bottomSheetRef} 
            initialSnapIndex={-1} 
            snapPoints={snapPoints} 
          />
        </SafeAreaView>
      </GestureHandlerRootView>
    );
  }

  // Otherwise show the subscription plans
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={[styles.container, { backgroundColor: colors.background }]}>

            <View style={{flexDirection:'row',alignItems:'center'}}>

            <TouchableOpacity onPress={() => router.back()} style={{marginLeft:10}} >
            <Image style={{width:20,height:20,tintColor:colorScheme === 'dark' ? Colors.light_main: Colors.dark_main}} source={require('@/assets/icons/arrow.png')}></Image>
            </TouchableOpacity>

            { (plans && plans.title) && <Text style={[styles.title, { color: colors.text, marginLeft:10 , marginBottom:0}]}>{plans.title}</Text>}
            </View>


        
            {(plans && plans.message) && <Text style={[styles.subtitle, { color: colors.subtext }]}>
                {plans.message}
            </Text>}
            
            {/* Plan toggle buttons */}
            {plans && plans.MONTHLY && plans.YEARLY && (
            <View style={styles.planToggle}>
                <TouchableOpacity
                style={[
                    styles.planToggleButton,
                    selectedPlan === plans.MONTHLY.id && [styles.planToggleButtonActive, { backgroundColor: colors.activeCard }]
                ]}
                  onPress={() => setSelectedPlan(plans.MONTHLY.id)}>
                <Text
                    style={[
                    styles.planToggleText,
                      { color: selectedPlan === plans.MONTHLY.id ? colors.accent : colors.subtext }
                    ]}>
                    Monthly
                </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                style={[
                    styles.planToggleButton,
                    selectedPlan === plans.YEARLY.id && [styles.planToggleButtonActive, { backgroundColor: colors.activeCard }]
                ]}
                  onPress={() => setSelectedPlan(plans.YEARLY.id)}>
                <Text
                    style={[
                    styles.planToggleText,
                      { color: selectedPlan === plans.YEARLY.id ? colors.accent : colors.subtext }
                    ]}>
                    Yearly
                </Text>
                  {plans.YEARLY.savings && (
                    <View style={[styles.savingsBadge, { backgroundColor: colors.accent + '20' }]}>
                      <Text style={[styles.savingsBadgeText, { color: colors.accent }]}>Save {plans.YEARLY.savings}</Text>
                    </View>
                )}
                </TouchableOpacity>
            </View>
            )}
            
            {/* Plan details card */}
            {plans && plans.MONTHLY && plans.YEARLY && (
            <View style={[styles.planCard, { backgroundColor: colors.card }]}>
                <Text style={[styles.planName, { color: colors.text }]}>
                  {selectedPlan === plans.MONTHLY.id ? plans.MONTHLY.name : plans.YEARLY.name}
                </Text>
                
                <View style={styles.priceContainer}>
                <Text style={[styles.price, { color: colors.text }]}>
                    {selectedPlan === plans.MONTHLY.id ? plans.MONTHLY.price : plans.YEARLY.price}
                </Text>
                <Text style={[styles.period, { color: colors.subtext }]}>
                    /{selectedPlan === plans.MONTHLY.id ? plans.MONTHLY.period : plans.YEARLY.period}
                </Text>
                </View>
                
                <View style={styles.featuresContainer}>
                  {(selectedPlan === plans.MONTHLY.id ? plans.MONTHLY.features : plans.YEARLY.features)?.map((feature, index) => (
                    <View key={index} style={styles.featureRow}>
                      <Ionicons name="checkmark-circle" size={20} color={Colors.green} />
                    <Text style={[styles.featureText, { color: colors.text }]}>{feature}</Text>
                    </View>
                ))}
                </View>

                {/* Show error if payment failed */}
                {paymentError && (
                  <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle" size={20} color={Colors.red_orange} style={styles.errorIcon} />
                    <Text style={[styles.errorText, { color: Colors.red_orange }]}>{paymentError}</Text>
                  </View>
                )}
                
                <TouchableOpacity
                style={[styles.subscribeButton, { backgroundColor: colors.accent }]}
                  onPress={openPaymentSheet}
                  disabled={isProcessingPayment}>
                  {isProcessingPayment ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="card-outline" size={22} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.subscribeButtonText}>Subscribe Now</Text>
                    </>
                  )}
                </TouchableOpacity>
            </View>
            )}
            
            <Text style={[styles.termsText, { color: colors.subtext }]}>
                You can cancel your subscription at any time
            </Text>
            </View>
    
        <PhoneInputBottomSheet 
          handleButtonPress={handlePayment} 
          bottomSheetRef={bottomSheetRef} 
          initialSnapIndex={-1} 
          snapPoints={snapPoints} 
        />
        </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 24,
  },
  planToggle: {
    flexDirection: 'row',
    marginBottom: 24,
    borderRadius: 12,
    overflow: 'hidden',
  },
  planToggleButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  planToggleButtonActive: {
    borderRadius: 12,
  },
  planToggleText: {
    fontWeight: '600',
    fontSize: 16,
  },
  savingsBadge: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  savingsBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  planCard: {
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
  },
  planName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 24,
  },
  price: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  period: {
    fontSize: 16,
    marginLeft: 4,
  },
  featuresContainer: {
    marginBottom: 24,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
    marginLeft: 12,
    fontSize: 16,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.red_orange + '15',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorIcon: {
    marginRight: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
  },
  subscribeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
  },
  subscribeButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  termsText: {
    textAlign: 'center',
    fontSize: 14,
  },
  // Current plan styles
  currentPlanCard: {
    borderRadius: 16,
    padding: 24,
    flex:1,
    marginBottom: 24,
    borderWidth: 1,
  },
  currentPlanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  currentPlanTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  activeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  activeBadgeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  planInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  planInfoText: {
    fontSize: 16,
    marginLeft: 12,
  },
  benefitsContainer: {
    marginTop: 16,
    flex:1,
    marginBottom: 24,
  },
  benefitsTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  benefitText: {
    marginLeft: 12,
    fontSize: 15,
  },
  buttonOutline: {
    padding: 16,
    borderRadius: 12,
    bottom: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  buttonOutlineText: {
    fontWeight: '600',
    fontSize: 16,
  },
  renewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 14,
  },
  renewButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  planDaysWarning: {
    color: Colors.red_orange,
    fontWeight: '600',
  },
});