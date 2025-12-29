# Design Thread v2

We are redesigning Design Mode. There is no longer a horizontal scroll.

The design mode tab has a grid of the existing design threads with the last design shown

When clicking on a new thread the user enters a prompt specific to that thread
(e.g. we are doing an interior design for the kitchen). 
The user can @reference photos from the master context or other design threads. 
The @references autocomplete. As the user @references photos thumbnails
of them appear below the prompt. They can be enlarged into a modal by clicking and then
dismissed with an X in the upper right corner or clicking outside of the 
modal or by hitting ESC.

When the user completes this prompt, the agent first asks clarifying questions
if necessary. When it is ready, a left pane appears with a summary of the prompt. Then the first design is rendered in the main canvas. Once the design
is complete the user enters free form text on what they like / don't like
and what to change in the next iteration. They can also @reference other
designs (master context or other threads) as well as previous versions within
the thread. Once they provide feedback the current photo is moved to the left
pane, given a version number, and a new image is rendered. This flow continues
until the user hits a "design complete" button or returns to the design thread list.