export function isMobileDevice(userAgent: string): boolean {
  const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
  return mobileRegex.test(userAgent);
}

export function isTabletDevice(userAgent: string): boolean {
  const tabletRegex = /iPad|Android(?!.*Mobile)/i;
  return tabletRegex.test(userAgent);
}

export function getDeviceType(userAgent: string): 'mobile' | 'tablet' | 'desktop' {
  if (isMobileDevice(userAgent) && !isTabletDevice(userAgent)) {
    return 'mobile';
  }
  if (isTabletDevice(userAgent)) {
    return 'tablet';
  }
  return 'desktop';
}

export type DeviceType = ReturnType<typeof getDeviceType>;
