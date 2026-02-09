
export enum AdType {
  ZIP = 'ZIP',
  TAG = 'TAG',
  CSV = 'CSV'
}

export interface AdSize {
  label: string;
  width: number;
  height: number;
}

export interface PreviewData {
  type: AdType;
  content: string; // HTML content or script
  assets?: Record<string, string>; // Map of filename to blob URL
  fileName?: string;
}

export const AD_SIZES: AdSize[] = [
  { label: 'Mobile Interstitial', width: 320, height: 480 },
  { label: 'Full Page Vertical', width: 1080, height: 1920 },
];
