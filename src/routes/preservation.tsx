import { createFileRoute } from '@tanstack/react-router'
import { PreservationPage } from '@/components/preservation/PreservationPage'

export const Route = createFileRoute('/preservation')({
	component: PreservationRoute,
})

function PreservationRoute() {
	return <PreservationPage />
}
