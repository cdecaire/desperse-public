import * as React from "react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

function Calendar({
	className,
	classNames,
	showOutsideDays = true,
	...props
}: React.ComponentProps<typeof DayPicker>) {
	return (
		<DayPicker
			showOutsideDays={showOutsideDays}
			className={cn("p-3", className)}
			components={{
				Chevron: ({ orientation }) => (
					<i
						className={cn(
							"fa-regular text-xs",
							orientation === "left"
								? "fa-chevron-left"
								: "fa-chevron-right",
						)}
					/>
				),
			}}
			classNames={{
				months: "flex flex-col sm:flex-row gap-2",
				month: "relative flex flex-col gap-4",
				month_caption:
					"flex justify-center pt-1 relative items-center w-full",
				caption_label: "text-sm font-semibold",
				nav: "absolute inset-x-0 top-0 z-10 flex items-center justify-between px-1 pt-1",
				button_previous: cn(
					buttonVariants({ variant: "ghost" }),
					"size-7 p-0 opacity-60 hover:opacity-100",
				),
				button_next: cn(
					buttonVariants({ variant: "ghost" }),
					"size-7 p-0 opacity-60 hover:opacity-100",
				),
				month_grid: "w-full border-collapse space-x-1",
				weekdays: "flex",
				weekday:
					"text-muted-foreground rounded-md w-8 font-normal text-[0.8rem]",
				week: "flex w-full mt-2",
				day: cn(
					"relative p-0 text-center text-sm focus-within:relative focus-within:z-20",
					props.mode === "range"
						? "[&:has([aria-selected])]:bg-accent [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has(>.day-range-end)]:rounded-r-md [&:has(>.day-range-start)]:rounded-l-md first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md"
						: "",
				),
				day_button: cn(
					buttonVariants({ variant: "ghost" }),
					"size-8 rounded-md p-0 font-normal aria-selected:opacity-100",
				),
				range_end: "day-range-end",
				range_start: "day-range-start",
				selected:
					"rounded-md bg-primary text-primary-foreground hover:!bg-primary hover:!text-primary-foreground focus:!bg-primary focus:!text-primary-foreground",
				today: "bg-accent text-accent-foreground",
				outside:
					"day-outside text-muted-foreground/50 aria-selected:text-muted-foreground/50",
				disabled: "text-muted-foreground opacity-50",
				range_middle:
					"aria-selected:bg-accent aria-selected:text-accent-foreground",
				hidden: "invisible",
				...classNames,
			}}
			{...props}
		/>
	)
}

export { Calendar }
