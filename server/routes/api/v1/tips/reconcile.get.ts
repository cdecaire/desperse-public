import { timingSafeEqual } from "node:crypto";
import { defineEventHandler, getHeader, setResponseStatus } from "h3";
import { reconcilePendingTips } from "@/server/jobs/tip-reconciliation";

function authorized(header: string | undefined, secret: string | undefined): boolean {
	if (!header || !secret) return false;
	const expected = `Bearer ${secret}`;
	return header.length === expected.length && timingSafeEqual(Buffer.from(header), Buffer.from(expected));
}

export default defineEventHandler(async (event) => {
	if (!authorized(getHeader(event, "authorization"), process.env.CRON_SECRET)) {
		setResponseStatus(event, 401);
		return { error: "Unauthorized" };
	}
	return reconcilePendingTips();
});
