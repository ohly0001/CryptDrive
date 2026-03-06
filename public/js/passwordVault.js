/**
 * Arrows for nav
 * Ctrl+/ for search selection
 * Ctrl+p for new password
 * Ctrl+t for top
 */

/* =========================
   STATE
========================= */
const state = {
    pageSize: 6, //only 6 are fully visible on initial page load, so fetch in sets of 6
    offset: 0,
    loading: false,
    reachedEnd: false,

    matchCase: false,
    matchEntire: false,
    useRegex: false,
    blacklistTags: false,
    favouritesOnly: false,

    allPasswords: [],
    selectedIndex: -1,
    selectedPasswords: new Set(),
    tagSuggestions: new Set(),

    sortMode: 0, // 0 title asc, 1 title desc, 2 date asc, 3 date desc

    searchTags: new Set(),

    clipboardLive: false
};

let visibleStart = 0;
let visibleEnd = 0;

/* =========================
   INIT
========================= */
document.addEventListener("DOMContentLoaded", () => {

    const container = document.getElementById("passwordContainer");
    const searchField = document.getElementById("searchField");
    const tagFilter = document.getElementById("tagFilter");
    const tagContainer = document.getElementById('newTags');
    const sortModeBtn = document.getElementById("sortMode");
    const deleteSelectedBtn = document.getElementById("deleteSelected");
    const favouriteSelectedBtn = document.getElementById("favouriteSelected");
    const tagBox = document.createElement("div");

    document.getElementById("addPasswordButton").addEventListener('click', () => location.href = '/pass/viewAdd');
    
    document.getElementById("selectAll").addEventListener('click', () => {
        const count = state.allPasswords.length;
        const newSelection = new Set();
        
        for (let i = 0; i < count; i++) {
            newSelection.add(i);
        }
        
        state.selectedPasswords = newSelection;
        renderVirtual();
    });

    document.getElementById("deselectAll").addEventListener('click', () => {
        state.selectedPasswords.clear();
        renderVirtual();
    });

    document.getElementById("clearTags").addEventListener('click', () => {
        if (!state.searchTags) return;
        state.searchTags.clear();
        tagBox.classList.add("hidden");
        tagFilter.value = "";
        tagContainer.innerHTML = "";
        resetSearch();
    });

    tagFilter.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();

        const value = e.currentTarget.value.trim().toLowerCase();
        if (!value) return;

        addSearchTag(value);

        e.currentTarget.value = '';
        tagBox.classList.add('hidden');
    });

    /* =========================
       UTIL
    ========================= */
    async function clearClipboard() {
        if (state.clipboardLive) await navigator.clipboard.writeText("");
    }

    async function clearClipboard(text) {
        navigator.clipboard.writeText(text);
        state.clipboardLive = true;
    }

    document.addEventListener('copy', (e) => {
        console.log("copy"); //check if writeText triggers copy
        state.clipboardLive = false; // flag to false because contents have been manually overwritten
    });

    function addSearchTag(value) {
        if (state.searchTags.has(value)) return;
        state.searchTags.add(value);

        const tag = document.createElement('span');
        tag.innerText = value;
        tag.title = `Click to remove the '${value}' tag`;
        tag.classList.add('searchTag');
        tag.style.borderColor = calculateColour(value);
        tag.style.cursor = "pointer";

        tag.addEventListener('click', () => {
            state.searchTags.delete(value);
            tagContainer.removeChild(tag);
            resetSearch();
        });
        tagContainer.appendChild(tag);

        resetSearch();
    }

    const debounce = (fn, delay = 250) => {
        let t;
        return (...args) => {
            clearTimeout(t);
            t = setTimeout(() => fn(...args), delay);
        };
    };

    function calculateColour(str) {
        let hash = 0;
        for (const c of str) hash = c.charCodeAt(0) + ((hash << 5) - hash);
        let colour = '#';
        for (let i = 0; i < 3; i++) {
            const value = (hash >> (i * 8)) & 0xff;
            colour += value.toString(16).padStart(2, '0');
        }
        return colour;
    }

    function hideAllCopyMenus() {
        document.querySelectorAll('.copy_options')
            .forEach(el => el.classList.add('hidden'));
    }

    function refreshAutoHideCopyOptionContainer(container) {
        if (container._hideTimer) clearTimeout(container._hideTimer);
        container._hideTimer = setTimeout(() => container.classList.add('hidden'), 1000);

        if (container._clearTimer) clearTimeout(container._clearTimer);
        container._clearTimer = setTimeout(async () => await clearClipboard(), 60 * 1000);
    }

    /* =========================
       SORTING
    ========================= */
    function sortAllPasswords() {
        const arr = state.allPasswords;

        arr.sort((a, b) => {

            // ===== Tier 1: favourites to top
            const favA = !!a.isFavourite;
            const favB = !!b.isFavourite;

            if (favA !== favB) {
                return favA ? -1 : 1; // favourites first
            }

            // ===== Tier 2: internal sorting
            switch (state.sortMode) {

                case 0: // title asc
                    return (a.title || "").localeCompare(
                        b.title || "",
                        undefined,
                        { sensitivity: "base" }
                    );

                case 1: // title desc
                    return (b.title || "").localeCompare(
                        a.title || "",
                        undefined,
                        { sensitivity: "base" }
                    );

                case 2: // date asc
                    return (a.createdAt?.getTime() || 0) -
                        (b.createdAt?.getTime() || 0);

                case 3: // date desc
                    return (b.createdAt?.getTime() || 0) -
                        (a.createdAt?.getTime() || 0);
            }

            return 0;
        });
    }

    function normalizePassword(p) {
        if (p.createdAt && !(p.createdAt instanceof Date)) {
            p.createdAt = new Date(p.createdAt);
        }
        return p;
    }

    /* =========================
       FETCH
    ========================= */
    async function favouriteSelectedPasswords() {
        const ids = [...state.selectedPasswords].map(i => state.allPasswords[i]._id);
        const allFavourited = [...state.selectedPasswords].every(i => state.allPasswords[i].isFavourite)

        const res = await fetch("/pass/favouriteMany", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids, state: !allFavourited })
        });

        const data = await res.json();
        if ('message' in data) {
            alert(data.message);
        }

        sortAllPasswords();
        renderVirtual();
    }
    favouriteSelectedBtn.addEventListener('click', async () => await favouriteSelectedPasswords());

    async function deleteSelectedPasswords() {
        if (state.selectedPasswords.size === 0) return;
        if (!confirm(`Are you sure you want to delete ${state.selectedPasswords.size} password(s)?`)) return

        const ids = [...state.selectedPasswords].map(i => state.allPasswords[i]._id);

        const res = await fetch("/pass/deleteMany", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids })
        });

        const data = await res.json();
        if ('message' in data) {
            alert(data.message);
        }

        sortAllPasswords();
        renderVirtual();
    }
    deleteSelectedBtn.addEventListener('click', async () => await deleteSelectedPasswords());

    async function fetchPasswords() {
        if (state.loading || state.reachedEnd) return;
        state.loading = true;

        const res = await fetch("/pass/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                limit: state.pageSize,
                offset: state.offset,
                favouritesOnly: state.favouritesOnly,
                searchTerm: searchField.value.trim(),
                matchCase: state.matchCase,
                matchEntire: state.matchEntire,
                useRegex: state.useRegex,
                searchTags: [...state.searchTags],
                blacklistTags: state.blacklistTags
            })
        });

        const data = await res.json();
        const list = (data.partialPasswords || []).map(normalizePassword);

        if (state.offset === 0) {
            state.allPasswords = [];
            container.innerHTML = "";
        }

        list.forEach(p => {
            state.allPasswords.push(p);
            (p.searchTags || []).forEach(t => state.tagSuggestions.add(t));
        });

        sortAllPasswords();

        state.offset += list.length;
        if (state.allPasswords.length >= data.total) state.reachedEnd = true;

        renderVirtual();
        state.loading = false;
    }

    function resetSearch() {
        state.offset = 0;
        state.reachedEnd = false;
        state.selectedIndex = -1;
        fetchPasswords();
    }

    /* =========================
       VIRTUAL RENDER
    ========================= */
    function renderVirtual() {
        const rowHeight = 64;
        const viewportHeight = window.innerHeight;
        const scrollTop = window.scrollY;

        visibleStart = Math.floor(scrollTop / rowHeight) - 10; // smaller buffer
        visibleEnd = Math.ceil((scrollTop + viewportHeight) / rowHeight) + 5;

        visibleStart = Math.max(0, visibleStart);
        visibleEnd = Math.min(state.allPasswords.length, visibleEnd);

        // Clear container and only render visible passwords
        container.innerHTML = "";

        // Top spacer
        const spacerTop = document.createElement("div");
        spacerTop.style.height = (visibleStart * rowHeight) + "px";
        container.appendChild(spacerTop);

        // Render only visible passwords
        for (let i = visibleStart; i < visibleEnd; i++) {
            container.appendChild(renderRow(state.allPasswords[i], i));
        }

        // Bottom spacer
        const spacerBottom = document.createElement("div");
        spacerBottom.style.height = ((state.allPasswords.length - visibleEnd) * rowHeight) + "px";
        container.appendChild(spacerBottom);
    }

    /* =========================
       ROW RENDER
    ========================= */
    function renderRow(e, index) {
        const row = document.createElement("div");
        row.className = "password";
        row.dataset.id = e._id;
        if (index === state.selectedIndex) row.classList.add("keyboardSelected");

        // Checkbox
        const checkbox = document.createElement('button');
        checkbox.innerHTML = state.selectedPasswords.has(index) ? 
            '<i class="fa-regular fa-square-check"></i>' : 
            '<i class="fa-regular fa-square"></i>';
        checkbox.addEventListener('click', () => {
            if (state.selectedPasswords.has(index)) {
                state.selectedPasswords.delete(index);
                checkbox.innerHTML = '<i class="fa-regular fa-square"></i>';
            } else {
                state.selectedPasswords.add(index);
                checkbox.innerHTML = '<i class="fa-regular fa-square-check"></i>';
            }
        });
        row.appendChild(checkbox);

        // Title
        const title = document.createElement("span");
        title.innerText = e.title || "No Title";

        // Favourite button
        const favBtn = document.createElement("button");
        favBtn.innerHTML = e.isFavourite ? "<i class='fa fa-star'></i>" : "<i class='fa fa-star-o'></i>";
        favBtn.onclick = async () => {
            e.isFavourite = !e.isFavourite;
            favBtn.innerHTML = e.isFavourite ? "<i class='fa fa-star'></i>" : "<i class='fa fa-star-o'></i>";
            fetch('/pass/toggleFavourite', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: e._id, state: e.isFavourite })
            });
            sortAllPasswords();
            renderVirtual();
        };

        // Copy menu
        const copyMenu = document.createElement("div");
        copyMenu.classList.add("hidden", "copy_options");
        ["url", "username", "password", "note"].forEach(key => {
            const b = document.createElement("button");
            b.innerText = key;
            b.style.cursor = "copy";
            b.onclick = async () => {
                const res = await fetch('/pass/copy', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: e._id, category: key })
                });
                const data = await res.json();
                await writeClipboard(data.decryptedValue)
                refreshAutoHideCopyOptionContainer(copyMenu);
            };
            copyMenu.appendChild(b);
        });

        const copyBtn = document.createElement("button");
        copyBtn.innerHTML = "<i class='fa fa-copy'></i>";
        copyBtn.onclick = ev => {
            hideAllCopyMenus();
            copyMenu.classList.remove("hidden");

            // Offset relative to button so it won't drift
            const rect = copyBtn.getBoundingClientRect();
            copyMenu.style.position = "absolute";
            copyMenu.style.left = `${rect.left + window.scrollX}px`;
            copyMenu.style.top = `${rect.bottom + window.scrollY}px`;

            refreshAutoHideCopyOptionContainer(copyMenu);
        };

        // Edit button
        const editBtn = document.createElement("button");
        editBtn.innerHTML = "<i class='fa fa-edit'></i>";
        editBtn.onclick = () => location.href = `/pass/viewEdit/${e._id}`;

        row.append(title, favBtn, copyBtn, editBtn, copyMenu);

        // Tags
        const tagWrap = document.createElement("div");
        (e.searchTags || []).forEach(t => {
            const tag = document.createElement("span");
            tag.innerText = t;
            tag.title = `Click to add the '${t}' tag`;
            tag.classList.add("searchTag");
            tag.style.borderColor = calculateColour(t);
            tag.onclick = () => addSearchTag(t);
            tag.style.cursor = "pointer";
            tagWrap.appendChild(tag);
        });
        row.appendChild(tagWrap);

        return row;
    }

    /* =========================
       TAG AUTOCOMPLETE
    ========================= */
    tagBox.classList.add("tagAutocomplete", "hidden");
    tagFilter.parentNode.appendChild(tagBox);

    tagFilter.addEventListener("input", () => {
        const val = tagFilter.value.toLowerCase();
        tagBox.innerHTML = "";
        tagBox.classList.remove("hidden");
        if (!val) return;

        [...state.tagSuggestions]
            .filter(t => t.toLowerCase().includes(val))
            .slice(0, 8)
            .forEach(tag => {
                const item = document.createElement("div");
                item.innerText = tag;
                item.onclick = () => {
                    //tagFilter.value = tag;
                    addSearchTag(tag);
                    tagFilter.value = "";
                    tagBox.innerHTML = "";
                    tagBox.classList.add("hidden");
                    //resetSearch();
                };
                tagBox.appendChild(item);
            });
    });

    /* =========================
       KEYBOARD NAV
    ========================= */
    document.addEventListener("keydown", e => {
        if (e.target.tagName === "INPUT") return;

        if (e.key === "ArrowDown") {
            state.selectedIndex = Math.min(state.selectedIndex + 1, state.allPasswords.length - 1);
            renderVirtual();
        }

        if (e.key === "ArrowUp") {
            state.selectedIndex = Math.max(state.selectedIndex - 1, 0);
            renderVirtual();
        }

        if (e.key === "Enter" && state.selectedIndex >= 0) {
            location.href = '/pass/viewEdit/' + state.allPasswords[state.selectedIndex]._id;
        }

        if ((e.ctrlKey || e.metaKey) && e.key === "/") {
            e.preventDefault();
            searchField.focus();
        }
    });

    /* =========================
       LIVE SEARCH
    ========================= */
    const live = debounce(resetSearch, 300);
    searchField.addEventListener("input", live);
    tagFilter.addEventListener("input", live);

    document.getElementById("searchForm").addEventListener("submit", e => {
        e.preventDefault();
        resetSearch();
    });

    /* =========================
       TOGGLES
    ========================= */
    function bindToggle(id, key) {
        const el = document.getElementById(id);
        el.onclick = () => {
            state[key] = !state[key];
            el.classList.toggle("toggled", state[key]);
            resetSearch();
        };
    }

    bindToggle("favorite", "favouritesOnly");
    bindToggle("matchCase", "matchCase");
    bindToggle("matchEntire", "matchEntire");
    bindToggle("useRegex", "useRegex");
    bindToggle("blacklistTags", "blacklistTags");

    /* =========================
       SORT MODE
    ========================= */
    sortModeBtn.addEventListener("click", () => {
        state.sortMode = (state.sortMode + 1) % 4;

        switch (state.sortMode) {
            case 0:
                sortMode.innerHTML = 'Sort By: <i class="fa-solid fa-arrow-up-a-z"></i>';
                sortMode.title = 'Title Ascending (A-Z)';
                break;
            case 1:
                sortMode.innerHTML = 'Sort By: <i class="fa-solid fa-arrow-down-a-z"></i>';
                sortMode.title = 'Title Descending (Z-A)';
                break;
            case 2:
                sortMode.innerHTML = 'Sort By: <i class="fa-solid fa-arrow-up-1-9"></i>';
                sortMode.title = 'Date Added Ascending (Oldest-Newest)';
                break;
            case 3:
                sortMode.innerHTML = 'Sort By: <i class="fa-solid fa-arrow-down-1-9"></i>';
                sortMode.title = 'Date Added Decending (Newest-Oldest)';
                break;
        }

        sortAllPasswords();
        renderVirtual();
    });

    /* =========================
       SCROLL
    ========================= */
    window.addEventListener("scroll", () => {
        renderVirtual();

        if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 400) {
            fetchPasswords();
        }
    });

    /* =========================
       INIT
    ========================= */
    resetSearch();
});
