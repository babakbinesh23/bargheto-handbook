import { readFile, writeFile } from "node:fs/promises";

const contentPayload = JSON.parse(await readFile(new URL("./content.json", import.meta.url), "utf8"));
const customizationsPayload = JSON.parse(await readFile(new URL("./customizations.json", import.meta.url), "utf8"));
const content = contentPayload.content ?? {};
const customizations = JSON.stringify(customizationsPayload.customizations ?? {});

const sqlString = (value = "") => `'${String(value).replaceAll("'", "''")}'`;
const updatedAt = contentPayload.updatedAt ?? new Date().toISOString();

const sql = `-- Bargheto Handbook V62 public-data seed
-- Apply drizzle migrations first. This seed intentionally excludes users, permissions, sessions and audit logs.
INSERT INTO handbook_content (
  id, welcome_title, about_title, about_body, sales_title, sales_body, customizations, updated_at
) VALUES (
  1,
  ${sqlString(content.welcomeTitle)},
  ${sqlString(content.aboutTitle)},
  ${sqlString(content.aboutBody)},
  ${sqlString(content.salesTitle)},
  ${sqlString(content.salesBody)},
  ${sqlString(customizations)},
  ${sqlString(updatedAt)}
)
ON CONFLICT(id) DO UPDATE SET
  welcome_title = excluded.welcome_title,
  about_title = excluded.about_title,
  about_body = excluded.about_body,
  sales_title = excluded.sales_title,
  sales_body = excluded.sales_body,
  customizations = excluded.customizations,
  updated_at = excluded.updated_at;
`;

await writeFile(new URL("./seed-d1.sql", import.meta.url), sql, "utf8");
