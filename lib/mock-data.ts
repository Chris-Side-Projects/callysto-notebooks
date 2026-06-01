// Mock data for the pre-database scaffold. Replace with real DB queries
// once Phase 1 (Read + Publish) wiring lands.

export type MockUser = {
  username: string;
  displayName: string;
  avatarUrl: string | null;
};

export type MockNotebook = {
  slug: string;
  title: string;
  description: string;
  tags: string[];
  owner: MockUser;
  studyTitle: string | null;
  studyUrl: string | null;
  kernelLanguage: "python" | "r" | "julia";
  cellCount: number;
  publishedAt: string; // ISO
  voteCount: number;
  forkCount: number;
  commentCount: number;
};

const chris: MockUser = {
  username: "chris",
  displayName: "Chris",
  avatarUrl: null,
};

const mira: MockUser = {
  username: "mira",
  displayName: "Mira Okafor",
  avatarUrl: null,
};

const dlee: MockUser = {
  username: "dlee",
  displayName: "Daniel Lee",
  avatarUrl: null,
};

export const mockNotebooks: MockNotebook[] = [
  {
    slug: "replicating-card-krueger-1994",
    title: "Replicating Card & Krueger (1994) on minimum wage effects",
    description:
      "Rebuilt the difference-in-differences analysis from the New Jersey / Pennsylvania fast-food study. Original CSVs, robust SEs, and a few sensitivity checks.",
    tags: ["economics", "diff-in-diff", "replication"],
    owner: chris,
    studyTitle:
      "Card & Krueger (1994). Minimum Wages and Employment. American Economic Review.",
    studyUrl: "https://www.aeaweb.org/articles?id=10.1257/aer.84.4.772",
    kernelLanguage: "python",
    cellCount: 42,
    publishedAt: "2026-05-28T12:00:00Z",
    voteCount: 184,
    forkCount: 23,
    commentCount: 11,
  },
  {
    slug: "covid-mortality-undercount-bayes",
    title: "A Bayesian look at COVID mortality undercounts",
    description:
      "Hierarchical model over excess-death data by country. Posterior intervals on true IFR by age stratum.",
    tags: ["epidemiology", "bayes", "pymc"],
    owner: mira,
    studyTitle: null,
    studyUrl: null,
    kernelLanguage: "python",
    cellCount: 31,
    publishedAt: "2026-05-26T09:30:00Z",
    voteCount: 142,
    forkCount: 18,
    commentCount: 27,
  },
  {
    slug: "gpt4-arithmetic-replication",
    title: "Does GPT-4 actually do arithmetic? Replicating Frieder et al.",
    description:
      "Re-running the test battery from the paper on the latest model snapshot. Spoiler: results have changed.",
    tags: ["ml", "llm-eval", "replication"],
    owner: dlee,
    studyTitle:
      "Frieder et al. (2023). Mathematical Capabilities of ChatGPT.",
    studyUrl: "https://arxiv.org/abs/2301.13867",
    kernelLanguage: "python",
    cellCount: 19,
    publishedAt: "2026-05-22T18:10:00Z",
    voteCount: 98,
    forkCount: 9,
    commentCount: 14,
  },
  {
    slug: "kaplan-meier-from-scratch",
    title: "Kaplan–Meier survival curves from scratch",
    description:
      "A teaching notebook: implement the estimator step-by-step, then compare against lifelines.",
    tags: ["statistics", "survival-analysis", "teaching"],
    owner: mira,
    studyTitle: null,
    studyUrl: null,
    kernelLanguage: "python",
    cellCount: 24,
    publishedAt: "2026-05-19T08:00:00Z",
    voteCount: 76,
    forkCount: 12,
    commentCount: 5,
  },
  {
    slug: "housing-price-elasticity-by-msa",
    title: "Housing price elasticity by MSA, 2010–2024",
    description:
      "Panel regression across 384 metro areas with population and zoning controls.",
    tags: ["economics", "housing", "panel-data"],
    owner: chris,
    studyTitle: null,
    studyUrl: null,
    kernelLanguage: "python",
    cellCount: 36,
    publishedAt: "2026-05-15T14:45:00Z",
    voteCount: 64,
    forkCount: 7,
    commentCount: 9,
  },
  {
    slug: "rct-power-calculations-walkthrough",
    title: "RCT power calculations: a practical walkthrough",
    description:
      "From a single proportion to cluster-randomized trials. With simulations.",
    tags: ["statistics", "rct", "power-analysis"],
    owner: dlee,
    studyTitle: null,
    studyUrl: null,
    kernelLanguage: "python",
    cellCount: 28,
    publishedAt: "2026-05-11T11:20:00Z",
    voteCount: 51,
    forkCount: 4,
    commentCount: 3,
  },
];

export function findMockNotebook(
  username: string,
  slug: string,
): MockNotebook | undefined {
  return mockNotebooks.find(
    (n) => n.owner.username === username && n.slug === slug,
  );
}
