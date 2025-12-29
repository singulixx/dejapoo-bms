import type { Metadata } from "next";
import AccountSettingsClient from "./AccountSettingsClient";

export const metadata: Metadata = {
  title: "Account Settings",
};

export default function AccountPage() {
  return <AccountSettingsClient />;
}
