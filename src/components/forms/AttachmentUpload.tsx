import { useCallback, useMemo, useRef, useState, type ChangeEvent } from "react"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"
import { deleteMedia } from "@/server/functions/upload"
import { useAuth } from "@/hooks/useAuth"

const SUPPORTED_ATTACHMENT_TYPES = [
	"application/pdf",
	"application/zip",
	"application/epub+zip",
]

const ACCEPT_STRING = ["application/pdf", ".pdf", "application/zip", ".zip", "application/epub+zip", ".epub"].join(",")

const MAX_ATTACHMENT_MB = 25
const MAX_ATTACHMENT_BYTES = MAX_ATTACHMENT_MB * 1024 * 1024
const FILE_TOO_LARGE_MESSAGE = `File too large. Maximum is ${MAX_ATTACHMENT_MB} MB.`

export interface UploadedAttachment {
	url: string
	fileName: string
	mimeType: string
	fileSize: number
}

type UploadStatus = "idle" | "uploading" | "success" | "error"

interface AttachmentUploadProps {
	onUpload: (attachment: UploadedAttachment) => void
	onRemove?: () => void
	onStatusChange?: (status: UploadStatus) => void
	disabled?: boolean
	initialAttachment?: UploadedAttachment | null
}

type DeleteMediaInput = Parameters<typeof deleteMedia>[0]

function isDocumentByExtension(fileName: string): boolean {
	const ext = fileName.toLowerCase().split(".").pop()
	return ext === "pdf" || ext === "zip" || ext === "epub"
}

function normalizeMimeType(file: File): string {
	if (file.name.toLowerCase().endsWith(".epub")) return "application/epub+zip"
	if (file.type && SUPPORTED_ATTACHMENT_TYPES.includes(file.type)) return file.type
	if (file.name.toLowerCase().endsWith(".pdf")) return "application/pdf"
	if (file.name.toLowerCase().endsWith(".zip")) return "application/zip"
	return file.type || "application/octet-stream"
}

function formatFileSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function fileToBase64(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader()
		reader.onload = () => {
			const result = typeof reader.result === "string" ? reader.result : ""
			const base64 = result.includes(",") ? result.split(",")[1] : result
			resolve(base64)
		}
		reader.onerror = () => reject(reader.error ?? new Error("Failed to read file."))
		reader.readAsDataURL(file)
	})
}

export function AttachmentUpload({
	onUpload,
	onRemove,
	onStatusChange,
	disabled = false,
	initialAttachment = null,
}: AttachmentUploadProps) {
	const { getAccessToken } = useAuth()
	const fileInputRef = useRef<HTMLInputElement>(null)
	const abortControllerRef = useRef<AbortController | null>(null)
	const [attachment, setAttachment] = useState<UploadedAttachment | null>(initialAttachment)
	const [status, setStatus] = useState<UploadStatus>(initialAttachment ? "success" : "idle")
	const [progress, setProgress] = useState(initialAttachment ? 100 : 0)
	const [error, setError] = useState<string | null>(null)

	const setUploadStatus = useCallback(
		(nextStatus: UploadStatus) => {
			setStatus(nextStatus)
			onStatusChange?.(nextStatus)
		},
		[onStatusChange],
	)

	const validateFile = useCallback((file: File) => {
		const normalizedMimeType = normalizeMimeType(file)
		if (!SUPPORTED_ATTACHMENT_TYPES.includes(normalizedMimeType) && !isDocumentByExtension(file.name)) {
			return { valid: false, error: "Unsupported file type. Please upload a PDF, ZIP, or EPUB." }
		}

		if (file.size > MAX_ATTACHMENT_BYTES) {
			return { valid: false, error: FILE_TOO_LARGE_MESSAGE }
		}

		return { valid: true, mimeType: normalizedMimeType }
	}, [])

	const handleUpload = useCallback(
		async (file: File) => {
			const validation = validateFile(file)
			if (!validation.valid) {
				setAttachment(null)
				setProgress(0)
				setError(validation.error ?? "Upload failed.")
				setUploadStatus("error")
				return
			}

			const accessToken = await getAccessToken()
			if (!accessToken) {
				setAttachment(null)
				setProgress(0)
				setError("Please log in to upload files.")
				setUploadStatus("error")
				return
			}

			const controller = new AbortController()
			abortControllerRef.current = controller
			setAttachment({
				url: "",
				fileName: file.name,
				mimeType: validation.mimeType!,
				fileSize: file.size,
			})
			setError(null)
			setProgress(10)
			setUploadStatus("uploading")

			try {
				const fileData = await fileToBase64(file)
				setProgress(45)

				const response = await fetch("/api/v1/media/upload", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${accessToken}`,
					},
					body: JSON.stringify({
						fileData,
						fileName: file.name,
						mimeType: validation.mimeType,
						fileSize: file.size,
					}),
					signal: controller.signal,
				})

				const result = await response.json()
				if (!response.ok || !result?.success || !result?.data?.url) {
					throw new Error(result?.error?.message || "Upload failed. Please try again.")
				}

				const uploadedAttachment = {
					url: result.data.url as string,
					fileName: file.name,
					mimeType: validation.mimeType!,
					fileSize: file.size,
				}
				abortControllerRef.current = null
				setAttachment(uploadedAttachment)
				setProgress(100)
				setUploadStatus("success")
				onUpload(uploadedAttachment)
			} catch (uploadError) {
				if ((uploadError as Error).name === "AbortError") {
					return
				}

				abortControllerRef.current = null
				setAttachment({
					url: "",
					fileName: file.name,
					mimeType: validation.mimeType!,
					fileSize: file.size,
				})
				setProgress(0)
				setError(uploadError instanceof Error ? uploadError.message : "Upload failed. Please try again.")
				setUploadStatus("error")
			}
		},
		[getAccessToken, onUpload, setUploadStatus, validateFile],
	)

	const handleRemove = useCallback(async () => {
		abortControllerRef.current?.abort()
		abortControllerRef.current = null

		if (attachment?.url) {
			const accessToken = await getAccessToken()
			if (accessToken) {
				const deletePayload = { _authorization: accessToken, url: attachment.url } satisfies {
					_authorization: string
					url: string
				}
				const deleteInput = { data: deletePayload } as unknown as DeleteMediaInput
				deleteMedia(deleteInput).catch(console.error)
			}
		}

		setAttachment(null)
		setProgress(0)
		setError(null)
		setUploadStatus("idle")
		onRemove?.()
	}, [attachment, getAccessToken, onRemove, setUploadStatus])

	const handleFileChange = useCallback(
		(e: ChangeEvent<HTMLInputElement>) => {
			const file = e.target.files?.[0]
			if (file) {
				void handleUpload(file)
			}
			e.target.value = ""
		},
		[handleUpload],
	)

	const buttonLabel = useMemo(() => {
		if (status === "uploading") return "Uploading attachment..."
		if (attachment) return "Replace attachment"
		return "Add attachment"
	}, [attachment, status])

	return (
		<div className="space-y-3 rounded-xl border bg-card p-4 shadow-md">
			<div className="flex items-start justify-between gap-3">
				<div>
					<label className="text-sm font-medium">Attachment</label>
					<p className="mt-1 text-xs text-muted-foreground">
						Optional PDF, ZIP, or EPUB. Uploads immediately and publishes only after it finishes.
					</p>
				</div>
				{attachment && (
					<Button type="button" variant="ghost" onClick={() => void handleRemove()} disabled={disabled}>
						Remove
					</Button>
				)}
			</div>

			<input
				ref={fileInputRef}
				type="file"
				accept={ACCEPT_STRING}
				onChange={handleFileChange}
				className="hidden"
				disabled={disabled}
			/>

			{attachment ? (
				<div className="rounded-lg border bg-muted/30 p-4">
					<div className="flex items-center gap-4">
						<div className="flex h-12 w-12 items-center justify-center rounded-lg bg-background">
							<Icon name={attachment.fileName.toLowerCase().endsWith(".zip") ? "fa-file-zipper" : attachment.fileName.toLowerCase().endsWith(".epub") ? "fa-book" : "fa-file-pdf"} variant="regular" className="text-lg text-muted-foreground" />
						</div>
						<div className="min-w-0 flex-1">
							<p className="truncate text-sm font-medium">{attachment.fileName}</p>
							<p className="text-xs text-muted-foreground">{formatFileSize(attachment.fileSize)}</p>
						</div>
						{status === "uploading" && <LoadingSpinner size="sm" />}
					</div>
					{status === "uploading" && (
						<div className="mt-3 space-y-1">
							<div className="h-1.5 overflow-hidden rounded-full bg-muted">
								<div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
							</div>
							<p className="text-xs text-muted-foreground">Uploading... {progress}%</p>
						</div>
					)}
				</div>
			) : (
				<Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={disabled} className="w-full justify-start">
					<Icon name="paperclip" className="mr-2" />
					{buttonLabel}
				</Button>
			)}

			{status === "error" && error && (
				<div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
					<Icon name="circle-exclamation" variant="regular" />
					<span>{error}</span>
				</div>
			)}

			<p className="text-xs text-muted-foreground">{FILE_TOO_LARGE_MESSAGE}</p>
		</div>
	)
}