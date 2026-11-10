import { describe, expect, it } from 'vitest'
import { installContext } from '../../src/lib/platform.js'

const UA = {
  iphoneSafari: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1',
  iphoneChrome: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/138.0 Mobile/15E148 Safari/604.1',
  ipadOs: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15',
  macSafari: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15',
  androidChrome: 'Mozilla/5.0 (Linux; Android 15; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0 Mobile Safari/537.36',
  androidTablet: 'Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0 Safari/537.36',
  instagramIos: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 390.0.0',
  facebookAndroid: 'Mozilla/5.0 (Linux; Android 15; Pixel 8; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/138.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/480.0;]',
  androidWebView: 'Mozilla/5.0 (Linux; Android 15; Pixel 8; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/138.0 Mobile Safari/537.36',
  windowsChrome: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0 Safari/537.36',
}

describe('installContext', () => {
  it('sends desktop browsers straight to onboarding', () => {
    expect(installContext({ ua: UA.macSafari, touchPoints: 0, standalone: false })).toBe('desktop')
    expect(installContext({ ua: UA.windowsChrome, touchPoints: 0, standalone: false })).toBe('desktop')
  })
  it('skips the screen once the app runs installed', () => {
    expect(installContext({ ua: UA.iphoneSafari, touchPoints: 5, standalone: true })).toBe('installed')
  })
  it('gives iOS steps on iPhone, in Safari or another browser', () => {
    expect(installContext({ ua: UA.iphoneSafari, touchPoints: 5, standalone: false })).toBe('ios')
    expect(installContext({ ua: UA.iphoneChrome, touchPoints: 5, standalone: false })).toBe('ios')
  })
  it('treats an iPad (reported as a Mac with touch) as iOS', () => {
    expect(installContext({ ua: UA.ipadOs, touchPoints: 5, standalone: false })).toBe('ios')
  })
  it('detects Android phones and tablets', () => {
    expect(installContext({ ua: UA.androidChrome, touchPoints: 5, standalone: false })).toBe('android')
    expect(installContext({ ua: UA.androidTablet, touchPoints: 5, standalone: false })).toBe('android')
  })
  it('detects in-app browsers of messaging and social apps', () => {
    expect(installContext({ ua: UA.instagramIos, touchPoints: 5, standalone: false })).toBe('in-app')
    expect(installContext({ ua: UA.facebookAndroid, touchPoints: 5, standalone: false })).toBe('in-app')
    expect(installContext({ ua: UA.androidWebView, touchPoints: 5, standalone: false })).toBe('in-app')
  })
})
