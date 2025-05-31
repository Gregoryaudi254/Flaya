import { Image, Text, TouchableOpacity, View, StyleSheet } from "react-native";
import Dialog from '@/components/CustomDialog';
import React from "react";
import { Ionicons } from '@expo/vector-icons';
import { Colors } from "@/constants/Colors";

const MemoizedDialog = React.memo(({ dialog, setDialog, blockinguserinfo, handleBlockUserConfirmation, iscurrurentuser }) => (
    <Dialog onclose={() => setDialog(false)} isVisible={dialog}>
      <View style={styles.dialogContainer}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <View style={styles.iconContainer}>
            <Ionicons 
              name={iscurrurentuser ? "trash-outline" : "shield-outline"} 
              size={24} 
              color={iscurrurentuser ? "#FF6B6B" : "#FFA726"} 
            />
          </View>
          <Text style={styles.headerTitle}>
            {iscurrurentuser ? 'Delete Post' : 'Block User'}
          </Text>
        </View>

        {/* User Info Section (only for blocking) */}
        {!iscurrurentuser && (
          <View style={styles.userInfoContainer}>
            <Image
              source={{ uri: blockinguserinfo.postcreatorimage || 'image' }}
              style={styles.userImage}
            />
            <View style={styles.userTextContainer}>
              <Text style={styles.username}>
                {blockinguserinfo.postcreatorusername || 'user'}
              </Text>
              <Text style={styles.userSubtext}>
                This user will be blocked from your content
              </Text>
            </View>
          </View>
        )}

        {/* Warning Message */}
        <View style={styles.messageContainer}>
          <Text style={styles.warningText}>
            {iscurrurentuser 
              ? 'This action cannot be undone. Your post will be permanently deleted.'
              : 'This user will no longer be able to see your posts or interact with your content.'
            }
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            onPress={() => setDialog(false)} 
            style={[styles.button, styles.cancelButton]}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={handleBlockUserConfirmation} 
            style={[styles.button, styles.confirmButton, { 
              backgroundColor: iscurrurentuser ? "#FF6B6B" : "#FFA726" 
            }]}
          >
            <Ionicons 
              name={iscurrurentuser ? "trash" : "shield"} 
              size={16} 
              color="white" 
              style={{ marginRight: 6 }}
            />
            <Text style={styles.confirmButtonText}>
              {iscurrurentuser ? 'Delete' : 'Block'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Dialog>
));

const styles = StyleSheet.create({
  dialogContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 0,
    minWidth: 320,
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  userInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 15,
    paddingBottom: 15,
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  userImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  userTextContainer: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  userSubtext: {
    fontSize: 12,
    color: '#666',
  },
  messageContainer: {
    padding: 20,
    paddingTop: 15,
    paddingBottom: 20,
  },
  warningText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
    textAlign: 'left',
  },
  buttonContainer: {
    flexDirection: 'row',
    padding: 20,
    paddingTop: 0,
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  confirmButton: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
  },
  confirmButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: 'white',
  },
});

export default MemoizedDialog;