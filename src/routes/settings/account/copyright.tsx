/**
 * Copyright & Licensing Settings Page
 * Allows creators to set default rights metadata for minted NFTs
 */

import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useCreatorSettings, type CreatorSettingsData } from '@/hooks/useCreatorSettings'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { toast } from '@/hooks/use-toast'
import { type LicensePreset } from '@/server/functions/creatorSettings'
import type { CreatorSettingsInput } from '@/server/functions/creatorSettings'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { PageHeader } from '@/components/shared/PageHeader'
import { CopyrightFields, SUGGESTED_STATEMENTS } from '@/components/forms/CopyrightFields'

export const Route = createFileRoute('/settings/account/copyright')({
	component: CopyrightSettingsPage,
})

function CopyrightSettingsPage() {
	const { user, isLoading: isUserLoading } = useCurrentUser()
	const { settings, isLoading: isSettingsLoading, isUpdating, updateSettings } =
		useCreatorSettings()

	const isLoading = isUserLoading || isSettingsLoading

	return (
		<div className="pt-4 pb-12">
			<PageHeader
				title="Copyright & Licensing"
				description={<>Set default rights metadata for your minted NFTs. These are creator-declared and stamped into metadata at mint time — changes apply to future mints only.{' '}<a href="/terms" target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80 transition-colors">Terms of Service</a></>}
			/>

			{isLoading ? (
				<div className="flex justify-center py-4">
					<LoadingSpinner />
				</div>
			) : !user ? (
				<p className="text-body-sm text-muted-foreground py-2">
					Sign in to manage copyright settings
				</p>
			) : (
				<CopyrightForm
					settings={settings}
					isUpdating={isUpdating}
					updateSettings={updateSettings}
				/>
			)}
		</div>
	)
}

function CopyrightForm({
	settings,
	isUpdating,
	updateSettings,
}: {
	settings: CreatorSettingsData | null
	isUpdating: boolean
	updateSettings: typeof import('@/hooks/useCreatorSettings').useCreatorSettings extends () => { updateSettings: infer T } ? T : never
}) {
	// Initialize from props on mount — this component only mounts after loading
	const [preset, setPreset] = useState(settings?.copyrightLicensePreset || '')
	const [customLicense, setCustomLicense] = useState(settings?.copyrightLicenseCustom || '')
	const [holder, setHolder] = useState(settings?.copyrightHolder || '')
	const [rights, setRights] = useState(settings?.copyrightRights || '')
	const [initialValues, setInitialValues] = useState({
		preset: settings?.copyrightLicensePreset || '',
		customLicense: settings?.copyrightLicenseCustom || '',
		holder: settings?.copyrightHolder || '',
		rights: settings?.copyrightRights || '',
	})

	const isDirty =
		preset !== initialValues.preset ||
		customLicense !== initialValues.customLicense ||
		holder !== initialValues.holder ||
		rights !== initialValues.rights

	const handleLicenseChange = (value: string | null) => {
		const newPreset = value || ''
		setPreset(newPreset)
		if (newPreset !== 'CUSTOM') {
			setCustomLicense('')
		}
		if (newPreset && newPreset !== 'CUSTOM' && SUGGESTED_STATEMENTS[newPreset]) {
			setRights(SUGGESTED_STATEMENTS[newPreset]!)
		} else if (!newPreset) {
			setRights('')
		}
	}

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()
		const payload: CreatorSettingsInput = {
			copyrightLicensePreset: (preset || null) as LicensePreset | null,
			copyrightLicenseCustom: preset === 'CUSTOM' ? customLicense || null : null,
			copyrightHolder: holder || null,
			copyrightRights: rights || null,
		}
		updateSettings(payload, {
			onSuccess: () => {
				setInitialValues({ preset, customLicense, holder, rights })
				toast.success('Copyright settings saved')
			},
			onError: () => {
				toast.error('Failed to save settings')
			},
		})
	}

	return (
		<form className="space-y-5" onSubmit={handleSubmit}>
			<CopyrightFields
				license={preset || null}
				customLicense={customLicense}
				holder={holder || null}
				statement={rights || null}
				onLicenseChange={handleLicenseChange}
				onCustomLicenseChange={setCustomLicense}
				onHolderChange={(v) => setHolder(v || '')}
				onStatementChange={(v) => setRights(v || '')}
				idPrefix="settings"
				showDescription
			/>

			{isDirty && (
				<div className="flex justify-end">
					<Button type="submit" disabled={isUpdating}>
						{isUpdating ? <LoadingSpinner size="sm" className="mr-2" /> : null}
						Save changes
					</Button>
				</div>
			)}
		</form>
	)
}
