var pageSize = 10;
var totalPasswords = 0;
var totalPages = 0;
var currentPage = 0;

function refreshAutoHideCopyOptionContainer(container) {
    if (container._hideTimer) clearTimeout(container._hideTimer);

    container._hideTimer = setTimeout(() => {
        container.classList.add('hidden');
    }, 5000);
}

document.addEventListener('DOMContentLoaded', () => {

    const passwordContainer = document.getElementById('passwordContainer');
    const currentPageNumberField = document.getElementById('currentPageNumber');
    const paginationSlice = document.getElementById('paginationSlice');

    // -------------------------
    // FETCH + RENDER PASSWORDS
    // -------------------------
    async function loadPasswords() {
        const res = await fetch('/passwords/pull', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                limit: pageSize,
                offset: currentPage * pageSize
            })
        });

        const data = await res.json();

        // expected: { passwords: [], total: number }
        const passwords = data.passwords || data;
        totalPasswords = data.total ?? passwords.length;

        totalPages = Math.max(1, Math.ceil(totalPasswords / pageSize));

        renderPasswords(passwords);
        updatePaginationUI();
    }

    function renderPasswords(list) {
        passwordContainer.innerHTML = '';

        list.forEach(e => {
            const selectionBox = document.createElement('input');
            selectionBox.classList.add('password-selection');
            selectionBox.type = 'checkbox';

            const childPasswordContainer = document.createElement('div');
            childPasswordContainer.classList.add('password');

            const label = document.createElement('span');
            label.innerText = e.url || 'Untitled';

            const copyOptionsContainer = document.createElement('div');
            copyOptionsContainer.classList.add('hidden', 'copy_options');

            // fields allowed to copy
            const copyableFields = ['url', 'username', 'password', 'email', 'note'];

            copyableFields.forEach(key => {
                if (!e[key]) return;

                const btn = document.createElement('button');
                btn.innerText = key;

                btn.addEventListener('click', async () => {
                    const res = await fetch('/passwords/paste', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            id: e._id,
                            category: key
                        })
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
            editOptionsBtn.addEventListener('click', () => {
                document.location.href = `/passwords/edit/${e._id}`;
            });

            childPasswordContainer.appendChild(selectionBox);
            childPasswordContainer.appendChild(label);
            childPasswordContainer.appendChild(copyOptionsBtn);
            childPasswordContainer.appendChild(editOptionsBtn);
            childPasswordContainer.appendChild(copyOptionsContainer);

            passwordContainer.appendChild(childPasswordContainer);
        });
    }

    function hideAllCopyMenus() {
        document.querySelectorAll('.copy_options').forEach(el => {
            el.classList.add('hidden');
        });
    }

    // -------------------------
    // LABEL FIELD (NO SUBMIT)
    // -------------------------
    const savedLabelField = document.getElementById('savedLabel');
    savedLabelField.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();

        const value = e.currentTarget.value.trim();
        if (!value) return;

        const savedLabelsContainer = document.getElementById('savedLabels');

        const label = document.createElement('div');
        label.innerHTML = `<span>${value}</span>`;
        label.title = "Click to remove";
        label.classList.add('label');

        label.addEventListener('click', () =>
            savedLabelsContainer.removeChild(label)
        );

        savedLabelsContainer.appendChild(label);
        savedLabelField.value = '';
    });

    // -------------------------
    // PAGINATION UI
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

    document.getElementById('firstPage').addEventListener('click', async () => {
        currentPage = 0;
        await loadPasswords();
    });

    document.getElementById('prevPage').addEventListener('click', async () => {
        currentPage = Math.max(currentPage - 1, 0);
        await loadPasswords();
    });

    document.getElementById('nextPage').addEventListener('click', async () => {
        currentPage = Math.min(currentPage + 1, totalPages - 1);
        await loadPasswords();
    });

    document.getElementById('lastPage').addEventListener('click', async () => {
        currentPage = totalPages - 1;
        await loadPasswords();
    });

    currentPageNumberField.addEventListener('change', async (e) => {
        let val = parseInt(e.target.value);
        if (isNaN(val)) return;

        currentPage = Math.max(0, Math.min(val - 1, totalPages - 1));
        await loadPasswords();
    });

    // initial load
    loadPasswords();
});