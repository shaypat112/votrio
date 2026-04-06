"use client";

import { useSearchParams } from "next/navigation";

import { AccountSection } from "./profile/account";
import { SecuritySection } from "./profile/security";
import { NotificationsSection } from "./profile/notifications";
import { ScanningSection } from "./profile/scanning";
import { AppearanceSection } from "./profile/appearance";
import { WebhooksSection } from "./profile/webhooks";
import { BillingSection } from "./profile/billing";

import { RetentionSection } from "./profile/retention";
import { TeamsSection } from "./profile/teams";
import { AdminSection } from "./profile/admin";
import { Suspense } from "react";

const SECTION_MAP = {
  account: AccountSection,
  security: SecuritySection,
  notifications: NotificationsSection,
  scanning: ScanningSection,
  billing: BillingSection,
  appearance: AppearanceSection,
  webhooks: WebhooksSection,

  retention: RetentionSection,
  teams: TeamsSection,
  admin: AdminSection,
} satisfies Record<string, React.ComponentType>;

type SectionKey = keyof typeof SECTION_MAP;

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center">Loading...</div>}>
      <SettingsContent />
    </Suspense>
  );
}

function SettingsContent() {
  const searchParams = useSearchParams();
  const active = (searchParams?.get("section") as SectionKey) ?? "account";

  const Component = SECTION_MAP[active] ?? AccountSection;

  return <Component />;
}
