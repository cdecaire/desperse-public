interface RouteLocationState {
	location: { href?: string; pathname: string; searchStr?: string; hash?: string }
	matches?: Array<{ pathname: string }>
	resolvedLocation?: { href?: string; pathname: string; searchStr?: string; hash?: string }
}

function getLocationKey(location: RouteLocationState["location"]): string {
	return location.href ?? `${location.pathname}${location.searchStr ?? ""}${location.hash ?? ""}`
}

/**
 * Returns the pathname whose route matches are currently rendered by the outlet.
 *
 * TanStack Router updates `location` as soon as navigation starts, while
 * `resolvedLocation` is not updated until a React layout effect after the new
 * matches render. The active `matches` array is therefore the only value that
 * stays aligned with the outlet on both sides of the commit: it remains on the
 * old route while loaders run, then changes in the same render as the outlet.
 */
export function getCommittedPathname(state: RouteLocationState): string {
	return state.matches?.at(-1)?.pathname ?? state.resolvedLocation?.pathname ?? state.location.pathname
}

/** True only while the URL points at a route that has not committed to the outlet yet. */
export function hasUncommittedNavigation(state: RouteLocationState): boolean {
	return Boolean(
		state.resolvedLocation &&
			getLocationKey(state.location) !== getLocationKey(state.resolvedLocation),
	)
}
