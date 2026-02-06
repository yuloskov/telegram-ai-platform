import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth, useRequireAuth } from "~/hooks/useAuth";
import { AppHeader, PageHeader } from "~/components/layout/header";
import { PageLayout, PageSection } from "~/components/layout/page-layout";
import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/ui/spinner";
import { SourceList } from "~/components/sources/source-list";
import { AddSourceModal } from "~/components/sources/add-source-modal";
import { AddDocumentModal } from "~/components/sources/add-document-modal";
import { AddWebpageModal } from "~/components/sources/add-webpage-modal";
import { AddWebsiteModal } from "~/components/sources/add-website-modal";
import { Plus, Upload, Globe, Network, ChevronDown } from "lucide-react";
import { useI18n } from "~/i18n";

interface Channel {
  id: string;
  title: string;
  username: string | null;
}

interface ContentSource {
  id: string;
  sourceType: "telegram" | "document" | "webpage" | "website";
  telegramUsername: string | null;
  documentName: string | null;
  documentSize: number | null;
  webpageUrl: string | null;
  webpageTitle: string | null;
  webpageDomain: string | null;
  webpageError: string | null;
  websiteUrl: string | null;
  websiteTitle: string | null;
  websiteDomain: string | null;
  websiteCrawlStatus: string | null;
  websitePagesTotal: number;
  websitePagesScraped: number;
  websiteError: string | null;
  isActive: boolean;
  lastScrapedAt: string | null;
  _count: {
    scrapedContent: number;
  };
}

export default function SourcesPage() {
  const router = useRouter();
  const { id: channelId } = router.query;
  const queryClient = useQueryClient();
  const { isLoading: authLoading } = useRequireAuth();
  const { user, logout } = useAuth();
  const { t } = useI18n();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showWebpageModal, setShowWebpageModal] = useState(false);
  const [showWebsiteModal, setShowWebsiteModal] = useState(false);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const addMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (addMenuRef.current && !addMenuRef.current.contains(event.target as Node)) {
        setAddMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const { data: channel, isLoading: channelLoading } = useQuery({
    queryKey: ["channel", channelId],
    queryFn: async () => {
      const res = await fetch(`/api/channels/${channelId}`);
      const json = await res.json();
      return json.data as Channel;
    },
    enabled: !!channelId && !authLoading,
  });

  const { data: sourcesData, isLoading: sourcesLoading } = useQuery({
    queryKey: ["sources", channelId],
    queryFn: async () => {
      const res = await fetch(`/api/channels/${channelId}/sources`);
      const json = await res.json();
      return json.data as ContentSource[];
    },
    enabled: !!channelId && !authLoading,
  });

  const addSourceMutation = useMutation({
    mutationFn: async (username: string) => {
      const res = await fetch(`/api/channels/${channelId}/sources`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telegramUsername: username }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sources", channelId] });
      setShowAddModal(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (sourceId: string) => {
      const res = await fetch(`/api/channels/${channelId}/sources/${sourceId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sources", channelId] });
    },
  });

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

  const sources = sourcesData ?? [];

  return (
    <PageLayout title={`${t("sources.title")} - ${channel.title}`}>
      <AppHeader user={user} onLogout={logout} />

      <div className="px-4 md:px-6 lg:px-8 py-6 max-w-5xl mx-auto">
        <PageHeader
          title={t("sources.title")}
          breadcrumbs={[
            { label: t("common.home"), href: "/" },
            { label: t("nav.channels"), href: "/channels" },
            { label: channel.title, href: `/channels/${channelId}` },
            { label: t("sources.title") },
          ]}
          actions={
            <div className="relative" ref={addMenuRef}>
              <Button onClick={() => setAddMenuOpen(!addMenuOpen)}>
                <Plus className="h-4 w-4" />
                {t("sources.addSource")}
                <ChevronDown className="h-3.5 w-3.5 ml-0.5" />
              </Button>
              {addMenuOpen && (
                <div className="absolute right-0 top-full mt-1 w-56 rounded-lg border border-[var(--border-secondary)] bg-[var(--bg-primary)] py-1 shadow-lg z-50">
                  <button
                    onClick={() => { setShowAddModal(true); setAddMenuOpen(false); }}
                    className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-secondary)]"
                  >
                    <Plus className="h-4 w-4 text-[var(--text-secondary)]" />
                    {t("sources.addSource")}
                  </button>
                  <button
                    onClick={() => { setShowUploadModal(true); setAddMenuOpen(false); }}
                    className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-secondary)]"
                  >
                    <Upload className="h-4 w-4 text-[var(--text-secondary)]" />
                    {t("sources.uploadDocument")}
                  </button>
                  <button
                    onClick={() => { setShowWebpageModal(true); setAddMenuOpen(false); }}
                    className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-secondary)]"
                  >
                    <Globe className="h-4 w-4 text-[var(--text-secondary)]" />
                    {t("sources.addWebpage")}
                  </button>
                  <button
                    onClick={() => { setShowWebsiteModal(true); setAddMenuOpen(false); }}
                    className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-secondary)]"
                  >
                    <Network className="h-4 w-4 text-[var(--text-secondary)]" />
                    {t("sources.addWebsite")}
                  </button>
                </div>
              )}
            </div>
          }
        />

        <p className="text-sm text-[var(--text-secondary)] -mt-4 mb-6">
          {t("sources.description")}
        </p>

        <AddSourceModal
          open={showAddModal}
          onOpenChange={setShowAddModal}
          onAdd={(username) => addSourceMutation.mutate(username)}
          isAdding={addSourceMutation.isPending}
        />

        <AddDocumentModal
          open={showUploadModal}
          onOpenChange={setShowUploadModal}
          channelId={channelId as string}
        />

        <AddWebpageModal
          open={showWebpageModal}
          onOpenChange={setShowWebpageModal}
          channelId={channelId as string}
        />

        <AddWebsiteModal
          open={showWebsiteModal}
          onOpenChange={setShowWebsiteModal}
          channelId={channelId as string}
        />

        <PageSection>
          <SourceList
            sources={sources}
            channelId={channelId as string}
            isLoading={sourcesLoading}
            onDelete={(sourceId) => deleteMutation.mutate(sourceId)}
            onOpenAddModal={() => setShowAddModal(true)}
          />
        </PageSection>
      </div>
    </PageLayout>
  );
}
