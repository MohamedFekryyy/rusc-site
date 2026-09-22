import { Gilda_Display, Jost } from "next/font/google";

// The families the old pages loaded from Google Fonts, now self-hosted.
// Every subset is served (ū comes from latin-ext); only latin is preloaded.
export const gilda = Gilda_Display({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-gilda",
});

// No italic: nothing visible uses it, and next/font would preload it on
// every page. Add style: ["normal", "italic"] if the reviews block
// (.quote p, italic) is ever shown.
export const jost = Jost({
  weight: ["300", "400", "500"],
  subsets: ["latin"],
  variable: "--font-jost",
});
