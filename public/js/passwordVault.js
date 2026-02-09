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
            });

            const copyOptionsBtn = document.createElement('button');
            copyOptionsBtn.innerText = "📋";
            copyOptionsBtn.title = 'Copy...';
            copyOptionsBtn.addEventListener('click', (event) => {
                hideChildPasswordContainers();
                copyOptionsContainer.classList.remove('hidden');

                copyOptionsContainer.style.left = event.clientX + 'px';
                copyOptionsContainer.style.top = event.clientY + 'px';

                // starts clock (or restarts if already running)
                refreshAutoHideCopyOptionContainer(copyOptionsContainer);
            });

            childPasswordContainer.appendChild(label);
            childPasswordContainer.appendChild(copyOptionsBtn);
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