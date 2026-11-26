import type { CapacitorConfig } from '@capacitor/cli'

// Settings for the native iPhone app (the ios/ folder). See IPHONE.md.
const config: CapacitorConfig = {
  appId: 'com.freespeedindia.arise',
  appName: 'Arise',
  webDir: 'dist',
  backgroundColor: '#F7F2E9',
  ios: { contentInset: 'never', backgroundColor: '#F7F2E9' },
  plugins: {
    LocalNotifications: { iconColor: '#CF6D1E' },
  },
}

export default config
