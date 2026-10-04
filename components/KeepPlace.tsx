import { RESTORE_PLACE } from "@/lib/keepPlace";

// After a FR/EN switch, puts the new page where the old one was (lib/keepPlace.ts).
// An inline script runs as the HTML is parsed, so the page never paints at the top
// first. Server-only (the root layouts): the switch is always a full page load.
export default function KeepPlace() {
  return <script dangerouslySetInnerHTML={{ __html: RESTORE_PLACE }} />;
}
