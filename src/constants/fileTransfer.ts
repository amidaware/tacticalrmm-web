export const FILE_TRANSFER_DEFAULT_CHUNK_SIZE = 8 * 1024 * 1024;
export const FILE_TRANSFER_DOWNLOAD_CHUNK_TIMEOUT_MS = 120_000;
export const FILE_TRANSFER_UPLOAD_CHUNK_TIMEOUT_MS = 300_000;
export const FILE_TRANSFER_UPLOAD_READY_TIMEOUT_MS = 15_000;
export const FILE_TRANSFER_COMPLETE_TIMEOUT_MS = 120_000;
export const ARCHIVE_STATUS_POLL_INTERVAL_MS = 1_500;
export const MAX_IN_MEMORY_DOWNLOAD_BYTES = 512 * 1024 * 1024;
export const FILE_TRANSFER_UPLOAD_RESUME_LS_KEY = "trmm-resume-up";
export const FILE_TRANSFER_DOWNLOAD_RESUME_LS_KEY = "trmm-resume-dl";
export const FILE_TRANSFER_RESUME_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
export const FILE_TRANSFER_DOWNLOAD_IDB_NAME = "trmm-transfer";
export const FILE_TRANSFER_DOWNLOAD_IDB_STORE = "handles";
export const FILE_TRANSFER_DOWNLOAD_BYTES_STORE = "download_bytes";
export const FILE_TRANSFER_UI_META_IDB_STORE = "ui_meta";
export const FILE_TRANSFER_IDB_VERSION = 3;
export const FILE_TRANSFER_LOCAL_PAUSED_LS_KEY = "trmm-transfer-local-paused";
export const FILE_TRANSFER_TAB_SYNC_CHANNEL = "trmm-file-transfer-tab-sync";
export const FILE_TRANSFER_TAB_SYNC_HEARTBEAT_MS = 5_000;
export const FILE_TRANSFER_TAB_SYNC_STALE_MS = 15_000;
export const FILE_TRANSFER_SLOT_RETRY_BASE_MS = 2_000;
export const FILE_TRANSFER_SLOT_RETRY_MAX_MS = 30_000;
export const FILE_TRANSFER_SLOT_RETRY_MAX_ATTEMPTS = 20;
export const FILE_TRANSFER_SLOT_RETRY_MAX_DURATION_MS = 10 * 60 * 1000;
export const TRANSFER_SLOT_WAIT_MESSAGE =
  "Waiting for a free transfer slot. All slots are in use, possibly by other users; cancelling one of your paused transfers frees one.";
export const TRANSFER_SLOT_WAIT_TIMEOUT_MESSAGE =
  "No transfer slot became available. All slots are in use, possibly by other users; cancel one of your paused transfers or try again later.";
export const TRANSFER_RATE_LIMIT_MESSAGE =
  "Too many requests. Try again later.";
export const FILE_TRANSFER_TRANSIENT_RETRY_ATTEMPTS = 4;
export const FILE_TRANSFER_TRANSIENT_RETRY_BASE_MS = 500;
export const FILE_TRANSFER_TRANSIENT_RETRY_MAX_MS = 4_000;
export const FILE_TRANSFER_TRANSIENT_RETRY_MAX_DURATION_MS = 60_000;
export const FILE_TRANSFER_TRANSIENT_RETRY_HARD_CAP = 40;
// A 408/204 means "not yet": the server answered, so the connection is fine.
// Poll with backoff (50 ms doubling to 2 s): a short first step because the
// agent usually delivers within ~100 ms on a fast link, the 2 s cap so a long
// stall costs one request every 2 s.
export const FILE_TRANSFER_ACK_POLL_MS = 50;
export const FILE_TRANSFER_ACK_POLL_MAX_MS = 2_000;
// must be longer than the agent's 120 s push/pull timeout
export const FILE_TRANSFER_ACK_WAIT_MAX_MS = 150_000;
export const FILE_TRANSFER_STALL_NOTICE_MS = 30_000;
export const FILE_TRANSFER_FINALIZE_WAIT_MAX_MS = 10 * 60 * 1000;
export const FILE_TRANSFER_AUTO_RESUME_ATTEMPTS = 5;
export const FILE_TRANSFER_AUTO_RESUME_DELAY_MS = 15_000;
export const TRANSFER_RECONNECTING_MESSAGE =
  "Connection interrupted — reconnecting…";
export const DOWNLOAD_FILE_ACCESS_DENIED_MESSAGE =
  "File access was not allowed. Click Resume and allow access to continue the download.";
export const TRANSFER_CONNECTION_LOST_MESSAGE =
  "Connection lost. Click Resume to continue.";
export const TRANSFER_TOOLTIP_CLEAR_FINISHED =
  "Remove completed, failed, and cancelled items from this list.";
export const TRANSFER_TOOLTIP_HIDE_PAUSED =
  "Hide paused items. Open Transfers to show them again.";
export const TRANSFER_TOOLTIP_PAUSE_ALL =
  "Pause all active and queued downloads.";
export const TRANSFER_TOOLTIP_PAUSE = "Pause this download.";
export const TRANSFER_TOOLTIP_CANCEL =
  "Cancel download and release the transfer slot.";
export const TRANSFER_TOOLTIP_CANCEL_EXTRACT =
  "Cancel the extraction. Files already extracted are kept.";
export const TRANSFER_TOOLTIP_PAUSE_UPLOAD = "Pause this upload.";
export const TRANSFER_TOOLTIP_CANCEL_UPLOAD =
  "Cancel upload and release the transfer slot.";
export const TRANSFER_TOOLTIP_OPEN_IN_OTHER_TAB = "Open in another tab";
export const TRANSFER_TOOLTIP_DISMISS = "Dismiss";
export const TRANSFER_TOOLTIP_REMOVE_FROM_QUEUE = "Remove from queue";
export const TRANSFER_SLOT_WAIT_LABEL = "Waiting for slot…";
export const TRANSFER_RECONNECTING_LABEL = "Reconnecting…";
export const TRANSFER_WAITING_FOR_AGENT_MESSAGE = "Waiting for the agent…";
export const TRANSFER_WAITING_FOR_AGENT_LABEL = "Waiting for agent…";
