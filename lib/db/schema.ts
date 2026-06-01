import {
  pgTable,
  pgEnum,
  uuid,
  text,
  varchar,
  timestamp,
  integer,
  index,
  uniqueIndex,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

// ---- Enums ----------------------------------------------------------------

export const authProviderEnum = pgEnum("auth_provider", [
  "github",
  "google",
  "orcid",
  "email",
]);

export const notebookStatusEnum = pgEnum("notebook_status", [
  "draft",
  "published",
  "unlisted",
]);

export const voteTargetEnum = pgEnum("vote_target", ["notebook", "comment"]);

// ---- users ----------------------------------------------------------------

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    username: varchar("username", { length: 39 }).notNull(),
    email: varchar("email", { length: 320 }).notNull(),
    authProvider: authProviderEnum("auth_provider").notNull(),
    authProviderId: varchar("auth_provider_id", { length: 255 }),
    displayName: varchar("display_name", { length: 120 }),
    bio: text("bio"),
    avatarUrl: text("avatar_url"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    usernameIdx: uniqueIndex("users_username_idx").on(t.username),
    emailIdx: uniqueIndex("users_email_idx").on(t.email),
  }),
);

// ---- notebooks ------------------------------------------------------------

export const notebooks = pgTable(
  "notebooks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: varchar("slug", { length: 120 }).notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description"),
    // Stored as a Postgres text[] of normalized tag slugs.
    tags: text("tags").array().notNull().default([]),

    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // Self-reference for forks. Typed via AnyPgColumn to avoid circular inference.
    parentNotebookId: uuid("parent_notebook_id").references(
      (): AnyPgColumn => notebooks.id,
      { onDelete: "set null" },
    ),

    studyUrl: text("study_url"),
    studyTitle: text("study_title"),

    ipynbPath: text("ipynb_path"),
    htmlPath: text("html_path"),

    kernelLanguage: varchar("kernel_language", { length: 40 }),
    kernelName: varchar("kernel_name", { length: 80 }),
    cellCount: integer("cell_count").notNull().default(0),

    publishedAt: timestamp("published_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    voteCount: integer("vote_count").notNull().default(0),
    forkCount: integer("fork_count").notNull().default(0),
    commentCount: integer("comment_count").notNull().default(0),
    viewCount: integer("view_count").notNull().default(0),

    status: notebookStatusEnum("status").notNull().default("draft"),
  },
  (t) => ({
    ownerSlugIdx: uniqueIndex("notebooks_owner_slug_idx").on(t.ownerId, t.slug),
    publishedAtIdx: index("notebooks_published_at_idx").on(t.publishedAt),
    parentIdx: index("notebooks_parent_idx").on(t.parentNotebookId),
  }),
);

// ---- comments -------------------------------------------------------------

export const comments = pgTable(
  "comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    notebookId: uuid("notebook_id")
      .notNull()
      .references(() => notebooks.id, { onDelete: "cascade" }),
    // null = top-level comment (not attached to a specific cell).
    cellIndex: integer("cell_index"),
    parentCommentId: uuid("parent_comment_id").references(
      (): AnyPgColumn => comments.id,
      { onDelete: "cascade" },
    ),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    voteCount: integer("vote_count").notNull().default(0),
  },
  (t) => ({
    notebookIdx: index("comments_notebook_idx").on(t.notebookId),
    parentIdx: index("comments_parent_idx").on(t.parentCommentId),
  }),
);

// ---- votes ----------------------------------------------------------------

export const votes = pgTable(
  "votes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    targetType: voteTargetEnum("target_type").notNull(),
    targetId: uuid("target_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    // One vote per user per target.
    uniqueVote: uniqueIndex("votes_user_target_idx").on(
      t.userId,
      t.targetType,
      t.targetId,
    ),
    targetIdx: index("votes_target_idx").on(t.targetType, t.targetId),
  }),
);

// ---- Inferred row types ---------------------------------------------------

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Notebook = typeof notebooks.$inferSelect;
export type NewNotebook = typeof notebooks.$inferInsert;
export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;
export type Vote = typeof votes.$inferSelect;
export type NewVote = typeof votes.$inferInsert;
