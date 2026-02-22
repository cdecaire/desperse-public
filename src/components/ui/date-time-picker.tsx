import * as React from "react"
import { format, setHours, setMinutes, isValid, startOfMonth } from "date-fns"

import { cn } from "@/lib/utils"
import { Icon } from "@/components/ui/icon"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"

interface DateTimePickerProps {
	/** Value in datetime-local format: "YYYY-MM-DDTHH:mm" */
	value: string
	/** Called with datetime-local formatted string */
	onChange: (value: string) => void
	/** Minimum selectable date (ISO string or Date) */
	min?: string | Date
	disabled?: boolean
	placeholder?: string
	className?: string
}

/** Format a Date to the datetime-local input format "YYYY-MM-DDTHH:mm" */
function toDateTimeLocal(date: Date): string {
	const pad = (n: number) => String(n).padStart(2, "0")
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** Parse a datetime-local string into a Date */
function fromDateTimeLocal(value: string): Date | null {
	if (!value) return null
	const date = new Date(value)
	return isValid(date) ? date : null
}

function DateTimePicker({
	value,
	onChange,
	min,
	disabled,
	placeholder = "Pick date & time",
	className,
}: DateTimePickerProps) {
	const [open, setOpen] = React.useState(false)

	const selectedDate = React.useMemo(() => fromDateTimeLocal(value), [value])

	const minDate = React.useMemo(() => {
		if (!min) return undefined
		if (min instanceof Date) return min
		const d = new Date(min)
		return isValid(d) ? d : undefined
	}, [min])

	const hours = selectedDate ? selectedDate.getHours() : 12
	const minutes = selectedDate ? selectedDate.getMinutes() : 0

	const handleDaySelect = (day: Date | undefined) => {
		if (!day) return
		// Preserve current time or default to 12:00
		const withTime = setMinutes(setHours(day, hours), minutes)
		onChange(toDateTimeLocal(withTime))
	}

	const handleHourChange = (h: string) => {
		const base = selectedDate || new Date()
		const updated = setHours(base, parseInt(h, 10))
		onChange(toDateTimeLocal(updated))
	}

	const handleMinuteChange = (m: string) => {
		const base = selectedDate || new Date()
		const updated = setMinutes(base, parseInt(m, 10))
		onChange(toDateTimeLocal(updated))
	}

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					disabled={disabled}
					className={cn(
						"w-full justify-start text-left font-normal rounded-sm h-10 md:text-sm bg-zinc-50 dark:bg-zinc-800 border-border dark:border-zinc-700/50",
						!selectedDate && "text-muted-foreground",
						className,
					)}
				>
					<Icon name="calendar" variant="regular" className="mr-2 text-muted-foreground" />
					{selectedDate
						? format(selectedDate, "MMM d, yyyy 'at' h:mm a")
						: placeholder}
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-auto p-0" align="start">
				<Calendar
					mode="single"
					selected={selectedDate ?? undefined}
					onSelect={handleDaySelect}
					disabled={minDate ? { before: minDate } : undefined}
					defaultMonth={selectedDate ?? minDate ?? new Date()}
					startMonth={startOfMonth(new Date())}
				/>
				<div className="border-t border-border px-3 py-3 flex items-center gap-2">
					<Icon name="clock" variant="regular" className="text-muted-foreground text-sm" />
					<Select
						value={String(hours)}
						onValueChange={handleHourChange}
					>
						<SelectTrigger className="w-[70px] h-8 text-sm">
							<SelectValue />
						</SelectTrigger>
						<SelectContent className="max-h-[200px]">
							{Array.from({ length: 24 }, (_, i) => (
								<SelectItem key={i} value={String(i)}>
									{String(i).padStart(2, "0")}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<span className="text-muted-foreground font-medium">:</span>
					<Select
						value={String(minutes)}
						onValueChange={handleMinuteChange}
					>
						<SelectTrigger className="w-[70px] h-8 text-sm">
							<SelectValue />
						</SelectTrigger>
						<SelectContent className="max-h-[200px]">
							{Array.from({ length: 12 }, (_, i) => i * 5).map(
								(m) => (
									<SelectItem key={m} value={String(m)}>
										{String(m).padStart(2, "0")}
									</SelectItem>
								),
							)}
						</SelectContent>
					</Select>
				</div>
			</PopoverContent>
		</Popover>
	)
}

export { DateTimePicker }
