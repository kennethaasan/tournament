import type {
  ScoreboardData,
  ScoreboardGroupTable,
  ScoreboardMatch,
  ScoreboardStanding,
  ScoreboardTopScorer,
} from "@/modules/public/scoreboard-types";

export type ScoreboardMode = "landing" | "screen";

export type SeasonTheme =
  | "auto"
  | "christmas"
  | "winter"
  | "spring"
  | "summer"
  | "fall";

export type ThemeSource = "competition" | "season";

export type MatchStatusFilter = "all" | "live" | "scheduled" | "finalized";
export type MatchSortOption = "time" | "venue" | "group";

export type ConnectionStatus = "connected" | "connecting" | "disconnected";

export type ScoreboardScreenProps = {
  initialData: ScoreboardData;
  competitionSlug: string;
  editionSlug: string;
};

export type ScreenLayoutProps = {
  overlayText: string;
  hasHighlight: boolean;
  highlightAnimating: boolean;
  showTopScorers?: boolean;
  matches: ScoreboardMatch[];
  standings: ScoreboardStanding[];
  tables: ScoreboardGroupTable[];
  scorers: ScoreboardTopScorer[];
  entryNames: Map<string, string>;
};

export type LandingLayoutProps = {
  data: ScoreboardData;
  entryNames: Map<string, string>;
  overlayText: string;
  hasHighlight: boolean;
  showTopScorers?: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: MatchStatusFilter;
  onStatusFilterChange: (filter: MatchStatusFilter) => void;
  sortOption: MatchSortOption;
  onSortOptionChange: (option: MatchSortOption) => void;
  connectionStatus: ConnectionStatus;
  lastUpdated: Date | null;
  isLoading: boolean;
};

export type {
  ScoreboardData,
  ScoreboardGroupTable,
  ScoreboardMatch,
  ScoreboardStanding,
  ScoreboardTopScorer,
};

export const FULL_HD_WIDTH = 1920;
export const FULL_HD_HEIGHT = 1080;
export const SEASON_THEME_STORAGE_KEY = "scoreboard-season-theme";
export const THEME_SOURCE_STORAGE_KEY = "scoreboard-theme-source";
// No limit - show all matches in screen mode
export const SCREEN_STANDINGS_LIMIT = 8;
export const SCREEN_GROUP_TABLES_LIMIT = 6;
export const CONTROLS_HIDE_DELAY_MS = 3000;
