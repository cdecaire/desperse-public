/**
 * Fire-and-forget beacon that records one net-new download for an asset.
 * Failures are swallowed — a missed count must never block the actual download.
 */
export function recordDownload(assetId: string): void {
  if (!assetId) return
  void fetch('/api/v1/media/record-download', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ assetId }),
    keepalive: true,
  }).catch(() => {})
}
