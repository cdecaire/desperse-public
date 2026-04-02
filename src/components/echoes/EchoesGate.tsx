/**
 * EchoesGate — Two-layer access gate for Echoes pages.
 * Layer 1: Privy login (handled by AuthGuard wrapper)
 * Layer 2: Secret access code, verified server-side, cached in localStorage.
 */

import { useState, useCallback, useEffect } from "react"
import { verifyEchoesAccess } from "@/server/functions/echoes-access"
import { AuthGuard } from "@/components/shared/AuthGuard"

const STORAGE_KEY = "echoes-access-token"
const STORAGE_VERSION = "v1" // bump to invalidate all cached codes

function getStoredCode(): string | null {
	try {
		const stored = localStorage.getItem(STORAGE_KEY)
		if (!stored) return null
		const parsed = JSON.parse(stored)
		if (parsed?.version !== STORAGE_VERSION) return null
		return parsed.code ?? null
	} catch {
		return null
	}
}

function storeCode(code: string) {
	localStorage.setItem(
		STORAGE_KEY,
		JSON.stringify({ code, version: STORAGE_VERSION }),
	)
}

function clearStoredCode() {
	localStorage.removeItem(STORAGE_KEY)
}

function AccessCodeForm({ onVerified }: { onVerified: () => void }) {
	const [code, setCode] = useState("")
	const [error, setError] = useState<string | null>(null)
	const [loading, setLoading] = useState(false)

	const handleSubmit = useCallback(
		async (e: React.FormEvent) => {
			e.preventDefault()
			if (!code.trim()) return

			setLoading(true)
			setError(null)

			try {
				const result = await verifyEchoesAccess({ data: { code: code.trim() } } as any)
				if (result.success) {
					storeCode(code.trim())
					onVerified()
				} else {
					setError(result.error ?? "Invalid code")
				}
			} catch {
				setError("Something went wrong. Try again.")
			} finally {
				setLoading(false)
			}
		},
		[code, onVerified],
	)

	return (
		<div className="min-h-screen flex items-center justify-center bg-zinc-950 px-4">
			<div className="w-full max-w-sm space-y-6 text-center">
				{/* Branding */}
				<div className="space-y-2">
					<h1 className="font-mono text-xs uppercase tracking-[0.3em] text-zinc-500">
						Echoes
					</h1>
					<p className="text-sm text-zinc-400">
						Enter the access code to continue.
					</p>
				</div>

				{/* Form */}
				<form onSubmit={handleSubmit} className="space-y-4">
					<input
						type="password"
						value={code}
						onChange={(e) => setCode(e.target.value)}
						placeholder="Access code"
						autoFocus
						disabled={loading}
						className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition-colors focus:border-zinc-600 disabled:opacity-50"
					/>

					{error && (
						<p className="text-sm text-red-400">{error}</p>
					)}

					<button
						type="submit"
						disabled={loading || !code.trim()}
						className="w-full rounded-md bg-zinc-100 px-4 py-3 text-sm font-medium text-zinc-950 transition-colors hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{loading ? "Verifying…" : "Enter"}
					</button>
				</form>
			</div>
		</div>
	)
}

function AccessCodeGate({ children }: { children: React.ReactNode }) {
	const [verified, setVerified] = useState<boolean | null>(null)
	const [checking, setChecking] = useState(true)

	// On mount, check if we have a cached code and re-verify it
	useEffect(() => {
		let cancelled = false
		const cachedCode = getStoredCode()

		if (!cachedCode) {
			setVerified(false)
			setChecking(false)
			return
		}

		verifyEchoesAccess({ data: { code: cachedCode } } as any)
			.then((result: { success: boolean; error?: string }) => {
				if (cancelled) return
				if (result.success) {
					setVerified(true)
				} else {
					clearStoredCode()
					setVerified(false)
				}
			})
			.catch(() => {
				if (cancelled) return
				clearStoredCode()
				setVerified(false)
			})
			.finally(() => {
				if (!cancelled) setChecking(false)
			})

		return () => {
			cancelled = true
		}
	}, [])

	if (checking) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-zinc-950">
				<div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-700 border-t-zinc-300" />
			</div>
		)
	}

	if (!verified) {
		return <AccessCodeForm onVerified={() => setVerified(true)} />
	}

	return <>{children}</>
}

/**
 * Full Echoes gate: login required + access code required.
 */
export function EchoesGate({ children }: { children: React.ReactNode }) {
	return (
		<AuthGuard>
			<AccessCodeGate>{children}</AccessCodeGate>
		</AuthGuard>
	)
}
