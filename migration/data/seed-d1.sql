-- Bargheto Handbook V62 public-data seed
-- Apply drizzle migrations first. This seed intentionally excludes users, permissions, sessions and audit logs.
INSERT INTO handbook_content (
  id, welcome_title, about_title, about_body, sales_title, sales_body, customizations, updated_at
) VALUES (
  1,
  'به برقتو خوش آمدید',
  'برقتو چه مسئله‌ای را حل می‌کند؟',
  '',
  'مسیر نمونه واحد فروش',
  '',
  '{"texts":{"step-1-section-1.div-1.p-0":"امید علوی","nav-step-2":"واحد ها","entity-unit-3-div-0.h3-0":"فناوری","nav-step-1":"هیئت‌مدیره","nav-step-0":"معرفی برقتو","step-2-section-0.div-0.div-0.h2-0":"واحدها","entity-policy-0-ul-0.li-0":"sdfsdfsdfsd"},"textStyles":{},"images":{"step-0-image-section-0.div-1.img-0":"/api/upload?key=handbook%2Fd0ecd086-2c21-400e-ba5c-dc9769ce3ef9.webp","section-company-step-0-image-section-0.div-1.img-0":"__deleted__"},"orders":{"step-2-group-0":["step-2-group-0-item-0","step-2-group-0-item-1","step-2-group-0-item-2","step-2-group-0-item-3","step-2-group-0-item-4","step-2-group-0-item-5","step-2-group-0-item-6","step-2-group-0-item-7"]},"sizes":{},"structure":{"addedPeople":[],"removedPeople":[],"addedUnits":[],"removedUnits":[],"addedPolicies":[],"removedPolicies":[],"customSections":[],"hiddenSections":[]}}',
  '2026-08-01T12:31:55.866Z'
)
ON CONFLICT(id) DO UPDATE SET
  welcome_title = excluded.welcome_title,
  about_title = excluded.about_title,
  about_body = excluded.about_body,
  sales_title = excluded.sales_title,
  sales_body = excluded.sales_body,
  customizations = excluded.customizations,
  updated_at = excluded.updated_at;
