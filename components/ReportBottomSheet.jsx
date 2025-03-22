import React, { memo, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';

const ReportBottomSheet = memo(({ 
  bottomSheetRef, 
  initialSnapIndex, 
  snapPoints, 
  reports, 
  isReportLoading, 
  onReportPressed ,
  handleSheetChanges
}) => {

  // Memoize the reports list
  const memoizedReports = useMemo(() => reports, [reports]);

  // Memoize the onReportPressed function
  const handleReportPress = useCallback((str) => {
    onReportPressed(str);
  }, [onReportPressed]);

  const onChangeBottomsheet = useCallback((index) => {
    console.log("bottom changed")
    handleSheetChanges(index);
  },[handleSheetChanges])

  return (
    <BottomSheet
      enablePanDownToClose={true}
      ref={bottomSheetRef}
      index={initialSnapIndex}
      onChange={onChangeBottomsheet}
      backgroundStyle={{ backgroundColor: '#141414' }}
      handleIndicatorStyle={{ backgroundColor: '#fff' }}
      snapPoints={snapPoints}
    >
      <BottomSheetView style={{ flexDirection: 'column' }}>
        <Text style={{ fontSize: 15, fontWeight: 'bold', alignSelf: 'center', color: 'white' }}>
          Why are you reporting?
        </Text>

        {isReportLoading ? (
          <ActivityIndicator style={{ alignSelf: 'center', marginTop: 20 }} size="small" color="white" />
        ) : (
          memoizedReports.map((str, index) => (
            <TouchableOpacity key={index} onPress={() => handleReportPress(str)}>
              <Text style={{ fontSize: 14, color: 'white', marginTop: 15, marginStart: 10 }}>
                {str}
              </Text>
            </TouchableOpacity>
          ))
        )}
      </BottomSheetView>
    </BottomSheet>
  );
});

export default ReportBottomSheet;
