import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { isOwner } from "@/controllers/server/auth/session";
import { SavedPage } from "@/components/pages/saved";
export const metadata = { title: "Saved Articles — The Personalized Time", robots: { index: false, follow: false } };
async function ReadingList() {
  await connection();
  if (!await isOwner()) redirect("/sign-in");
  return <SavedPage date={new Date().toISOString()} />;
}
export default function Page() { return <Suspense fallback={<p role="status">Loading saved articles…</p>}><ReadingList /></Suspense>; }
