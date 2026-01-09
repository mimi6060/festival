/**
 * LanguageSelector - UI component for selecting app language
 *
 * Features:
 * - Displays all available languages with flags
 * - Shows current language indicator
 * - Handles RTL language switching with restart prompt
 * - Supports modal and inline display modes
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';

import { useLanguage } from '../providers/LanguageProvider';
import { useTranslation } from '../hooks/useTranslation';
import { Locale, LocaleConfig, isRTL } from '../i18n/config';

/**
 * Props for LanguageSelector component
 */
interface LanguageSelectorProps {
  /** Display mode: 'modal' shows a popup, 'inline' shows list directly */
  mode?: 'modal' | 'inline';
  /** Called when language is changed */
  onLanguageChange?: (language: Locale) => void;
  /** Show flag emojis (default: true) */
  showFlags?: boolean;
  /** Show native language names (default: true) */
  showNativeNames?: boolean;
  /** Custom styles */
  style?: object;
  /** Custom button styles (for modal mode) */
  buttonStyle?: object;
  /** Custom item styles */
  itemStyle?: object;
}

/**
 * Single language item component
 */
interface LanguageItemProps {
  locale: LocaleConfig;
  isSelected: boolean;
  onSelect: (locale: Locale) => void;
  showFlags: boolean;
  showNativeNames: boolean;
  isRTL: boolean;
  style?: object;
}

function LanguageItem({
  locale,
  isSelected,
  onSelect,
  showFlags,
  showNativeNames,
  isRTL: rtl,
  style,
}: LanguageItemProps): JSX.Element {
  const handlePress = useCallback(() => {
    onSelect(locale.locale);
  }, [locale.locale, onSelect]);

  return (
    <TouchableOpacity
      style={[styles.item, rtl && styles.itemRTL, isSelected && styles.itemSelected, style]}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      accessibilityLabel={`${locale.name} - ${locale.nativeName}`}
    >
      {showFlags && <Text style={[styles.flag, rtl && styles.flagRTL]}>{locale.flagEmoji}</Text>}
      <View style={[styles.textContainer, rtl && styles.textContainerRTL]}>
        {showNativeNames ? (
          <>
            <Text style={[styles.nativeName, isSelected && styles.textSelected]}>
              {locale.nativeName}
            </Text>
            <Text style={[styles.name, isSelected && styles.textSelectedSecondary]}>
              {locale.name}
            </Text>
          </>
        ) : (
          <Text style={[styles.nativeName, isSelected && styles.textSelected]}>{locale.name}</Text>
        )}
      </View>
      {isSelected && <Text style={styles.checkmark}>&#10003;</Text>}
    </TouchableOpacity>
  );
}

/**
 * LanguageSelector component
 *
 * @example
 * // Modal mode (default)
 * <LanguageSelector />
 *
 * @example
 * // Inline mode
 * <LanguageSelector mode="inline" />
 *
 * @example
 * // With callback
 * <LanguageSelector
 *   onLanguageChange={(lang) => console.log('Changed to:', lang)}
 * />
 */
export function LanguageSelector({
  mode = 'modal',
  onLanguageChange,
  showFlags = true,
  showNativeNames = true,
  style,
  buttonStyle,
  itemStyle,
}: LanguageSelectorProps): JSX.Element {
  const { t, language, isRTL: currentIsRTL } = useTranslation();
  const { availableLocales, changeLanguage, localeConfig } = useLanguage();

  const [modalVisible, setModalVisible] = useState(false);
  const [isChanging, setIsChanging] = useState(false);

  /**
   * Handle language selection
   */
  const handleSelectLanguage = useCallback(
    async (newLanguage: Locale) => {
      if (newLanguage === language) {
        setModalVisible(false);
        return;
      }

      // Check if RTL status will change
      const willBeRTL = isRTL(newLanguage);
      const rtlWillChange = currentIsRTL !== willBeRTL;

      // Show confirmation if RTL will change
      if (rtlWillChange) {
        Alert.alert(
          t('settings.language'),
          t('settings.languageRestartRequired') ||
            'Changing to this language requires restarting the app. Continue?',
          [
            {
              text: t('common.cancel'),
              style: 'cancel',
            },
            {
              text: t('common.confirm'),
              onPress: async () => {
                await performLanguageChange(newLanguage);
              },
            },
          ]
        );
        return;
      }

      await performLanguageChange(newLanguage);
    },
    [language, currentIsRTL, t]
  );

  /**
   * Perform the actual language change
   */
  const performLanguageChange = async (newLanguage: Locale) => {
    setIsChanging(true);

    try {
      await changeLanguage(newLanguage);
      onLanguageChange?.(newLanguage);
      setModalVisible(false);
    } catch (error) {
      console.error('Failed to change language:', error);
      Alert.alert(t('common.error'), t('errors.generic'));
    } finally {
      setIsChanging(false);
    }
  };

  /**
   * Render a single language item
   */
  const renderItem = useCallback(
    ({ item }: { item: LocaleConfig }) => (
      <LanguageItem
        locale={item}
        isSelected={item.locale === language}
        onSelect={handleSelectLanguage}
        showFlags={showFlags}
        showNativeNames={showNativeNames}
        isRTL={currentIsRTL}
        style={itemStyle}
      />
    ),
    [language, handleSelectLanguage, showFlags, showNativeNames, currentIsRTL, itemStyle]
  );

  /**
   * Key extractor for FlatList
   */
  const keyExtractor = useCallback((item: LocaleConfig) => item.locale, []);

  // Inline mode: render list directly
  if (mode === 'inline') {
    return (
      <View style={[styles.container, style]}>
        <FlatList
          data={availableLocales}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          scrollEnabled={false}
        />
        {isChanging && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#007AFF" />
          </View>
        )}
      </View>
    );
  }

  // Modal mode: render button and modal
  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        style={[styles.button, currentIsRTL && styles.buttonRTL, buttonStyle]}
        onPress={() => setModalVisible(true)}
        accessibilityRole="button"
        accessibilityLabel={t('settings.selectLanguage')}
      >
        {showFlags && <Text style={styles.buttonFlag}>{localeConfig.flagEmoji}</Text>}
        <Text style={styles.buttonText}>{localeConfig.nativeName}</Text>
        <Text style={styles.chevron}>{currentIsRTL ? '<' : '>'}</Text>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, currentIsRTL && styles.modalContentRTL]}>
            <View style={[styles.modalHeader, currentIsRTL && styles.modalHeaderRTL]}>
              <Text style={styles.modalTitle}>{t('settings.selectLanguage')}</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
                accessibilityRole="button"
                accessibilityLabel={t('common.close')}
              >
                <Text style={styles.closeButtonText}>&#10005;</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={availableLocales}
              renderItem={renderItem}
              keyExtractor={keyExtractor}
              style={styles.list}
            />

            {isChanging && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color="#007AFF" />
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

/**
 * Styles
 */
const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },

  // Button styles (modal mode)
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  buttonRTL: {
    flexDirection: 'row-reverse',
  },
  buttonFlag: {
    fontSize: 20,
    marginRight: 8,
  },
  buttonText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  chevron: {
    fontSize: 16,
    color: '#999',
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '70%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  modalContentRTL: {
    // RTL specific styles if needed
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalHeaderRTL: {
    flexDirection: 'row-reverse',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 20,
    color: '#999',
  },
  list: {
    paddingHorizontal: 16,
  },

  // Item styles
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginVertical: 4,
  },
  itemRTL: {
    flexDirection: 'row-reverse',
  },
  itemSelected: {
    backgroundColor: '#E3F2FD',
  },
  flag: {
    fontSize: 24,
    marginRight: 12,
  },
  flagRTL: {
    marginRight: 0,
    marginLeft: 12,
  },
  textContainer: {
    flex: 1,
  },
  textContainerRTL: {
    alignItems: 'flex-end',
  },
  nativeName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  name: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  textSelected: {
    color: '#1976D2',
  },
  textSelectedSecondary: {
    color: '#42A5F5',
  },
  checkmark: {
    fontSize: 18,
    color: '#1976D2',
    marginLeft: 8,
  },

  // Loading overlay
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
  },
});

export default LanguageSelector;
