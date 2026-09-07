export interface Env {
  MAL_CLIENT_ID: string;
  MAL_CLIENT_SECRET?: string;
  MAL_ACCESS_TOKEN?: string;
  MAL_REFRESH_TOKEN?: string;
}

export const ANIME_RANKING_TYPES = [
  "all",
  "airing",
  "upcoming",
  "tv",
  "ova",
  "movie",
  "special",
  "bypopularity",
  "favorite",
] as const;

export const MANGA_RANKING_TYPES = [
  "all",
  "manga",
  "novels",
  "oneshots",
  "doujin",
  "manhwa",
  "manhua",
  "bypopularity",
  "favorite",
] as const;

export const SEASONS = ["winter", "spring", "summer", "fall"] as const;

export const SEASONAL_SORT = ["anime_score", "anime_num_list_users"] as const;

export const ANIME_LIST_STATUS = [
  "watching",
  "completed",
  "on_hold",
  "dropped",
  "plan_to_watch",
] as const;

export const MANGA_LIST_STATUS = [
  "reading",
  "completed",
  "on_hold",
  "dropped",
  "plan_to_read",
] as const;

export const ANIME_LIST_SORT = [
  "list_score",
  "list_updated_at",
  "anime_title",
  "anime_start_date",
  "anime_id",
] as const;

export const MANGA_LIST_SORT = [
  "list_score",
  "list_updated_at",
  "manga_title",
  "manga_start_date",
  "manga_id",
] as const;

export const FORUM_TOPIC_SORT = ["recent"] as const;
