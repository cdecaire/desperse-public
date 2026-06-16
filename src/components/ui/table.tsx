/**
 * Migration shim (Phase 2 — Sable adoption).
 *
 * The app's <Table> family now renders @cdecaire/sable's Table parts (adopting
 * Sable styling: text-body-sm body, text-label-md headers, hairline borders,
 * motion-interactive rows) while keeping the LEGACY shadcn API so existing call
 * sites don't change.
 *
 * Sable exports a 1:1 match for every Desperse part — Table, TableHeader,
 * TableBody, TableFooter, TableRow, TableHead, TableCell, TableCaption — so no
 * part required a passthrough shim. Each Sable part is a plain function
 * component that forwards `ref` via props, matching the legacy ref contract.
 *
 * Note for auditing: Sable's <TableRow> marks selection with `data-selected`
 * (legacy used `data-[state=selected]`); no current call site relies on either.
 */

export {
	Table,
	TableHeader,
	TableBody,
	TableFooter,
	TableHead,
	TableRow,
	TableCell,
	TableCaption,
} from "@cdecaire/sable"
