import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"

interface ExternalLinkWarningProps {
	url: string | null
	onClose: () => void
}

export function ExternalLinkWarning({ url, onClose }: ExternalLinkWarningProps) {
	const displayUrl = url
		? url.replace(/^https?:\/\//, "").replace(/\/$/, "")
		: ""

	return (
		<Dialog open={!!url} onOpenChange={(open) => !open && onClose()}>
			<DialogContent showCloseButton={false} className="max-w-sm">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Icon name="arrow-up-right-from-square" variant="regular" className="text-base text-muted-foreground" />
						You're leaving Desperse
					</DialogTitle>
					<DialogDescription>
						You're about to visit an external website. Be careful with links from
						other users — Desperse isn't responsible for content on other sites.
					</DialogDescription>
				</DialogHeader>
				<div className="rounded-md bg-muted px-3 py-2 text-sm break-all text-muted-foreground">
					{displayUrl}
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={onClose}>
						Cancel
					</Button>
					<Button
						onClick={() => {
							if (url) window.open(url, "_blank", "noopener,noreferrer")
							onClose()
						}}
					>
						Continue
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
