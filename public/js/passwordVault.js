var pageSize = 10;
var totalPasswords = 0;
var totalPages = 0;
var currentPage = 0;

document.addEventListener('DOMContentLoaded', () => {
    const passwordContainer = document.getElementById('passwordContainer');
    const currentPageNumberField = document.getElementById('currentPageNumber');
    const paginationSlice = document.getElementById('paginationSlice');

    const savedTagField = document.getElementById('savedTag');
    const savedTagsContainer = document.getElementById('savedTags');
    const searchField = document.getElementById('searchField');
    const filterTagField = document.getElementById('filterTag');
    const filterTagsContainer = document.getElementById('filterTags');

    let allPasswords = []; // store fetched passwords for filtering

    // -------------------------
    // UTILITY FUNCTIONS
    // -------------------------
    function refreshAutoHideCopyOptionContainer(container) {
        if (container._hideTimer) clearTimeout(container._hideTimer);

        container._hideTimer = setTimeout(() => {
            container.classList.add('hidden');
        }, 5000);
    }

    function hideAllCopyMenus() {
        document.querySelectorAll('.copy_options').forEach(el => {
            el.classList.add('hidden');
        });
    }

    function getSelectedTags(container) {
        return Array.from(container.children).map(c => c.innerText.trim());
    }

    function calculateColour(str) {
        let hash = 0;
        str.split('').forEach(char => {
            hash = char.charCodeAt(0) + ((hash << 5) - hash)
        })
        let colour = '#'
        for (let i = 0; i < 3; i++) {
            const value = (hash >> (i * 8)) & 0xff
            colour += value.toString(16).padStart(2, '0')
        }
        return colour
    }

    // -------------------------
    // RENDER PASSWORDS
    // -------------------------
    function renderPasswords(list) {
        passwordContainer.innerHTML = '';

        list.forEach(e => {
            const selectionBox = document.createElement('input');
            selectionBox.classList.add('password-selection');
            selectionBox.type = 'checkbox';

            const childPasswordContainer = document.createElement('div');
            childPasswordContainer.classList.add('password');

            const url = document.createElement('span');
            url.innerText = e.url || 'No URL Provided';

            const copyOptionsContainer = document.createElement('div');
            copyOptionsContainer.classList.add('hidden', 'copy_options');

            const copyableFields = ['url', 'username', 'password', 'note'];
            copyableFields.forEach(key => {
                if (!e[key]) return;

                const btn = document.createElement('button');
                btn.innerText = key;
                btn.type = 'button';

                btn.addEventListener('click', async () => {
                    const res = await fetch('/passwords/copy', {
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
            copyOptionsBtn.innerText = "📋";
            copyOptionsBtn.title = 'Copy';
            copyOptionsBtn.type = 'button';
            copyOptionsBtn.addEventListener('click', (event) => {
                hideAllCopyMenus();
                copyOptionsContainer.classList.remove('hidden');
                copyOptionsContainer.style.left = event.clientX + 'px';
                copyOptionsContainer.style.top = event.clientY + 'px';
                refreshAutoHideCopyOptionContainer(copyOptionsContainer);
            });

            const editOptionsBtn = document.createElement('button');
            editOptionsBtn.innerText = "✏️";
            editOptionsBtn.title = 'Edit';
            editOptionsBtn.type = 'button';
            editOptionsBtn.addEventListener('click', () => {
                document.location.href = `/passwords/edit/${e._id}`;
            });

            childPasswordContainer.appendChild(selectionBox);
            childPasswordContainer.appendChild(url);
            childPasswordContainer.appendChild(copyOptionsBtn);
            childPasswordContainer.appendChild(editOptionsBtn);
            childPasswordContainer.appendChild(copyOptionsContainer);

            passwordContainer.appendChild(childPasswordContainer);
        });
    }

    // -------------------------
    // FETCH PASSWORDS
    // -------------------------
    async function loadPasswords() {
        const res = await fetch('/passwords/pull', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ limit: pageSize, offset: currentPage * pageSize })
        });
        const data = await res.json();

        allPasswords = data.partialPasswords || [];
        totalPasswords = data.total ?? allPasswords.length;
        totalPages = Math.max(1, Math.ceil(totalPasswords / pageSize));

        applyFilters();
        updatePaginationUI();
    }

    // -------------------------
    // FILTERING
    // -------------------------
    function applyFilters() {
        let filtered = allPasswords.slice();

        const searchQuery = searchField.value.trim().toLowerCase();
        const tagFilters = getSelectedTags(filterTagsContainer);

        if (searchQuery) {
            filtered = filtered.filter(p => (p.url || '').toLowerCase().includes(searchQuery));
        }

        if (tagFilters.length) {
            filtered = filtered.filter(p => {
                if (!p.tags || !Array.isArray(p.tags)) return false;
                return tagFilters.every(f => p.tags.includes(f));
            });
        }

        renderPasswords(filtered);
    }

    searchField.addEventListener('input', applyFilters);
    filterTagField.addEventListener('keydown', e => {
        if (e.key !== 'Enter') return;
        e.preventDefault();

        const value = e.currentTarget.value.trim();
        if (!value) return;

        const tag = document.createElement('div');
        tag.innerText = value;
        tag.title = 'Click to remove';
        tag.classList.add('searchTag');
        tag.style.backgroundColor = calculateColour(value);

        tag.addEventListener('click', () => filterTagsContainer.removeChild(tag));
        filterTagsContainer.appendChild(tag);

        e.currentTarget.value = '';
        applyFilters();
    });

    // -------------------------
    // LABELS FOR ADD PASSWORD
    // -------------------------
    savedTagField.addEventListener('keydown', e => {
        if (e.key !== 'Enter') return;
        e.preventDefault();

        const value = e.currentTarget.value.trim();
        if (!value) return;

        const tag = document.createElement('div');
        tag.innerText = value;
        tag.title = 'Click to remove';
        tag.classList.add('searchTag');
        tag.style.backgroundColor = calculateColour(value);
        console.log(tag.style.backgroundColor);

        tag.addEventListener('click', () => savedTagsContainer.removeChild(tag));
        savedTagsContainer.appendChild(tag);

        savedTagField.value = '';
    });

    // -------------------------
    // PAGINATION
    // -------------------------
    function updatePaginationSlice() {
        const sliceStart = Math.min(currentPage * pageSize + 1, totalPasswords);
        const sliceEnd = Math.min((currentPage + 1) * pageSize, totalPasswords);
        paginationSlice.innerText = `${sliceStart}-${sliceEnd} of ${totalPasswords}`;
    }

    function updatePaginationUI() {
        document.getElementById('totalPages').innerText = totalPages;
        currentPageNumberField.max = totalPages;
        currentPageNumberField.value = currentPage + 1;
        updatePaginationSlice();
    }

    document.getElementById('paginationSize').addEventListener('change', async e => {
        pageSize = parseInt(e.target.value);
        currentPage = 0;
        await loadPasswords();
    });

    document.getElementById('firstPage').addEventListener('click', async () => { currentPage = 0; await loadPasswords(); });
    document.getElementById('prevPage').addEventListener('click', async () => { currentPage = Math.max(currentPage - 1, 0); await loadPasswords(); });
    document.getElementById('nextPage').addEventListener('click', async () => { currentPage = Math.min(currentPage + 1, totalPages - 1); await loadPasswords(); });
    document.getElementById('lastPage').addEventListener('click', async () => { currentPage = totalPages - 1; await loadPasswords(); });

    currentPageNumberField.addEventListener('change', async e => {
        let val = parseInt(e.target.value);
        if (isNaN(val)) return;
        currentPage = Math.max(0, Math.min(val - 1, totalPages - 1));
        await loadPasswords();
    });

    // -------------------------
    // BATCH ACTIONS
    // -------------------------
    document.getElementById('selectAll').addEventListener('click', () => {
        document.querySelectorAll('.password-selection').forEach(c => c.checked = true);
    });
    document.getElementById('deselectAll').addEventListener('click', () => {
        document.querySelectorAll('.password-selection').forEach(c => c.checked = false);
    });
    // Add/Remove/Delete selected would require API endpoints; placeholders:
    document.getElementById('addTagSelected').addEventListener('click', () => { alert('Add Tag to Selected - Not implemented'); });
    document.getElementById('removeTagSelected').addEventListener('click', () => { alert('Remove Tag from Selected - Not implemented'); });
    document.getElementById('deleteSelected').addEventListener('click', () => { alert('Delete Selected - Not implemented'); });

    // -------------------------
    // INITIAL LOAD
    // -------------------------
    loadPasswords();
});