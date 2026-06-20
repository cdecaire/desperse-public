/**
 * Admin Content Moderation Page
 * Shows queue of reported posts for moderation in a data table layout
 */

import { createFileRoute, Outlet, useMatchRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { getReportsQueue } from '@/server/functions/admin'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useAuth } from '@/hooks/useAuth'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { EmptyState } from '@/components/shared/EmptyState'
import { useState, useMemo } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ModerationRowMenu } from '@/components/admin/ModerationRowMenu'
import { Badge } from '@/components/ui/badge'
import { Entity, StatusBadge } from '@cdecaire/sable'
import { Row, Stack } from '@cdecaire/sable/layout'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { Icon } from '@/components/ui/icon'
import { detectMediaType } from '@/lib/media'
import { formatRelativeTime } from '@/lib/dates'

type StatusFilter = 'open' | 'resolved' | 'all'
type TypeFilter = 'all' | 'post' | 'comment' | 'dm_thread'
type SortField = 'reportCount' | 'latestReportDate'
type SortDirection = 'asc' | 'desc'

export const Route = createFileRoute('/admin/moderation')({
  component: ModerationListPage,
})

function ModerationListPage() {
  const { user: currentUser, isLoading: isLoadingUser } = useCurrentUser()
  const { getAuthHeaders } = useAuth()
  const matchRoute = useMatchRoute()
  const navigate = useNavigate()

  // Filters
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('open')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')

  // Sorting
  const [sortField, setSortField] = useState<SortField>('latestReportDate')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  // Check if we're on a detail page (child route)
  const isDetailPage = matchRoute({ to: '/admin/moderation/$reportId' })

  const { data, isLoading, isPending, error } = useQuery({
    queryKey: ['admin', 'reports', currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) throw new Error('Not authenticated')

      const authHeaders = await getAuthHeaders()
      const result = await getReportsQueue({
        data: {
          limit: 100,
          _authorization: authHeaders.Authorization,
        },
      } as any)

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch reports')
      }

      return result.reports
    },
    enabled: !!currentUser?.id && !isLoadingUser,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  })

  // Filter and sort data
  const filteredData = useMemo(() => {
    if (!data) return []

    let filtered = data.filter((report) => {
      // Status filter
      if (statusFilter === 'open' && !report.hasOpenReports) return false
      if (statusFilter === 'resolved' && report.hasOpenReports) return false

      // Type filter
      if (typeFilter === 'post' && report.contentType !== 'post') return false
      if (typeFilter === 'comment' && report.contentType !== 'comment') return false
      if (typeFilter === 'dm_thread' && report.contentType !== 'dm_thread') return false

      return true
    })

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0
      if (sortField === 'reportCount') {
        comparison = a.reportCount - b.reportCount
      } else if (sortField === 'latestReportDate') {
        comparison = new Date(a.latestReportDate).getTime() - new Date(b.latestReportDate).getTime()
      }
      return sortDirection === 'desc' ? -comparison : comparison
    })

    return filtered
  }, [data, statusFilter, typeFilter, sortField, sortDirection])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const handleRowClick = (report: typeof filteredData[0]) => {
    const isComment = report.contentType === 'comment'
    const isDmThread = report.contentType === 'dm_thread'

    if (isDmThread) {
      navigate({
        to: '/admin/moderation/$reportId',
        params: { reportId: report.contentId },
        search: { type: 'dm_thread' },
      })
    } else {
      navigate({
        to: '/admin/moderation/$reportId',
        params: { reportId: report.postId! },
        search: isComment ? { type: 'comment', commentId: report.commentId! } : undefined,
      })
    }
  }

  // If we're on a detail page, render the outlet (child route)
  if (isDetailPage) {
    return <Outlet />
  }

  // Otherwise, render the list page
  return (
    <div className="pt-4">
      <div>
        <Stack gap={1} className="mb-6">
          <h1 className="hidden md:block text-heading-3">Content Moderation</h1>
          <p className="text-body-sm text-muted-foreground">
            Review and moderate reported posts.
          </p>
        </Stack>

        {/* Filters */}
        <Row wrap className="gap-3 mb-4">
          <Row align="center" gap={1}>
            <span className="text-body-sm text-muted-foreground">Status:</span>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
              <SelectTrigger className="w-[120px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
          </Row>
          <Row align="center" gap={1}>
            <span className="text-body-sm text-muted-foreground">Type:</span>
            <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as TypeFilter)}>
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="post">Posts only</SelectItem>
                <SelectItem value="comment">Comments only</SelectItem>
                <SelectItem value="dm_thread">DMs only</SelectItem>
              </SelectContent>
            </Select>
          </Row>
        </Row>

        {isLoadingUser && (
          <Row align="center" justify="center" className="py-12">
            <LoadingSpinner size="lg" />
            <div className="ml-4 text-body-sm text-muted-foreground">
              Loading user...
            </div>
          </Row>
        )}

        {!isLoadingUser && (isLoading || isPending) && (
          <Row align="center" justify="center" className="py-12">
            <LoadingSpinner size="lg" />
            <div className="ml-4 text-body-sm text-muted-foreground">
              Loading reports...
            </div>
          </Row>
        )}

        {error && (
          <EmptyState
            icon={<Icon name="circle-exclamation" variant="regular" className="text-4xl" />}
            title="Failed to load reports"
            description={error.message || 'An error occurred while loading reports.'}
          />
        )}

        {!isLoading && !isPending && filteredData.length === 0 && (
          <EmptyState
            icon={<Icon name="check-circle" variant="regular" className="text-4xl" />}
            title={statusFilter === 'open' ? "No open reports" : statusFilter === 'resolved' ? "No resolved reports" : "No reports"}
            description={statusFilter === 'open'
              ? "All reports have been reviewed."
              : statusFilter === 'resolved'
              ? "No resolved reports found."
              : "No reports found."}
          />
        )}

        {filteredData && filteredData.length > 0 && (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="whitespace-nowrap">Media</TableHead>
                  <TableHead className="whitespace-nowrap">User</TableHead>
                  <TableHead>Content</TableHead>
                  <TableHead className="whitespace-nowrap">Type</TableHead>
                  <TableHead
                    className="whitespace-nowrap cursor-pointer select-none"
                    onClick={() => handleSort('reportCount')}
                  >
                    <div className="flex items-center gap-1">
                      Reports
                      {sortField === 'reportCount' && (
                        <Icon
                          name={sortDirection === 'desc' ? 'caret-down' : 'caret-up'}
                          className="text-[10px]"
                        />
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="whitespace-nowrap">Reason</TableHead>
                  <TableHead className="whitespace-nowrap">Status</TableHead>
                  <TableHead
                    className="whitespace-nowrap cursor-pointer select-none"
                    onClick={() => handleSort('latestReportDate')}
                  >
                    <div className="flex items-center gap-1">
                      Last Report
                      {sortField === 'latestReportDate' && (
                        <Icon
                          name={sortDirection === 'desc' ? 'caret-down' : 'caret-up'}
                          className="text-[10px]"
                        />
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((report) => {
                  const isComment = report.contentType === 'comment'
                  const isDmThread = report.contentType === 'dm_thread'
                  const contentId = isDmThread ? report.contentId : (isComment ? report.commentId! : report.postId)

                  return (
                    <TableRow
                      key={contentId}
                      className="cursor-pointer"
                      onClick={() => handleRowClick(report)}
                    >
                      {/* Thumbnail */}
                      <TableCell>
                        {isDmThread ? (
                          <div className="w-10 h-10 rounded bg-muted shrink-0 flex items-center justify-center">
                            <Icon name="envelope" variant="regular" className="text-body-sm text-muted-foreground" />
                          </div>
                        ) : isComment ? (
                          <div className="w-10 h-10 rounded bg-muted shrink-0 flex items-center justify-center">
                            <Icon name="comment" variant="regular" className="text-body-sm text-muted-foreground" />
                          </div>
                        ) : (() => {
                          const mediaType = detectMediaType(report.mediaUrl || '')
                          const coverUrl = (report as any).coverUrl || null
                          const displayImage = (mediaType === 'image') ? report.mediaUrl : coverUrl

                          if (displayImage) {
                            return (
                              <div className="w-10 h-10 rounded overflow-hidden bg-muted shrink-0">
                                <img
                                  src={displayImage}
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            )
                          }

                          const iconMap: Record<string, string> = {
                            video: 'video',
                            audio: 'music',
                            document: (report.mediaUrl || '').toLowerCase().endsWith('.zip') ? 'file-zipper' : 'file-pdf',
                            '3d': 'cube',
                            image: 'image',
                          }
                          const icon = iconMap[mediaType] || 'file'

                          return (
                            <div className="w-10 h-10 rounded bg-muted shrink-0 flex items-center justify-center">
                              <Icon name={icon} variant="regular" className="text-body-sm text-muted-foreground" />
                            </div>
                          )
                        })()}
                      </TableCell>

                      {/* User */}
                      <TableCell className="whitespace-nowrap">
                        <Entity
                          leading={<UserAvatar src={report.creator.avatarUrl} size="xs" />}
                          title={report.creator.displayName || `@${report.creator.usernameSlug}`}
                          subtitle={`@${report.creator.usernameSlug}`}
                        />
                      </TableCell>

                      {/* Content */}
                      <TableCell>
                        <p className="text-sm text-foreground/90 line-clamp-2">
                          {isDmThread ? report.contentText : isComment ? report.contentText : report.caption || '(No caption)'}
                        </p>
                      </TableCell>

                      {/* Type */}
                      <TableCell className="whitespace-nowrap text-body-sm text-muted-foreground">
                        {isDmThread ? 'DM' : isComment ? 'Comment' : 'Post'}
                      </TableCell>

                      {/* Reports count */}
                      <TableCell className="whitespace-nowrap font-medium">
                        {report.reportCount}
                      </TableCell>

                      {/* Top reason + details */}
                      <TableCell className="max-w-[200px]">
                        <div className="space-y-1">
                          {report.topReasons.length > 0 ? (
                            <Badge variant="destructive" size="sm">
                              {report.topReasons[0]}
                            </Badge>
                          ) : (
                            <span className="text-caption text-muted-foreground">-</span>
                          )}
                          {(report as any).reportDetails?.length > 0 && (
                            <p className="text-caption text-muted-foreground line-clamp-2" title={(report as any).reportDetails[0]}>
                              {(report as any).reportDetails[0]}
                            </p>
                          )}
                        </div>
                      </TableCell>

                      {/* Status + mint context */}
                      <TableCell className="whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <div className="flex gap-1">
                            {report.hasOpenReports ? (
                              <StatusBadge status="warning">Open</StatusBadge>
                            ) : (
                              <StatusBadge status="success">Resolved</StatusBadge>
                            )}
                            {report.isHidden && (
                              <StatusBadge status="hidden">Hidden</StatusBadge>
                            )}
                            {report.isDeleted && (
                              <StatusBadge status="deleted">Deleted</StatusBadge>
                            )}
                          </div>
                          {/* Mint status for posts */}
                          {report.contentType === 'post' && (report as any).isMinted && (
                            <span className="text-[10px] text-muted-foreground">
                              Minted: {(report as any).currentSupply || 0}{report.maxSupply ? `/${report.maxSupply}` : ''}
                            </span>
                          )}
                          {/* Repeat offender indicator */}
                          {((report as any).userReportsCount || 0) > 1 && (
                            <span className="text-[10px] text-amber-500">
                              {(report as any).userReportsCount} reported items
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Last report date */}
                      <TableCell className="whitespace-nowrap">
                        <span className="text-body-sm text-muted-foreground">
                          {formatRelativeTime(report.latestReportDate)}
                        </span>
                      </TableCell>

                      {/* Quick links + actions */}
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          {/* Quick links */}
                          {report.postId && (
                            <a
                              href={`/post/${report.postId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent"
                              title="View post"
                            >
                              <Icon name="arrow-up-right-from-square" variant="regular" className="text-caption text-muted-foreground" />
                            </a>
                          )}
                          {report.creator?.usernameSlug && (
                            <a
                              href={`/profile/${report.creator.usernameSlug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent"
                              title="View profile"
                            >
                              <Icon name="user" variant="regular" className="text-caption text-muted-foreground" />
                            </a>
                          )}
                          <ModerationRowMenu
                            contentType={report.contentType as 'post' | 'comment'}
                            postId={report.postId!}
                            commentId={report.commentId}
                            isHidden={report.isHidden}
                            hasOpenReports={report.hasOpenReports}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  )
}
