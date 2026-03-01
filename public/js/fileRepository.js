//TODO delete file, disble navToParent if in root, imp delete dir, imp edit file name & tags & note, imp move file between dir, imp change ownership, imp deletion gating if not owner, imp ownerhip indicator, imp file & directory selection / favouriting
//TODO group based file sharing. The file owner maintains full control over the file, but the share allows over uses to (change file tags, move the file, rename the file, edit the file note, overwrite the file, download file, but not; delete the file, change its permisison group or transfer its ownership), 
//TODO allow file previewing for (maybe pdf if its easy), images, txt, csv, json, xml in the browser (or any plain text viewable file) but requires a decryption request to see its contents

let currentPath = '/';
const selectedFiles = new Set();

// ===== Utility Functions =====
function updateCurrentPathDisplay() {
    document.getElementById('currentPath').innerText = currentPath;
}

function toggleSelectFile(fileId, btn) {
    if (selectedFiles.has(fileId)) {
        selectedFiles.delete(fileId);
        btn.innerHTML = '<i class="fa-regular fa-square"></i>';
    } else {
        selectedFiles.add(fileId);
        btn.innerHTML = '<i class="fa-regular fa-square-check"></i>';
    }
}

function renderOwnership(owner) {
    const span = document.createElement('span');
    span.classList.add('ownerIndicator');
    span.innerText = owner === currentUser ? 'You' : owner;
    return span;
}

// ===== File Upload =====
async function selectFile() {
    try {
        const handles = await window.showOpenFilePicker({ multiple: true });
        const files = await Promise.all(handles.map(h => h.getFile()));
        if (!files.length) return;

        files.length === 1 ? uploadSingleFile(files[0]) : uploadMultipleFiles(files);
    } catch (err) {
        console.error('File picker error:', err);
        alert('Failed to select file(s).');
    }
}

async function uploadSingleFile(file) {
    const formData = new FormData();
    formData.append('file', file);
    await uploadRequest('/file/upload', formData, `Uploaded "${file.name}" successfully!`);
}

async function uploadMultipleFiles(files) {
    const formData = new FormData();
    files.forEach(f => formData.append('file[]', f));
    await uploadRequest('/file/uploadMany', formData, `Uploaded ${files.length} files successfully!`);
}

async function uploadRequest(url, formData, successMsg) {
    try {
        const res = await fetch(`${url}?path=${encodeURIComponent(currentPath)}`, { method: 'POST', body: formData });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        console.log('Upload result:', data);
        alert(successMsg);
        loadFiles(currentPath);
    } catch (err) {
        console.error('Upload error:', err);
        alert('Upload failed. See console for details.');
    }
}

// ===== Directory Management =====
async function createDirectory() {
    const name = prompt('Enter folder name:');
    if (!name) return;

    try {
        const res = await fetch('/file/directory/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, parentPath: currentPath })
        });
        const data = await res.json();
        if (data.success) loadFiles(currentPath);
    } catch (err) {
        console.error('Create directory error:', err);
    }
}

function navigateToDir(path) {
    currentPath = path;
    updateCurrentPathDisplay();
    loadFiles(path);
}

// ===== File / Directory Listing =====
async function loadFiles(path) {
    try {
        const res = await fetch(`/file/list?path=${encodeURIComponent(path)}`);
        const data = await res.json();
        const fileList = document.getElementById('fileList');
        fileList.innerHTML = '';

        // ----- Directories -----
        (data.directories || []).forEach(dir => {
            const dirDiv = document.createElement('div');
            dirDiv.className = 'file-item directory';
            dirDiv.innerText = dir.basename;

            // Ownership indicator
            dirDiv.appendChild(renderOwnership(dir.account === currentUser ? currentUser : 'Shared'));

            // Actions container
            const actions = document.createElement('div');
            actions.className = 'file-actions';

            // Download button for directory
            const downloadBtn = document.createElement('button');
            downloadBtn.innerHTML = '<i class="fa-solid fa-download"></i>';
            downloadBtn.title = 'Download folder as ZIP';
            downloadBtn.onclick = e => { e.stopPropagation(); downloadDirectory(dir._id); };
            actions.appendChild(downloadBtn);

            // Owner-only actions: Delete, Rename, Move
            if (dir.account === currentUser) {
                const delBtn = document.createElement('button');
                delBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
                delBtn.onclick = e => { e.stopPropagation(); deleteDirectory(dir.basename); };
                actions.appendChild(delBtn);

                const renameBtn = document.createElement('button');
                renameBtn.innerHTML = '<i class="fa-solid fa-pen"></i>';
                renameBtn.onclick = e => { e.stopPropagation(); renameItem('directory', dir.basename); };
                actions.appendChild(renameBtn);

                const moveBtn = document.createElement('button');
                moveBtn.innerHTML = '<i class="fa-solid fa-arrow-right-arrow-left"></i>';
                moveBtn.title = 'Move directory';
                moveBtn.onclick = e => { e.stopPropagation(); moveFile(dir._id); };
                actions.appendChild(moveBtn);
            }

            dirDiv.appendChild(actions);

            // Navigate into directory
            dirDiv.addEventListener('click', () => navigateToDir(`${path}/${dir.basename}`));

            fileList.appendChild(dirDiv);
        });

        // ----- Files -----
        (data.files || []).forEach(file => {
            const fileDiv = document.createElement('div');
            fileDiv.className = 'file-item';
            fileDiv.innerHTML = `<span>${file.original}</span>`;
            fileDiv.appendChild(renderOwnership(file.account === currentUser ? currentUser : 'Shared'));

            const actions = document.createElement('div');
            actions.className = 'file-actions';

            // Download file
            const downloadBtn = document.createElement('button');
            downloadBtn.innerHTML = '<i class="fa-solid fa-download"></i>';
            downloadBtn.onclick = e => { e.stopPropagation(); downloadFile(file._id); };
            actions.appendChild(downloadBtn);

            // Owner-only actions: Rename, Delete, Move
            if (file.account === currentUser) {
                const renameBtn = document.createElement('button');
                renameBtn.innerHTML = '<i class="fa-solid fa-pen"></i>';
                renameBtn.title = 'Rename file';
                renameBtn.onclick = e => { e.stopPropagation(); renameItem('file', file.original); };
                actions.appendChild(renameBtn);

                const delBtn = document.createElement('button');
                delBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
                delBtn.title = 'Delete file';
                delBtn.onclick = e => { e.stopPropagation(); deleteFile(file._id); };
                actions.appendChild(delBtn);

                const moveBtn = document.createElement('button');
                moveBtn.innerHTML = '<i class="fa-solid fa-arrow-right-arrow-left"></i>';
                moveBtn.title = 'Move file';
                moveBtn.onclick = e => { e.stopPropagation(); moveFile(file._id); };
                actions.appendChild(moveBtn);
            }

            fileDiv.appendChild(actions);

            fileList.appendChild(fileDiv);
        });

    } catch (err) {
        console.error('Load files error:', err);
    }
}

// ===== File Download =====
async function downloadFile(fileId) {
    try {
        const res = await fetch(`/file/download/${fileId}`);
        if (!res.ok) throw new Error('Download failed');
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = '';
        document.body.appendChild(a);
        a.click();
        a.remove();
    } catch (err) {
        console.error('Download error:', err);
    }
}

async function downloadDirectory(directoryId) { 
    try {
        const res = await fetch(`/file/zip/${directoryId}`);
        if (!res.ok) throw new Error('Download failed');

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);

        // Parse filename from Content-Disposition header
        let filename = 'directory.zip';
        const disposition = res.headers.get('Content-Disposition');
        if (disposition && disposition.includes('filename=')) {
            const match = disposition.match(/filename="?(.+?)"?(\s*;|$)/);
            if (match && match[1]) filename = match[1];
        }

        // Create temporary link and click it
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();

        // Release memory
        URL.revokeObjectURL(url);

    } catch (err) {
        console.error('Download error:', err);
        alert('Failed to download directory.');
    }
}

// ===== Search =====
async function searchFiles(query) {
    try {
        const res = await fetch('/file/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ searchTerm: query, filepath: currentPath })
        });
        const data = await res.json();
        const fileList = document.getElementById('fileList');
        fileList.innerHTML = '';
        (data.files || []).forEach(file => {
            const div = document.createElement('div');
            div.className = 'file-item';
            div.innerHTML = `<span>${file.original}</span>`;
            fileList.appendChild(div);
        });
    } catch (err) {
        console.error('Search error:', err);
    }
}

// ===== Event Listeners =====
document.addEventListener('DOMContentLoaded', () => {
    updateCurrentPathDisplay();

    const dropZone = document.getElementById('dropZone');
    const createDirBtn = document.getElementById('createDirBtn');
    const navToParent = document.getElementById('navToParent');

    dropZone.addEventListener('click', selectFile);
    createDirBtn.addEventListener('click', createDirectory);
    navToParent.addEventListener('click', () => {
        if (currentPath === 'root') return;
        const parts = currentPath.split('/');
        parts.pop();
        currentPath = parts.join('/') || 'root';
        updateCurrentPathDisplay();
        loadFiles(currentPath);
    });

    dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('hover'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('hover'));
    dropZone.addEventListener('drop', e => {
        e.preventDefault();
        dropZone.classList.remove('hover');
        uploadMultipleFiles(Array.from(e.dataTransfer.files));
    });

    // Search input
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Search files...';
    dropZone.insertAdjacentElement('afterend', searchInput);
    searchInput.addEventListener('input', e => {
        const query = e.target.value.trim();
        query ? searchFiles(query) : loadFiles(currentPath);
    });

    loadFiles(currentPath);
});