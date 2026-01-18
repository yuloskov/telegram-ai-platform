import { useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRequireAuth } from "~/hooks/useAuth";

interface Channel {
  id: string;
  telegramId: string;
  username: string | null;
  title: string;
  niche: string | null;
  tone: string;
  language: string;
  hashtags: string[];
}

interface Post {
  id: string;
  content: string;
  status: string;
  generationType: string;
  scheduledAt: string | null;
  publishedAt: string | null;
  createdAt: string;
}

export default function ChannelDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const queryClient = useQueryClient();
  const { isLoading: authLoading } = useRequireAuth();

  const [showGenerator, setShowGenerator] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [generatedContent, setGeneratedContent] = useState("");
  const [showPostEditor, setShowPostEditor] = useState(false);
  const [postContent, setPostContent] = useState("");

  const { data: channel, isLoading: channelLoading } = useQuery({
    queryKey: ["channel", id],
    queryFn: async () => {
      const res = await fetch(`/api/channels/${id}`);
      const json = await res.json();
      return json.data as Channel;
    },
    enabled: !!id && !authLoading,
  });

  const { data: postsData, isLoading: postsLoading } = useQuery({
    queryKey: ["posts", id],
    queryFn: async () => {
      const res = await fetch(`/api/posts?channelId=${id}`);
      const json = await res.json();
      return json as { data: Post[]; pagination: any };
    },
    enabled: !!id && !authLoading,
  });

  const generateMutation = useMutation({
    mutationFn: async (prompt: string) => {
      const res = await fetch("/api/generate/prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId: id, prompt }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data.data;
    },
    onSuccess: (data) => {
      setGeneratedContent(data.content);
      setPostContent(data.content);
      setShowGenerator(false);
      setShowPostEditor(true);
    },
  });

  const createPostMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId: id, content }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts", id] });
      setShowPostEditor(false);
      setPostContent("");
      setGeneratedContent("");
    },
  });

  const publishMutation = useMutation({
    mutationFn: async (postId: string) => {
      const res = await fetch(`/api/posts/${postId}/publish`, {
        method: "POST",
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts", id] });
    },
  });

  if (authLoading || channelLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (!channel) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Channel not found</p>
      </div>
    );
  }

  const posts = postsData?.data || [];

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: "bg-gray-100 text-gray-700",
      scheduled: "bg-blue-100 text-blue-700",
      publishing: "bg-yellow-100 text-yellow-700",
      published: "bg-green-100 text-green-700",
      failed: "bg-red-100 text-red-700",
      pending_review: "bg-purple-100 text-purple-700",
    };
    return styles[status] || "bg-gray-100 text-gray-700";
  };

  return (
    <>
      <Head>
        <title>{channel.title} - AI Telegram Channels</title>
      </Head>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link href="/channels" className="text-gray-600 hover:text-gray-900">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </Link>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">{channel.title}</h1>
                  {channel.username && (
                    <p className="text-sm text-gray-500">@{channel.username}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/channels/${id}/settings`}
                  className="text-gray-600 hover:text-gray-900 p-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-8">
          {/* Quick Actions */}
          <div className="flex gap-4 mb-8">
            <button
              onClick={() => setShowGenerator(true)}
              className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Generate with AI
            </button>
            <button
              onClick={() => {
                setPostContent("");
                setShowPostEditor(true);
              }}
              className="border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium py-2 px-4 rounded-lg flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Post
            </button>
          </div>

          {/* AI Generator Modal */}
          {showGenerator && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
                <h2 className="text-lg font-semibold mb-4">Generate Content</h2>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Enter a topic or prompt for AI to generate content..."
                  className="w-full h-32 px-4 py-2 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex justify-end gap-2 mt-4">
                  <button
                    onClick={() => setShowGenerator(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-900"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => generateMutation.mutate(prompt)}
                    disabled={!prompt || generateMutation.isPending}
                    className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white font-medium py-2 px-4 rounded-lg"
                  >
                    {generateMutation.isPending ? "Generating..." : "Generate"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Post Editor Modal */}
          {showPostEditor && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6">
                <h2 className="text-lg font-semibold mb-4">
                  {generatedContent ? "Review Generated Content" : "Create Post"}
                </h2>
                <textarea
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  placeholder="Write your post content..."
                  className="w-full h-48 px-4 py-2 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-sm text-gray-500 mt-2">
                  {postContent.length} / 4096 characters
                </p>
                <div className="flex justify-end gap-2 mt-4">
                  <button
                    onClick={() => {
                      setShowPostEditor(false);
                      setPostContent("");
                      setGeneratedContent("");
                    }}
                    className="px-4 py-2 text-gray-600 hover:text-gray-900"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => createPostMutation.mutate(postContent)}
                    disabled={!postContent || createPostMutation.isPending}
                    className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white font-medium py-2 px-4 rounded-lg"
                  >
                    {createPostMutation.isPending ? "Saving..." : "Save as Draft"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Posts List */}
          <div className="bg-white rounded-xl shadow-sm border">
            <div className="p-4 border-b">
              <h2 className="font-semibold text-gray-900">Posts</h2>
            </div>
            {postsLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto" />
              </div>
            ) : posts.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No posts yet. Create your first post!
              </div>
            ) : (
              <div className="divide-y">
                {posts.map((post) => (
                  <div key={post.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-900 line-clamp-2">{post.content}</p>
                        <div className="flex items-center gap-3 mt-2 text-sm">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusBadge(post.status)}`}>
                            {post.status}
                          </span>
                          <span className="text-gray-500">
                            {new Date(post.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {post.status === "draft" && (
                          <button
                            onClick={() => publishMutation.mutate(post.id)}
                            disabled={publishMutation.isPending}
                            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                          >
                            Publish
                          </button>
                        )}
                        {post.status === "failed" && (
                          <button
                            onClick={() => publishMutation.mutate(post.id)}
                            disabled={publishMutation.isPending}
                            className="text-orange-600 hover:text-orange-700 text-sm font-medium"
                          >
                            Retry
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
