import { queryOptions } from "@tanstack/react-query"
import { getUserBySlug } from "@/server/functions/profile"

type ProfileQueryKey = readonly ["profile", string, "public" | "viewer", string]

export const profileQueryKeys = {
	all: (slug: string) => ["profile", slug] as const,
	public: (slug: string): ProfileQueryKey => ["profile", slug, "public", "anonymous"],
	viewer: (slug: string, privyId: string): ProfileQueryKey => ["profile", slug, "viewer", privyId],
}

async function fetchProfile(slug: string, authorization?: string) {
	const result = await getUserBySlug({
		data: {
			slug,
			...(authorization ? { _authorization: authorization } : {}),
		},
	} as never)

	if (!result.success) throw new Error(result.error || "User not found")
	return result
}

export type ProfileQueryData = Awaited<ReturnType<typeof fetchProfile>>

export function publicProfileQueryOptions(slug: string) {
	return queryOptions({
		queryKey: profileQueryKeys.public(slug),
		queryFn: () => fetchProfile(slug),
		staleTime: 5 * 60 * 1000,
		gcTime: 10 * 60 * 1000,
	})
}

export function viewerProfileQueryOptions(
	slug: string,
	privyId: string,
	getAuthorization: () => Promise<string | null>,
) {
	return queryOptions({
		queryKey: profileQueryKeys.viewer(slug, privyId),
		queryFn: async () => {
			const authorization = await getAuthorization()
			if (!authorization) throw new Error("Authentication unavailable")
			return fetchProfile(slug, authorization)
		},
		staleTime: 5 * 60 * 1000,
		gcTime: 10 * 60 * 1000,
	})
}

