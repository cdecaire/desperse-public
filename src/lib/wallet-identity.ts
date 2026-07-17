export function formatWalletIdentifier(
  address: string,
): { slugBase: string; display: string } {
  const trimmed = address.trim()

  if (!trimmed) {
    return { slugBase: 'user', display: 'user' }
  }

  const prefix = trimmed.slice(0, 4)
  const suffix = trimmed.slice(-4)

  return {
    slugBase: `${prefix}-${suffix}`,
    display: `${prefix}…${suffix}`,
  }
}

export function isWalletDefaultDisplayName(
  name: string | null | undefined,
  address: string | null | undefined,
): boolean {
  const trimmedName = name?.trim()
  const trimmedAddress = address?.trim()

  if (!trimmedName || !trimmedAddress) {
    return false
  }

  const { display } = formatWalletIdentifier(trimmedAddress)
  const legacyDisplay = `${trimmedAddress.slice(0, 4)}...${trimmedAddress.slice(-4)}`

  return trimmedName === display || trimmedName === legacyDisplay
}
