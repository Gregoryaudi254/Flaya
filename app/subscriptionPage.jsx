import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useColorScheme, ActivityIndicator, ScrollView, Alert, Image, Linking, Modal } from 'react-native';

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
import { FlutterwaveInit, PayWithFlutterwave } from 'flutterwave-react-native';

import * as Clipboard from 'expo-clipboard';
import { useAuth } from '@/constants/AuthContext';

import * as Localization from 'react-native-localize';
import BottomSheet from '@gorhom/bottom-sheet';
import FlutterwavePaymentBottomSheet from '@/components/FlutterwavePaymentBottomSheet';


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
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('mpesa'); // 'mpesa' or 'flutterwave'
  const [flutterwaveOptions, setFlutterwaveOptions] = useState(null);
  const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false);
  const [currentAction, setCurrentAction] = useState(null); // 'renew', 'upgrade', 'downgrade'

  const paymentSuccess = useRef(false);
  const toast = useToast();
  const router = useRouter();
  const dispatch = useDispatch();

  const snapPoints = useMemo(() => ['40%'], []);
  const bottomSheetRef = useRef(null);
  const flutterwaveBottomSheetRef = useRef(null);

  // Open the payment bottom sheet
  const openPaymentSheet = () => {
    console.log("Opening M-Pesa payment sheet");
    paymentSuccess.current = false;
    setPaymentError(null);
   bottomSheetRef.current?.snapToIndex(0);
  };

  // Open payment method selection modal
  const openPaymentMethodModal = (action = 'renew') => {
    console.log("Opening payment method modal for action:", action);
    setCurrentAction(action);
    setShowPaymentMethodModal(true);
  };

  // Handle payment method selection and proceed
  const handlePaymentMethodSelection = (method) => {
    console.log("Payment method selected:", method, "for action:", currentAction);
    setSelectedPaymentMethod(method);
    setShowPaymentMethodModal(false);
    
    if (method === 'mpesa') {
      // Small delay to ensure modal closes smoothly before opening bottom sheet
      setTimeout(() => {
        openPaymentSheet();
      }, 500);
    } else {
      // For Flutterwave, prepare options and open bottom sheet
      setTimeout(() => {
        prepareFlutterwaveForAction(currentAction);
      }, 300);
    }
  };

  // Prepare Flutterwave options based on action
  const prepareFlutterwaveForAction = (action) => {
    console.log("Preparing Flutterwave options for action:", action);
    setPaymentError(null); // Clear any previous errors
    setFlutterwaveOptions(null); // Reset options to show loading state
    
    let targetPlan = selectedPlan;
    
    if (action === 'upgrade') {
      targetPlan = 'yearly';
    } else if (action === 'downgrade') {
      targetPlan = 'monthly';
    } else if (action === 'renew') {
      targetPlan = currentPlan?.subscriptionType || selectedPlan;
    }

    console.log("Target plan for Flutterwave:", targetPlan);
    
    const options = prepareFlutterwaveOptionsForPlan(targetPlan, action);
    if (options) {
      console.log("Flutterwave options prepared successfully");
      setFlutterwaveOptions(options);
      // Open bottom sheet after options are set
      setTimeout(() => {
        console.log("Opening Flutterwave bottom sheet");
        console.log("flutterwaveBottomSheetRef.current:", flutterwaveBottomSheetRef.current);
        if (flutterwaveBottomSheetRef.current) {
          console.log("Attempting to snapToIndex(0)");
          flutterwaveBottomSheetRef.current?.snapToIndex(0);
        } else {
          console.error("flutterwaveBottomSheetRef.current is null!");
        }
      }, 100);
    } else {
      console.error("Failed to prepare Flutterwave options");
      setPaymentError("Failed to prepare payment options");
    }
  };

  // Prepare Flutterwave options for specific plan and action
  const prepareFlutterwaveOptionsForPlan = (planType, action) => {
    if (!userInfo || !userInfo.uid) {
      setPaymentError("User information not available");
      return null;
    }

    const selectedPlanData = plans[planType.toUpperCase()];
    if (!selectedPlanData) {
      setPaymentError("Selected plan not found");
      return null;
    }

    const amount = getAmount(planType);
    const currency = plans.currency || 'USD';

    return {
      tx_ref: `flaya_${userInfo.uid}_${Date.now()}`,
      authorization: 'FLWPUBK-7da1fdeafd8af122aefde63095feef60-X',
      customer: {
        email: user.email,
        phonenumber: userInfo.phoneNumber || '',
        name: userInfo.username || 'Flaya User',
      },
      amount: amount,
      currency: currency,
      meta: {
        consumer_id: userInfo.uid,
        plan: planType,
        action: action,
        consumer_mac: "92a3-912ba-1192a",
      },
    };
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

  const [paymentMethod, setPaymentMethod] = useState(null);

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

   
     const callbackPlans = httpsCallable(functions, 'getPaymentPlans');
     const responseplans = await callbackPlans({ userid: userinfo.uid });
    

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
      const response = await callbackFunction({ userid: userinfo.uid, page: 'subscription' });
      
      // Store subscription data from the backend
      if (response.data.subscriptionType === null) {
        setIsSubscribed(false);
      } else {

        setPaymentMethod(response.data.paymentMethod);

        
        setCurrentPlan(response.data);
        setIsSubscribed(true);

        console.log("current plan", JSON.stringify(response.data));
        
        // If the user was on monthly, pre-select monthly for simplicity
        if (response.data.subscriptionType === null) {
          setSelectedPlan(response.data.subscriptionType);
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
          callbackFunction({ userid: userinfo.uid, page: 'subscription' }).then(updatedResponse => {
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

  // Prepare Flutterwave options when payment method or plan changes
  useEffect(() => {
    if (selectedPaymentMethod === 'flutterwave' && userInfo && plans && selectedPlan) {
      const options = prepareFlutterwaveOptions();
      setFlutterwaveOptions(options);
    }
  }, [selectedPaymentMethod, selectedPlan, userInfo, plans]);

  // Handle payment based on selected method
  const handlePaymentMethod = async (phoneNumber = null) => {
    try {
      if (selectedPaymentMethod === 'mpesa') {
        return await handleMpesaPayment(phoneNumber);
      } else if (selectedPaymentMethod === 'flutterwave') {
        // Flutterwave will be handled by the component
        return true;
      }
    } catch (error) {
      console.error("Payment method error:", error);
      setPaymentError(error.message || "Payment failed. Please try again.");
      return false;
    }
  };

  // Handle M-Pesa payment for different actions
  const handleMpesaPayment = async (phoneNumber) => {
    setIsProcessingPayment(true);
    setPaymentError(null);
    
    try {
      const callbackFunction = httpsCallable(functions, 'mpesaPush');
      
      if (!userInfo || !userInfo.uid) {
        throw new Error("User information not available");
      }
      
      let planType = selectedPlan;
      let isUpgrade = false;
      
      if (currentAction === 'upgrade') {
        planType = 'yearly';
        isUpgrade = true;
      } else if (currentAction === 'downgrade') {
        planType = 'monthly';
        isUpgrade = true;
      } else if (currentAction === 'renew') {
        planType = currentPlan?.subscriptionType || selectedPlan;
        isUpgrade = false;
      }
      
      const info = {
        userid: userInfo.uid,
        phone: phoneNumber,
        plan: planType,
        isUpgrade: isUpgrade
      };

      const response = await callbackFunction(info);
      console.log("payment response", JSON.stringify(response));
      
      if (response.data && (response.data.data && response.data.data.ResponseCode === "0" || response.data.ResponseCode === "0")) {
        paymentSuccess.current = true;
        showToast("Payment request sent to your phone. Please check your M-Pesa.");
        return true;
      } else {
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

  const { user, logout } = useAuth();

  const getAmount = (plan) => {
    const selectedPlanData = plans[plan.toUpperCase()];
    if (!selectedPlanData) {
      setPaymentError("Selected plan not found");
      return null;
    }
    const priceString = selectedPlanData.price.replace(/[^\d]/g, '');
    const amount = parseInt(priceString);
    return amount;
  }

  // Prepare Flutterwave payment options
  const prepareFlutterwaveOptions = () => {
    if (!userInfo || !userInfo.uid) {
      setPaymentError("User information not available");
      return null;
    }

    const selectedPlanData = plans[selectedPlan.toUpperCase()];
    if (!selectedPlanData) {
      setPaymentError("Selected plan not found");
      return null;
    }

    // Extract price number from string (e.g., "Ksh 500" -> 500, "$ 4" -> 4)
    const priceString = selectedPlanData.price.replace(/[^\d]/g, '');
    const amount = parseInt(priceString);

    // Use currency from plans data, fallback to USD if not available
    const currency = plans.currency || 'USD';

    return {
      tx_ref: `flaya_${userInfo.uid}_${Date.now()}`,
      authorization: 'FLWPUBK-7da1fdeafd8af122aefde63095feef60-X', // Replace with your public key
      customer: {
        email: user.email,
        phonenumber: userInfo.phoneNumber || '',
        name: userInfo.username || 'Flaya User',
      },
      amount: amount,
      currency: currency,
      meta: {
        consumer_id: userInfo.uid,
        plan: selectedPlan,
        consumer_mac: "92a3-912ba-1192a",
      },
     
    };
  };

  // Handle Flutterwave payment
  const handleFlutterwavePayment = async () => {
    setIsProcessingPayment(true);
    setPaymentError(null);
    
    try {
      const options = prepareFlutterwaveOptions();
      if (options) {
        setFlutterwaveOptions(options);
      }
    } catch (error) {
      console.error("Error preparing Flutterwave payment:", error);
      setPaymentError(error.message || "Failed to prepare payment. Please try again.");
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Handle Flutterwave payment response
  const onFlutterwaveRedirect = async (data) => {
    setIsProcessingPayment(true);
    console.log("Flutterwave response:", data);

    try {
      if (data.status === 'successful') {
        // Payment successful, verify on backend
        const verifyFunction = httpsCallable(functions, 'verifyFlutterwavePayment');
        const verificationResponse = await verifyFunction({
          transaction_id: data.transaction_id,
          tx_ref: data.tx_ref,
          userid: userInfo.uid,
          plan: selectedPlan
        });

        if (verificationResponse.data.success) {
          paymentSuccess.current = true;
          // close flutterwave bottom sheet
          flutterwaveBottomSheetRef.current?.close();
          showToast("Payment successful! Your subscription is now active.");
          setPaymentError(null);
        } else {
          throw new Error("Payment verification failed");
        }
      } else if (data.status === 'cancelled') {
        showToast("Payment was cancelled");
        setPaymentError("Payment was cancelled by user");
      } else {
        throw new Error(data.message || "Payment failed");
      }
    } catch (error) {
      console.error("Flutterwave payment error:", error);
      setPaymentError(error.message || "Payment failed. Please try again.");
      showToast("Payment failed. Please try again.");
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
          onPress: () => {
            openPaymentMethodModal('upgrade');
          }
        }
      ]
    );
  };

  const handleDownGradeToMonthly = async () => {
    Alert.alert(
      'Downgrade to Monthly Plan',
      'Would you like to downgrade to the monthly plan? You will lose the benefits of the yearly plan and your remaining days from the yearly plan will be credited.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Downgrade', 
          onPress: () => {
            openPaymentMethodModal('downgrade');
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

  // Flutterwave Payment Bottom Sheet Component
 
  // Payment Method Selection Modal Component
  const PaymentMethodModal = () => (
    <Modal
      visible={showPaymentMethodModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowPaymentMethodModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Choose Payment Method
            </Text>
            <TouchableOpacity 
              onPress={() => setShowPaymentMethodModal(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.paymentOptionsContainer}>
            <TouchableOpacity
              style={[styles.paymentOption, { borderColor: colors.border }]}
              onPress={() => handlePaymentMethodSelection('mpesa')}
            >
              <View style={styles.paymentOptionContent}>
                <Image 
                  source={{ uri: 'https://upload.wikimedia.org/wikipedia/commons/1/15/M-PESA_LOGO-01.svg' }}
                  style={styles.paymentOptionIcon}
                  resizeMode="contain"
                />
                <View style={styles.paymentOptionText}>
                  <Text style={[styles.paymentOptionTitle, { color: colors.text }]}>
                    M-Pesa
                  </Text>
                  <Text style={[styles.paymentOptionSubtitle, { color: colors.subtext }]}>
                    Pay with your mobile money
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.subtext} />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.paymentOption, { borderColor: colors.border }]}
              onPress={() => handlePaymentMethodSelection('flutterwave')}
            >
              <View style={styles.paymentOptionContent}>
                <View style={[styles.flutterwaveModalIcon, { backgroundColor: '#f5a623' }]}>
                  <Text style={styles.flutterwaveModalIconText}>FW</Text>
                </View>
                <View style={styles.paymentOptionText}>
                  <Text style={[styles.paymentOptionTitle, { color: colors.text }]}>
                    Other Payment Methods
                  </Text>
                  <Text style={[styles.paymentOptionSubtitle, { color: colors.subtext }]}>
                    Card, Mobile Money, Bank Transfer
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.subtext} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

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
          <ScrollView 
            style={[styles.container, { backgroundColor: colors.background }]}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
          >
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={() => router.back()}>
                <Image 
                  style={{
                    width: 20, 
                    height: 20, 
                    tintColor: colorScheme === 'dark' ? Colors.light_main : Colors.dark_main
                  }} 
                  source={require('@/assets/icons/arrow.png')}
                />
              </TouchableOpacity>
              <Text style={[styles.headerTitle, { color: colors.text, fontSize: 18 , marginLeft: 10}]}>
                 Subscription
              </Text>
              <View style={{ width: 20 }} />
            </View>

            {/* Current Plan Card */}
            <View style={[styles.currentPlanCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {/* Plan Status Header */}
              <View style={styles.planStatusHeader}>
                <View style={styles.planIconContainer}>
                  <Ionicons 
                    name="diamond" 
                    size={24} 
                    color={currentPlan.status === "active" ? colors.success : Colors.red_orange} 
                  />
                </View>
                <View style={styles.planStatusInfo}>
                  <Text style={[styles.planStatusTitle, { color: colors.text }]}>
                    {currentPlan.plan}
                  </Text>
                  <View style={[styles.statusBadge, { 
                    backgroundColor: currentPlan.status === "active" ? colors.success + '20' : Colors.red_orange + '20' 
                  }]}>
                    <View style={[styles.statusDot, {
                      backgroundColor: currentPlan.status === "active" ? colors.success : Colors.red_orange
                    }]} />
                    <Text style={[styles.statusText, { 
                      color: currentPlan.status === "active" ? colors.success : Colors.red_orange 
                    }]}>
                      {currentPlan.status === "active" ? "Active" : "Expired"}
                    </Text>
                  </View>
                </View>
            </View>
            
              {/* Plan Details */}
              <View style={styles.planDetailsContainer}>
                <View style={styles.planDetailRow}>
                  <View style={styles.planDetailIcon}>
                    <Ionicons name="calendar-outline" size={20} color={colors.accent} />
                  </View>
                  <View style={styles.planDetailContent}>
                    <Text style={[styles.planDetailLabel, { color: colors.subtext }]}>
                      {message}
                    </Text>
                    <Text style={[styles.planDetailValue, { color: colors.text }]}>
                      { currentPlan.period === "grace_period" ? currentPlan.expiryDate : currentPlan.endDate}
                    </Text>
                  </View>
            </View>
            
                {currentPlan.period === "safe_period" && currentPlan.days > 0 && (
                  <View style={styles.planDetailRow}>
                    <View style={styles.planDetailIcon}>
                      <Ionicons 
                        name="time-outline" 
                        size={20} 
                        color={currentPlan.days <= 5 ? Colors.red_orange : colors.accent} 
                      />
                    </View>
                    <View style={styles.planDetailContent}>
                      <Text style={[styles.planDetailLabel, { color: colors.subtext }]}>
                        Time Remaining
                      </Text>
                      <Text style={[
                        styles.planDetailValue, 
                        { 
                          color: currentPlan.days <= 5 ? Colors.red_orange : colors.text,
                          fontWeight: currentPlan.days <= 5 ? '600' : 'normal'
                        }
                      ]}>
                        {currentPlan.days} days
                </Text>
                    </View>
                  </View>
                )}
            </View>
            
              {/* Benefits Section */}
              <View style={styles.benefitsSection}>
                <Text style={[styles.benefitsSectionTitle, { color: colors.text }]}>
                  Your Benefits
                </Text>
                <View style={styles.benefitsList}>
                  <View style={styles.benefitItem}>
                    <View style={[styles.benefitIcon, { backgroundColor: colors.success + '20' }]}>
                      <Ionicons name="location" size={16} color={colors.success} />
                    </View>
                    <Text style={[styles.benefitText, { color: colors.text }]}>
                      Store visible to people nearby
                    </Text>
                  </View>
                  
                  <View style={styles.benefitItem}>
                    <View style={[styles.benefitIcon, { backgroundColor: colors.accent + '20' }]}>
                      <Ionicons name="notifications" size={16} color={colors.accent} />
                    </View>
                    <Text style={[styles.benefitText, { color: colors.text }]}>
                      Receive and manage orders
                    </Text>
                </View>
                
                  <View style={styles.benefitItem}>
                    <View style={[styles.benefitIcon, { backgroundColor: Colors.blue + '20' }]}>
                      <Ionicons name="cube" size={16} color={Colors.blue} />
                    </View>
                    <Text style={[styles.benefitText, { color: colors.text }]}>
                      Post unlimited products
                    </Text>
                </View>
                
                  <View style={styles.benefitItem}>
                    <View style={[styles.benefitIcon, { backgroundColor: Colors.green + '20' }]}>
                      <Ionicons name="analytics" size={16} color={Colors.green} />
                    </View>
                    <Text style={[styles.benefitText, { color: colors.text }]}>
                      Business insights
                    </Text>
                  </View>
                </View>
            </View>
            
              {/* Action Buttons */}
              <View style={styles.actionButtonsContainer}>
                {showRenewButton && (
            <TouchableOpacity
                    style={[styles.primaryActionButton, { backgroundColor: colors.accent }]}
                    onPress={() => openPaymentMethodModal('renew')}
                    disabled={isProcessingPayment}
                  >
                    {isProcessingPayment ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="refresh" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                        <Text style={styles.primaryActionButtonText}>
                          {getRenewButtonText(currentPlan)}
                        </Text>
                      </>
                    )}
            </TouchableOpacity>
                )}
        
                {shouldShowChangePlan && (
        <TouchableOpacity
                    style={[styles.secondaryActionButton, { borderColor: colors.border }]}
                    onPress={handleUpgradeToYearly}
                    disabled={isProcessingPayment}
                  >
                    <Ionicons name="arrow-up-circle-outline" size={20} color={colors.accent} style={{ marginRight: 8 }} />
                    <Text style={[styles.secondaryActionButtonText, { color: colors.accent }]}>
                      Upgrade to Yearly Plan
                    </Text>
        </TouchableOpacity>
                )}

                {(showRenewButton && currentPlan.subscriptionType === "yearly") && (
                  <TouchableOpacity
                    style={[styles.secondaryActionButton, { borderColor: colors.border }]}
                    onPress={handleDownGradeToMonthly}
                    disabled={isProcessingPayment}
                  >
                    <Ionicons name="arrow-down-circle-outline" size={20} color={colors.subtext} style={{ marginRight: 8 }} />
                    <Text style={[styles.secondaryActionButtonText, { color: colors.text }]}>
                      Downgrade to Monthly Plan
                    </Text>
                  </TouchableOpacity>
                )}
      </View>
            </View>
          </ScrollView>

          {/* Payment Method Modal */}
          <PaymentMethodModal />

          {/* Flutterwave Payment Bottom Sheet */}
          <FlutterwavePaymentBottomSheet
            bottomSheetRef={flutterwaveBottomSheetRef}
            snapPoints={snapPoints}
            colors={colors}
            currentAction={currentAction}
            paymentError={paymentError}
            flutterwaveOptions={flutterwaveOptions}
            isProcessingPayment={isProcessingPayment}
            onFlutterwaveRedirect={onFlutterwaveRedirect}
          />

          {/* M-Pesa Bottom Sheet */}
          {(
            <PhoneInputBottomSheet 
              handleButtonPress={handlePaymentMethod} 
              bottomSheetRef={bottomSheetRef} 
              initialSnapIndex={-1} 
              snapPoints={snapPoints} 
            />
          )}
        </SafeAreaView>
      </GestureHandlerRootView>
    );
  }

  // Otherwise show the subscription plans
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView 
          style={[styles.container, { backgroundColor: colors.background }]}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()}>
              <Image 
                style={{
                  width: 20, 
                  height: 20, 
                  tintColor: colorScheme === 'dark' ? Colors.light_main : Colors.dark_main
                }} 
                source={require('@/assets/icons/arrow.png')}
              />
            </TouchableOpacity>
            {(plans && plans.title) && (
              <Text style={[styles.headerTitle, { color: colors.text , fontSize: 18, marginLeft: 10}]}>
                {plans.title}
              </Text>
            )}
            <View style={{ width: 20 }} />
          </View>

          {/* Subtitle */}
          {(plans && plans.message) && (
            <Text style={[styles.subtitle, { color: colors.subtext }]}>
              {plans.message}
            </Text>
          )}
            
          {/* Plan toggle buttons */}
          {plans && plans.MONTHLY && plans.YEARLY && (
            <View style={styles.planToggle}>
                <TouchableOpacity
                style={[
                    styles.planToggleButton,
                  selectedPlan === plans.MONTHLY.id && [styles.planToggleButtonActive, { backgroundColor: colors.activeCard }]
                ]}
                onPress={() => setSelectedPlan(plans.MONTHLY.id)}
              >
                <Text
                    style={[
                    styles.planToggleText,
                    { color: selectedPlan === plans.MONTHLY.id ? colors.accent : colors.subtext }
                  ]}
                >
                    Monthly
                </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                style={[
                    styles.planToggleButton,
                  selectedPlan === plans.YEARLY.id && [styles.planToggleButtonActive, { backgroundColor: colors.activeCard }]
                ]}
                onPress={() => setSelectedPlan(plans.YEARLY.id)}
              >
                <Text
                    style={[
                    styles.planToggleText,
                    { color: selectedPlan === plans.YEARLY.id ? colors.accent : colors.subtext }
                  ]}
                >
                    Yearly
                </Text>
                {plans.YEARLY.savings && (
                    <View style={[styles.savingsBadge, { backgroundColor: colors.accent + '20' }]}>
                    <Text style={[styles.savingsBadgeText, { color: colors.accent }]}>
                      Save {plans.YEARLY.savings}
                    </Text>
                    </View>
                )}
                </TouchableOpacity>
            </View>
          )}
          
          {/* Payment Method Selection */}
          {plans && plans.MONTHLY && plans.YEARLY && (
            <View style={[styles.paymentMethodContainer, { backgroundColor: colors.card }]}>
              <Text style={[styles.paymentMethodTitle, { color: colors.text }]}>
                Choose Payment Method
              </Text>
              
              <View style={styles.paymentMethodToggle}>
                <TouchableOpacity
                  style={[
                    styles.paymentMethodButton,
                    selectedPaymentMethod === 'mpesa' && [styles.paymentMethodButtonActive, { backgroundColor: colors.accent + '20' }]
                  ]}
                  onPress={() => setSelectedPaymentMethod('mpesa')}
                >
                  <View style={styles.paymentMethodContent}>
                    <Image 
                      source={require('@/assets/icons/mpesa_icon.png')}
                      style={styles.paymentMethodIcon}
                      resizeMode="contain"
                    />
                    <Text style={[
                      styles.paymentMethodText,
                      { color: selectedPaymentMethod === 'mpesa' ? colors.accent : colors.text }
                    ]}>
                      M-Pesa
                    </Text>
                  </View>
                  {selectedPaymentMethod === 'mpesa' && (
                    <Ionicons name="checkmark-circle" size={20} color={colors.accent} />
                  )}
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.paymentMethodButton,
                    selectedPaymentMethod === 'flutterwave' && [styles.paymentMethodButtonActive, { backgroundColor: colors.accent + '20' }]
                  ]}
                  onPress={() => setSelectedPaymentMethod('flutterwave')}
                >
                  <View style={styles.paymentMethodContent}>
                    <View style={[styles.flutterwaveIcon, { backgroundColor: '#f5a623' }]}>
                      <Text style={styles.flutterwaveIconText}>FW</Text>
                    </View>
                    <View>
                      <Text style={[
                        styles.paymentMethodText,
                        { color: selectedPaymentMethod === 'flutterwave' ? colors.accent : colors.text }
                      ]}>
                        Other Payment Methods
                      </Text>
                      <Text style={[styles.paymentMethodSubtext, { color: colors.subtext }]}>
                        Card, Mobile Money, Bank
                      </Text>
                    </View>
                  </View>
                  {selectedPaymentMethod === 'flutterwave' && (
                    <Ionicons name="checkmark-circle" size={20} color={colors.accent} />
                  )}
                </TouchableOpacity>
              </View>
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
              
              {/* Conditional rendering based on payment method */}
              {selectedPaymentMethod === 'mpesa' ? (
                <TouchableOpacity
                style={[styles.subscribeButton, { backgroundColor: colors.accent }]}
                  onPress={openPaymentSheet}
                  disabled={isProcessingPayment}
                >
                  {isProcessingPayment ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons 
                        name="phone-portrait-outline" 
                        size={22} 
                        color="#FFFFFF" 
                        style={{ marginRight: 8 }} 
                      />
                      <Text style={styles.subscribeButtonText}>
                        Pay with M-Pesa
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              ) : (
                flutterwaveOptions && (
                  <PayWithFlutterwave
                    onRedirect={onFlutterwaveRedirect}
                    options={flutterwaveOptions}
                    customButton={(props) => (
                      <TouchableOpacity
                        style={[styles.subscribeButton, { backgroundColor: colors.accent }]}
                        onPress={props.onPress}
                        disabled={props.disabled || isProcessingPayment}
                      >
                        {isProcessingPayment ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <>
                            <Ionicons 
                              name="card-outline" 
                              size={22} 
                              color="#FFFFFF" 
                              style={{ marginRight: 8 }} 
                             />
                            <Text style={styles.subscribeButtonText}>
                              Pay with Flutterwave
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}
                  />
                )
              )}
            </View>
          )}
            
            <Text style={[styles.termsText, { color: colors.subtext }]}>
                You can cancel your subscription at any time
            </Text>
        </ScrollView>

        {selectedPaymentMethod === 'mpesa' && (
          <PhoneInputBottomSheet 
            handleButtonPress={handlePaymentMethod} 
            bottomSheetRef={bottomSheetRef} 
            initialSnapIndex={-1} 
            snapPoints={snapPoints} 
          />
        )}
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
  paymentMethodContainer: {
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
  },
  paymentMethodTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  paymentMethodToggle: {
    flexDirection: 'column',
    gap: 12,
  },
  paymentMethodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  paymentMethodButtonActive: {
    borderWidth: 1,
  },
  paymentMethodContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentMethodIcon: {
    width: 24,
    height: 24,
    marginRight: 12,
  },
  paymentMethodText: {
    fontWeight: '600',
    fontSize: 16,
  },
  paymentMethodSubtext: {
    fontSize: 12,
    marginTop: 2,
  },
  flutterwaveIcon: {
    width: 24,
    height: 24,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  flutterwaveIconText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    padding: 24,
    borderRadius: 16,
    width: '80%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 8,
  },
  paymentOptionsContainer: {
    gap: 12,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: 12,
  },
  paymentOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentOptionIcon: {
    width: 24,
    height: 24,
    marginRight: 12,
  },
  paymentOptionText: {
    flex: 1,
  },
  paymentOptionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  paymentOptionSubtitle: {
    fontSize: 12,
  },
  flutterwaveModalIcon: {
    width: 24,
    height: 24,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  flutterwaveModalIconText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
  },
  planStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  planIconContainer: {
    marginRight: 12,
  },
  planStatusInfo: {
    flex: 1,
  },
  planStatusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
    borderRadius: 12,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 4,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  planDetailsContainer: {
    marginBottom: 24,
  },
  planDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  planDetailIcon: {
    marginRight: 12,
  },
  planDetailContent: {
    flex: 1,
  },
  planDetailLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  planDetailValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  benefitsSection: {
    marginBottom: 24,
  },
  benefitsSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  benefitsList: {
    gap: 8,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  benefitIcon: {
    width: 24,
    height: 24,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  actionButtonsContainer: {
    gap: 12,
    marginTop: 16,
  },
  primaryActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    width: '100%',
  },
  primaryActionButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  secondaryActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    width: '100%',
  },
  secondaryActionButtonText: {
    fontWeight: '600',
    fontSize: 16,
  },
  bottomSheetContent: {
    padding: 24,
  },
  bottomSheetTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  bottomSheetSubtitle: {
    fontSize: 14,
  },
});