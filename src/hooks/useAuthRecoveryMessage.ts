import { useEffect, useState } from 'react'
import { readCreateIntent } from '@/lib/createIntent'

function getAuthRecoveryMessage(firstPost: boolean): string {
  return firstPost
    ? 'Sign-in didn’t finish. Try email, wallet, or social, and we’ll bring you back to your first post.'
    : 'Sign-in didn’t finish. Try email, wallet, or social, and we’ll bring you back to create.'
}

export function useAuthRecoveryMessage(authenticated: boolean): string | null {
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (authenticated) {
      setMessage(null)
      return
    }

    const createIntent = readCreateIntent()
    setMessage(createIntent ? getAuthRecoveryMessage(createIntent.firstPost) : null)
  }, [authenticated])

  return message
}
