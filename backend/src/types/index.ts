export interface VideoGenerateJobData {
  job_id: string;
  video_id: string;
  workspace_id: string;
  script: string;
  avatar_id: string;
  voice_provider: "heygen" | "elevenlabs";
  lang: string;
  heygen_api_key: string;
  elevenlabs_api_key?: string;
  elevenlabs_voice_id?: string;
}

export interface VideoMergeJobData {
  job_id: string;
  video_id: string;
  workspace_id: string;
  footage_path: string;   // Supabase storage path or HTTPS URL
  avatar_path: string;    // Supabase storage path or HTTPS URL
  scene_markers: { start: number; end: number; description: string }[];
  effects: { entrance: string[]; scene: string[]; exit: string[] };
  duration: number;
}

export interface VideoDownloadJobData {
  job_id: string;
  workspace_id: string;
  url: string;
  video_id?: string;
}

export interface VideoAnalyzeJobData {
  job_id: string;
  workspace_id: string;
  storage_path: string;     // Supabase storage path of the downloaded source video
  duration?: number;        // seconds — used for fallback when TL not connected
  twelvelabs_api_key?: string;
  twelvelabs_index_id?: string; // cached index id, may be null on first run
  video_id?: string;
}

export interface VideoExtractJobData {
  job_id: string;
  workspace_id: string;
  storage_path: string;             // Supabase storage path of source video
  segments: { start: number; end: number }[];
  video_id?: string;
}

export interface AvatarRenderJobData {
  job_id: string;
  video_id: string;
  workspace_id: string;
  script: string;
  avatar_id: string;
  voice_provider: "heygen" | "elevenlabs";
  audio_url?: string;   // pre-generated signed URL from /api/voice/generate
  language: string;
  heygen_api_key: string;
  background: "black" | "green";
}

export interface PostTikTokJobData {
  job_id: string;
  video_id: string;
  workspace_id: string;
  storage_path: string;
  caption: string;           // combined caption + hashtags
  privacy_level: string;
  disable_duet: boolean;
  disable_comment: boolean;
  disable_stitch: boolean;
  access_token: string;
}

export interface PostYouTubeJobData {
  job_id: string;
  video_id: string;
  workspace_id: string;
  storage_path: string;
  title: string;
  description: string;       // caption + hashtags
  tags: string[];
  category_id: number;
  privacy_status: string;
  made_for_kids: boolean;
  access_token: string;
}

export interface PostInstagramJobData {
  job_id: string;
  video_id: string;
  workspace_id: string;
  storage_path: string;
  caption: string;           // caption with hashtags inline
  ig_user_id: string;
  share_to_feed: boolean;
  access_token: string;
}

export type VideoJobData =
  | VideoGenerateJobData
  | VideoMergeJobData
  | VideoDownloadJobData
  | VideoAnalyzeJobData
  | VideoExtractJobData
  | AvatarRenderJobData
  | PostTikTokJobData
  | PostYouTubeJobData
  | PostInstagramJobData;
