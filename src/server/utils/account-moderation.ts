import { desc, eq, sql } from 'drizzle-orm'
import { db } from '@/server/db'
import {
  comments,
  contentReports,
  posts,
  userModerationActions,
  users,
} from '@/server/db/schema'
import { getUserWithRole, type UserRole } from '@/server/utils/auth-helpers'

export const USER_STATUSES = ['active', 'flagged', 'banned'] as const
export type UserStatus = (typeof USER_STATUSES)[number]

export type AccountModerationContext = {
  user: {
    id: string
    usernameSlug: string
    displayName: string | null
    avatarUrl: string | null
    status: UserStatus
    flaggedReason: string | null
  }
  actions: Array<{
    id: string
    previousStatus: string
    nextStatus: string
    reason: string
    createdAt: string
    actor: {
      id: string
      usernameSlug: string
      displayName: string | null
    }
  }>
}

function isUserStatus(value: string): value is UserStatus {
  return USER_STATUSES.includes(value as UserStatus)
}

export function isAccountStatusTransitionAllowed(role: UserRole, previous: UserStatus, next: UserStatus): boolean {
  if (previous === next) return false
  if (next === 'banned') return role === 'admin' && previous !== 'banned'
  if (previous === 'banned') return role === 'admin' && next === 'active'
  if (previous === 'active' && next === 'flagged') return role === 'moderator' || role === 'admin'
  if (previous === 'flagged' && next === 'active') return role === 'moderator' || role === 'admin'
  return false
}

async function validateLinkedReport(reportId: string, subjectUserId: string): Promise<boolean> {
  const [report] = await db
    .select({
      id: contentReports.id,
      contentType: contentReports.contentType,
      contentId: contentReports.contentId,
    })
    .from(contentReports)
    .where(eq(contentReports.id, reportId))
    .limit(1)
  if (!report) return false
  if (report.contentType === 'user') return report.contentId === subjectUserId
  if (report.contentType === 'post') {
    const [post] = await db
      .select({ userId: posts.userId })
      .from(posts)
      .where(eq(posts.id, report.contentId))
      .limit(1)
    return post?.userId === subjectUserId
  }
  if (report.contentType === 'comment') {
    const [comment] = await db
      .select({ userId: comments.userId })
      .from(comments)
      .where(eq(comments.id, report.contentId))
      .limit(1)
    return comment?.userId === subjectUserId
  }
  return false
}

export async function getAccountModerationContext(
  subjectUserId: string,
): Promise<AccountModerationContext | null> {
  const [user] = await db
    .select({
      id: users.id,
      usernameSlug: users.usernameSlug,
      displayName: users.displayName,
      avatarUrl: users.avatarUrl,
      status: users.status,
      flaggedReason: users.flaggedReason,
    })
    .from(users)
    .where(eq(users.id, subjectUserId))
    .limit(1)
  if (!user || !isUserStatus(user.status)) return null

  const actor = users
  const actions = await db
    .select({
      id: userModerationActions.id,
      previousStatus: userModerationActions.previousStatus,
      nextStatus: userModerationActions.nextStatus,
      reason: userModerationActions.reason,
      createdAt: userModerationActions.createdAt,
      actorId: actor.id,
      actorUsernameSlug: actor.usernameSlug,
      actorDisplayName: actor.displayName,
    })
    .from(userModerationActions)
    .innerJoin(actor, eq(userModerationActions.actorUserId, actor.id))
    .where(eq(userModerationActions.subjectUserId, subjectUserId))
    .orderBy(desc(userModerationActions.createdAt))
    .limit(20)

  return {
    user: { ...user, status: user.status as UserStatus },
    actions: actions.map((action) => ({
      id: action.id,
      previousStatus: action.previousStatus,
      nextStatus: action.nextStatus,
      reason: action.reason,
      createdAt: action.createdAt.toISOString(),
      actor: {
        id: action.actorId,
        usernameSlug: action.actorUsernameSlug,
        displayName: action.actorDisplayName,
      },
    })),
  }
}

export async function updateAccountModerationStatus(input: {
  actorUserId: string
  subjectUserId: string
  expectedStatus: UserStatus
  nextStatus: UserStatus
  reason: string
  linkedReportId?: string | null
}) {
  if (input.actorUserId === input.subjectUserId) {
    return { success: false as const, error: 'You cannot change your own account status.' }
  }
  const actor = await getUserWithRole(input.actorUserId)
  if (!actor || (actor.role !== 'moderator' && actor.role !== 'admin')) {
    return { success: false as const, error: 'Moderator access required.' }
  }
  if (!isAccountStatusTransitionAllowed(actor.role, input.expectedStatus, input.nextStatus)) {
    return { success: false as const, error: 'This account status transition is not allowed.' }
  }
  if (input.linkedReportId && !(await validateLinkedReport(input.linkedReportId, input.subjectUserId))) {
    return { success: false as const, error: 'The linked report does not belong to this account.' }
  }

  const reason = input.reason.trim()
  const result = await db.execute<{ action_id: string }>(sql`
    WITH updated AS (
      UPDATE users
      SET
        status = ${input.nextStatus},
        flagged_reason = ${input.nextStatus === 'active' ? null : reason},
        updated_at = NOW()
      WHERE id = ${input.subjectUserId}
        AND status = ${input.expectedStatus}
      RETURNING id
    )
    INSERT INTO user_moderation_actions (
      subject_user_id,
      actor_user_id,
      report_id,
      previous_status,
      next_status,
      reason
    )
    SELECT
      updated.id,
      ${input.actorUserId},
      ${input.linkedReportId ?? null},
      ${input.expectedStatus},
      ${input.nextStatus},
      ${reason}
    FROM updated
    RETURNING id AS action_id
  `)
  const rows = Array.from(result as unknown as Array<{ action_id: string }>)
  if (rows.length === 0) {
    return {
      success: false as const,
      error: 'The account status changed before this action completed. Refresh and try again.',
    }
  }

  console.log('[updateAccountModerationStatus] Account status changed', {
    subjectUserId: input.subjectUserId,
    previousStatus: input.expectedStatus,
    nextStatus: input.nextStatus,
    actionId: rows[0]?.action_id,
  })
  return { success: true as const, actionId: rows[0]!.action_id }
}
