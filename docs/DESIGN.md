# Product and interaction design
The November 2026 revision replaces the presentation-led scrolling page with a task-oriented field planning workspace.

References requested by the user:
- Watermelon UI: https://ui.watermelon.sh/llms.txt and its Gridline workspace registry https://registry.watermelon.sh/r/gridline-dashboard.json. Reviewed navigation, workspace composition, restrained surfaces, search and theme patterns. The implementation is original vanilla HTML/CSS/JS; no React component source is copied.
- Emil Kowalski: https://github.com/emilkowalski/skills/blob/main/skills/emil-design-eng/SKILL.md. Applied short explicit transform/opacity transitions, press feedback, reduced-motion handling, touch-safe hover, and immediate keyboard navigation.

| Before | After | Why |
| --- | --- | --- |
| Promotional hero before the tool | Planner opens immediately | Put the farmer's task first |
| One long scrolling document | Distinct workspace, observations, decisions and evidence views | Preserve task context |
| Static rotation cards | Selectable comparison table and editable seasonal sequence | Support decisions and iteration |
| One browser snapshot | Multiple fields and named decision snapshots | Support repeat planning |
| Decorative schematic field image | Observations with source lineage and month inspection | Prioritize actionable data |

Motion is reserved for occasional dialog/notification entry and press feedback. No count-up metrics, moving charts, delayed navigation or constant decorative motion. Keyboard action search is instant. Light/dark themes persist locally. All native inputs have visible labels, dialogs use the browser focus model, and comparison actions are keyboard reachable. Data remains local to the browser; this revision does not claim backend collaboration.

The geospatial revision introduces Field intelligence as a dedicated spatial workspace. Satellite/street basemaps carry dated NASA observations as coarse cells; the original schematic is not used. The planner includes a direct map entry. A docked inspector, explicit layer legends and a data table connect the spatial overview to exact values and the rotation workflow. Playback requires an explicit user action and stops on navigation or a hidden tab. Geographic place labels help orient the imagery without pretending to add farm-level measurements.
