import { relations, sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from "drizzle-orm/pg-core";

export const authProviderEnum = pgEnum("auth_provider", ["github", "google", "email", "orcid"]);
export const notebookStatusEnum = pgEnum("notebook_status", ["draft", "published", "unlisted"]);
export const voteTargetTypeEnum = pgEnum("vote_target_type", ["notebook", "comment"]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    username: text("username").notNull(),
    email: text("email").notNull(),
    authProvider: authProviderEnum("auth_provider").notNull(),
    displayName: text("display_name").notNull(),
    bio: text("bio"),
    avatarUrl: text("avatar_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    emailIdx: uniqueIndex("users_email_idx").on(table.email),
    usernameIdx: uniqueIndex("users_username_idx").on(table.username)
  })
);

export const notebooks = pgTable(
  "notebooks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    tags: text("tags").array().default(sql`ARRAY[]::text[]`).notNull(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    parentNotebookId: uuid("parent_notebook_id").references((): AnyPgColumn => notebooks.id, {
      onDelete: "set null"
    }),
    studyUrl: text("study_url"),
    ipynbPath: text("ipynb_path").notNull(),
    htmlPath: text("html_path").notNull(),
    kernelLanguage: text("kernel_language").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    voteCount: integer("vote_count").default(0).notNull(),
    forkCount: integer("fork_count").default(0).notNull(),
    commentCount: integer("comment_count").default(0).notNull(),
    viewCount: integer("view_count").default(0).notNull(),
    status: notebookStatusEnum("status").default("draft").notNull()
  },
  (table) => ({
    ownerSlugIdx: uniqueIndex("notebooks_owner_slug_idx").on(table.ownerId, table.slug)
  })
);

export const comments = pgTable("comments", {
  id: uuid("id").defaultRandom().primaryKey(),
  notebookId: uuid("notebook_id")
    .notNull()
    .references(() => notebooks.id, { onDelete: "cascade" }),
  cellIndex: integer("cell_index"),
  parentCommentId: uuid("parent_comment_id").references((): AnyPgColumn => comments.id, {
    onDelete: "cascade"
  }),
  authorId: uuid("author_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  voteCount: integer("vote_count").default(0).notNull()
});

export const votes = pgTable(
  "votes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    targetType: voteTargetTypeEnum("target_type").notNull(),
    targetId: uuid("target_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    userTargetIdx: uniqueIndex("votes_user_target_idx").on(table.userId, table.targetType, table.targetId)
  })
);

export const usersRelations = relations(users, ({ many }) => ({
  comments: many(comments),
  notebooks: many(notebooks),
  votes: many(votes)
}));

export const notebooksRelations = relations(notebooks, ({ many, one }) => ({
  comments: many(comments),
  forks: many(notebooks),
  owner: one(users, {
    fields: [notebooks.ownerId],
    references: [users.id]
  }),
  parentNotebook: one(notebooks, {
    fields: [notebooks.parentNotebookId],
    references: [notebooks.id]
  })
}));

export const commentsRelations = relations(comments, ({ many, one }) => ({
  author: one(users, {
    fields: [comments.authorId],
    references: [users.id]
  }),
  notebook: one(notebooks, {
    fields: [comments.notebookId],
    references: [notebooks.id]
  }),
  parentComment: one(comments, {
    fields: [comments.parentCommentId],
    references: [comments.id]
  }),
  replies: many(comments)
}));

export const votesRelations = relations(votes, ({ one }) => ({
  user: one(users, {
    fields: [votes.userId],
    references: [users.id]
  })
}));
