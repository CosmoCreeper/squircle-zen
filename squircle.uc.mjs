// The magic that calculates squircle coordinates
function squirclePath(width, height, n = roundness, steps = 32) {
  const r = Math.min(width, height) / 2 * Math.max(0, Math.min(1, cornerSize));

  function corner(cx, cy, signX, signY, startAngle) {
    const pts = [];
    for (let i = 0; i <= steps; i++) {
      const t = startAngle + (i / steps) * (Math.PI / 2);
      const lx = Math.pow(Math.abs(Math.cos(t)), 2 / n) * r;
      const ly = Math.pow(Math.abs(Math.sin(t)), 2 / n) * r;
      pts.push([cx + signX * lx, cy + signY * ly]);
    }
    return pts;
  }

  const tl = corner(r, r, -1, -1, 0);
  const tr = corner(width - r, r, +1, -1, Math.PI / 2);
  const br = corner(width - r, height - r, +1, +1, 0);
  const bl = corner(r, height - r, -1, +1, Math.PI / 2);

  const pts = [...tl, ...tr, ...br, ...bl];
  return pts.map((p, i) =>
    `${i === 0 ? 'M' : 'L'}${p[0].toFixed(3)},${p[1].toFixed(3)}`
  ).join(' ') + ' Z';
}

// Handle SVG cases (most)
function injectSquircle(elBg) {
  let svgBg = elBg.querySelector("svg.squircle");
  if (svgBg) {
    svgBg.querySelector("path").setAttribute("d",
      squirclePath(svgBg.clientWidthDouble, svgBg.clientHeightDouble)
    );
  } else {
    const svg = `
      <svg class="squircle" xmlns="http://www.w3.org/2000/svg"></svg>
    `;
    elBg.appendChild(MozXULElement.parseXULToFragment(svg));
    svgBg = elBg.querySelector("svg.squircle");
    const d = squirclePath(svgBg.clientWidthDouble, svgBg.clientHeightDouble);
    const path = `<path d="${d}" xmlns="http://www.w3.org/2000/svg" />`;
    svgBg.appendChild(MozXULElement.parseXULToFragment(path));
  }
}

const observer = new ResizeObserver(entries => {
  for (const entry of entries) {
    injectSquircle(entry.target);
  }
});

function handleEl(elBg, observe = true) {
  injectSquircle(elBg);
  if (observe) {
    observer.observe(elBg);
  }
}

// Handle clip-path cases
function clipSquircle(el, offset = 0) {
  el.style.clipPath = `path('${squirclePath(el.clientWidthDouble, el.clientHeightDouble, roundness + offset)}')`;
}

const clipPathObserver = new ResizeObserver(entries => {
  for (const entry of entries) {
    const offset = offsetMap[entry.target.id] || 0;
    clipSquircle(entry.target, offset);
  }
});

function clipEl(el, offset = 0, observe = true) {
  clipSquircle(el, offset);
  if (observe) {
    clipPathObserver.observe(el);
  }
}

// Offsets for each id
const offsetMap = {
  "tabbrowser-tabbox": 100,
};

// Render all squircles
function renderSquircles(observe = true) {
  // Standard SVG cases
  for (const tab of gZenWorkspaces.allStoredTabs) {
    handleEl(tab.querySelector(".tab-background"), observe);
  }
  for (const tab of gZenWorkspaces.allTabGroups) {
    handleEl(tab.querySelector(".tab-group-label-container"), observe);
  }
  for (const element of document.querySelectorAll("#tabs-newtab-button")) {
    handleEl(element, observe);
  }
  for (const element of document.querySelectorAll(".zen-current-workspace-indicator")) {
    handleEl(element, observe);
  }
  for (const element of document.querySelectorAll("#zen-sidebar-top-buttons toolbarbutton.toolbarbutton-1:not(.webextension-browser-action)")) {
    handleEl(element, observe);
  }
  for (const element of document.querySelectorAll("#zen-sidebar-foot-buttons > toolbarbutton.toolbarbutton-1")) {
    handleEl(element, observe);
  }
  for (const element of document.querySelectorAll(`.toolbaritem-combined-buttons.unified-extensions-item.chromeclass-toolbar-additional`)) {
    handleEl(element, observe);
  }
  handleEl(document.querySelector(".urlbar-background"), observe);

  // Clip-path cases
  clipEl(document.querySelector("#tabbrowser-tabbox"), offsetMap["tabbrowser-tabbox"], observe);
}

// Refresh roundness/intensity pref when necessary
const intensityPref = "zen.squircles.intensity";
const intensityObserver = {
  observe() {
    roundness = Number(Services.prefs.getStringPref("zen.squircles.intensity", "4"));
    renderSquircles(false);
  },
  unload() {
    Services.prefs.removeObserver(intensityPref, intensityObserver);
  },
};
Services.prefs.addObserver(intensityPref, intensityObserver);
window.addEventListener("beforeunload", intensityObserver.unload, { once: true });

// Custom prefs
let roundness = Number(Services.prefs.getStringPref(intensityPref, "4"));
const cornerSize = 1;

// Render all squircles
renderSquircles();

// Add initial tab open listener
gBrowser.tabContainer.addEventListener("TabOpen", (event) => {
  handleEl(event.target.querySelector(".tab-background"));
});

// Sine unload listener
window.addUnloadListener(() => {
  Array.from(document.getElementsByClassName("squircle")).forEach((el) => {
    el.remove();
  });
  intensityObserver.unload();
});
