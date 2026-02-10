const { json } = require("express");

var autoHideCopyOptionContainer;
var pageSize = 10;
var totalPasswords = 100;
var totalPages = 10;
var currentPage = 0;
//todo use sesssion management to remember current page and values

function refreshAutoHideCopyOptionContainer(copyOptionsContainer) {
    clearTimeout(autoHideCopyOptionContainer);

    autoHideCopyOptionContainer = window.setTimeout(() => {
        copyOptionsContainer.classList.add('hidden');
    }, 5000);
}

document.addEventListener('DOMContentLoaded', () => {
    // add sub headers for multiple passwords under the same url (multiple accounts)
    const passwordContainer = document.getElementById('passwordContainer');

    fetch('/passwords/pull', {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' } 
    })
    .then(res => res.json())
    .then(data => {
        data.forEach(e => {
            const selectionBox = document.createElement('input');
            selectionBox.classList.add('password-selection');
            selectionBox.type = 'checkbox';

            const childPasswordContainer = document.createElement('div');
            childPasswordContainer.classList.add('password');

            const label = document.createElement('span');
            label.innerText = e.url;

            const copyOptionsContainer = document.createElement('div');
            copyOptionsContainer.classList.add('hidden', 'copy_options');

            Object.entries(e).forEach((e2 => {
                const copySubBtn = document.createElement('button');
                copySubBtn.innerText = key
                copySubBtn.addEventListener('click', async () => {
                    fetch('/passwords/paste', {
                        method: 'POST', 
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ category: e2 })
                    })
                    .then(res => res.json())
                    .then(async data => {
                        await navigator.clipboard.writeText(data.decryptedValue); 
                        refreshAutoHideCopyOptionContainer(copyOptionsContainer); // extends duration
                    });
                });
                copyOptionsContainer.appendChild(copySubBtn);
            }));

            const copyOptionsBtn = document.createElement('button');
            copyOptionsBtn.innerText = "📋";
            copyOptionsBtn.title = 'Copy Me';
            copyOptionsBtn.addEventListener('click', (event) => {
                hideChildPasswordContainers();
                copyOptionsContainer.classList.remove('hidden');

                copyOptionsContainer.style.left = event.clientX + 'px';
                copyOptionsContainer.style.top = event.clientY + 'px';

                // starts clock (or restarts if already running)
                refreshAutoHideCopyOptionContainer(copyOptionsContainer);
            });
            const editOptionsBtn = document.createElement('button');
            editOptionsBtn.innerText = "✏️";
            editOptionsBtn.title = 'Edit Me';
            editOptionsBtn.addEventListener('click', (event) => {
                document.location.href = '/passwords/edit' //TODO add id
            });
            childPasswordContainer.appendChild(selectionBox)
            childPasswordContainer.appendChild(label);
            childPasswordContainer.appendChild(copyOptionsBtn);
            childPasswordContainer.appendChild(editOptionsBtn);
            childPasswordContainer.appendChild(copyOptionsContainer);
            passwordContainer.appendChild(childPasswordContainer);
        });
    });

    function hideChildPasswordContainers(callingNode) {
        Array.from(passwordContainer.children).forEach((child) => {
            child.getElementsByClassName('copy_options')[0].classList.add('hidden');
        });
    }
    
    const currentPageNumberField = document.getElementById('currentPageNumber');
    const paginationSlice = document.getElementById('paginationSlice');

    //should not submit but is
    const savedLabelField = document.getElementById('savedLabel');
    savedLabelField.addEventListener('keyup', (e) => {
        e.preventDefault();

        if (e.key === 'Enter') {
            const savedLabelsContainer = document.getElementById('savedLabels');
            const label = document.createElement('div');
            label.innerHTML = `<span>${e.currentTarget.value}</span>`;
            label.title = "Click to remove";
            label.classList.add('label');
            label.addEventListener('click', () => 
                savedLabelsContainer.removeChild(label)
            )
            savedLabelsContainer.appendChild(label);
            savedLabelField.value = ''; 
        }
    });

    const updatePaginationSlice = () => { 
        const sliceStart = Math.min(currentPage * pageSize, totalPasswords);
        const sliceEnd = Math.min(currentPage * pageSize + pageSize, totalPasswords);
        paginationSlice.innerText = `${sliceStart}-${sliceEnd} of ${totalPasswords} Passwords`; 
    };

    //TODO get current pagination settings
    document.getElementById('paginationSize').addEventListener('change', e => {
        pageSize = e.target.value;
        totalPages = Math.round(totalPasswords / pageSize);

        updatePaginationSlice();
        document.getElementById('totalPages').innerText = totalPages;
        currentPageNumberField.max = totalPages;
    });
    document.getElementById('firstPage').addEventListener('click', () => {
        currentPage = 0;
        currentPageNumberField.value = 1;
        updatePaginationSlice();
    });
    document.getElementById('prevPage').addEventListener('click', () => {
        currentPage = Math.max(currentPage - 1, 0);
        currentPageNumberField.value = currentPage + 1;
        updatePaginationSlice();
    });
    document.getElementById('nextPage').addEventListener('click', () => {
        currentPage = Math.min(currentPage + 1, totalPages - 1);
        currentPageNumberField.value = currentPage + 1;
        updatePaginationSlice();
    });
    document.getElementById('lastPage').addEventListener('click', () => {
        currentPage = totalPages - 1;
        currentPageNumberField.value = totalPages;
        updatePaginationSlice();
    });
    currentPageNumberField.addEventListener('change', (e) => {
        currentPage = e.value - 1;
        updatePaginationSlice();
    });
});