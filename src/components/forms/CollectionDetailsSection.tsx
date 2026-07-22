/**
 * CollectionDetailsSection
 *
 * Expandable "Collection details" card on the create-collectible form. Shows the
 * creator's per-creator collectibles collection (the group their cNFTs are verified
 * into). Two states:
 *  - Draft (no collection yet): editable name + image. Saved as overrides on the
 *    user; consumed by ensureCreatorCollection when the collection is lazily created
 *    on first collect. No on-chain object exists yet, so this is just a stored draft.
 *  - Live (collection already exists): read-only. Editing an existing collection
 *    (which needs an on-chain updateCollection) is the documented follow-on.
 *
 * Name/image default to the creator's display name + avatar (Desperse logo if none).
 */

import { useRef, useState } from 'react'

import { Icon } from '@/components/ui/icon'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { cn } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useProfileUpdate, useAvatarUpload } from '@/hooks/useProfileQuery'
import { uploadAvatarFile } from '@/lib/avatar-upload'

/** Desperse logo fallback (matches the on-chain collection image when no avatar). */
const DESPERSE_LOGO = 'https://www.desperse.com/icon-512x512.png'

export function CollectionDetailsSection() {
	const { user } = useCurrentUser()
	const [open, setOpen] = useState(false)
	const fileInputRef = useRef<HTMLInputElement | null>(null)

	const profileUpdate = useProfileUpdate()
	const avatarUpload = useAvatarUpload(user?.id)

	const hasCollection = Boolean(user?.collectionMint)

	// Draft edit state (overrides). Empty → falls back to profile at save time.
	const [name, setName] = useState(user?.collectionName ?? '')
	const [imageUrl, setImageUrl] = useState(user?.collectionImageUrl ?? '')

	const profileName = user?.displayName?.trim() || (user?.usernameSlug ? `@${user.usernameSlug}` : 'Your collection')
	const previewName = name.trim() || profileName
	const previewImage = imageUrl.trim() || user?.avatarUrl?.trim() || DESPERSE_LOGO

	const dirty = name !== (user?.collectionName ?? '') || imageUrl !== (user?.collectionImageUrl ?? '')
	const isBusy = profileUpdate.isPending || avatarUpload.isPending

	const handleImageSelect = async (file?: File | null) => {
		if (!file || !user) return
		try {
			const url = await uploadAvatarFile(file, (input) => avatarUpload.mutateAsync(input))
			setImageUrl(url)
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to upload image')
		}
	}

	const handleSave = async () => {
		try {
			await profileUpdate.mutateAsync({
				collectionName: name.trim() || null,
				collectionImageUrl: imageUrl.trim() || null,
			})
			toast.success('Collection details saved')
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to save collection details')
		}
	}

	return (
		<div className="rounded-xl border border-border bg-card p-4 shadow-md">
			<button
				type="button"
				onClick={() => setOpen(!open)}
				className="flex w-full items-center justify-between text-sm text-foreground transition-colors hover:text-foreground/80"
				aria-expanded={open}
			>
				<span className="flex items-center gap-2">
					Collection details
					{!hasCollection ? <span className="text-xs text-muted-foreground">· preview</span> : null}
				</span>
				<Icon
					name="chevron-down"
					variant="regular"
					className={cn('transition-transform duration-200', open && 'rotate-180')}
				/>
			</button>

			{open ? (
				<div className="mt-4 space-y-4">
					{/* Live preview — reflects the current (possibly unsaved) name/image. */}
					<div className="flex items-center gap-3 rounded-lg border border-border bg-background p-3">
						<img src={previewImage} alt={previewName} className="h-10 w-10 shrink-0 rounded-full object-cover" />
						<div className="min-w-0 flex-1">
							<p className="truncate text-sm font-semibold">{previewName}</p>
							<p className="text-xs text-muted-foreground">
								{hasCollection ? 'Your collectibles collection' : 'Collectibles collection · not created yet'}
							</p>
						</div>
						{hasCollection ? (
							<a
								href={`https://explorer.solana.com/address/${user?.collectionMint}`}
								target="_blank"
								rel="noopener noreferrer"
								className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
							>
								View
								<Icon name="arrow-up-right-from-square" variant="regular" className="text-[10px]" />
							</a>
						) : null}
					</div>

					{hasCollection ? (
						<p className="text-xs leading-relaxed text-muted-foreground">
							Your collectibles are grouped under this collection in wallets and marketplaces. Editing its
							name and artwork is coming soon.
						</p>
					) : (
						<>
							<div className="flex items-center gap-3">
								<Button
									type="button"
									variant="outline"
									disabled={isBusy || !user}
									onClick={() => fileInputRef.current?.click()}
								>
									{avatarUpload.isPending ? <LoadingSpinner size="sm" className="mr-2" /> : null}
									{imageUrl ? 'Change image' : 'Upload image'}
								</Button>
								{imageUrl ? (
									<button
										type="button"
										className="text-xs text-muted-foreground hover:text-foreground"
										onClick={() => setImageUrl('')}
									>
										Use my avatar
									</button>
								) : null}
								<input
									ref={fileInputRef}
									type="file"
									accept="image/jpeg,image/png,image/webp"
									className="hidden"
									onChange={(e) => handleImageSelect(e.target.files?.[0])}
								/>
							</div>

							<div className="space-y-1.5">
								<Label htmlFor="collectionName" className="text-xs">
									Collection name
								</Label>
								<Input
									id="collectionName"
									value={name}
									maxLength={50}
									placeholder={profileName}
									onChange={(e) => setName(e.target.value)}
									disabled={isBusy}
								/>
							</div>

							<div className="flex items-center justify-between gap-3">
								<p className="text-xs leading-relaxed text-muted-foreground">
									Applies when your collection is created — the first time someone collects your work. Leave
									blank to use your profile.
								</p>
								<Button type="button" onClick={handleSave} disabled={isBusy || !dirty}>
									{profileUpdate.isPending ? <LoadingSpinner size="sm" className="mr-2" /> : null}
									Save
								</Button>
							</div>
						</>
					)}
				</div>
			) : null}
		</div>
	)
}

export default CollectionDetailsSection
