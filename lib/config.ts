export interface AppConfig {
  enableAds: boolean
  adsensePublisherId?: string
  enableAutoAds: boolean
  enableAnalytics: boolean
  enableSearch: boolean
  maxFileSize: number // MB
  maxFiles: number
  supportEmail: string
  apiUrl?: string
}

export const APP_CONFIG: AppConfig = {
  enableAds: !!process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID, // Only enable if publisher ID is set
  adsensePublisherId: "ca-pub-4755003409431265",
  enableAutoAds: true,
  enableAnalytics: true,
  enableSearch: true,
  maxFileSize: 100,
  maxFiles: 20,
  supportEmail: "support@pixoratools.com",
  apiUrl: process.env.NEXT_PUBLIC_API_URL,
}

export function getConfig(): AppConfig {
  return APP_CONFIG
}