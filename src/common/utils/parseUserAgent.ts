import { UAParser } from 'ua-parser-js';
import type { DeviceInfo } from '../../modules/device/device.types';

export const parseUserAgent = (userAgent?: string): DeviceInfo => {
  if (!userAgent) {
    return {
      deviceName: 'Unknown Device',
      deviceType: 'unknown',
      browser: 'Unknown',
      os: 'Unknown',
    };
  }

  const parser = new UAParser(userAgent);
  const browser = parser.getBrowser();
  const os = parser.getOS();
  const device = parser.getDevice();

  const browserName = browser.name
    ? `${browser.name}${browser.major ? ' ' + browser.major : ''}`
    : 'Unknown';
  const osName = os.name ? `${os.name}${os.version ? ' ' + os.version : ''}` : 'Unknown';

  const deviceType = device.type || 'desktop';
  const deviceName = `${browserName} on ${osName}`;

  return { deviceName, deviceType, browser: browserName, os: osName };
};
