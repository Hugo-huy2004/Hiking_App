/**
 *
 *   123-abc.apps.googleusercontent.com  ->  com.googleusercontent.apps.123-abc
 */

const BUNDLE_ID = 'com.example.legiahu.mhike'

const reversed = (clientId) =>
  clientId ? `com.googleusercontent.apps.${clientId.replace('.apps.googleusercontent.com', '')}` : null

const IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || ''
const ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || ''

module.exports = ({ config }) => {
  const iosScheme = reversed(IOS_CLIENT_ID)
  const androidScheme = reversed(ANDROID_CLIENT_ID)

  return {
    name: 'MHike App',
    scheme: BUNDLE_ID,
    ios: {
      ...config.ios,
      bundleIdentifier: BUNDLE_ID,
      infoPlist: {
        ...config.ios?.infoPlist,
        NSCameraUsageDescription: 'M-Hike cần quyền camera để bạn chụp ảnh ngay trên đường mòn.',
        NSPhotoLibraryUsageDescription: 'M-Hike cần quyền vào thư viện ảnh để bạn đính ảnh cho chuyến đi và ghi chú thực địa.',
        NSLocationWhenInUseUsageDescription: 'M-Hike dùng vị trí của bạn để tự điền địa điểm và ghim chuyến đi lên bản đồ.',
        CFBundleURLTypes: [
          { CFBundleURLSchemes: [BUNDLE_ID, iosScheme, androidScheme].filter(Boolean) },
        ],
      },
    },
    android: {
      ...config.android,
      package: BUNDLE_ID,
      intentFilters: [
        {
          action: 'VIEW',
          autoVerify: true,
          data: [
            ...(BUNDLE_ID ? [{ scheme: BUNDLE_ID }] : []),
            ...(iosScheme ? [{ scheme: iosScheme }] : []),
            ...(androidScheme ? [{ scheme: androidScheme }] : []),
          ],
          category: ['DEFAULT', 'BROWSABLE'],
        },
      ],
    },
    plugins: [
      '@react-native-google-signin/google-signin',
    ],
    extra: {
      ...config.extra,
      eas: { ...config.extra?.eas },
    },
  }
}
