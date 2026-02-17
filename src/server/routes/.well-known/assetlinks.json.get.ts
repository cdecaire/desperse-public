/**
 * Android App Links - Digital Asset Links
 *
 * Serves /.well-known/assetlinks.json for automatic deep link verification.
 * This allows Android to verify that the app is authorized to handle
 * links from desperse.com without showing a disambiguation dialog.
 *
 * To get SHA256 fingerprints:
 *   Debug:   keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android
 *   Release: keytool -list -v -keystore <release.keystore> -alias <alias>
 *
 * Or from Play Console: Setup > App signing > SHA-256 certificate fingerprint
 */
import { defineEventHandler, setResponseHeader } from 'h3'

export default defineEventHandler((event) => {
  setResponseHeader(event, 'content-type', 'application/json')

  return [
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: 'app.desperse',
        sha256_cert_fingerprints: [
          // Debug signing key
          'D6:D5:02:33:6C:0E:1F:E5:9A:BF:A9:58:45:6B:1F:19:13:0C:B2:0D:8B:1E:9D:C0:13:75:6F:D4:7C:26:5D:4D',
          // Release signing key
          'AC:9D:44:FB:84:24:C2:B6:63:6C:2C:D9:20:BC:B6:40:47:69:51:62:32:26:DD:32:B3:40:61:6E:42:C7:4F:26',
        ],
      },
    },
  ]
})
