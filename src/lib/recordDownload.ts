/**
 * Records a unique-per-user download for an asset (counting only — the caller has
 * already served the file; this never blocks or gates re-downloads).
 *
 * Returns whether the server counted this as a new unique download, so the UI can
 * optimistically bump the tally exactly once per user. Requires an auth token;
 * without one the download still works, it just isn't counted. Failures are
 * swallowed and resolve to `false`.
 */
export async function recordDownload(
  assetId: string,
  token: string | null | undefined,
): Promise<boolean> {
  if (!assetId || !token) return false
  try {
    const res = await fetch('/api/v1/media/record-download', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ assetId }),
      keepalive: true,
    })
    if (!res.ok) return false
    const json = await res.json()
    return json?.data?.recorded === true
  } catch {
    return false
  }
}
