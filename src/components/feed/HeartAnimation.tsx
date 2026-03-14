import { useEffect, useState } from 'react'
import { Icon } from '@/components/ui/icon'

interface HeartAnimationProps {
	/** Trigger key — increment to replay the animation */
	trigger: number
}

/**
 * Instagram-style heart pop animation overlay.
 * Renders centered in its nearest positioned parent.
 */
export function HeartAnimation({ trigger }: HeartAnimationProps) {
	const [visible, setVisible] = useState(false)

	useEffect(() => {
		if (trigger === 0) return
		setVisible(true)
		const timer = setTimeout(() => setVisible(false), 800)
		return () => clearTimeout(timer)
	}, [trigger])

	if (!visible) return null

	return (
		<div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
			<div className="animate-heart-pop">
				<Icon name="heart" variant="solid" className="text-6xl text-white drop-shadow-lg" />
			</div>
		</div>
	)
}
