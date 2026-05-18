import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { listLcRecipients } from "@/actions/lc-recipients";
import { getAppSetting } from "@/actions/app-settings";
import { FROM_EMAIL_SETTING_KEY } from "@/lib/lc-email";
import { FromAddressSection } from "@/components/settings/from-address-section";
import { LcRecipientsSection } from "@/components/settings/lc-recipients-section";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect("/auth/signin");
  if (session.role !== "owner" && session.role !== "super_admin") {
    redirect("/events");
  }

  const [recipients, fromEmail] = await Promise.all([
    listLcRecipients(),
    getAppSetting(FROM_EMAIL_SETTING_KEY),
  ]);

  const envFromFallback = process.env.FROM_EMAIL ?? null;

  return (
    <div className="max-w-3xl">
      <h1 className="font-[family-name:var(--font-cormorant)] text-3xl font-light text-charcoal tracking-tight mb-2">
        Settings
      </h1>
      <p className="font-[family-name:var(--font-raleway)] text-sm text-grey mb-10">
        Manage who briefs are sent to and from.
      </p>

      <FromAddressSection
        currentValue={fromEmail}
        envFallback={envFromFallback}
      />

      <LcRecipientsSection recipients={recipients} />
    </div>
  );
}
