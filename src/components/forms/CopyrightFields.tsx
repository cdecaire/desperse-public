/**
 * CopyrightFields Component
 * Shared license/rights fields used by both the create post form and copyright settings page.
 */

import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { LICENSE_PRESETS } from '@/server/functions/creatorSettings'

export const LICENSE_LABELS: Record<string, string> = {
	'All Rights Reserved': 'All Rights Reserved',
	CC0: 'CC0 (Public Domain)',
	'CC-BY-4.0': 'CC BY 4.0 (Attribution)',
	'CC-BY-SA-4.0': 'CC BY-SA 4.0 (Attribution-ShareAlike)',
	'CC-BY-NC-4.0': 'CC BY-NC 4.0 (Attribution-NonCommercial)',
	CUSTOM: 'Custom License',
}

export const SUGGESTED_STATEMENTS: Partial<Record<string, string>> = {
	'All Rights Reserved':
		'All rights reserved. No reproduction, distribution, or derivative works permitted without written permission from the rights holder.',
	CC0: 'This work is dedicated to the public domain. You may copy, modify, distribute, and perform the work, even for commercial purposes, without asking permission.',
	'CC-BY-4.0':
		'You are free to share and adapt this work for any purpose, including commercially, as long as you give appropriate credit to the original creator.',
	'CC-BY-SA-4.0':
		'You are free to share and adapt this work for any purpose, including commercially, as long as you give appropriate credit and distribute any derivative works under the same license.',
	'CC-BY-NC-4.0':
		'You are free to share and adapt this work as long as you give appropriate credit. Commercial use is not permitted without written permission from the rights holder.',
}

interface CopyrightFieldsProps {
	license: string | null
	customLicense?: string
	holder: string | null
	statement: string | null
	onLicenseChange: (license: string | null) => void
	onCustomLicenseChange?: (value: string) => void
	onHolderChange: (holder: string | null) => void
	onStatementChange: (statement: string | null) => void
	disabled?: boolean
	idPrefix?: string
	showDescription?: boolean
}

export function CopyrightFields({
	license,
	customLicense = '',
	holder,
	statement,
	onLicenseChange,
	onCustomLicenseChange,
	onHolderChange,
	onStatementChange,
	disabled,
	idPrefix = 'copyright',
	showDescription,
}: CopyrightFieldsProps) {
	const isPreset = license && LICENSE_PRESETS.includes(license as any)
	const selectValue = isPreset ? license : license ? 'CUSTOM' : 'none'

	const handlePresetChange = (value: string) => {
		if (value === 'none') {
			onLicenseChange(null)
			onStatementChange(null)
		} else if (value === 'CUSTOM') {
			onLicenseChange(customLicense || null)
		} else {
			onLicenseChange(value)
			onStatementChange(SUGGESTED_STATEMENTS[value] || null)
		}
	}

	return (
		<div className="space-y-4">
			{/* License */}
			<div className="space-y-2">
				<Label htmlFor={`${idPrefix}-license`}>License</Label>
				<Select
					value={selectValue || 'none'}
					onValueChange={handlePresetChange}
					disabled={disabled}
				>
					<SelectTrigger id={`${idPrefix}-license`} className="w-full">
						<SelectValue placeholder="Select a license..." />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="none">None</SelectItem>
						{LICENSE_PRESETS.map((p) => (
							<SelectItem key={p} value={p}>
								{LICENSE_LABELS[p] || p}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				{showDescription && (
					<p className="text-xs text-muted-foreground">
						Included as a License attribute in NFT metadata for marketplace
						visibility.
					</p>
				)}
			</div>

			{/* Custom license input */}
			{selectValue === 'CUSTOM' && (
				<div className="space-y-2">
					<Label htmlFor={`${idPrefix}-custom-license`}>Custom License</Label>
					<Input
						id={`${idPrefix}-custom-license`}
						value={customLicense}
						onChange={(e) => onCustomLicenseChange?.(e.target.value)}
						placeholder="e.g., MIT License, Custom Terms v2"
						maxLength={100}
						disabled={disabled}
					/>
				</div>
			)}

			{/* Rights Holder */}
			<div className="space-y-2">
				<Label htmlFor={`${idPrefix}-holder`}>Rights Holder</Label>
				<Input
					id={`${idPrefix}-holder`}
					value={holder || ''}
					onChange={(e) => onHolderChange(e.target.value || null)}
					placeholder="Legal name for rights attribution"
					maxLength={200}
					disabled={disabled}
				/>
				{showDescription && (
					<p className="text-xs text-muted-foreground">
						Optional. Included in NFT metadata as rights attribution.
					</p>
				)}
			</div>

			{/* Rights Statement */}
			<div className="space-y-2">
				<Label htmlFor={`${idPrefix}-statement`}>Rights Statement</Label>
				<div className="relative">
					<Textarea
						id={`${idPrefix}-statement`}
						value={statement || ''}
						onChange={(e) => onStatementChange(e.target.value || null)}
						placeholder="Describe usage rights, restrictions, or permissions..."
						maxLength={1000}
						rows={3}
						className="resize-none pb-7"
						disabled={disabled}
					/>
					<div className="absolute bottom-2 right-3 text-xs text-muted-foreground pointer-events-none">
						{(statement || '').length} / 1000
					</div>
				</div>
				{selectValue &&
					selectValue !== 'none' &&
					selectValue !== 'CUSTOM' &&
					SUGGESTED_STATEMENTS[selectValue] &&
					!statement && (
						<button
							type="button"
							onClick={() => onStatementChange(SUGGESTED_STATEMENTS[selectValue]!)}
							className="text-xs text-primary hover:text-primary/80 transition-colors"
							disabled={disabled}
						>
							Use suggested statement for{' '}
							{LICENSE_LABELS[selectValue] || selectValue}
						</button>
					)}
			</div>
		</div>
	)
}
