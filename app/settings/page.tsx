"use client";

import { useSettings } from "./profile/context";
import { AccountSection } from "./profile/account";
import { SecuritySection } from "./profile/security";
import { NotificationsSection } from "./profile/notifications";
import { ScanningSection } from "./profile/scanning";
import { WebhooksSection } from "./profile/webhooks";
import { ReposSection } from "./profile/repos";
import { RetentionSection } from "./profile/retention";
import { TeamsSection } from "./profile/teams";
import { PlanSection } from "./profile/plan";

const SECTION_MAP: any = {
  account: AccountSection,
  security: SecuritySection,
  notifications: NotificationsSection,
  scanning: ScanningSection,
  webhooks: WebhooksSection,
  repos: ReposSection,
  retention: RetentionSection,
  teams: TeamsSection,
  plan: PlanSection,
} as const;

export default function SettingsPage() {
  const active = "account";

  const Component = SECTION_MAP[active];

  return <Component />;
}
