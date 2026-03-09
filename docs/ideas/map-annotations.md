# Map Annotation Ideas

*Product-manager voice. These are forward-looking ideas for enriching the lobby mindmap with personal data layers and navigation tools.*

---

## 1. Visited-Place Tagging

After a user opens an exploration, drop a "visited" pin on the lobby map at that node. Visit history is already tracked in `user-state.js` via `hasVisited()` — the data is there, it just needs a visual treatment.

**Visual treatment ideas:**
- Small checkmark badge (✓) rendered below the node dot
- Subtle glow ring at 40% opacity using the node's topic color
- Visited nodes rendered at full opacity (already done), unvisited at 65% — but the distinction could be stronger: visited nodes could have a small inner highlight

**Why it matters:** Learners get a sense of their own progress mapped spatially. They can see "I've explored this whole Chaos cluster" without counting.

---

## 2. Saved-Image Annotations

When you save a snapshot inside an exploration, show a tiny thumbnail badge on that node in the lobby. Clicking the node while in the lobby could reveal a preview strip of your saved snapshots for that exploration.

**Implementation sketch:**
- `getSnapshots(id)` already exists in `user-state.js`
- On lobby load, check which nodes have non-empty snapshot lists
- Render a small camera icon (📷) or thumbnail overlay on nodes with saves
- On click: open a small popover strip above the node showing snapshot thumbnails, each clickable to navigate to that exploration with that snapshot pre-loaded

---

## 3. Note Indicators

A small "✎" badge on nodes where the user has saved notes (via the Notes tab in the info panel). Clicking goes straight to that exploration's Notes tab.

`getNote(id)` exists in `user-state.js`. On lobby load, check all nodes in parallel and mark the ones with non-empty notes.

---

## 4. "Driving" from Node to Node (Guided Routes)

Find the shortest path through the `foundations`/`extensions` graph between any two selected nodes. Highlight that path as a colored overlay on the lobby.

**User flow:**
1. Right-click (or shift-click) a starting node → "Start route from here"
2. Click a destination node → lobby highlights the path
3. Click "Drive" → guided tour starts: each exploration in order, with the lobby visible in a picture-in-picture corner so learners always see where they are

**Why it matters:** The graph encodes learning prerequisites. Guided routes turn that structure into a curated on-ramp — "to understand Lorenz, go through Logistic Map → Bifurcation → Lorenz."

---

## 5. Trail Overlay

The 8 learning trails in `js/trails/` form curated paths through the graph. Render them as coloured polylines across the lobby map, toggled on/off via a "Show Trails" button.

- Each trail gets a distinct color (already have trail data with names)
- Hover a trail segment → tooltip shows trail name and step number
- Clicking the trail name in the legend zooms and highlights just that trail's nodes
- Active trail (if user is in a trail) gets a pulsing animation

---

## 6. Zoom-to-Region

Clicking a region label (e.g., "Fractal Geometry" drawn as a large semi-transparent watermark) should animate the viewport to frame all nodes in that topic cluster with a small padding margin.

Implement as: compute bounding box of all nodes with that topic tag in world space, then animate `GraphPanZoom` to center on that bounding box.

---

## 7. Personal "Constellation"

The subgraph of explorations the user has visited, rendered as a glowing overlay — edges lit up only between visited nodes, unvisited nodes dimmed further.

**Share as URL hash:** Encode visited node IDs in the URL hash so a user can share their learning map with others. The recipient sees the constellation grayed-out (not their own data) but can use it as inspiration.

This turns the lobby into a social artefact — "here's the path I took through the math."
