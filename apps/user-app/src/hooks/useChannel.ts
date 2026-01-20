// Shared hook for fetching channel data - eliminates duplication across 6+ pages

import { useQuery } from "@tanstack/react-query";
import type { Channel, ChannelBasic } from "~/types";

interface UseChannelOptions {
  enabled?: boolean;
}

/**
 * Fetch a channel by ID with full details.
 * Used by pages that need all channel information (settings, main page).
 */
export function useChannel(
  channelId: string | string[] | undefined,
  options: UseChannelOptions = {}
) {
  const { enabled = true } = options;
  const id = Array.isArray(channelId) ? channelId[0] : channelId;

  return useQuery({
    queryKey: ["channel", id],
    queryFn: async () => {
      const res = await fetch(`/api/channels/${id}`);
      const json = await res.json();
      return json.data as Channel;
    },
    enabled: !!id && enabled,
  });
}

/**
 * Fetch a channel by ID with basic details only.
 * Used by pages that only need id, title, username.
 */
export function useChannelBasic(
  channelId: string | string[] | undefined,
  options: UseChannelOptions = {}
) {
  const { enabled = true } = options;
  const id = Array.isArray(channelId) ? channelId[0] : channelId;

  return useQuery({
    queryKey: ["channel", id],
    queryFn: async () => {
      const res = await fetch(`/api/channels/${id}`);
      const json = await res.json();
      return json.data as ChannelBasic;
    },
    enabled: !!id && enabled,
  });
}

/**
 * Get the channel ID as a string from router query.
 */
export function getChannelId(
  id: string | string[] | undefined
): string | undefined {
  return Array.isArray(id) ? id[0] : id;
}
