# Swatch: Product Design Document

## Summary

Swatch is an app for designers, creative professionals, and everyday users that provides superpowers for visual design creation. It delivers the experience of having a top-tier design team to develop ideas and bring them to life.

Like agentic coding tools (Cursor, Claude Code), Swatch features a UX specifically designed for its domain—visual design. Unlike traditional chat interfaces, it uses visual layouts and non-linear generation to create a highly visual and intuitive tool that produces stunning results.

---

## Core Concepts

### Projects

A **Project** is the top-level container for all design work. Each project contains:

- **Master Context** — The persistent reference materials that inform all design work
- **Design Threads** — Linear sequences of design iterations and explorations
- **Portfolio** — The collection of approved/finalized design outputs

**Project States:**
- `Draft` — Work in progress
- `In Review` — Awaiting feedback or approval
- `Approved` — Finalized and ready for delivery

### Master Context

The Master Context is a visual workspace (bulletin board/whiteboard metaphor) containing reference materials that inform the AI throughout the design process. It remains in the context window for all agent operations.

**Default Sections** (pre-created, ready to fill):

| Section | Purpose |
|---------|---------|
| Design Brief | Goals, constraints, deliverables |
| Inspiration | Visual references the user likes |
| Research | Market research, competitor analysis |
| Palette | Color schemes, typography choices |
| User Personas | Target audience profiles |
| Existing Designs | Brand assets that new work must align with |
| Current Iterations | Work-in-progress designs to improve |

**User-Created Sections:** Users can add custom sections (e.g., "Brand Standards," "Product Specifications," "Furniture to Reuse").

**Element Labels:** Any element (especially images) can have:
- A **description label** explaining what it is ("Kitchen we're remodeling")
- A **purpose label** explaining its role ("Interior design style I want to incorporate")
- An **"Outside of Context" flag** — Hides the element from AI processing (useful for client photos or irrelevant reference materials)

**Priority Tiers** (for context compression):

| Tier | Label | Compression Behavior |
|------|-------|---------------------|
| 1 | Must Have | Never compressed, always verbatim |
| 2 | Important | Light summarization when space is tight |
| 3 | Nice to Have | Aggressive summarization permitted |
| 4 | Inspiration Only | Can be embedded/retrieved rather than kept in active context |

### Design Threads

A **Design Thread** is a linear sequence of design iterations, displayed left-to-right as a scrollable timeline. Each thread is focused on a specific design task.

**Thread Prompt:** Every thread begins with a brief text prompt that defines the thread's purpose (e.g., "Design the kitchen layout" or "Create the preferences screen UI"). This prompt:
- Is text-only (no images)
- Should be kept brief (encouraged by UI hints)
- Always remains in context (never compressed or summarized)
- Serves as the "north star" for all work in that thread

**Thread Operations:**
- **Clone**: Select any artifact in a thread → Clone creates a new thread with that artifact as the starting point (inherits original thread prompt or user provides new one)
- **Revert**: Select any artifact in a thread → Revert prunes all subsequent artifacts (destructive, requires confirmation)

**Artifact Feedback:**
- **Save**: User can save any artifact, marking it as important. Saved artifacts have highest context priority.
- **Thumbs Up/Down**: Quick signal of approval/rejection. Artifacts with feedback are prioritized in context.
- **Star Rating**: 1-5 stars for more granular preference signaling.
- **Notes/Annotations**: Text or drawn feedback on specific artifacts.

**Thread Divergence Detection:** If the user's requests start diverging significantly from the thread prompt (e.g., thread is "Design the kitchen" but user asks about bedroom design), the system suggests:

> "This seems like a new task. Should we start a new design thread? It will take into account what we've created here."

If the user accepts:
- A new thread is created with the user's new prompt
- A summary of the previous thread (with emphasis on final outputs) is carried forward as high-priority context
- The original thread remains unchanged

**Tree Structure:** All threads within a project form a tree. The UI displays threads as linear progressions, but users can navigate the underlying tree structure to see relationships between threads.

### Design Artifacts

Artifacts are the outputs produced during the design process. They can be:

**Intermediate Artifacts:**
- Palettes
- Layouts / Wireframes
- Mood boards
- Emotional journeys
- User journeys
- Trend analyses

**Finished Artifacts:**
- Rendered images (room renderings, product visualizations)
- Graphic designs
- Illustrations
- Presentations

---

## Agent Architecture

### Phase 1: Single Creative Director

In the initial implementation, Swatch uses a single **Creative Director** agent that handles all tasks directly. This agent:

- Interacts directly with the user
- Leads the overall design process
- Performs research, strategy, and creative direction
- Delegates image generation to specialized models
- Evaluates outputs and recommends next steps
- Suggests process workflows (which users can approve or modify)

The Creative Director uses the base LLM (Claude) for all reasoning, planning, and evaluation. Image generation is delegated to specialized models (ChatGPT Image initially, others later).

### Agent Workflow (Phase 1)

1. User provides prompt or request
2. Creative Director analyzes request and context
3. Creative Director performs any needed research/planning
4. Creative Director delegates to image generation model
5. Outputs are surfaced to user as they're created
6. User provides feedback (thumbs up/down, stars, written notes, drawn annotations)
7. Feedback loops back to Creative Director for iteration

### Check-in Behavior

The Creative Director surfaces work as it's created and pauses at natural checkpoints:
- After research/analysis (before generation begins)
- After initial design options are generated
- When user feedback is needed to proceed

(Later phases will allow users to configure check-in frequency.)

### Future: Sub-Agent System (Phase 3+)

In later phases, Swatch will implement Anthropic's orchestrator-worker pattern with specialized sub-agents. The Creative Director becomes the orchestrator, delegating to:

| Agent | Role | Primary Tools |
|-------|------|---------------|
| **Strategist** | Business context analysis. Understands project goals, performs 4Cs analysis (Context, Competitors, Company, Collaborators), SWOT analysis. Most relevant for corporate/commercial projects. | Web search, internal context |
| **Researcher** | Creative context analysis. Finds relevant existing designs, understands trends, develops user personas, creates mood boards and journey maps. | Web search, image search, internal context |
| **Creator** | Produces design artifacts. Specialized variants: Illustrator, Graphic Designer, Interaction Designer, 3D Designer, Animator. Takes inputs from Master Context + Strategist + Researcher outputs. | Image generation models |
| **Presentation Designer** | Builds presentations for user or client review. Structures: Master Context recap → Research findings → Design alternatives explored → Final recommendations. | Presentation tools |

Sub-agents will not be directly exposed to users. Their work is surfaced through the Creative Director. Status messages show activity (e.g., "Researching current design trends...").

---

## Image Generation

### Model Support

- **Default Model:** ChatGPT Image (GPT-4o image generation)
- **Future Models:** Nano Banana, others as available

Users can override the default model per-project or per-generation.

### Model Abstraction

The Creator agent delegates to image generation. The system abstracts model selection so users don't need to understand underlying technology—they just describe what they want.

---

## Context Management

### Context Priority Hierarchy

When building context for agent operations, items are prioritized in this order:

**Tier 0 — Always Present (Never Compressed):**
1. **Thread Prompt** — The brief text prompt that defines the current thread's purpose
2. **Saved Artifacts** — Any artifact the user has explicitly saved
3. **Master Context: Must Have** — Items marked as essential reference

**Tier 1 — High Priority:**
4. **Artifacts with Feedback** — Any artifact with thumbs up/down, stars, or notes
5. **Most Recent N Iterations** — The last N artifacts in the current thread (N is configurable; see below)
6. **Master Context: Important** — Items marked as important

**Tier 2 — Standard Priority:**
7. **Master Context: Nice to Have** — Items with standard priority
8. **Older thread artifacts** — Artifacts older than the recent N window

**Tier 3 — Low Priority (Retrievable):**
9. **Master Context: Inspiration Only** — Reference material for retrieval
10. **Other thread history** — Artifacts from sibling/parent threads

### Configurable Parameters

The following parameters should be defined at the application level (environment variables or config file) without requiring a rebuild:

| Parameter | Description | Suggested Default |
|-----------|-------------|-------------------|
| `RECENT_ITERATIONS_WINDOW` | Number of most recent artifacts to keep verbatim | 5 |
| `MAX_CONTEXT_TOKENS` | Maximum tokens for agent context | Model-dependent |
| `COMPRESSION_THRESHOLD` | Context usage % before compression kicks in | 80% |

### Compression Strategy

When context approaches limits, the system uses **hierarchical summarization with priority awareness**:

1. **Recent work stays verbatim** — Artifacts within the `RECENT_ITERATIONS_WINDOW` are never compressed
2. **Saved/feedback items stay verbatim** — User-signaled importance is respected
3. **Older work is summarized** — Previous iterations compress to: final output + condensed rationale
4. **Priority tiers guide compression order** — Tier 3 compresses first, then Tier 2, etc.
5. **Nothing is dropped** — Items are compressed or moved to retrieval, never deleted

### Thread Transition Context

When a user starts a new thread (including via divergence detection), the previous thread's context is carried forward as:
- **High priority:** Final output(s) from the previous thread
- **Medium priority:** Summary of the design journey and key decisions
- **Available for retrieval:** Full history of previous thread

### Retrieval Augmentation

For very large projects, low-priority items are:
- Embedded as vectors
- Retrieved semantically when relevant to current work
- Summarized into active context as needed

---

## User Interface

### Core Views

**Portfolio View (Home)**
- Grid or list of all projects
- Each project shows: thumbnail (primary output or key Master Context image), title, status, last modified
- Create new project action

**Master Context View (Canvas)**
- Visual bulletin board / whiteboard
- Drag-and-drop arrangement of images, text, diagrams
- Labeling tools for elements
- Priority tier assignment
- "Outside of Context" toggle
- Relationship lines between elements (with labels)

**Design Mode View**
- Thread prompt display (always visible, shows current thread's purpose)
- Thread timeline (horizontal scroll, left-to-right)
- Active thread selector (for projects with multiple threads)
- Prompt input area
- Feedback tools (save, thumbs, stars, text, drawing)
- Saved artifact indicators
- Agent activity indicators ("Researching...", "Generating options...")
- Divergence detection prompt ("Start new thread?")

**Presentation View**
- Slideshow display of deliverables
- Section structure: Brief → Research → Alternatives → Final

### Feedback Mechanisms

| Feedback Type | Description | Context Priority Impact |
|---------------|-------------|------------------------|
| **Save** | Bookmark artifact as important | Highest — never compressed |
| Thumbs up/down | Quick approval/rejection signal | High — prioritized in context |
| Star rating | Graduated preference (1-5 stars) | High — prioritized in context |
| Written notes | Text feedback on specific artifacts | High — prioritized in context |
| Drawn annotations | Arrow to element + note, circle areas of interest, strike-through unwanted elements | High — prioritized in context |

---

## Public Portfolio (Social Features)

### Publishing

Users can publish projects to a public gallery. Options:
- Publish entire project (Master Context + outputs)
- Publish outputs only
- Publish Master Context only

### Discovery & Cloning

- Public projects are browsable by other users
- Users can **Clone** public projects (creates a copy in their account)
- Clone preserves: Master Context, Design Threads (as starting points)

---

## Export

### Phase 1 Formats
- PNG (individual images)
- PDF (single images or compiled presentations)

### Future Formats
- PowerPoint (.pptx)
- Figma import
- Source files where applicable

---

## Technical Requirements

### Platform
- Web application (responsive for desktop/tablet)
- Mobile: view-only initially; full editing in later phases

### Accounts
- User accounts with authentication
- Project ownership and access control
- Single-user per project (collaboration in later phases)

### Version Control
- Full history of all design threads
- Ability to view any previous state
- Clone from any historical point

### Storage
- User-uploaded assets (images, documents)
- Generated artifacts (all versions)
- Project metadata and structure

---

## Out of Scope (Future Phases)

The following are explicitly deferred:

- Real-time collaboration / multiplayer
- Monetization, subscriptions, rate limiting
- Parallel agent execution
- User-created custom sub-agents
- Advanced check-in configuration
- Mobile editing
- Figma/PowerPoint export
- Public portfolio search/discovery algorithms

---

# Development Phases

## Phase 0: Foundation

**Goal:** Establish core infrastructure and prove the agent architecture works.

**Deliverables:**
- [ ] Basic web app shell with authentication
- [ ] Project CRUD (create, read, update, delete)
- [ ] File upload and storage infrastructure
- [ ] Creative Director agent (single agent, no sub-agents)
- [ ] Basic prompt → image generation flow (ChatGPT Image)
- [ ] Simple linear conversation UI (chat-like, temporary)

**Verification:**
- User can sign up, create a project, upload reference images
- User can prompt the Creative Director and receive generated images
- Images are stored and persisted

**Exit Criteria:** End-to-end flow works for single-turn image generation.

---

## Phase 1: Master Context

**Goal:** Build the visual Master Context canvas that differentiates Swatch from chat interfaces.

**Deliverables:**
- [ ] Canvas UI component (drag-drop, pan, zoom)
- [ ] Image placement and arrangement on canvas
- [ ] Text/note elements on canvas
- [ ] Element labeling (description + purpose)
- [ ] "Outside of Context" toggle
- [ ] Priority tier assignment (Must Have → Inspiration Only)
- [ ] Default section templates (Design Brief, Inspiration, etc.)
- [ ] User-created custom sections
- [ ] Master Context → prompt injection (feeding canvas to Creative Director)

**Verification:**
- User can build a complete Master Context with mixed media
- Labels and priorities are reflected in agent behavior
- "Outside of Context" items are provably excluded from AI processing

**Exit Criteria:** Master Context visually built and correctly informs AI generation.

---

## Phase 2: Design Threads

**Goal:** Implement the non-linear design exploration model with focused thread prompts.

**Deliverables:**
- [ ] Thread data model (tree structure with prompt)
- [ ] Thread prompt input UI (text-only, with brevity hints)
- [ ] Thread prompt always-in-context logic
- [ ] Thread timeline UI (horizontal scroll)
- [ ] Artifact cards in timeline (image + metadata)
- [ ] Clone operation (artifact → new thread, with prompt inheritance or new prompt)
- [ ] Revert operation (prune thread, with confirmation)
- [ ] Thread switching / navigation
- [ ] Divergence detection (compare user request to thread prompt)
- [ ] "Start new thread?" suggestion flow
- [ ] Thread transition context (summary of previous thread carried forward)
- [ ] Tree visualization (optional: for power users)

**Verification:**
- User can create a thread with a clear prompt
- Thread prompt remains visible and influences agent behavior
- Divergent requests trigger new thread suggestion
- New threads correctly inherit context summaries from parent threads
- Clone and revert work correctly

**Exit Criteria:** Thread-based exploration with focused prompts is functional.

---

## Phase 3: Sub-Agent System

**Goal:** Implement the multi-agent architecture with specialized sub-agents.

**Deliverables:**
- [ ] Strategist agent (4Cs, SWOT, business analysis)
- [ ] Researcher agent (trend analysis, mood boards, user journeys)
- [ ] Creator agent variants (illustrator, graphic designer, etc.)
- [ ] Presentation Designer agent
- [ ] Agent orchestration logic in Creative Director
- [ ] Agent activity status UI ("Researching trends...")
- [ ] Agent output surfacing (incremental display)
- [ ] Check-in pauses at phase boundaries

**Verification:**
- Complex request triggers appropriate sub-agents
- User sees status updates during agent work
- Research/strategy outputs inform creator outputs
- Natural pause points allow user feedback before proceeding

**Exit Criteria:** Multi-agent workflow produces coherent, research-informed designs.

---

## Phase 4: Feedback, Save & Iteration Loop

**Goal:** Rich feedback mechanisms that improve agent outputs and inform context priority.

**Deliverables:**
- [ ] Save artifact action (marks as highest priority)
- [ ] Saved artifacts indicator in UI
- [ ] Thumbs up/down on artifacts
- [ ] Star ratings (1-5)
- [ ] Text feedback input (per-artifact)
- [ ] Drawing/annotation tools (arrows, circles, strikethrough)
- [ ] Feedback → context priority logic (saved > feedback > recent)
- [ ] Feedback → agent prompt injection
- [ ] Iteration loop (feedback triggers refinement)
- [ ] "Suggest Next Steps" feature

**Verification:**
- Saved artifacts persist and are clearly marked in UI
- User feedback visibly improves subsequent generations
- Saved/feedback artifacts remain in context even when window fills
- Annotations are correctly interpreted by agents
- Next step suggestions are contextually appropriate

**Exit Criteria:** Feedback loop demonstrably improves output quality and context remains focused on user-prioritized work.

---

## Phase 5: Context Compression & Scaling

**Goal:** Handle large projects without losing important context, respecting user-defined priorities.

**Deliverables:**
- [ ] Configurable `RECENT_ITERATIONS_WINDOW` parameter
- [ ] Configurable `MAX_CONTEXT_TOKENS` parameter
- [ ] Configurable `COMPRESSION_THRESHOLD` parameter
- [ ] Context priority hierarchy implementation (Tier 0 → Tier 3)
- [ ] Thread prompt always-present logic
- [ ] Saved artifacts always-present logic
- [ ] Feedback artifacts high-priority logic
- [ ] Hierarchical summarization system
- [ ] Priority-tier-aware compression order
- [ ] Retrieval system for low-priority/old items
- [ ] Compression transparency (user can see what's summarized, optional)

**Verification:**
- Large projects (50+ artifacts) remain functional
- Thread prompt never disappears from context
- Saved artifacts never compressed
- Feedback artifacts prioritized correctly
- Configurable parameters work without rebuild
- Agent behavior remains consistent despite compression

**Exit Criteria:** Projects scale without degradation; user priorities are respected.

---

## Phase 6: Presentation & Export

**Goal:** Professional output delivery.

**Deliverables:**
- [ ] Presentation Designer produces structured slideshows
- [ ] Presentation structure: Brief → Research → Alternatives → Final
- [ ] Intermediate presentations (per-section review)
- [ ] PNG export (individual artifacts)
- [ ] PDF export (individual + compiled)
- [ ] Download/share flow

**Verification:**
- Generated presentations are client-ready
- Exports are high-quality and properly formatted

**Exit Criteria:** Users can deliver professional presentations to clients.

---

## Phase 7: Public Portfolio

**Goal:** Social discovery and sharing.

**Deliverables:**
- [ ] Publish project flow (full / outputs-only / context-only)
- [ ] Public gallery browse UI
- [ ] Clone public project flow
- [ ] Privacy controls and visibility settings
- [ ] Attribution for cloned projects

**Verification:**
- Published projects are discoverable
- Cloning creates functional independent copies
- Privacy settings are respected

**Exit Criteria:** Community sharing functional.

---

## Phase 8: Version Control & History

**Goal:** Full project history and recovery.

**Deliverables:**
- [ ] Complete version history per thread
- [ ] History browser UI
- [ ] View any historical state
- [ ] Clone from any historical point
- [ ] Diff view between versions (optional)

**Verification:**
- User can recover any previous state
- History doesn't impact performance

**Exit Criteria:** Robust version control in place.

---

## Future Phases (Not Scoped)

- **Phase 9:** Parallel agent execution
- **Phase 10:** Real-time collaboration / multiplayer
- **Phase 11:** Advanced model selection (Nano Banana, model marketplace)
- **Phase 12:** User-created custom sub-agents
- **Phase 13:** Advanced export (Figma, PowerPoint)
- **Phase 14:** Mobile editing
- **Phase 15:** Monetization, subscriptions, usage limits

---

## Open Questions for Future Discussion

1. **Agent personality/voice:** Should agents have distinct communication styles, or should all communication feel unified through the Creative Director?

2. **Failure recovery:** When image generation fails or produces off-brief results, what's the user experience? Automatic retry? Explanation + options?

3. **Template library:** Should Swatch ship with pre-built project templates (e.g., "Kitchen Remodel," "Brand Identity," "Social Media Campaign")?

4. **Asset library:** Should users have a persistent asset library across projects, or is everything project-scoped?

5. **Prompt transparency:** Should users be able to see/edit the prompts being sent to image generation models, or is this abstracted away entirely?

---

*Document Version: 1.0*  
*Last Updated: December 2024*