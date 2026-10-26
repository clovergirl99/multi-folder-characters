// src/model.ts
function normalizeFolderName(value) {
  if (typeof value !== "string")
    return null;
  const name = value.trim();
  return name && name.toLocaleLowerCase() !== "uncategorized" ? name : null;
}
function normalizeMemberships(value) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return {};
  const result = {};
  for (const [characterId, rawFolders] of Object.entries(value)) {
    if (!characterId.trim() || !Array.isArray(rawFolders))
      continue;
    const seen = new Set;
    const folders = [];
    for (const rawFolder of rawFolders) {
      const folder = normalizeFolderName(rawFolder);
      if (!folder)
        continue;
      const key = folder.toLocaleLowerCase();
      if (seen.has(key))
        continue;
      seen.add(key);
      folders.push(folder);
    }
    if (folders.length)
      result[characterId] = folders;
  }
  return result;
}
function secondaryFolders(characterId, primaryFolder, memberships) {
  const primaryKey = primaryFolder.trim().toLocaleLowerCase();
  return (memberships[characterId] ?? []).filter((folder) => folder.toLocaleLowerCase() !== primaryKey);
}
function charactersForFolder(characters, folder, memberships) {
  const folderKey = folder.toLocaleLowerCase();
  return characters.filter((character) => {
    if ((character.folder ?? "").trim().toLocaleLowerCase() === folderKey)
      return false;
    return secondaryFolders(character.id, character.folder ?? "", memberships).some((candidate) => candidate.toLocaleLowerCase() === folderKey);
  });
}

// src/frontend.ts
var MEMBERSHIPS_SETTING = "folders:memberships";
var CSS = `
  .mfc-button-host{display:contents}.mfc-card-button{position:absolute!important;z-index:8!important;left:8px!important;right:auto!important;top:auto!important;bottom:8px!important;display:flex!important;align-items:center;justify-content:center;width:23px!important;height:23px!important;padding:0!important;border:1px solid rgba(255,255,255,.26)!important;border-radius:999px!important;background:rgba(8,8,10,.78)!important;color:#fff!important;cursor:pointer;opacity:0!important;transform:none!important;transition:opacity .18s ease,border-color .18s ease,color .18s ease!important}.mfc-card-button svg{width:13px;height:13px;pointer-events:none}.mfc-card-button:hover,.mfc-card-button:focus-visible{border-color:var(--lumiverse-primary)!important;color:var(--lumiverse-primary)!important;opacity:1!important}
  .mfc-manager{display:flex;flex-direction:column;gap:10px;color:var(--lumiverse-text)}.mfc-copy{font-size:11px;line-height:1.45;color:var(--lumiverse-text-muted)}.mfc-primary{padding:7px 9px;border:1px solid var(--lumiverse-border);border-radius:7px;background:var(--lumiverse-fill-subtle);font-size:11px}.mfc-folder-list{display:flex;flex-direction:column;gap:5px;max-height:min(420px,55vh);overflow:auto}.mfc-folder-option{display:flex;align-items:center;gap:8px;padding:7px 9px;border:1px solid var(--lumiverse-border);border-radius:7px;background:var(--lumiverse-bg-elevated);font-size:12px}.mfc-folder-option input{accent-color:var(--lumiverse-primary)}.mfc-new-row{display:flex;gap:6px}.mfc-new-input{min-width:0;flex:1;border:1px solid var(--lumiverse-border);border-radius:7px;background:var(--lumiverse-bg);color:var(--lumiverse-text);font:inherit;font-size:11.5px;padding:7px 9px}.mfc-new-button,.mfc-actions button{border:1px solid var(--lumiverse-border);border-radius:7px;background:var(--lumiverse-bg-elevated);color:var(--lumiverse-text);font:inherit;font-size:11px;padding:7px 10px;cursor:pointer}.mfc-new-button:disabled{opacity:.45}.mfc-actions{display:flex;justify-content:flex-end;gap:7px}.mfc-actions .mfc-save{border-color:var(--lumiverse-primary);background:var(--lumiverse-primary);color:var(--lumiverse-primary-contrast,#fff)}.mfc-empty{padding:14px;text-align:center;color:var(--lumiverse-text-dim);font-size:11px}
  .mfc-secondary-host{display:block!important;flex:0 0 auto!important;min-height:0}.mfc-secondary-grid{display:grid!important;grid-template-columns:repeat(auto-fill,minmax(min(140px,100%),1fr));gap:var(--cc-gap,var(--character-card-gap,12px));padding:4px 5px 8px}.mfc-unified-grid{position:relative!important;z-index:3!important;width:100%!important;box-sizing:border-box!important;visibility:visible!important;opacity:1!important;overflow:visible!important}.mfc-card-slot{display:block!important;min-width:0;min-height:0}.mfc_card_{position:relative;display:flex;flex-direction:column;aspect-ratio:3/4;border-radius:16px;overflow:hidden;cursor:pointer;background:var(--lumiverse-card-bg);border:1px solid var(--lumiverse-border-neutral);box-shadow:var(--lumiverse-shadow-sm)}.mfc_imageWrap_{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;overflow:hidden;background:var(--lumiverse-card-image-bg)}.mfc_coverImg_{position:absolute;inset:0;width:100%;height:100%;object-fit:contain}.mfc_avatarFallback_{font-size:48px;color:var(--lumiverse-primary-muted)}.mfc_info_{position:relative;z-index:2;margin-top:auto;padding:12px 14px 14px;display:flex;flex-direction:column;gap:4px;pointer-events:none}.mfc_name_{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:14px;font-weight:600;color:var(--lumiverse-text)}.mfc_creator_{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px;color:var(--lumiverse-text-dim)}
  .mfc-virtual-folder-host{display:block}.mfc-virtual-folder{display:flex;flex-direction:column;gap:6px;margin-bottom:12px;min-height:0}.mfc-folder-header{display:flex;align-items:center;gap:6px;width:100%;padding:4px;border:0;border-radius:6px;background:none;color:inherit;text-align:left;cursor:pointer}.mfc-folder-header:hover{background:var(--lumiverse-fill-subtle)}.mfc-chevron{color:var(--lumiverse-text-dim);transition:transform .15s}.mfc-virtual-folder[data-open="true"] .mfc-chevron{transform:rotate(90deg)}.mfc-folder-name{flex:1;color:var(--lumiverse-text-muted);font-size:11px;font-weight:600;letter-spacing:.4px;text-transform:uppercase}.mfc-folder-count{color:var(--lumiverse-text-dim);font-size:10px}.mfc-virtual-folder[data-open="false"] .mfc-secondary-grid{display:none}
  .mfc-chat-list{display:flex;flex-direction:column;gap:6px}.mfc-chat-list button{border:1px solid var(--lumiverse-border);border-radius:7px;background:var(--lumiverse-bg-elevated);color:var(--lumiverse-text);font:inherit;text-align:left;padding:9px;cursor:pointer}.mfc-error{color:var(--lumiverse-danger,#d66);font-size:11px}
`;
async function fetchJson(path, init) {
  const response = await fetch(path, { credentials: "same-origin", headers: { Accept: "application/json", ...init?.body ? { "Content-Type": "application/json" } : {} }, ...init });
  if (!response.ok)
    throw new Error(`Lumiverse returned ${response.status}`);
  return await response.json();
}
async function fetchCharacters() {
  const result = [];
  let offset = 0;
  for (;; ) {
    const page = await fetchJson(`/api/v1/characters/summary?limit=100&offset=${offset}`);
    result.push(...page.data);
    offset += page.data.length;
    if (!page.data.length || offset >= page.total)
      return result;
  }
}
function setup(ctx) {
  const disposers = [ctx.dom.addStyle(CSS)];
  const buttonWrappers = new Map;
  const displayWrappers = [];
  const nativeCardSlots = [];
  const nativeReplacements = [];
  const resizedCanvases = new Map;
  const hiddenNativeGrids = new Map;
  const overriddenCounts = new Map;
  const collapsedVirtualFolders = new Set;
  let memberships = {};
  let characters = [];
  let loading = null;
  let scanQueued = false;
  let displayQueued = false;
  const saveMemberships = async () => {
    if (ctx.settings)
      await ctx.settings.set(MEMBERSHIPS_SETTING, memberships);
    else
      localStorage.setItem(`spindle:${MEMBERSHIPS_SETTING}`, JSON.stringify(memberships));
  };
  const readMemberships = async () => {
    const value = ctx.settings ? await ctx.settings.get(MEMBERSHIPS_SETTING) : JSON.parse(localStorage.getItem(`spindle:${MEMBERSHIPS_SETTING}`) || "{}");
    memberships = normalizeMemberships(value);
  };
  const loadCharacters = (force = false) => {
    if (loading)
      return loading;
    if (!force && characters.length)
      return Promise.resolve();
    loading = fetchCharacters().then((next) => {
      characters = next;
    }).finally(() => {
      loading = null;
    });
    return loading;
  };
  const navigate = (path) => {
    window.location.assign(path);
  };
  const chooseChat = (chats) => {
    const modal = ctx.ui.showModal({ title: "Choose a chat", width: 440, maxHeight: 620 });
    const list = document.createElement("div");
    list.className = "mfc-chat-list";
    chats.sort((a, b) => (b.updated_at ?? 0) - (a.updated_at ?? 0)).forEach((chat) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = chat.name || "Untitled chat";
      button.addEventListener("click", () => navigate(`/chat/${encodeURIComponent(chat.id)}`));
      list.appendChild(button);
    });
    modal.root.appendChild(list);
  };
  const openCharacter = async (characterId) => {
    try {
      const chats = await fetchJson(`/api/v1/chats/character-chats/${encodeURIComponent(characterId)}`);
      if (chats.length === 1) {
        navigate(`/chat/${encodeURIComponent(chats[0].id)}`);
        return;
      }
      if (chats.length > 1) {
        chooseChat(chats);
        return;
      }
      const chat = await fetchJson("/api/v1/chats", { method: "POST", body: JSON.stringify({ character_id: characterId, name: new Date().toLocaleString() }) });
      navigate(`/chat/${encodeURIComponent(chat.id)}`);
    } catch (reason) {
      const modal = ctx.ui.showModal({ title: "Could not open character", width: 420 });
      const error = document.createElement("div");
      error.className = "mfc-error";
      error.textContent = reason instanceof Error ? reason.message : "Unknown error";
      modal.root.appendChild(error);
    }
  };
  const clearDisplays = (removePlaceholderMarks = false) => {
    for (const { card, placeholder } of nativeReplacements.splice(0)) {
      if (card.isConnected)
        card.replaceWith(placeholder);
      if (removePlaceholderMarks)
        delete placeholder.dataset.spindleExt;
    }
    for (const slot of nativeCardSlots.splice(0))
      slot.remove();
    for (const [canvas, height] of resizedCanvases) {
      if (canvas.isConnected)
        canvas.style.height = height;
    }
    resizedCanvases.clear();
    for (const [grid, display] of hiddenNativeGrids) {
      if (grid.isConnected)
        grid.style.display = display;
    }
    hiddenNativeGrids.clear();
    for (const wrapper of displayWrappers.splice(0)) {
      try {
        ctx.dom.uninject(wrapper);
      } catch {}
    }
    for (const [element, original] of overriddenCounts) {
      if (element.isConnected)
        element.textContent = original;
    }
    overriddenCounts.clear();
  };
  const cardTemplate = () => {
    const nativeMount = [...document.querySelectorAll('[data-spindle-mount="character_browser_card_actions"]')].find((mount) => !mount.closest("[data-spindle-ext]"));
    const nativeImageWrap = nativeMount?.parentElement;
    const nativeCard = nativeImageWrap?.parentElement;
    const nativeInfo = nativeCard?.querySelector('[class*="_info_"]');
    return { nativeCard: nativeCard ?? undefined, nativeImageWrap: nativeImageWrap ?? undefined, nativeInfo: nativeInfo ?? undefined };
  };
  const renderCard = (slot, character, template = cardTemplate()) => {
    const { nativeCard, nativeImageWrap, nativeInfo } = template;
    const classOf = (root, selector) => root?.querySelector(selector)?.className ?? "";
    const card = document.createElement("div");
    card.className = `mfc_card_ ${nativeCard?.className ?? ""}`.trim();
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    const imageWrap = document.createElement("div");
    imageWrap.className = `mfc_imageWrap_ ${nativeImageWrap?.className ?? ""}`.trim();
    if (character.image_id) {
      const image = document.createElement("img");
      image.className = `mfc_coverImg_ ${classOf(nativeImageWrap, '[class*="_coverImg_"]')}`.trim();
      image.src = `/api/v1/images/${encodeURIComponent(character.image_id)}?size=sm`;
      image.alt = character.name;
      image.loading = "lazy";
      imageWrap.appendChild(image);
    } else {
      const fallback = document.createElement("div");
      fallback.className = `mfc_avatarFallback_ ${classOf(nativeImageWrap, '[class*="_avatarFallback_"]')}`.trim();
      fallback.textContent = character.name[0]?.toUpperCase() ?? "?";
      imageWrap.appendChild(fallback);
    }
    const actions = document.createElement("span");
    actions.dataset.spindleMount = "character_browser_card_actions";
    actions.dataset.spindleScope = `character-card:${character.id}:actions`;
    actions.style.display = "contents";
    imageWrap.appendChild(actions);
    const info = document.createElement("div");
    info.className = `mfc_info_ ${nativeInfo?.className ?? ""}`.trim();
    const name = document.createElement("span");
    name.className = `mfc_name_ ${classOf(nativeInfo, '[class*="_name_"]')}`.trim();
    name.textContent = character.name;
    info.appendChild(name);
    if (character.creator) {
      const creator = document.createElement("span");
      creator.className = `mfc_creator_ ${classOf(nativeInfo, '[class*="_creator_"]')}`.trim();
      creator.textContent = character.creator;
      info.appendChild(creator);
    }
    card.append(imageWrap, info);
    slot.appendChild(card);
    card.addEventListener("click", (event) => {
      if (!(event.target instanceof Element) || !event.target.closest("button"))
        openCharacter(character.id);
    });
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter")
        openCharacter(character.id);
    });
    return card;
  };
  const mountCards = (target, cards) => {
    const grid = target.querySelector(".mfc-secondary-grid");
    if (!grid)
      return;
    const template = cardTemplate();
    cards.forEach((character) => {
      const slot = document.createElement("div");
      slot.className = "mfc-card-slot";
      grid.appendChild(slot);
      renderCard(slot, character, template);
    });
  };
  const mountCardsInNativeGrid = (group, cards, nativeCount) => {
    const rows = [...group.querySelectorAll("[data-index]")].filter((row) => getComputedStyle(row).display === "grid");
    if (!rows.length)
      return;
    const sample = rows[0];
    const columns = Math.max(1, getComputedStyle(sample).gridTemplateColumns.split(/\s+/).filter(Boolean).length);
    const lastIndex = Math.max(0, Math.ceil(nativeCount / columns) - 1);
    const row = rows.find((candidate) => Number(candidate.dataset.index) === lastIndex);
    if (!row)
      return;
    const baseRowHeight = row.getBoundingClientRect().height;
    const template = cardTemplate();
    const placeholders = [...row.children].filter((child) => child instanceof HTMLElement && child.childElementCount === 0 && (!child.hasAttribute("data-spindle-ext") || child.dataset.spindleExt === "multi_folder_placeholder"));
    cards.forEach((character, index) => {
      const placeholder = placeholders[index];
      if (placeholder) {
        const staging = document.createElement("div");
        const card = renderCard(staging, character, template);
        card.dataset.spindleExt = "multi_folder_characters";
        placeholder.dataset.spindleExt = "multi_folder_placeholder";
        placeholder.replaceWith(card);
        nativeReplacements.push({ card, placeholder });
        return;
      }
      const card = renderCard(row, character, template);
      card.dataset.spindleExt = "multi_folder_characters";
      nativeCardSlots.push(card);
    });
    const occupied = Math.max(0, nativeCount - lastIndex * columns);
    const availableCells = Math.max(0, columns - occupied);
    const appendedCards = Math.max(0, cards.length - availableCells);
    const addedRows = Math.ceil(appendedCards / columns);
    const canvas = row.parentElement;
    if (addedRows > 0 && canvas && baseRowHeight > 0) {
      const originalHeight = canvas.style.height;
      const measuredCanvasHeight = canvas.getBoundingClientRect().height;
      const currentHeight = Number.parseFloat(originalHeight) || measuredCanvasHeight;
      resizedCanvases.set(canvas, originalHeight);
      canvas.style.height = `${currentHeight + addedRows * baseRowHeight}px`;
    }
  };
  const mountUnifiedGrid = (group, cards) => {
    const row = [...group.querySelectorAll("[data-index]")].find((candidate) => getComputedStyle(candidate).display === "grid");
    const scrollContainer = row?.parentElement?.parentElement;
    const fallbackGrid = [...group.children].find((child) => child instanceof HTMLElement && !child.querySelector('[class*="_folderHeader_"]') && !child.hasAttribute("data-spindle-ext"));
    const nativeGrid = scrollContainer instanceof HTMLElement ? scrollContainer : fallbackGrid instanceof HTMLElement ? fallbackGrid : null;
    if (nativeGrid) {
      hiddenNativeGrids.set(nativeGrid, nativeGrid.style.display);
      nativeGrid.style.display = "none";
    }
    const wrapper = ctx.dom.inject(group, '<div class="mfc-secondary-grid mfc-unified-grid" aria-label="Folder characters"></div>', "beforeend");
    wrapper.classList.add("mfc-secondary-host");
    displayWrappers.push(wrapper);
    mountCards(wrapper, cards);
  };
  const refreshDisplays = () => {
    clearDisplays();
    const drawer = document.querySelector('[data-spindle-drawer-tab="characters"]');
    const folderGroups = drawer?.querySelector('[class*="_folderGroups_"]');
    if (!folderGroups || !characters.length)
      return;
    const nativeFolders = new Set;
    const namedFolders = new Map;
    characters.forEach((character) => {
      const folder = (character.folder ?? "").trim();
      if (folder)
        namedFolders.set(folder.toLocaleLowerCase(), folder);
    });
    for (const group of [...folderGroups.children]) {
      if (!(group instanceof HTMLElement) || group.hasAttribute("data-spindle-ext"))
        continue;
      const label = group.querySelector('[class*="_folderName_"]')?.textContent?.trim() ?? "";
      const folder = namedFolders.get(label.toLocaleLowerCase());
      if (!folder)
        continue;
      nativeFolders.add(folder.toLocaleLowerCase());
      const cards = charactersForFolder(characters, folder, memberships);
      if (!cards.length)
        continue;
      const count = group.querySelector('[class*="_folderCount_"]');
      const primaryCount = characters.filter((character) => (character.folder ?? "").trim().toLocaleLowerCase() === folder.toLocaleLowerCase()).length;
      if (count) {
        const original = count.textContent ?? "0";
        overriddenCounts.set(count, original);
        count.textContent = String(primaryCount + cards.length);
      }
      const expanded = group.children.length > 1;
      if (!expanded)
        continue;
      const primaryCards = characters.filter((character) => (character.folder ?? "").trim().toLocaleLowerCase() === folder.toLocaleLowerCase());
      mountUnifiedGrid(group, [...primaryCards, ...cards]);
    }
    const membershipFolders = [...new Set(Object.values(memberships).flat())].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
    membershipFolders.forEach((folder) => {
      if (nativeFolders.has(folder.toLocaleLowerCase()))
        return;
      const cards = charactersForFolder(characters, folder, memberships);
      if (!cards.length)
        return;
      const open = !collapsedVirtualFolders.has(folder.toLocaleLowerCase());
      const wrapper = ctx.dom.inject(folderGroups, '<section class="mfc-virtual-folder"><button type="button" class="mfc-folder-header"><span class="mfc-chevron">›</span><span class="mfc-folder-name"></span><span class="mfc-folder-count"></span></button><div class="mfc-secondary-grid"></div></section>', "beforeend");
      wrapper.classList.add("mfc-virtual-folder-host");
      displayWrappers.push(wrapper);
      const section = wrapper.querySelector(".mfc-virtual-folder");
      section.dataset.open = String(open);
      section.querySelector(".mfc-folder-name").textContent = folder;
      section.querySelector(".mfc-folder-count").textContent = String(cards.length);
      section.querySelector(".mfc-folder-header").addEventListener("click", () => {
        const key = folder.toLocaleLowerCase();
        if (collapsedVirtualFolders.has(key))
          collapsedVirtualFolders.delete(key);
        else
          collapsedVirtualFolders.add(key);
        refreshDisplays();
        queueScan();
      });
      if (open)
        mountCards(wrapper, cards);
    });
  };
  const openFolderManager = (characterId) => {
    const character = characters.find((item) => item.id === characterId);
    if (!character)
      return;
    const primary = (character.folder ?? "").trim();
    let selected = new Set(secondaryFolders(characterId, primary, memberships).map((folder) => folder.toLocaleLowerCase()));
    let folders = [...new Set([...characters.map((item) => (item.folder ?? "").trim()).filter(Boolean), ...Object.values(memberships).flat()])].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
    const modal = ctx.ui.showModal({ title: `Folders for ${character.name}`, width: 480, maxHeight: 700, persistent: true });
    modal.root.innerHTML = '<div class="mfc-manager"><div class="mfc-copy">The primary folder stays managed by Lumiverse. Select any additional folders where this same character card should also appear.</div><div class="mfc-primary"></div><div class="mfc-new-row"><input class="mfc-new-input" type="text" maxlength="80" placeholder="New additional folder…"><button type="button" class="mfc-new-button" disabled>Add</button></div><div class="mfc-folder-list"></div><div class="mfc-actions"><button type="button" data-cancel>Cancel</button><button type="button" class="mfc-save" data-save>Save folders</button></div></div>';
    modal.root.querySelector(".mfc-primary").textContent = `Primary folder: ${primary || "Uncategorized"}`;
    const list = modal.root.querySelector(".mfc-folder-list");
    const newInput = modal.root.querySelector(".mfc-new-input");
    const add = modal.root.querySelector(".mfc-new-button");
    const render = () => {
      list.replaceChildren();
      const choices = folders.filter((folder) => folder.toLocaleLowerCase() !== primary.toLocaleLowerCase());
      choices.forEach((folder) => {
        const label = document.createElement("label");
        label.className = "mfc-folder-option";
        const input = document.createElement("input");
        input.type = "checkbox";
        input.checked = selected.has(folder.toLocaleLowerCase());
        input.addEventListener("change", () => {
          if (input.checked)
            selected.add(folder.toLocaleLowerCase());
          else
            selected.delete(folder.toLocaleLowerCase());
        });
        const text = document.createElement("span");
        text.textContent = folder;
        label.append(input, text);
        list.appendChild(label);
      });
      if (!choices.length) {
        const empty = document.createElement("div");
        empty.className = "mfc-empty";
        empty.textContent = "No additional folders yet. Add one above.";
        list.appendChild(empty);
      }
    };
    const updateAdd = () => {
      const value = newInput.value.trim();
      add.disabled = !value || value.toLocaleLowerCase() === primary.toLocaleLowerCase() || folders.some((folder) => folder.localeCompare(value, undefined, { sensitivity: "base" }) === 0);
    };
    const addFolder = () => {
      updateAdd();
      if (add.disabled)
        return;
      const value = newInput.value.trim();
      folders = [...folders, value].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
      selected.add(value.toLocaleLowerCase());
      newInput.value = "";
      updateAdd();
      render();
    };
    newInput.addEventListener("input", updateAdd);
    newInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        addFolder();
      }
    });
    add.addEventListener("click", addFolder);
    modal.root.querySelector("[data-cancel]").addEventListener("click", () => modal.dismiss());
    modal.root.querySelector("[data-save]").addEventListener("click", () => {
      const chosen = folders.filter((folder) => selected.has(folder.toLocaleLowerCase()) && folder.toLocaleLowerCase() !== primary.toLocaleLowerCase());
      if (chosen.length)
        memberships = { ...memberships, [characterId]: chosen };
      else {
        const next = { ...memberships };
        delete next[characterId];
        memberships = next;
      }
      saveMemberships().then(() => {
        modal.dismiss();
        refreshDisplays();
        queueScan();
      });
    });
    render();
  };
  const mountButtons = () => {
    for (const [mount, wrapper] of [...buttonWrappers])
      if (!mount.isConnected || !wrapper.isConnected)
        buttonWrappers.delete(mount);
    document.querySelectorAll('[data-spindle-mount="character_browser_card_actions"][data-spindle-scope^="character-card:"]').forEach((mount) => {
      if (buttonWrappers.has(mount))
        return;
      const match = /^character-card:([^:]+):actions$/.exec(mount.dataset.spindleScope ?? "");
      if (!match?.[1])
        return;
      const characterId = match[1];
      const wrapper = ctx.dom.inject(mount, '<button type="button" class="mfc-card-button" title="Additional folders" aria-label="Manage additional folders"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h6l2 2h10v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"></path><path d="M12 11v6M9 14h6"></path></svg></button>', "beforeend");
      wrapper.classList.add("mfc-button-host");
      wrapper.querySelector("button").addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        openFolderManager(characterId);
      });
      buttonWrappers.set(mount, wrapper);
    });
  };
  const scan = () => {
    scanQueued = false;
    mountButtons();
  };
  const queueScan = () => {
    if (!scanQueued) {
      scanQueued = true;
      queueMicrotask(scan);
    }
  };
  const queueDisplay = () => {
    if (!displayQueued) {
      displayQueued = true;
      window.setTimeout(() => {
        displayQueued = false;
        refreshDisplays();
        queueScan();
      }, 60);
    }
  };
  const observer = new MutationObserver(() => {
    queueScan();
    if (displayWrappers.some((wrapper) => !wrapper.isConnected))
      queueDisplay();
  });
  observer.observe(document.body, { childList: true, subtree: true });
  disposers.push(() => observer.disconnect());
  const onDocumentClick = (event) => {
    const target = event.target;
    if (target instanceof Element && target.closest('button[class*="_folderHeader_"]'))
      queueDisplay();
  };
  document.addEventListener("click", onDocumentClick, true);
  disposers.push(() => document.removeEventListener("click", onDocumentClick, true));
  disposers.push(ctx.ui.events.onDrawerChange(() => {
    queueScan();
    window.setTimeout(() => {
      refreshDisplays();
      queueScan();
    }, 80);
  }));
  for (const event of ["CHARACTER_CREATED", "CHARACTER_EDITED", "CHARACTER_DELETED", "CHARACTER_DUPLICATED", "CHARACTER_LIBRARY_CHANGED"])
    disposers.push(ctx.events.on(event, () => {
      loadCharacters(true).then(() => {
        refreshDisplays();
        queueScan();
      });
    }));
  if (ctx.settings)
    disposers.push(ctx.settings.watch(MEMBERSHIPS_SETTING, (value) => {
      memberships = normalizeMemberships(value);
      refreshDisplays();
      queueScan();
    }));
  Promise.all([readMemberships(), loadCharacters()]).then(() => {
    refreshDisplays();
    scan();
  }).catch(() => scan());
  return () => {
    observer.disconnect();
    clearDisplays(true);
    for (const wrapper of buttonWrappers.values()) {
      try {
        ctx.dom.uninject(wrapper);
      } catch {}
    }
    buttonWrappers.clear();
    for (const dispose of disposers.reverse()) {
      try {
        dispose();
      } catch {}
    }
  };
}
export {
  setup
};
