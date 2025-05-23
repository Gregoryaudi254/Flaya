import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Keyboard,
  StatusBar,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, useNavigation } from 'expo-router';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import ViewShot from 'react-native-view-shot';
import { manipulateAsync } from 'expo-image-manipulator';
import { useToast } from 'react-native-toast-notifications';
import { LinearGradient } from 'expo-linear-gradient';
import { useDispatch, useSelector } from 'react-redux';
import { setTextImageData, setImageUri, selectTextImageData } from '@/slices/textImageSlice';

const { width, height } = Dimensions.get('window');



const FONTS = [
  { name: 'Default', style: { fontFamily: undefined } },
  { name: 'Bold', style: { fontWeight: 'bold' } },
  { name: 'Italic', style: { fontStyle: 'italic' } },
  { name: 'Mono', style: { fontFamily: 'monospace' } },
];

const FONT_SIZES = [
  { name: 'S', size: 24 },
  { name: 'M', size: 32 },
  { name: 'L', size: 40 },
  { name: 'XL', size: 48 },
];

const COLOR_PRESETS = [
  // Vibrant colors
  '#3498db', // Blue
  '#e74c3c', // Red
  '#2ecc71', // Green
  '#f39c12', // Orange
  '#9b59b6', // Purple
  '#1abc9c', // Teal
  // Darker tones
  '#34495e', // Dark Blue
  '#e84393', // Pink
  // Pastel colors
  '#fd79a8', // Light Pink
  '#00cec9', // Light Teal
  '#6c5ce7', // Violet
  '#fab1a0', // Light Orange
  // Neutrals
  '#2d3436', // Almost Black
  '#636e72', // Grey
  '#55efc4', // Mint
];

// Gradients
const GRADIENT_PRESETS = [
  ['#1FA2FF', '#12D8FA', '#A6FFCB'], // Blue to Green
  ['#FF416C', '#FF4B2B'], // Red Orange
  ['#834d9b', '#d04ed6'], // Purple
  ['#4568DC', '#B06AB3'], // Purple Blue
  ['#0F2027', '#203A43', '#2C5364'], // Dark Blue
  ['#373B44', '#B06AB3'], // Blue Grey
  ['#3C3B3F', '#605C3C'], // Dark Neutral
  ['#8E2DE2', '#4A00E0'], // Purple
  ['#2980B9', '#6DD5FA', '#FFFFFF'], // Light Blue
];

const TextToImageScreen = () => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams();
  const toast = useToast();
  const { returnTo } = params;
  
  // Redux setup
  const dispatch = useDispatch();
  const textImageState = useSelector(selectTextImageData);

  // Initialize local state from Redux or defaults
  const [text, setText] = useState(textImageState.text || '');
  const [backgroundColor, setBackgroundColor] = useState(textImageState.backgroundColor || '#3498db');
  const [selectedFontIndex, setSelectedFontIndex] = useState(textImageState.fontIndex || 0);
  const [selectedFontSizeIndex, setSelectedFontSizeIndex] = useState(textImageState.fontSizeIndex || 1);
  const [textColor, setTextColor] = useState(textImageState.textColor || '#FFFFFF');
  const [textAlignment, setTextAlignment] = useState(textImageState.textAlignment || 'center');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [useGradient, setUseGradient] = useState(textImageState.useGradient || false);
  const [selectedGradientIndex, setSelectedGradientIndex] = useState(textImageState.gradientIndex || 0);
  const [tabIndex, setTabIndex] = useState(0); // 0 = Text, 1 = Background
  
  const viewShotRef = useRef(null);

  useEffect(() => {
    
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => setKeyboardVisible(false)
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  const showToast = (message) => {
    if (toast) {
      toast.show(message, {
        type: "normal",
        placement: "bottom",
        duration: 3000,
        offset: 30,
        animationType: "zoom-in",
      });
    } else {
      Alert.alert("Notice", message);
    }
  };

  const handleTextAlignmentChange = (alignment) => {
    setTextAlignment(alignment);
  };

  const toggleTextColor = () => {
    setTextColor(textColor === '#FFFFFF' ? '#000000' : '#FFFFFF');
  };

  const captureAndReturnImage = async () => {
    if (!text.trim()) {
      showToast("Please enter some text first");
      return;
    }

    try {
      setIsGenerating(true);
      
      // Try to capture the view as an image
      if (!viewShotRef.current || !viewShotRef.current.capture) {
        throw new Error("ViewShot module is not available");
      }
      
      const uri = await viewShotRef.current.capture();
      
      // Try to optimize the image
      if (!manipulateAsync) {
        throw new Error("Image manipulator is not available");
      }
      
      const processedImage = await manipulateAsync(
        uri,
        [{ resize: { width: 1080 } }],
        { compress: 0.8, format: 'jpeg' }
      );

      // Save current text image settings to Redux
      dispatch(setTextImageData({
        text,
        backgroundColor,
        fontIndex: selectedFontIndex,
        fontSizeIndex: selectedFontSizeIndex,
        textColor,
        textAlignment,
        useGradient,
        gradientIndex: selectedGradientIndex,
      }));
      
      // Save the generated image URI to Redux
      dispatch(setImageUri(processedImage.uri));

      router.back();

     
    } catch (error) {
      console.error('Error capturing image:', error);
      showToast("Failed to create image. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const renderPreview = () => {
    const isBackgroundDark = useGradient 
      ? false // Let's assume gradients work well with white text
      : getColorBrightness(backgroundColor) < 128;
      
    const defaultPreviewTextColor = isBackgroundDark ? '#FFFFFF' : '#000000';
    
    if (useGradient) {
      const gradientColors = GRADIENT_PRESETS[selectedGradientIndex];
      
      
      
      return (
        <LinearGradient
          colors={gradientColors}
          style={styles.previewContainer}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.textContainer}>
            <Text 
              style={[
                styles.previewText,
                FONTS[selectedFontIndex].style,
                { 
                  fontSize: FONT_SIZES[selectedFontSizeIndex].size,
                  color: textColor || defaultPreviewTextColor,
                  textAlign: textAlignment,
                }
              ]}
            >
              {text || 'Type something...'}
            </Text>
          </View>
        </LinearGradient>
      );
    }
    
    return (
      <View
        style={[
          styles.previewContainer,
          { backgroundColor: backgroundColor }
        ]}
      >
        <View style={styles.textContainer}>
          <Text 
            style={[
              styles.previewText,
              FONTS[selectedFontIndex].style,
              { 
                fontSize: FONT_SIZES[selectedFontSizeIndex].size,
                color: textColor || defaultPreviewTextColor,
                textAlign: textAlignment,
              }
            ]}
          >
            {text || 'Type something...'}
          </Text>
        </View>
      </View>
    );
  };

  // Helper function to determine if a color is dark or light
  const getColorBrightness = (hexColor) => {
    const r = parseInt(hexColor.substr(1, 2), 16);
    const g = parseInt(hexColor.substr(3, 2), 16);
    const b = parseInt(hexColor.substr(5, 2), 16);
    return (r * 299 + g * 587 + b * 114) / 1000;
  };

  // Custom back navigation
  const navigateBack = () => {
    // Save current state to Redux before navigating
    dispatch(setTextImageData({
      text,
      backgroundColor,
      fontIndex: selectedFontIndex,
      fontSizeIndex: selectedFontSizeIndex,
      textColor,
      textAlignment,
      useGradient,
      gradientIndex: selectedGradientIndex,
    }));
    
    router.back();
  };

  // Update the header back button to use our custom navigation
  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={navigateBack}
        >
          <Ionicons name="arrow-back" size={24} color={isDark ? '#FFFFFF' : '#000000'} />
        </TouchableOpacity>
      ),
    });
  }, [navigation, text, backgroundColor, selectedFontIndex, selectedFontSizeIndex, 
      textColor, textAlignment, useGradient, selectedGradientIndex]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#121212' : '#FFFFFF' }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={navigateBack}
        >
          <Ionicons name="arrow-back" size={24} color={isDark ? '#FFFFFF' : '#000000'} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
          Create Text Post
        </Text>
        <TouchableOpacity 
          style={[
            styles.doneButton,
            { opacity: text.trim() ? 1 : 0.5 }
          ]} 
          onPress={captureAndReturnImage}
          disabled={!text.trim() || isGenerating}
        >
          {isGenerating ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.doneButtonText}>Create</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.mainContainer}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Preview Area */}
        <ViewShot
          ref={viewShotRef}
          options={{ format: 'jpg', quality: 0.9 }}
          style={styles.viewShotContainer}
        >
          {renderPreview()}
        </ViewShot>

        {/* Text Input */}
        <View style={[
          styles.inputContainer,
          { backgroundColor: isDark ? '#1E1E1E' : '#F5F5F5' }
        ]}>
          <TextInput
            style={[
              styles.textInput,
              { color: isDark ? '#FFFFFF' : '#000000' }
            ]}
            placeholder="Type your text here..."
            placeholderTextColor={isDark ? '#888888' : '#AAAAAA'}
            value={text}
            onChangeText={setText}
            multiline
            autoFocus
            maxLength={100}
          />
          <Text style={[styles.characterCount, { color: isDark ? '#888888' : '#888888' }]}>
            {text.length}/100
          </Text>
        </View>

        {/* Tabs for Text and Background */}
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[
              styles.tab,
              tabIndex === 0 && [
                styles.activeTab, 
                { borderBottomColor: Colors.blue }
              ]
            ]}
            onPress={() => setTabIndex(0)}
          >
            <Ionicons 
              name="text" 
              size={22} 
              color={tabIndex === 0 ? Colors.blue : (isDark ? '#BBBBBB' : '#666666')} 
            />
            <Text style={[
              styles.tabText,
              { color: tabIndex === 0 ? Colors.blue : (isDark ? '#BBBBBB' : '#666666') }
            ]}>
              Text
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.tab,
              tabIndex === 1 && [
                styles.activeTab, 
                { borderBottomColor: Colors.blue }
              ]
            ]}
            onPress={() => setTabIndex(1)}
          >
            <Ionicons 
              name="color-palette" 
              size={22} 
              color={tabIndex === 1 ? Colors.blue : (isDark ? '#BBBBBB' : '#666666')} 
            />
            <Text style={[
              styles.tabText,
              { color: tabIndex === 1 ? Colors.blue : (isDark ? '#BBBBBB' : '#666666') }
            ]}>
              Background
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content based on selected tab */}
        {tabIndex === 0 ? (
          /* Text Styling Options */
          <View style={styles.tabContent}>
            {/* Font Style */}
            <View style={styles.optionSection}>
              <Text style={[styles.optionTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                Font Style
              </Text>
              <View style={styles.fontOptionsContainer}>
                {FONTS.map((font, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.fontOption,
                      selectedFontIndex === index && [
                        styles.selectedFontOption, 
                        { borderColor: Colors.blue }
                      ],
                      { backgroundColor: isDark ? '#2A2A2A' : '#F0F0F0' }
                    ]}
                    onPress={() => setSelectedFontIndex(index)}
                  >
                    <Text 
                      style={[
                        styles.fontOptionText,
                        font.style,
                        { color: isDark ? '#FFFFFF' : '#000000' }
                      ]}
                    >
                      {font.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Font Size */}
            <View style={styles.optionSection}>
              <Text style={[styles.optionTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                Font Size
              </Text>
              <View style={styles.fontSizeContainer}>
                {FONT_SIZES.map((size, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.fontSizeOption,
                      selectedFontSizeIndex === index && [
                        styles.selectedFontSizeOption,
                        { borderColor: Colors.blue }
                      ],
                      { backgroundColor: isDark ? '#2A2A2A' : '#F0F0F0' }
                    ]}
                    onPress={() => setSelectedFontSizeIndex(index)}
                  >
                    <Text style={[
                      styles.fontSizeText,
                      { color: isDark ? '#FFFFFF' : '#000000' }
                    ]}>
                      {size.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Text Alignment */}
            <View style={styles.optionSection}>
              <Text style={[styles.optionTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                Alignment
              </Text>
              <View style={styles.alignmentContainer}>
                <TouchableOpacity
                  style={[
                    styles.alignmentOption,
                    textAlignment === 'left' && [
                      styles.selectedAlignmentOption,
                      { borderColor: Colors.blue }
                    ],
                    { backgroundColor: isDark ? '#2A2A2A' : '#F0F0F0' }
                  ]}
                  onPress={() => handleTextAlignmentChange('left')}
                >
                  <Ionicons
                    name="list-outline"
                    size={24}
                    color={textAlignment === 'left' ? Colors.blue : (isDark ? '#FFFFFF' : '#000000')}
                  />
                  <Text style={[
                    styles.alignmentLabel, 
                    { color: textAlignment === 'left' ? Colors.blue : (isDark ? '#FFFFFF' : '#000000') }
                  ]}>
                    Left
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.alignmentOption,
                    textAlignment === 'center' && [
                      styles.selectedAlignmentOption,
                      { borderColor: Colors.blue }
                    ],
                    { backgroundColor: isDark ? '#2A2A2A' : '#F0F0F0' }
                  ]}
                  onPress={() => handleTextAlignmentChange('center')}
                >
                  <Ionicons
                    name="reorder-four-outline"
                    size={24}
                    color={textAlignment === 'center' ? Colors.blue : (isDark ? '#FFFFFF' : '#000000')}
                  />
                  <Text style={[
                    styles.alignmentLabel, 
                    { color: textAlignment === 'center' ? Colors.blue : (isDark ? '#FFFFFF' : '#000000') }
                  ]}>
                    Center
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.alignmentOption,
                    textAlignment === 'right' && [
                      styles.selectedAlignmentOption,
                      { borderColor: Colors.blue }
                    ],
                    { backgroundColor: isDark ? '#2A2A2A' : '#F0F0F0' }
                  ]}
                  onPress={() => handleTextAlignmentChange('right')}
                >
                  <Ionicons
                    name="list-outline"
                    style={{ transform: [{ scaleX: -1 }] }}
                    size={24}
                    color={textAlignment === 'right' ? Colors.blue : (isDark ? '#FFFFFF' : '#000000')}
                  />
                  <Text style={[
                    styles.alignmentLabel, 
                    { color: textAlignment === 'right' ? Colors.blue : (isDark ? '#FFFFFF' : '#000000') }
                  ]}>
                    Right
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Text Color */}
            <View style={styles.optionSection}>
              <Text style={[styles.optionTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                Text Color
              </Text>
              <View style={styles.textColorOptions}>
                <TouchableOpacity
                  style={[
                    styles.colorOption,
                    textColor === '#FFFFFF' && styles.selectedColorOption,
                    { backgroundColor: '#FFFFFF' }
                  ]}
                  onPress={() => setTextColor('#FFFFFF')}
                >
                  {textColor === '#FFFFFF' && (
                    <Ionicons name="checkmark" size={18} color="#000000" />
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.colorOption,
                    textColor === '#000000' && styles.selectedColorOption,
                    { backgroundColor: '#000000' }
                  ]}
                  onPress={() => setTextColor('#000000')}
                >
                  {textColor === '#000000' && (
                    <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : (
          /* Background Styling Options */
          <View style={styles.tabContent}>
            {/* Background Type Toggle */}
            <View style={styles.optionSection}>
              <Text style={[styles.optionTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                Background Type
              </Text>
              <View style={[styles.backgroundTypeToggle, { backgroundColor: isDark ? '#2A2A2A' : '#F0F0F0' }]}>
                <TouchableOpacity
                  style={[
                    styles.backgroundTypeOption,
                    !useGradient && [
                      styles.activeBackgroundType,
                      { backgroundColor: isDark ? '#444' : '#DDD' }
                    ]
                  ]}
                  onPress={() => setUseGradient(false)}
                >
                  <Text style={{ color: isDark ? '#FFFFFF' : '#000000' }}>Solid Color</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.backgroundTypeOption,
                    useGradient && [
                      styles.activeBackgroundType,
                      { backgroundColor: isDark ? '#444' : '#DDD' }
                    ]
                  ]}
                  onPress={() => {
                    setUseGradient(true);
                  }}
                >
                  <Text style={{ color: isDark ? '#FFFFFF' : '#000000' }}>Gradient</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Color Presets or Gradient Presets */}
            <View style={styles.optionSection}>
              <Text style={[styles.optionTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                {useGradient ? 'Gradient Presets' : 'Color Presets'}
              </Text>
              
              {!useGradient ? (
                // Solid Colors
                <View style={styles.colorPresetsGrid}>
                  {COLOR_PRESETS.map((color, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.colorPresetButton,
                        { backgroundColor: color },
                        backgroundColor === color && styles.selectedColorPreset
                      ]}
                      onPress={() => setBackgroundColor(color)}
                    />
                  ))}
                </View>
              ) : (
                // Gradients
                <View style={styles.gradientPresetsContainer}>
                  {GRADIENT_PRESETS.map((colors, index) => (
                    <TouchableOpacity
                      key={index}
                      onPress={() => setSelectedGradientIndex(index)}
                      style={[
                        styles.gradientPresetButton,
                        selectedGradientIndex === index && styles.selectedGradientPreset
                      ]}
                    >
                     <LinearGradient
                          colors={colors}
                          style={styles.gradientPreview}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                        />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#CCCCCC',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  doneButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: Colors.blue,
    minWidth: 70,
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  mainContainer: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 16,
  },
  viewShotContainer: {
    alignItems: 'center',
    
    marginBottom: 16,
  },
  previewContainer: {
    width: '100%',
    height: width * 0.85,
  
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  textContainer: {
    width: '85%',
    padding: 16,
  },
  previewText: {
    textAlign: 'center',
  },
  inputContainer: {
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 12,
    minHeight: 100,
    marginBottom: 16,
  },
  textInput: {
    fontSize: 16,
    minHeight: 60,
  },
  characterCount: {
    textAlign: 'right',
    fontSize: 12,
    marginTop: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 8,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomWidth: 2,
  },
  tabText: {
    marginLeft: 8,
    fontWeight: '500',
  },
  tabContent: {
    paddingHorizontal: 16,
  },
  optionSection: {
    marginBottom: 20,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  fontOptionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  fontOption: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    width: '23%',
    alignItems: 'center',
  },
  selectedFontOption: {
    borderWidth: 2,
  },
  fontOptionText: {
    fontSize: 15,
  },
  fontSizeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  fontSizeOption: {
    paddingVertical: 10,
    borderRadius: 12,
    width: '23%',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedFontSizeOption: {
    borderWidth: 2,
  },
  fontSizeText: {
    fontSize: 15,
  },
  alignmentContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  alignmentOption: {
    padding: 12,
    borderRadius: 12,
    width: '31%',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    flexDirection: 'column',
  },
  selectedAlignmentOption: {
    borderWidth: 2,
  },
  alignmentLabel: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  textColorOptions: {
    flexDirection: 'row',
    marginTop: 8,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedColorOption: {
    borderColor: Colors.blue,
  },
  backgroundTypeToggle: {
    flexDirection: 'row',
    borderRadius: 12,
    overflow: 'hidden',
    height: 40,
  },
  backgroundTypeOption: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeBackgroundType: {
    borderRadius: 8,
  },
  colorPresetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    marginTop: 8,
  },
  colorPresetButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedColorPreset: {
    borderColor: Colors.blue,
    transform: [{ scale: 1.1 }],
  },
  gradientPresetsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    marginTop: 8,
  },
  gradientPresetButton: {
    width: 70,
    height: 40,
    borderRadius: 8,
    marginRight: 12,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedGradientPreset: {
    borderColor: Colors.blue,
    transform: [{ scale: 1.05 }],
  },
  gradientPreview: {
    width: '100%',
    height: '100%',
  },
});

export default TextToImageScreen; 