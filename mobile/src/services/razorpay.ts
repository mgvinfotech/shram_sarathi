import { Alert, Linking, Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { BASE_URL } from './api';

// Ensures any pending in-app redirect session completes smoothly
WebBrowser.maybeCompleteAuthSession();

export interface RazorpayOptions {
  description: string;
  currency: string;
  key: string;
  amount: string;
  order_id: string;
  name: string;
  prefill?: { name?: string; contact?: string };
  theme?: { color?: string };
  method?: string;
}

export interface RazorpayResult {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export type RazorpayModalState = {
  visible: boolean;
  checkoutUrl: string;
  orderId: string;
};

type ModalListener = (state: RazorpayModalState) => void;
let activeListener: ModalListener | null = null;
let currentResolve: ((res: RazorpayResult) => void) | null = null;
let currentReject: ((err: any) => void) | null = null;

export function registerRazorpayListener(listener: ModalListener | null) {
  activeListener = listener;
}

export function handleRazorpayModalSuccess(result: RazorpayResult) {
  if (currentResolve) {
    currentResolve(result);
    currentResolve = null;
    currentReject = null;
  }
}

export function handleRazorpayModalCancel() {
  if (currentReject) {
    const err = new Error('Payment was cancelled');
    (err as any).code = 'PAYMENT_CANCELLED';
    currentReject(err);
    currentResolve = null;
    currentReject = null;
  }
}

export function handleRazorpayModalError(err: any) {
  if (currentReject) {
    currentReject(err);
    currentResolve = null;
    currentReject = null;
  }
}

/**
 * Opens Razorpay payment checkout directly inside the mobile app.
 * 
 * 1. Primary: Native In-App WebView Modal (Zero browser UI, no Chrome address bar, seamless UPI intent).
 * 2. Fallback: Expo WebBrowser Custom Tabs.
 */
export async function openRazorpay(options: RazorpayOptions): Promise<RazorpayResult> {
  const checkoutUrl = `${BASE_URL}/checkout-app?order_id=${encodeURIComponent(options.order_id)}` +
    `&amount=${encodeURIComponent(options.amount)}` +
    `&key=${encodeURIComponent(options.key)}` +
    `&name=${encodeURIComponent(options.name)}` +
    `&description=${encodeURIComponent(options.description)}` +
    `&contact=${encodeURIComponent(options.prefill?.contact || '')}` +
    `&customer_name=${encodeURIComponent(options.prefill?.name || '')}` +
    `&method=${encodeURIComponent(options.method || '')}` +
    `&inapp=1`;

  // 1. Primary In-App Modal (Native WebView — 0% Browser UI)
  if (activeListener) {
    return new Promise((resolve, reject) => {
      currentResolve = resolve;
      currentReject = reject;
      activeListener!({
        visible: true,
        checkoutUrl,
        orderId: options.order_id,
      });
    });
  }

  // 2. Fallback: WebBrowser Custom Tab
  const redirectScheme = 'shramsarathi://';

  try {
    const result = await WebBrowser.openAuthSessionAsync(checkoutUrl, redirectScheme, {
      toolbarColor: '#0b192c',
      secondaryToolbarColor: '#10223b',
      showTitle: true,
      enableBarCollapsing: true,
      showInRecents: false, // Does not show as separate app in Android recent tasks
      dismissButtonStyle: 'close',
    });

    if (result.type === 'success' && result.url) {
      const url = result.url;

      if (url.startsWith('shramsarathi://payment-cancel')) {
        const cancelErr = new Error('Payment was cancelled');
        (cancelErr as any).code = 'PAYMENT_CANCELLED';
        throw cancelErr;
      }

      if (url.startsWith('shramsarathi://payment-success')) {
        // Parse payment parameters strictly from redirect URL
        const cleanUrl = url.replace('shramsarathi://', 'https://shramsarathi.app/');
        const urlObj = new URL(cleanUrl);
        const paymentId = urlObj.searchParams.get('payment_id');
        const orderId = urlObj.searchParams.get('order_id') || options.order_id;
        const signature = urlObj.searchParams.get('signature');

        if (!paymentId || !signature || signature.trim() === '') {
          const failErr = new Error('Payment signature verification failed: missing payment signature');
          (failErr as any).code = 'PAYMENT_SIGNATURE_MISSING';
          throw failErr;
        }

        return {
          razorpay_payment_id: paymentId,
          razorpay_order_id: orderId,
          razorpay_signature: signature,
        };
      }

      throw new Error('Payment window returned an unexpected URL');
    }

    if (result.type === 'cancel' || result.type === 'dismiss') {
      const cancelErr = new Error('Payment was cancelled');
      (cancelErr as any).code = 'PAYMENT_CANCELLED';
      throw cancelErr;
    }

    // Fallback if unexpected result type
    throw new Error('Payment window was closed');
  } catch (err: any) {
    if (err?.code === 'PAYMENT_CANCELLED' || err?.code === 'PAYMENT_SIGNATURE_MISSING') {
      throw err;
    }

    // Fallback: If WebBrowser fails for any device reason, try system browser as last resort
    console.warn('[Razorpay] In-app browser session error, falling back to Linking:', err);
    return new Promise((resolve, reject) => {
      let subscription: any = null;

      const cleanup = () => {
        if (subscription && typeof subscription.remove === 'function') {
          subscription.remove();
        }
      };

      const handleUrl = (event: { url: string }) => {
        const url = event.url;
        if (!url) return;

        if (url.startsWith('shramsarathi://payment-success')) {
          cleanup();
          try {
            const cleanUrl = url.replace('shramsarathi://', 'https://shramsarathi.app/');
            const urlObj = new URL(cleanUrl);
            const paymentId = urlObj.searchParams.get('payment_id');
            const orderId = urlObj.searchParams.get('order_id') || options.order_id;
            const signature = urlObj.searchParams.get('signature');

            if (!paymentId || !signature || signature.trim() === '') {
              const failErr = new Error('Payment signature verification failed: missing payment signature');
              (failErr as any).code = 'PAYMENT_SIGNATURE_MISSING';
              reject(failErr);
              return;
            }

            resolve({
              razorpay_payment_id: paymentId,
              razorpay_order_id: orderId,
              razorpay_signature: signature,
            });
          } catch (err) {
            reject(err);
          }
        } else if (url.startsWith('shramsarathi://payment-cancel')) {
          cleanup();
          reject({ code: 'PAYMENT_CANCELLED', message: 'Payment was cancelled' });
        }
      };

      subscription = Linking.addEventListener('url', handleUrl);

      Linking.openURL(checkoutUrl).catch((linkErr) => {
        cleanup();
        Alert.alert('भुगतान त्रुटि', 'पेमेंट गेटवे नहीं खुल सका: ' + linkErr.message);
        reject(linkErr);
      });
    });
  }
}
