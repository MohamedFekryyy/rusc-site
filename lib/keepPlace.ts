// FR/EN keeps your place on the page. The two languages are separate pages
// (separate root layouts, so the switch is a full page load), but their markup
// runs in parallel. On click, savePlace() notes the element under the header's
// bottom edge as a path of child indices, with how far into each element that
// line falls. The new page's inline RESTORE_PLACE script follows the same path
// before the first paint and scrolls to the same point; the texts' lengths
// differ, so landing at a fraction of the element absorbs the difference.

const KEY = "rusc-place";

type Step = { i: number; t: string; f: number };

// Children that count for the path: in the page's flow (not the fixed menu
// panel or its scrim, which only exist while the menu is open), no scripts.
// RESTORE_PLACE repeats this filter: keep the two in step.
function flowChildren(el: Element) {
  return Array.from(el.children).filter(
    (c) => !["SCRIPT", "STYLE", "LINK", "NOSCRIPT"].includes(c.tagName) && getComputedStyle(c).position !== "fixed"
  );
}

function readingLine() {
  const header = document.querySelector("header");
  return header ? Math.max(0, header.getBoundingClientRect().bottom) : 0;
}

export function savePlace(href: string) {
  try {
    sessionStorage.removeItem(KEY);
    if (window.scrollY < 1) return;
    const line = readingLine();
    const path: Step[] = [];
    let el: Element = document.body;
    for (let depth = 0; depth < 16; depth++) {
      const kids = flowChildren(el);
      const i = kids.findIndex((c) => {
        const r = c.getBoundingClientRect();
        if (r.height <= 0 || r.top > line || r.bottom <= line) return false;
        const style = getComputedStyle(c);
        // Stop at text: inline runs differ between the two languages.
        return style.position !== "sticky" && style.display !== "inline" && style.display !== "contents";
      });
      if (i < 0) break;
      const r = kids[i].getBoundingClientRect();
      path.push({ i, t: kids[i].tagName, f: (line - r.top) / r.height });
      el = kids[i];
    }
    const max = document.documentElement.scrollHeight - window.innerHeight;
    sessionStorage.setItem(
      KEY,
      JSON.stringify({
        to: new URL(href, window.location.href).pathname,
        path,
        ratio: max > 0 ? window.scrollY / max : 0,
        at: Date.now(),
      })
    );
  } catch {
    // No sessionStorage (private mode): the page opens at the top, as before.
  }
}

// Runs inline at the end of <body> (see KeepPlace), once the page is parsed and
// before it paints. Fonts and images can still move things a little, so it
// settles once more when they're in, unless the visitor has scrolled since.
export const RESTORE_PLACE = `(function(){try{
var s=sessionStorage.getItem(${JSON.stringify(KEY)});if(!s)return;
sessionStorage.removeItem(${JSON.stringify(KEY)});
var p=JSON.parse(s);if(p.to!==location.pathname||Date.now()-p.at>15000)return;
function kids(el){return Array.prototype.filter.call(el.children,function(c){
return ["SCRIPT","STYLE","LINK","NOSCRIPT"].indexOf(c.tagName)<0&&getComputedStyle(c).position!=="fixed";});}
function go(){
var h=document.querySelector("header"),line=h?Math.max(0,h.getBoundingClientRect().bottom):0;
var el=document.body,hit=null,f=0;
for(var d=0;d<p.path.length;d++){var st=p.path[d],c=kids(el)[st.i];if(!c||c.tagName!==st.t)break;el=hit=c;f=st.f;}
var y;
if(hit){var r=hit.getBoundingClientRect();y=scrollY+r.top+f*r.height-line;}
else y=p.ratio*(document.documentElement.scrollHeight-innerHeight);
scrollTo({top:Math.max(0,Math.round(y)),behavior:"instant"});
return scrollY;}
var at=go();
function again(){if(Math.abs(scrollY-at)<2)at=go();}
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(again);
addEventListener("load",again,{once:true});
}catch(e){}})();`;
