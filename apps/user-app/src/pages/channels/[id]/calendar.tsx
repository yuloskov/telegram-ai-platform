import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth, useRequireAuth } from "~/hooks/useAuth";
import { useChannel } from "~/hooks/useChannel";
import { useContentPlans } from "~/hooks/useContentPlan";
import { AppHeader, PageHeader } from "~/components/layout/header";
import { PageLayout, PageSection } from "~/components/layout/page-layout";
import { Spinner } from "~/components/ui/spinner";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "~/components/ui/select";
import { PostingCalendar, CalendarDayDetail } from "~/components/calendar";
import { SkippedPostsBanner } from "~/components/posts/skipped-posts-banner";
import { BulkRescheduleModal } from "~/components/posts/bulk-reschedule-modal";
import { PostEditorModal } from "~/components/posts/post-editor-modal";
import { PostStatusActions } from "~/components/posts/post-status-actions";
import { useI18n } from "~/i18n";
import type { MediaFile, PostImage } from "~/types";

interface CalendarPost {
  id: string;
  content: string;
  status: string;
  scheduledAt: string | null;
  publishedAt: string | null;
  skippedAt: string | null;
  contentPlanId: string | null;
  contentPlanName: string | null;
  mediaFiles?: { id: string; url: string; type: string }[];
}

interface CalendarData {
  dates: Record<string, CalendarPost[]>;
  totalPosts: number;
  skippedCount: number;
}

async function fetchCalendarPosts(
  channelId: string,
  startDate: string,
  endDate: string,
  contentPlanId?: string
): Promise<CalendarData> {
  const params = new URLSearchParams({ startDate, endDate });
  if (contentPlanId) params.append("contentPlanId", contentPlanId);

  const res = await fetch(`/api/channels/${channelId}/posts/calendar?${params}`);
  if (!res.ok) throw new Error("Failed to fetch calendar posts");
  const data = await res.json();
  return data.data;
}

export default function CalendarPage() {
  const router = useRouter();
  const { id: channelId } = router.query;
  const { isLoading: authLoading } = useRequireAuth();
  const { user, logout } = useAuth();
  const { t } = useI18n();

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedPosts, setSelectedPosts] = useState<CalendarPost[]>([]);
  const [contentPlanFilter, setContentPlanFilter] = useState<string>("");
  const [reschedulePostIds, setReschedulePostIds] = useState<string[]>([]);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);

  // Edit post state
  const [editingPost, setEditingPost] = useState<CalendarPost | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editImages, setEditImages] = useState<PostImage[]>([]);
  const [selectedImages, setSelectedImages] = useState<PostImage[]>([]);

  // Current month for API query
  const now = new Date();
  const [currentMonth, setCurrentMonth] = useState({
    year: now.getFullYear(),
    month: now.getMonth(),
  });

  const { data: channel, isLoading: channelLoading } = useChannel(
    channelId as string,
    { enabled: !authLoading }
  );

  const { data: plans } = useContentPlans(channelId as string, {
    enabled: !authLoading && !!channelId,
  });

  // Calculate date range for current month
  const startDate = new Date(currentMonth.year, currentMonth.month, 1).toISOString();
  const endDate = new Date(currentMonth.year, currentMonth.month + 1, 0, 23, 59, 59).toISOString();

  const {
    data: calendarData,
    isLoading: calendarLoading,
    refetch,
  } = useQuery({
    queryKey: ["calendar", channelId, startDate, endDate, contentPlanFilter],
    queryFn: () =>
      fetchCalendarPosts(
        channelId as string,
        startDate,
        endDate,
        contentPlanFilter || undefined
      ),
    enabled: !authLoading && !!channelId,
  });

  const handleMonthChange = useCallback((year: number, month: number) => {
    setCurrentMonth({ year, month });
    setSelectedDate(null);
    setSelectedPosts([]);
  }, []);

  const handleDayClick = useCallback((date: string, posts: CalendarPost[]) => {
    setSelectedDate(date);
    setSelectedPosts(posts);
  }, []);

  const handleCloseDayDetail = useCallback(() => {
    setSelectedDate(null);
    setSelectedPosts([]);
  }, []);

  const handleReschedule = useCallback((postIds: string[]) => {
    setReschedulePostIds(postIds);
    setShowRescheduleModal(true);
  }, []);

  const handleRescheduleSuccess = useCallback(() => {
    refetch();
    setSelectedDate(null);
    setSelectedPosts([]);
  }, [refetch]);

  const handleViewPost = useCallback(
    (postId: string) => {
      router.push(`/channels/${channelId}/posts/${postId}`);
    },
    [router, channelId]
  );

  const handleRescheduleAllSkipped = useCallback(() => {
    if (!calendarData) return;
    // Collect all skipped post IDs from all dates
    const skippedIds: string[] = [];
    Object.values(calendarData.dates).forEach((posts) => {
      posts.forEach((post) => {
        if (post.skippedAt) {
          skippedIds.push(post.id);
        }
      });
    });
    if (skippedIds.length > 0) {
      handleReschedule(skippedIds);
    }
  }, [calendarData, handleReschedule]);

  // Edit post mutation
  const updatePostMutation = useMutation({
    mutationFn: async ({
      postId,
      content,
      mediaFiles,
    }: {
      postId: string;
      content: string;
      mediaFiles?: { url: string; type: string; isGenerated: boolean }[];
    }) => {
      const res = await fetch(`/api/posts/${postId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, mediaFiles }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update post");
      }
      return res.json();
    },
    onSuccess: () => {
      setEditingPost(null);
      setEditContent("");
      setEditImages([]);
      setSelectedImages([]);
      refetch();
      // Update selected posts if still viewing the same day
      if (selectedDate && calendarData) {
        const updatedPosts = calendarData.dates[selectedDate] || [];
        setSelectedPosts(updatedPosts);
      }
    },
  });

  const handleEditPost = useCallback((post: CalendarPost) => {
    setEditingPost(post);
    setEditContent(post.content);
    // Convert existing media to PostImage format
    const images: PostImage[] = (post.mediaFiles || []).map((mf) => ({
      url: mf.url,
      isGenerated: false, // We don't have this info from calendar API
    }));
    setEditImages(images);
    setSelectedImages(images);
  }, []);

  const handleSavePost = useCallback(() => {
    if (!editingPost) return;
    // Convert selected images to media files format for API
    const mediaFiles = selectedImages.map((img) => ({
      url: img.url,
      type: "image",
      isGenerated: img.isGenerated,
    }));
    updatePostMutation.mutate({
      postId: editingPost.id,
      content: editContent,
      mediaFiles,
    });
  }, [editingPost, editContent, selectedImages, updatePostMutation]);

  const handleCancelEdit = useCallback(() => {
    setEditingPost(null);
    setEditContent("");
    setEditImages([]);
    setSelectedImages([]);
  }, []);

  const handleNewImageGenerated = useCallback((newImage: PostImage) => {
    setEditImages((prev) => [...prev, newImage]);
    setSelectedImages((prev) => [...prev, newImage]);
  }, []);

  const handleImageRegenerated = useCallback((oldUrl: string, newImage: PostImage) => {
    setEditImages((prev) =>
      prev.map((img) => (img.url === oldUrl ? newImage : img))
    );
    setSelectedImages((prev) =>
      prev.map((img) => (img.url === oldUrl ? newImage : img))
    );
  }, []);

  const handleStatusChange = useCallback(() => {
    setEditingPost(null);
    setEditContent("");
    setEditImages([]);
    setSelectedImages([]);
    refetch();
  }, [refetch]);

  if (authLoading || channelLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-secondary)]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!channel) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-secondary)]">
        <p className="text-[var(--text-secondary)]">{t("channels.notFound")}</p>
      </div>
    );
  }

  const contentPlans = plans ?? [];

  return (
    <PageLayout title={`${t("calendar.title")} - ${channel.title}`}>
      <AppHeader user={user} onLogout={logout} />

      <div className="px-4 md:px-6 lg:px-8 py-6 max-w-6xl mx-auto">
        <PageHeader
          title={t("calendar.title")}
          breadcrumbs={[
            { label: t("common.home"), href: "/" },
            { label: t("nav.channels"), href: "/channels" },
            { label: channel.title, href: `/channels/${channelId}` },
            { label: t("calendar.title") },
          ]}
          actions={
            <div className="flex items-center gap-2">
              <Select
                value={contentPlanFilter || "all"}
                onValueChange={(value) => setContentPlanFilter(value === "all" ? "" : value)}
              >
                <SelectTrigger className="w-48 border border-[var(--border-primary)]">
                  <SelectValue placeholder={t("calendar.filterByPlan")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("calendar.allPlans")}</SelectItem>
                  {contentPlans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          }
        />

        {/* Skipped posts banner */}
        {calendarData && calendarData.skippedCount > 0 && (
          <div className="mb-6">
            <SkippedPostsBanner
              count={calendarData.skippedCount}
              onReschedule={handleRescheduleAllSkipped}
            />
          </div>
        )}

        <PageSection>
          <div className="relative">
            <PostingCalendar
              data={calendarData}
              isLoading={calendarLoading}
              onMonthChange={handleMonthChange}
              onDayClick={handleDayClick}
              selectedDate={selectedDate}
            />
          </div>
        </PageSection>
      </div>

      {/* Day detail slide-out */}
      {selectedDate && (
        <>
          <div
            className="fixed inset-0 bg-black/20 z-30"
            onClick={handleCloseDayDetail}
          />
          <CalendarDayDetail
            date={selectedDate}
            posts={selectedPosts}
            onClose={handleCloseDayDetail}
            onReschedule={handleReschedule}
            onViewPost={handleViewPost}
            onEditPost={handleEditPost}
          />
        </>
      )}

      {/* Bulk reschedule modal */}
      <BulkRescheduleModal
        open={showRescheduleModal}
        onOpenChange={setShowRescheduleModal}
        postIds={reschedulePostIds}
        onSuccess={handleRescheduleSuccess}
      />

      {/* Post editor modal with status actions */}
      {editingPost && (
        <PostEditorModal
          open={!!editingPost}
          onOpenChange={(open) => !open && handleCancelEdit()}
          content={editContent}
          onContentChange={setEditContent}
          onSave={handleSavePost}
          onCancel={handleCancelEdit}
          isSaving={updatePostMutation.isPending}
          channelName={channel?.title || ""}
          channelId={channelId as string}
          isGenerated={editImages.length > 0}
          postImages={editImages}
          selectedImages={selectedImages}
          onImagesChange={setSelectedImages}
          onImageRegenerated={handleImageRegenerated}
          onNewImageGenerated={handleNewImageGenerated}
        >
          {/* Status actions inside the modal */}
          <div className="border-t border-[var(--border-secondary)] pt-4 mt-4">
            <p className="text-sm font-medium text-[var(--text-primary)] mb-3">
              {t("posts.changeStatus")}
            </p>
            <PostStatusActions
              postId={editingPost.id}
              currentStatus={editingPost.status}
              scheduledAt={editingPost.scheduledAt}
              onStatusChange={handleStatusChange}
            />
          </div>
        </PostEditorModal>
      )}
    </PageLayout>
  );
}
