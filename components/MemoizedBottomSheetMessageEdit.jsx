import React, { memo } from 'react';
import { View, Text, TouchableOpacity, Switch } from 'react-native';
import BottomSheet from '@gorhom/bottom-sheet';

const MemoizedBottomSheetMessageEdit = memo(({
  bottomSheetRef,
  initialSnapIndex,
  snapPoints,
  colorScheme,
  Colors,
  showFlatList,
  showDistance,
  setShowDistance,
  handleBottomPress,
}) => {

  return (
    <BottomSheet
      enablePanDownToClose={true}
      ref={bottomSheetRef}
      index={initialSnapIndex}
      backgroundStyle={{ backgroundColor: colorScheme === 'dark' ? '#141414' : Colors.light_main }}
      handleIndicatorStyle={{ backgroundColor: colorScheme === 'dark' ? Colors.light_main : '#141414' }}
      snapPoints={snapPoints}
    >
      <View style={{ marginHorizontal: 10, alignItems: 'center', flex: 1 }}>

        <Text style={{ fontSize: 20, fontWeight: 'bold', color: colorScheme === 'dark' ? Colors.light_main : Colors.dark_main }}>
          {showFlatList ? 'Going offline?' : 'See active users?'}
        </Text>

        <View style={{ width: '100%', height: 0.7, backgroundColor: colorScheme === 'dark' ? Colors.light_main : Colors.dark_main, marginTop: 15 }} />

        <Text style={[{ fontSize: 15, color: 'gray', maxWidth: '70%', textAlign: 'center', marginTop: 15 }, showFlatList && { flex: 1 }]}>
          {showFlatList
            ? 'You will no longer see active users, and your profile will also be removed from the list of active users'
            : "You'll see active users in your area and also be visible to others. For privacy reasons, the displayed distance will never go below 100 meters."}
        </Text>

        {!showFlatList && (
          <View style={{ width: '90%', justifyContent: 'space-between', flexDirection: 'row', marginTop: 15, flex: 1, alignItems: 'center' }}>
            <Text style={{ fontSize: 15, color: colorScheme === 'dark' ? Colors.light_main : Colors.dark_main }}>
              Show your distance
            </Text>

            <Switch
              trackColor={{ false: 'gray', true: '#3897f0' }}
              thumbColor={'#f4f3f4'}
              value={showDistance}
              onValueChange={() => setShowDistance((prev) => !prev)}
            />
          </View>
        )}

        <TouchableOpacity
          onPress={handleBottomPress}
          style={{
            width: '100%',
            height: 40,
            marginBottom: 5,
            alignItems: 'center',
            borderRadius: 5,
            backgroundColor: Colors.blue,
          }}
        >
          <View style={{ flexDirection: 'row', height: '100%' }}>
            <Text style={{ color: 'white', alignSelf: 'center', fontSize: 15 }}>
              {showFlatList ? 'GO OFFLINE' : 'GO ONLINE'}
            </Text>
          </View>
        </TouchableOpacity>

      </View>
    </BottomSheet>
  );
});

export default MemoizedBottomSheetMessageEdit;
