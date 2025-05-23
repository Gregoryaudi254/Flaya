import React, { memo, useState, useEffect } from 'react';
import { View, TouchableOpacity, Image, Text, StyleSheet, Dimensions, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import BottomSheet from '@gorhom/bottom-sheet';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { useToast } from 'react-native-toast-notifications';

const inputPhoneBottomSheet = memo(({ bottomSheetRef, initialSnapIndex, snapPoints, handleButtonPress }) => {
    const toast = useToast();
    const colorscheme = useColorScheme();
    const isDark = colorscheme === 'dark';

    const [phoneNumber, setPhoneNumber] = useState('')
    const [isLoading, setLoading] = useState(false);
    const [paymentStatus, setPaymentStatus] = useState(null); // 'pending', 'success', 'failed'

    const showToast = (message) => {
        toast.show(message, {
            type: "normal",
            placement: "bottom",
            duration: 2000,
            offset: 30,
            animationType: "zoom-in",
        });
    };

    const validatePhone = (phone) => {
        // Kenya phone number format: 7XXXXXXXX or 1XXXXXXXX (9 digits after prefix)
        // This regex pattern validates Kenyan phone numbers
        const phoneRegex = /^(0|\+254|254)?[17][0-9]{8}$/;
        return phoneRegex.test(phone);
    };

    const formatPhoneNumber = (phone) => {
        // Remove any non-digit characters
        let cleaned = phone.replace(/\D/g, '');
        
        // For Kenya phone numbers - ensure they're in the format required by the API
        // If phone starts with 0, replace with 254
        if (cleaned.startsWith('0')) {
            cleaned = '254' + cleaned.substring(1);
        }
        // If number doesn't have country code, add it
        else if (!cleaned.startsWith('254')) {
            cleaned = '254' + cleaned;
        }
        
        return cleaned;
    };

    const handlePress = async () => {
        if (!phoneNumber) {
            showToast('Please enter your phone number');
            return;
        }
        
        if (!validatePhone(phoneNumber)) {
            showToast('Please enter a valid Kenyan phone number');
            return;
        }

        const formattedPhone = formatPhoneNumber(phoneNumber);
        
        setLoading(true);
        setPaymentStatus('pending');
        
        try {
            await handleButtonPress(formattedPhone);
            setPaymentStatus('success');
            showToast('Payment request sent successfully. Please check your phone.');
            
            // Close the bottom sheet after a short delay to show success state
            setTimeout(() => {
                bottomSheetRef.current?.close();
                setLoading(false);
                setPaymentStatus(null);
                setPhoneNumber('');
            }, 2000);
        } catch (error) {
            console.error('Payment error:', error);
            setPaymentStatus('failed');
            showToast('Failed to send payment request. Please try again.');
            setLoading(false);
        }
    };

    const renderButton = () => {
        if (isLoading) {
            return (
                <View style={styles.submitButton}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={[styles.submitButtonText, { marginLeft: 10 }]}>
                        {paymentStatus === 'pending' ? 'Sending Request...' : 'Processing...'}
                    </Text>
                </View>
            );
        }

        if (paymentStatus === 'success') {
            return (
                <View style={[styles.submitButton, { backgroundColor: Colors.green }]}>
                    <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                    <Text style={[styles.submitButtonText, { marginLeft: 10 }]}>Request Sent!</Text>
                </View>
            );
        }

        if (paymentStatus === 'failed') {
            return (
                <TouchableOpacity
                    style={[styles.submitButton, { backgroundColor: Colors.red_orange }]}
                    onPress={handlePress}
                >
                    <Ionicons name="refresh" size={20} color="#FFFFFF" />
                    <Text style={[styles.submitButtonText, { marginLeft: 10 }]}>Try Again</Text>
                </TouchableOpacity>
            );
        }

        return (
            <TouchableOpacity
                style={[styles.submitButton]}
                onPress={handlePress}
            >
                <Text style={styles.submitButtonText}>Pay with M-Pesa</Text>
            </TouchableOpacity>
        );
    };

    return (
        <BottomSheet
            enablePanDownToClose={true}
            ref={bottomSheetRef}
            index={initialSnapIndex}
            snapPoints={snapPoints}
            backgroundStyle={{ backgroundColor: isDark ? '#121212' : '#FFFFFF' }}
            handleIndicatorStyle={{ backgroundColor: isDark ? '#FFFFFF' : '#000000' }}
        >
            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <View style={styles.container}>
                    <View style={styles.headerContainer}>
                        <Image 
                            source={require('@/assets/icons/mpesa_icon.png')}
                            style={styles.mpesaIcon} 
                        />
                        <Text style={[styles.headerText, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                            M-Pesa Payment
                        </Text>
                    </View>

                    <Text style={[styles.descriptionText, { color: isDark ? '#DDDDDD' : '#555555' }]}>
                        Enter your phone number to receive an M-Pesa payment prompt
                    </Text>

                    <View style={styles.inputContainer}>
                        <View style={[styles.phoneInputContainer, { 
                            borderColor: isDark ? 'gray' : '#DDDDDD',
                            backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)'
                        }]}>
                            <Text style={[styles.countryCode, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                                +254
                            </Text>
                            <TextInput
                                style={[styles.phoneInput, { 
                                    color: isDark ? '#FFFFFF' : '#000000',
                                }]}
                                placeholder="7XXXXXXXX"
                                placeholderTextColor="#999999"
                                value={phoneNumber}
                                onChangeText={setPhoneNumber}
                                keyboardType="phone-pad"
                                maxLength={10}
                                editable={!isLoading}
                            />
                        </View>
                    </View>

                    {renderButton()}

                    <Text style={[styles.noticeText, { color: isDark ? '#AAAAAA' : '#777777' }]}>
                        You will receive a prompt on your phone to confirm payment
                    </Text>
                </View>
            </KeyboardAvoidingView>
        </BottomSheet>
    );
});

export default inputPhoneBottomSheet;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
    },
    headerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 15,
    },
    headerText: {
        fontSize: 20,
        fontWeight: 'bold',
        marginLeft: 10,
    },
    mpesaIcon: {
        width: 35,
        height: 35,
    },
    descriptionText: {
        textAlign: 'center',
        marginBottom: 20,
        fontSize: 14,
        lineHeight: 20,
    },
    inputContainer: {
        marginBottom: 20,
    },
    phoneInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 10,
        height: 50,
        paddingHorizontal: 15,
    },
    countryCode: {
        fontWeight: '500',
        marginRight: 5,
        fontSize: 16,
    },
    phoneInput: {
        flex: 1,
        height: '100%',
        fontSize: 16,
    },
    submitButton: {
        backgroundColor: Colors.blue,
        paddingVertical: 15,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 10,
        marginBottom: 15,
        flexDirection: 'row',
        justifyContent: 'center',
    },
    disabledButton: {
        opacity: 0.7,
    },
    submitButtonText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        fontSize: 16,
    },
    noticeText: {
        textAlign: 'center',
        fontSize: 12,
        marginTop: 10,
    }
});
