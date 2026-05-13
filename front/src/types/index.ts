export type Lang = "sq" | "en" | "sr";

export type Localized<T extends string> = {
  [K in `${T}_${Lang}`]?: string;
};

export type EuObjective = Localized<"name" | "description" | "conditions"> & {
  id: string;
  slug?: string;
  cluster: string;
  completed: boolean;
  completed_at?: string | null;
  progress_percent?: number;
  source_url?: string | null;
  sort_order?: number;
  published?: boolean;
};
