# Multi-Folder Characters

An independent, unofficial extension compatible with Lumiverse.

## Install from GitHub

In Lumiverse, open Extensions, choose Add Extension, and paste:

https://github.com/clovergirl99/multi-folder-characters

Install and enable the extension. Grant its requested permissions if prompted.

The checked-in frontend.js is the original compiled extension, unchanged. spindle.json points to it directly, so no build step is needed. The original ZIP is included with the original documentation and any available source files and tests.

---

# Multi-Folder Characters

An independent Lumiverse extension that lets one character appear in multiple character-library folders.

Lumiverse's normal folder remains the character's **primary folder**. Additional memberships are stored by this extension and rendered with Lumiverse's native character-card surface, so the underlying character is never duplicated.

## Use

1. Open the Characters drawer in grid view.
2. Select the small folder-plus overlay in the portrait's lower-left corner. It does not occupy card layout space.
3. Check every additional folder where the character should appear.
4. Choose **Save folders**.

Clicking a secondary card opens its existing chat, lets you choose among multiple chats, or creates a chat when none exists. The edit button opens the normal Lumiverse character editor.

Version 3.0 uses one unified, non-virtualized grid for every affected folder on desktop and mobile. The grid contains the folder's primary cards and all additional memberships together, so every card participates in the same rows and responsive CSS. Lumiverse's native virtual grid is hidden only while the unified grid is active, and virtualizer mutations no longer trigger destructive rebuild loops. Folder counts are recalculated from unique primary and additional memberships.

## Install

Extract the ZIP, import the folder through Lumiverse's local extension importer, and enable **Multi-Folder Characters**. No gated permissions are requested.
