import {
	Calendar as SableCalendar,
	type CalendarProps as SableCalendarProps,
} from "@cdecaire/sable"

/**
 * Migration shim (Phase 2 — Sable adoption).
 *
 * The app's <Calendar> now renders @cdecaire/sable's Calendar — an owned wrapper
 * over react-day-picker v9, themed entirely with Sable's semantic tokens and
 * rendering nav chevrons through the injected icon set. This replaces the legacy
 * shadcn calendar that styled day cells with `buttonVariants` + inline FA
 * chevrons.
 *
 * The legacy API is preserved: this is a thin passthrough over react-day-picker,
 * so every DayPicker prop the call sites use forwards unchanged
 * (`mode`, `selected`, `onSelect`, `disabled`, `defaultMonth`, `startMonth`,
 * `showOutsideDays`, `className`, …). `classNames` and `components` overrides
 * also pass through and are merged on top of Sable's defaults.
 *
 * Notes for auditing:
 *   - Sole consumer is `date-time-picker.tsx`, which passes only plain RDP props
 *     (no `classNames`/`components` override). The class-name surface differs
 *     from the old shadcn structure, so any FUTURE caller passing a Desperse-
 *     shaped `classNames` map would target keys Sable already defines — flag and
 *     re-map if that happens.
 */

export type CalendarProps = SableCalendarProps

function Calendar(props: CalendarProps) {
	return <SableCalendar {...props} />
}

export { Calendar }
