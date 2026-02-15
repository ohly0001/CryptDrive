var pageSize = 10;
var totalPasswords = 0;
var totalPages = 0;
var currentPage = 0;

document.addEventListener('DOMContentLoaded', () => {
    const addPasswordButton = document.getElementById('addPasswordButton');
    
    const passwordContainer = document.getElementById('passwordContainer');
    const currentPageNumberField = document.getElementById('currentPageNumber');
    const paginationSlice = document.getElementById('paginationSlice');

    const searchField = document.getElementById('searchField');

    let allPasswords = []; // store fetched passwords for filtering

    // UTILITY FUNCTIONS
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

    function addPassword() {
        document.location.href='/pass/viewAdd'
    }

    // RENDER PASSWORDS
    function renderPasswords(list) {
        passwordContainer.innerHTML = '';

        list.forEach(e => {
            const selectionBox = document.createElement('input');
            selectionBox.classList.add('password-selection');
            selectionBox.type = 'checkbox';

            const childPasswordContainer = document.createElement('div');
            childPasswordContainer.classList.add('password');

            const title = document.createElement('span');
            title.innerText = e.title || 'No Title Found';

            const copyOptionsContainer = document.createElement('div');
            copyOptionsContainer.classList.add('hidden', 'copy_options');

            const copyableFields = ['url', 'username', 'password'];
            copyableFields.forEach(key => {
                //if (!e[key]) return;

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
                document.location.href = `/pass/viewEdit/${e._id}`;
            });

            childPasswordContainer.appendChild(selectionBox);
            childPasswordContainer.appendChild(title);
            childPasswordContainer.appendChild(copyOptionsBtn);
            childPasswordContainer.appendChild(editOptionsBtn);
            childPasswordContainer.appendChild(copyOptionsContainer);
            childPasswordContainer.appendChild(document.createElement('br'));

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
    }

    // FETCH PASSWORDS
    async function loadPasswords() {
        await fetch('/pass/pull', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ limit: pageSize, offset: currentPage * pageSize })
        })
        .then(res => res.json())
        .then(data => {
            allPasswords = data.partialPasswords || [];
            totalPasswords = data.total ?? allPasswords.length;
            totalPages = Math.max(1, Math.ceil(totalPasswords / pageSize));

            renderPasswords(allPasswords);
            updatePaginationUI();
        });
    }

    // PAGINATION
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

    // BATCH ACTIONS
    function selectPasswords(checked) {
        document.querySelectorAll('.password-selection').forEach(c => c.checked = checked);
    }

    function deleteSelected() {
        
    }

    document.getElementById('selectAll').addEventListener('click', () => selectPasswords(true));
    document.getElementById('deselectAll').addEventListener('click', () => selectPasswords(false));
    // Delete selected would require API endpoints; placeholders:
    document.getElementById('deleteSelected').addEventListener('click', () => deleteSelected());
    
    // Shortcuts
    document.addEventListener('keydown', (e) => {
        // Check if the key combination is Ctrl+ (or Cmd+ on Mac)
        //e.preventDefault();
        if (!e.ctrlKey && !e.metaKey) return;

        if (e.key === '/') {
            e.preventDefault();
            searchField.focus();
        }
        else if (e.key === 'p') {
            e.preventDefault();
            addPassword();
        }
        else if (e.key === 'a') {
            e.preventDefault();
            selectPasswords(true);
        }
        else if (e.key === 'd') {
            e.preventDefault();
            selectPasswords(false);
        }
    });

    addPasswordButton.addEventListener('click', e => addPassword());

    // INITIAL LOAD
    loadPasswords();
});