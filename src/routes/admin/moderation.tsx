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
import { cn } from '@/lib/utils'
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

// Detect media type from URL
function detectMediaType(url: string): 'image' | 'video' | 'audio' | 'document' | '3d' {
  const extension = url.split('.').pop()?.toLowerCase()?.split('?')[0]

  if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(extension || '')) {
    return 'image'
  }
  if (['mp4', 'webm', 'mov'].includes(extension || '')) {
    return 'video'
  }
  if (['mp3', 'wav', 'ogg', 'aac'].includes(extension || '')) {
    return 'audio'
  }
  if (['pdf', 'zip'].includes(extension || '')) {
    return 'document'
  }
  if (['glb', 'gltf'].includes(extension || '')) {
    return '3d'
  }

  return 'image'
}

// Format relative time
function formatRelativeTime(date: Date | string): string {
  const now = new Date()
  const then = new Date(date)
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000)

  if (seconds < 60) return 'now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`
  if (seconds < 2592000) return `${Math.floor(seconds / 604800)}w`

  return then.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

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
      })

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
        <div className="space-y-2 mb-6">
          <h1 className="hidden md:block text-xl font-bold">Content Moderation</h1>
          <p className="text-sm text-muted-foreground">
            Review and moderate reported posts.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Status:</span>
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
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Type:</span>
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
          </div>
        </div>

        {isLoadingUser && (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="lg" />
            <div className="ml-4 text-sm text-muted-foreground">
              Loading user...
            </div>
          </div>
        )}

        {!isLoadingUser && (isLoading || isPending) && (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="lg" />
            <div className="ml-4 text-sm text-muted-foreground">
              Loading reports...
            </div>
          </div>
        )}

        {error && (
          <EmptyState
            icon={<i className="fa-regular fa-circle-exclamation text-4xl" />}
            title="Failed to load reports"
            description={error.message || 'An error occurred while loading reports.'}
          />
        )}

        {!isLoading && !isPending && filteredData.length === 0 && (
          <EmptyState
            icon={<i className="fa-regular fa-check-circle text-4xl" />}
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
                        <i className={cn(
                          'fa-solid text-[10px]',
                          sortDirection === 'desc' ? 'fa-caret-down' : 'fa-caret-up'
                        )} />
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
                        <i className={cn(
                          'fa-solid text-[10px]',
                          sortDirection === 'desc' ? 'fa-caret-down' : 'fa-caret-up'
                        )} />
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
                            <i className="fa-regular fa-envelope text-sm text-muted-foreground" />
                          </div>
                        ) : isComment ? (
                          <div className="w-10 h-10 rounded bg-muted shrink-0 flex items-center justify-center">
                            <i className="fa-regular fa-comment text-sm text-muted-foreground" />
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
                            video: 'fa-video',
                            audio: 'fa-music',
                            document: (report.mediaUrl || '').toLowerCase().endsWith('.zip') ? 'fa-file-zipper' : 'fa-file-pdf',
                            '3d': 'fa-cube',
                            image: 'fa-image',
                          }
                          const icon = iconMap[mediaType] || 'fa-file'

                          return (
                            <div className="w-10 h-10 rounded bg-muted shrink-0 flex items-center justify-center">
                              <i className={cn('fa-regular', icon, 'text-sm text-muted-foreground')} />
                            </div>
                          )
                        })()}
                      </TableCell>

                      {/* User */}
                      <TableCell className="whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full overflow-hidden bg-muted shrink-0">
                            {report.creator.avatarUrl ? (
                              <img
                                src={report.creator.avatarUrl}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-muted">
                                <i className="fa-regular fa-user text-[10px] text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="text-sm font-medium">
                              {report.creator.displayName || `@${report.creator.usernameSlug}`}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              @{report.creator.usernameSlug}
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      {/* Content */}
                      <TableCell>
                        <p className="text-sm text-foreground/90 line-clamp-2">
                          {isDmThread ? report.contentText : isComment ? report.contentText : report.caption || '(No caption)'}
                        </p>
                      </TableCell>

                      {/* Type */}
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {isDmThread ? 'DM' : isComment ? 'Comment' : 'Post'}
                      </TableCell>

                      {/* Reports count */}
                      <TableCell className="whitespace-nowrap font-medium">
                        {report.reportCount}
                      </TableCell>

                      {/* Top reason */}
                      <TableCell className="whitespace-nowrap">
                        {report.topReasons.length > 0 ? (
                          <Badge variant="destructive" size="sm">
                            {report.topReasons[0]}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>

                      {/* Status */}
                      <TableCell className="whitespace-nowrap">
                        <div className="flex gap-1">
                          {report.hasOpenReports ? (
                            <Badge variant="warning" size="sm">Open</Badge>
                          ) : (
                            <Badge variant="success" size="sm">Resolved</Badge>
                          )}
                          {report.isHidden && (
                            <Badge variant="destructive" size="sm">Hidden</Badge>
                          )}
                          {report.isDeleted && (
                            <Badge variant="destructive" size="sm">Deleted</Badge>
                          )}
                        </div>
                      </TableCell>

                      {/* Last report date */}
                      <TableCell className="whitespace-nowrap">
                        <span className="text-sm text-muted-foreground">
                          {formatRelativeTime(report.latestReportDate)}
                        </span>
                      </TableCell>

                      {/* Actions */}
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <ModerationRowMenu
                          contentType={report.contentType}
                          postId={report.postId!}
                          commentId={report.commentId}
                          isHidden={report.isHidden}
                          hasOpenReports={report.hasOpenReports}
                        />
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
