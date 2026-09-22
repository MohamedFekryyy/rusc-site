import { Gilda_Display, Jost } from "next/font/google";

// The families the old pages loaded from Google Fonts, now self-hosted.
// Every subset is served (ū comes from latin-ext); only latin is preloaded.
export const gilda = Gilda_Display({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-gilda",
});

export const jost = Jost({
  weight: ["300", "400", "500"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-jost",
});
