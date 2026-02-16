let pageSize = 10;
let totalPasswords = 0;
let totalPages = 0;
let currentPage = 0;

let blacklistTagsMode = false;
let matchCaseMode = false;
let matchEntireMode = false;
let favouritesMode = false;
let useRegexMode = false;

document.addEventListener('DOMContentLoaded', () => {
    const addPasswordButton = document.getElementById('addPasswordButton');
    const passwordContainer = document.getElementById('passwordContainer');
    const currentPageNumberField = document.getElementById('currentPageNumber');
    const paginationSlice = document.getElementById('paginationSlice');

    const searchField = document.getElementById('searchField');
    const titleSort = document.getElementById('titleSort');
    const tagFilter = document.getElementById('tagFilter');

    const favorites = document.getElementById('favorite');
    favorites.addEventListener('click', (e) => {
        favouritesMode = !favouritesMode;
        if (favouritesMode)
            favorites.classList.add('toggled');
        else
            favorites.classList.remove('toggled');
    });

    const blacklistTags = document.getElementById('blacklistTags');
    blacklistTags.addEventListener('click', (e) => {
        blacklistTagsMode = !blacklistTagsMode;
        if (blacklistTagsMode)
            blacklistTags.classList.add('toggled');
        else
            blacklistTags.classList.remove('toggled');
    });

    const matchCase = document.getElementById('matchCase');
    matchCase.addEventListener('click', (e) => {
        matchCaseMode = !matchCaseMode;
        if (matchCaseMode)
            matchCase.classList.add('toggled');
        else
            matchCase.classList.remove('toggled');
    });

    const matchEntire = document.getElementById('matchEntire');
    matchEntire.addEventListener('click', (e) => {
        matchEntireMode = !matchEntireMode;
        if (matchEntireMode)
            matchEntire.classList.add('toggled');
        else
            matchEntire.classList.remove('toggled');
    });

    const useRegex = document.getElementById('useRegex');
    useRegex.addEventListener('click', (e) => {
        useRegexMode = !useRegexMode;
        if (useRegexMode)
            useRegex.classList.add('toggled');
        else
           useRegex.classList.remove('toggled');
    });

    let allPasswords = [];

    

    // UTILITIES
    function refreshAutoHideCopyOptionContainer(container) {
        if (container._hideTimer) clearTimeout(container._hideTimer);
        container._hideTimer = setTimeout(() => container.classList.add('hidden'), 5000);
    }

    function hideAllCopyMenus() {
        document.querySelectorAll('.copy_options').forEach(el => el.classList.add('hidden'));
    }

    function calculateColour(str) {
        let hash = 0;
        str.split('').forEach(char => hash = char.charCodeAt(0) + ((hash << 5) - hash));
        let colour = '#';
        for (let i = 0; i < 3; i++) {
            const value = (hash >> (i * 8)) & 0xff;
            colour += value.toString(16).padStart(2, '0');
        }
        return colour;
    }

    function addPassword() {
        document.location.href = '/pass/viewAdd';
    }

    // FILTER + SORT + PIN FAVORITES
    /*
    function getFilteredPasswords() {
        let filtered = [...allPasswords];

        // Only favorites toggle filter
        if (favoriteFilter.checked) filtered = filtered.filter(p => p.isFavourite);

        // Tag filter
        const tagText = tagFilter.value.trim().toLowerCase();
        if (tagText) {
            filtered = filtered.filter(p =>
                p.searchTags.some(tag => tag.toLowerCase().includes(tagText))
            );
        }

        // Search filter
        const searchText = searchField.value.trim().toLowerCase();
        if (searchText) {
            filtered = filtered.filter(p =>
                (p.title && p.title.toLowerCase().includes(searchText)) ||
                p.searchTags.some(tag => tag.toLowerCase().includes(searchText))
            );
        }

        // Sort function
        const sortFn = (a, b) => {
            if (titleSort.value === 'asc') {
                return (a.title || '').localeCompare(b.title || '');
            } else {
                return (b.title || '').localeCompare(a.title || '');
            }
        };

        // PIN FAVORITES TO TOP
        const favorites = filtered.filter(p => p.isFavourite).sort(sortFn);
        const nonFavourites = filtered.filter(p => !p.isFavourite).sort(sortFn);

        return [...favorites, ...nonFavourites];
    }

    // RENDER PASSWORDS
    function renderPasswords() {
        const list = getFilteredPasswords();

        const startIndex = currentPage * pageSize;
        const paginatedList = list.slice(startIndex, startIndex + pageSize);

        passwordContainer.innerHTML = '';

        paginatedList.forEach(e => {
            const selectionBox = document.createElement('input');
            selectionBox.classList.add('password-selection');
            selectionBox.type = 'checkbox';

            const childPasswordContainer = document.createElement('div');
            childPasswordContainer.classList.add('password');
            childPasswordContainer.dataset.id = e._id;

            // TITLE
            const title = document.createElement('span');
            title.innerText = e.title || 'No Title Found';

            // FAVORITE BUTTON
            const favBtn = document.createElement('button');
            favBtn.type = 'button';
            favBtn.innerHTML = e.isFavourite
                ? "<i class='fa fa-star'></i>"
                : "<i class='fa fa-star-o'></i>";
            favBtn.title = 'Toggle Favourite';

            favBtn.addEventListener('click', async () => {
                await fetch('/pass/toggleFavourite', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: e._id })
                });
               
                e.isFavourite = !e.isFavourite;
                renderPasswords(); // re-render to reposition pinned favorite
            });

            // COPY OPTIONS
            const copyOptionsContainer = document.createElement('div');
            copyOptionsContainer.classList.add('hidden', 'copy_options');

            ['url', 'username', 'password'].forEach(key => {
                const btn = document.createElement('button');
                btn.innerText = key;
                btn.type = 'button';

                btn.addEventListener('click', async () => {
                    const res = await fetch('/pass/copy', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id: e._id, category: key })
                    });
                    const data = await res.json();
                    await navigator.clipboard.writeText(data.decryptedValue);
                    refreshAutoHideCopyOptionContainer(copyOptionsContainer);
                });

                copyOptionsContainer.appendChild(btn);
            });

            const copyOptionsBtn = document.createElement('button');
            copyOptionsBtn.innerHTML = "<i class='fa fa-copy'></i>";
            copyOptionsBtn.title = 'Copy';
            copyOptionsBtn.type = 'button';
            copyOptionsBtn.addEventListener('click', event => {
                hideAllCopyMenus();
                copyOptionsContainer.classList.remove('hidden');
                copyOptionsContainer.style.left = event.clientX + 'px';
                copyOptionsContainer.style.top = event.clientY + 'px';
                refreshAutoHideCopyOptionContainer(copyOptionsContainer);
            });

            // EDIT BUTTON
            const editOptionsBtn = document.createElement('button');
            editOptionsBtn.innerHTML = "<i class='fa fa-edit'></i>";
            editOptionsBtn.title = 'Edit';
            editOptionsBtn.type = 'button';
            editOptionsBtn.addEventListener('click', () => {
                document.location.href = `/pass/viewEdit/${e._id}`;
            });

            childPasswordContainer.appendChild(selectionBox);
            childPasswordContainer.appendChild(favBtn);
            childPasswordContainer.appendChild(title);
            childPasswordContainer.appendChild(copyOptionsBtn);
            childPasswordContainer.appendChild(editOptionsBtn);
            childPasswordContainer.appendChild(copyOptionsContainer);
            childPasswordContainer.appendChild(document.createElement('br'));

            // TAGS
            const tagContainer = document.createElement('div');
            e.searchTags.forEach(tagText => {
                const tag = document.createElement('span');
                tag.innerText = tagText;
                tag.classList.add('searchTag');
                tag.style.borderColor = calculateColour(tagText);
                tagContainer.appendChild(tag);
            });
            childPasswordContainer.appendChild(tagContainer);

            passwordContainer.appendChild(childPasswordContainer);
        });

        updatePaginationUI(list.length);
    }
    */

    // FETCH
    async function loadPasswords() {
        const res = await fetch('/pass/pull', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ limit: 1000 })
        });

        const data = await res.json();
        allPasswords = data.partialPasswords || [];
        totalPasswords = allPasswords.length;
        renderPasswords();
    }

    // PAGINATION
    function updatePaginationSlice(filteredCount) {
        const sliceStart = Math.min(currentPage * pageSize + 1, filteredCount);
        const sliceEnd = Math.min((currentPage + 1) * pageSize, filteredCount);
        paginationSlice.innerText = `${sliceStart}-${sliceEnd} of ${filteredCount}`;
    }

    function updatePaginationUI(filteredCount) {
        totalPages = Math.max(1, Math.ceil(filteredCount / pageSize));
        document.getElementById('totalPages').innerText = totalPages;
        currentPageNumberField.max = totalPages;
        currentPageNumberField.value = Math.min(currentPage + 1, totalPages);
        updatePaginationSlice(filteredCount);
    }

    // BATCH ACTIONS
    function selectPasswords(checked) {
        document.querySelectorAll('.password-selection').forEach(c => c.checked = checked);
    }

    async function deleteSelected() {
        const selectedIds = Array.from(document.querySelectorAll('.password-selection:checked'))
            .map(cb => cb.closest('.password').dataset.id);

        if (!selectedIds.length) return alert("No passwords selected.");
        if (!confirm(`Delete ${selectedIds.length} password(s)?`)) return;

        try {
            const res = await fetch('/pass/deleteMany', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: selectedIds })
            });

            const result = await res.json();
            if (result.success) loadPasswords();
            else alert("Failed to delete selected passwords.");
        } catch (err) {
            console.error(err);
            alert("Error deleting passwords.");
        }
    }

    //set all to favourite if only some in the list is favourited, otherwise unfavourite if all in selection is favourited
    async function favouriteSelected() {
        const selected = Array.from(document.querySelectorAll('.password-selection:checked'))
            .map(cb => cb.closest('.password').dataset.id);

        if (!selected.length) {
            alert("No passwords selected.");
            return;
        }

        // Find selected password objects
        const selectedObjects = allPasswords.filter(p => selected.includes(p._id));

        // Check if ALL are already favorite
        const allAreFav = selectedObjects.every(p => p.isFavourite === true);

        // If all are fav → unfav them
        // If some not fav → fav them all
        const newState = !allAreFav;

        try {
            const res = await fetch('/pass/favouriteMany', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ids: selected,
                    state: newState
                })
            });

            const result = await res.json();

            if (!result.success) {
                alert("Failed updating favorites");
                return;
            }

            // Update local cache
            allPasswords.forEach(p => {
                if (selected.includes(p._id)) {
                    p.isFavourite = newState;
                }
            });

            renderPasswords();

        } catch (err) {
            console.error(err);
            alert("Error updating favorites");
        }
    }

    // EVENTS
    addPasswordButton.addEventListener('click', addPassword);
    document.getElementById('selectAll').addEventListener('click', () => selectPasswords(true));
    document.getElementById('deselectAll').addEventListener('click', () => selectPasswords(false));
    document.getElementById('deleteSelected').addEventListener('click', deleteSelected);
    document.getElementById('favouriteSelected').addEventListener('click', favouriteSelected);

    // PAGINATION
    document.getElementById('paginationSize').addEventListener('change', e => {
        pageSize = parseInt(e.target.value);
        currentPage = 0;
        renderPasswords();
    });

    document.getElementById('firstPage').addEventListener('click', () => { currentPage = 0; renderPasswords(); });
    document.getElementById('prevPage').addEventListener('click', () => { currentPage = Math.max(currentPage - 1, 0); renderPasswords(); });
    document.getElementById('nextPage').addEventListener('click', () => { currentPage = Math.min(currentPage + 1, totalPages - 1); renderPasswords(); });
    document.getElementById('lastPage').addEventListener('click', () => { currentPage = totalPages - 1; renderPasswords(); });

    currentPageNumberField.addEventListener('change', e => {
        const val = parseInt(e.target.value);
        if (isNaN(val)) return;
        currentPage = Math.max(0, Math.min(val - 1, totalPages - 1));
        renderPasswords();
    });

    // FILTER EVENTS
    [searchField, favoriteFilter, titleSort, tagFilter].forEach(el =>
        el.addEventListener('input', () => {
            currentPage = 0;
            renderPasswords();
        })
    );

    // SHORTCUTS
    document.addEventListener('keydown', e => {
        if (!e.ctrlKey && !e.metaKey) return;

        if (e.key === '/') { e.preventDefault(); searchField.focus(); }
        else if (e.key === 'p') { e.preventDefault(); addPassword(); }
        else if (e.key === 'a') { e.preventDefault(); selectPasswords(true); }
        else if (e.key === 'd') { e.preventDefault(); selectPasswords(false); }
    });

    // INIT
    loadPasswords();
});