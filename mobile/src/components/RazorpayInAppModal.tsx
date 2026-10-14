import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Linking,
  Platform,
  StatusBar,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  registerRazorpayListener,
  handleRazorpayModalSuccess,
  handleRazorpayModalCancel,
  handleRazorpayModalError,
  RazorpayResult,
} from '../services/razorpay';

export default function RazorpayInAppModal() {
  const [visible, setVisible] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState('');
  const [orderId, setOrderId] = useState('');
  const [loading, setLoading] = useState(true);
  const webViewRef = useRef<WebView>(null);
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 38 : 16);

  useEffect(() => {
    registerRazorpayListener((state) => {
      if (state.visible) {
        setCheckoutUrl(state.checkoutUrl);
        setOrderId(state.orderId);
        setLoading(true);
        setVisible(true);
      } else {
        setVisible(false);
      }
    });

    return () => {
      registerRazorpayListener(null);
    };
  }, []);

  const handleClose = () => {
    setVisible(false);
    handleRazorpayModalCancel();
  };

  const handleShouldStartLoadWithRequest = (request: any) => {
    const url = request.url;
    if (!url) return true;

    // 1. Intercept payment success redirect strictly
    if (url.startsWith('shramsarathi://payment-success')) {
      try {
        const cleanUrl = url.replace('shramsarathi://', 'https://shramsarathi.app/');
        const urlObj = new URL(cleanUrl);
        const paymentId = urlObj.searchParams.get('payment_id');
        const returnedOrderId = urlObj.searchParams.get('order_id') || orderId;
        const signature = urlObj.searchParams.get('signature');

        if (!paymentId || !signature || signature.trim() === '') {
          setVisible(false);
          const err = new Error('Payment signature verification failed: missing payment signature');
          (err as any).code = 'PAYMENT_SIGNATURE_MISSING';
          handleRazorpayModalError(err);
          return false;
        }

        const result: RazorpayResult = {
          razorpay_payment_id: paymentId,
          razorpay_order_id: returnedOrderId,
          razorpay_signature: signature,
        };

        setVisible(false);
        handleRazorpayModalSuccess(result);
      } catch (err: any) {
        setVisible(false);
        handleRazorpayModalError(err);
      }
      return false;
    }

    // 2. Intercept payment cancel redirect
    if (url.startsWith('shramsarathi://payment-cancel')) {
      handleClose();
      return false;
    }

    // 3. Intercept UPI & Native Payment app intents (PhonePe, GPay, Paytm, BHIM, CRED)
    if (
      url.startsWith('upi://') ||
      url.startsWith('intent://') ||
      url.startsWith('phonepe://') ||
      url.startsWith('paytmmp://') ||
      url.startsWith('tez://') ||
      url.startsWith('gpay://')
    ) {
      let targetUrl = url;
      if (url.startsWith('intent://')) {
        const schemeMatch = url.match(/#Intent;scheme=([a-zA-Z0-9_-]+);/);
        const scheme = schemeMatch ? schemeMatch[1] : 'upi';
        const cleanPath = url.replace(/^intent:\/\//, '').split('#Intent;')[0];
        targetUrl = `${scheme}://${cleanPath}`;
      }

      Linking.openURL(targetUrl).catch((err) => {
        console.log('[RazorpayInAppModal] Failed to open target UPI app:', err);
        if (targetUrl !== url) {
          Linking.openURL(url).catch(() => {});
        }
      });
      return false;
    }

    // Allow standard HTTPS navigation (Razorpay gateway assets and scripts)
    return true;
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor="#E05525" />

        {/* Pure Native In-App Header — Matches Shram Sarathi Brand */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.headerBadge}>
              <Text style={styles.headerIcon}>🛡️</Text>
            </View>
            <View>
              <Text style={styles.headerTitle}>सुरक्षित भुगतान</Text>
              <Text style={styles.headerSubtitle}>256-Bit SSL Secured • Razorpay</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={handleClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.7}
          >
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Embedded In-App WebView with Bottom Inset Padding to prevent navigation bar collision */}
        <View style={[styles.webViewContainer, { paddingBottom: bottomInset }]}>
          <WebView
            ref={webViewRef}
            source={{ uri: checkoutUrl }}
            style={styles.webView}
            userAgent="Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36"
            javaScriptEnabled={true}
            domStorageEnabled={true}
            originWhitelist={['*']}
            mixedContentMode="always"
            allowsInlineMediaPlayback={true}
            setSupportMultipleWindows={false}
            onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
            onLoadEnd={() => setLoading(false)}
            renderLoading={() => (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color="#F26333" />
                <Text style={styles.loadingText}>सुरक्षित पेमेंट गेटवे लोड हो रहा है...</Text>
              </View>
            )}
            startInLoadingState={true}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F26333',
  },
  header: {
    height: 58,
    backgroundColor: '#F26333',
    borderBottomWidth: 1,
    borderBottomColor: '#E05525',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIcon: {
    fontSize: 20,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.2,
  },
  headerSubtitle: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.88)',
    marginTop: 1,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  closeText: {
    fontSize: 16,
    color: '#F26333',
    fontWeight: '800',
  },
  webViewContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  webView: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#555555',
    fontWeight: '600',
  },
});
