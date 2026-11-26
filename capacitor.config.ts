import type { CapacitorConfig } from '@capacitor/cli'

// Settings for the native iPhone app (the ios/ folder). See IPHONE.md.
const config: CapacitorConfig = {
  appId: 'com.freespeedindia.arise',
  appName: 'Arise',
  webDir: 'dist',
  backgroundColor: '#E8E4DC',
  ios: { contentInset: 'never', backgroundColor: '#E8E4DC' },
  plugins: {
    LocalNotifications: { iconColor: '#CF6D1E' },
  },
}

export default config
