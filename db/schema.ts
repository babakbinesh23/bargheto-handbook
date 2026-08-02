import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const handbookContent = sqliteTable("handbook_content", {
  id: integer("id").primaryKey(),
  welcomeTitle: text("welcome_title")
    .notNull()
    .default("به برقتو خوش آمدید"),
  aboutTitle: text("about_title")
    .notNull()
    .default("برقتو چه مسئله‌ای را حل می‌کند؟"),
  aboutBody: text("about_body").notNull().default(""),
  salesTitle: text("sales_title").notNull().default("مسیر نمونه واحد فروش"),
  salesBody: text("sales_body").notNull().default(""),
  customizations: text("customizations").notNull().default("{}"),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const handbookUsers = sqliteTable(
  "handbook_users",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    username: text("username"),
    passwordHash: text("password_hash"),
    passwordSalt: text("password_salt"),
    fullName: text("full_name").notNull(),
    title: text("title").notNull().default(""),
    role: text("role").notNull().default("user"),
    status: text("status").notNull().default("active"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("handbook_users_email_unique").on(table.email),
    uniqueIndex("handbook_users_username_unique").on(table.username),
  ],
);

export const handbookSessions = sqliteTable(
  "handbook_sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    expiresAt: text("expires_at").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("handbook_sessions_user_idx").on(table.userId),
    index("handbook_sessions_expires_idx").on(table.expiresAt),
  ],
);

export const handbookUserPermissions = sqliteTable(
  "handbook_user_permissions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    sectionKey: text("section_key").notNull(),
    resourceKey: text("resource_key").notNull().default("*"),
    canEditText: integer("can_edit_text", { mode: "boolean" }).notNull().default(false),
    canEditImage: integer("can_edit_image", { mode: "boolean" }).notNull().default(false),
    canManageItems: integer("can_manage_items", { mode: "boolean" }).notNull().default(false),
    canReorder: integer("can_reorder", { mode: "boolean" }).notNull().default(false),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("handbook_permissions_user_section_resource_unique").on(
      table.userId,
      table.sectionKey,
      table.resourceKey,
    ),
    index("handbook_permissions_user_idx").on(table.userId),
  ],
);

export const handbookNotifications = sqliteTable(
  "handbook_notifications",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    message: text("message").notNull(),
    sectionKey: text("section_key").notNull(),
    resourceKey: text("resource_key"),
    step: integer("step").notNull().default(0),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("handbook_notifications_created_idx").on(table.createdAt)],
);

export const handbookAuditLog = sqliteTable(
  "handbook_audit_log",
  {
    id: text("id").primaryKey(),
    actorUserId: text("actor_user_id"),
    actorEmail: text("actor_email").notNull(),
    action: text("action").notNull(),
    sectionKey: text("section_key"),
    summary: text("summary").notNull(),
    beforeJson: text("before_json"),
    afterJson: text("after_json"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("handbook_audit_created_idx").on(table.createdAt)],
);
