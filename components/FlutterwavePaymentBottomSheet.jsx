import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import BottomSheet from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { FlutterwaveInit, PayWithFlutterwave } from 'flutterwave-react-native';
import { Colors } from '@/constants/Colors';



const FlutterwavePaymentBottomSheet = ({
  bottomSheetRef,
  snapPoints,
  colors,
  currentAction,
  paymentError,
  flutterwaveOptions,
  isProcessingPayment,
  onFlutterwaveRedirect,
}) => (
  <BottomSheet
    ref={bottomSheetRef}
    index={-1}
    snapPoints={snapPoints}
    onChange={() => {}}
    enablePanDownToClose={true}
    backgroundStyle={{ backgroundColor: colors.background }}
    handleIndicatorStyle={{ backgroundColor: colors.subtext }}
  >
    <View style={[styles.bottomSheetContent, { backgroundColor: colors.background }]}>
      <Text style={[styles.bottomSheetTitle, { color: colors.text }]}>
        {currentAction === 'upgrade' ? 'Upgrade to Yearly Plan' :
         currentAction === 'downgrade' ? 'Downgrade to Monthly Plan' :
         'Renew Subscription'}
      </Text>
      
      <Text style={[styles.bottomSheetSubtitle, { color: colors.subtext }]}>
        {currentAction === 'upgrade' ? 'Pay for yearly plan upgrade' :
         currentAction === 'downgrade' ? 'Pay for monthly plan downgrade' :
         'Renew your current subscription'}
      </Text>

      {paymentError && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={20} color={Colors.red_orange} style={styles.errorIcon} />
          <Text style={[styles.errorText, { color: Colors.red_orange }]}>{paymentError}</Text>
        </View>
      )}

      {!flutterwaveOptions ? (
        <View style={[styles.subscribeButton, { backgroundColor: colors.accent, opacity: 0.7 }]}>
          <ActivityIndicator size="small" color="#FFFFFF" />
          <Text style={[styles.subscribeButtonText, { marginLeft: 8 }]}>
            Preparing Payment...
          </Text>
        </View>
      ) : (
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
                    Pay with Other Methods
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  </BottomSheet>
);

export default FlutterwavePaymentBottomSheet;

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
        marginBottom: 16,
      },
});


