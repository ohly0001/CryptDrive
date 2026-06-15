// fileRepository.js
// ===== GLOBALS =====
let currentPath = '/';
const selectedFiles = new Set();
const favoriteFiles = new Set();
const currentUser = window.__CURRENT_USER__;
const searchField = document.getElementById('searchField') || { value: '' };

const state = {
    pageSize: 6,
    offset: 0,
    loading: false,
    reachedEnd: false,
    matchCase: false,
    matchEntire: false,
    useRegex: false,
    blacklistTags: false,
    favouritesOnly: false,
    searchTags: new Set(),
    sortMode: 0
};

// ===== MIME ICONS =====
const mimeToCategory = {
    audio: new Set(['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4']),
    video: new Set(['video/mp4', 'video/webm', 'video/ogg']),
    image: new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml']),
    pdf: new Set(['application/pdf']),
    word: new Set(['application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
    excel: new Set(['application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']),
    powerpoint: new Set(['application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation']),
    csv: new Set(['text/csv']),
    code: new Set(['text/html','text/css','application/javascript','application/json','application/xml']),
    text: new Set(['text/plain','text/markdown']),
    zip: new Set(['application/zip','application/x-7z-compressed','application/x-rar-compressed']),
    secure: new Set(['application/pgp-encrypted','application/x-pem-file']),
    crypto: new Set(['application/x-bitcoin']),
    medical: new Set(['application/hl7-v2','application/fhir+json']),
    system: new Set(['application/octet-stream'])
};

const categoryIcons = {
    default: '<i class="fa-solid fa-file"></i>',
    audio: '<i class="fa-solid fa-file-audio"></i>',
    video: '<i class="fa-solid fa-file-video"></i>',
    image: '<i class="fa-solid fa-file-image"></i>',
    pdf: '<i class="fa-solid fa-file-pdf"></i>',
    word: '<i class="fa-solid fa-file-word"></i>',
    excel: '<i class="fa-solid fa-file-excel"></i>',
    powerpoint: '<i class="fa-solid fa-file-powerpoint"></i>',
    csv: '<i class="fa-solid fa-file-csv"></i>',
    code: '<i class="fa-solid fa-file-code"></i>',
    text: '<i class="fa-solid fa-file-lines"></i>',
    zip: '<i class="fa-solid fa-file-zipper"></i>',
    secure: '<i class="fa-solid fa-file-shield"></i>',
    crypto: '<i class="fa-solid fa-file-invoice-dollar"></i>',
    medical: '<i class="fa-solid fa-file-medical"></i>',
    system: '<i class="fa-solid fa-laptop-file"></i>',
    error: '<i class="fa-solid fa-file-circle-exclamation"></i>'
};

function getFileIcon(mime) {
    if (!mime) return categoryIcons.error;
    for (const [category, mimeList] of Object.entries(mimeToCategory)) {
        if (mimeList.has(mime)) return categoryIcons[category] || categoryIcons.default;
    }
    if (mime.startsWith('image/')) return categoryIcons.image;
    if (mime.startsWith('audio/')) return categoryIcons.audio;
    if (mime.startsWith('video/')) return categoryIcons.video;
    return categoryIcons.default;
}

// ===== UTILITY =====
function updateCurrentPathDisplay() {
    const pathElem = document.getElementById('currentPath');
    if (pathElem) pathElem.value = currentPath.replace("//","/");
    const navBtn = document.getElementById('navToParent');
    if (navBtn) navBtn.disabled = currentPath === '/';
}

function toggleSelectFile(fileId, btn) {
    //TODO add selection checkboxes in renderer
    if (selectedFiles.has(fileId)) {
        selectedFiles.delete(fileId);
        btn.innerHTML = '<i class="fa-regular fa-square"></i>';
    } else {
        selectedFiles.add(fileId);
        btn.innerHTML = '<i class="fa-regular fa-square-check"></i>';
    }
}

function toggleFavorite(fileId, btn) {
    //TODO add for both directors and implement API route
    if (favoriteFiles.has(fileId)) {
        favoriteFiles.delete(fileId);
        btn.innerHTML = '<i class="fa-regular fa-star"></i>';
    } else {
        favoriteFiles.add(fileId);
        btn.innerHTML = '<i class="fa-solid fa-star"></i>';
    }
}

function renderOwnership(owner) {
    const span = document.createElement('span');
    span.classList.add('ownerIndicator');
    span.innerText = owner === currentUser ? 'You' : owner;
    return span;
}

// ===== FILE/DIRECTORY ACTIONS =====
async function deleteFile(fileId) {
    if (!confirm('Are you sure you want to delete this file?')) return;
    try {
        const res = await fetch(`/file/delete/${fileId}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Delete failed');
        loadFiles();
    } catch (err) { console.error(err); alert('Failed to delete file'); }
}

async function deleteDirectory(dirId) {
    if (!confirm('Delete folder and contents?')) return;
    try {
        const res = await fetch(`/file/directory/delete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: dirId })
        });
        const data = await res.json();
        if (!data.success) throw new Error('Delete failed');
        loadFiles();
    } catch (err) { console.error(err); alert('Failed to delete folder'); }
}

async function renameItem(type, id, oldName) {
    const newName = prompt(`Enter new ${type} name:`, oldName);
    if (!newName || newName === oldName) return;
    try {
        const res = await fetch(`/file/rename`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type, id, newName })
        });
        const data = await res.json();
        if (data.success) loadFiles();
    } catch (err) { console.error(err); alert('Failed to rename item'); }
}

async function moveItem(type, id) {
    const destPath = prompt('Enter destination folder path:');
    if (!destPath || destPath === currentPath) return;
    try {
        const res = await fetch(`/file/move`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type, id, destPath })
        });
        const data = await res.json();
        if (data.success) loadFiles();
    } catch (err) { console.error(err); alert('Failed to move item'); }
}

async function downloadDirectory(dirId) {
    window.location.href = `/file/downloadDirectory/${dirId}`;
}

// ===== FILE UPLOAD =====
async function selectFile() {
    try {
        const handles = await window.showOpenFilePicker({ multiple: true });
        const files = await Promise.all(handles.map(h => h.getFile()));
        if (!files.length) return;
        files.length === 1 ? uploadSingleFile(files[0]) : uploadMultipleFiles(files);
    } catch (err) { console.error(err); alert('Failed to select file(s)'); }
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
        alert(successMsg);
        loadFiles();
    } catch (err) { console.error(err); alert('Upload failed'); }
}

// ===== DIRECTORY MANAGEMENT =====
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
        if (data.success) loadFiles();
    } catch (err) { console.error(err); }
}

// ===== DIRECTORY NAVIGATION =====
function navigateToDir(path) {
    if (!path) return;

    path = path.trim().replace(/\/+/g, '/'); // collapse //
    if (!path.startsWith('/')) path = '/' + path;

    currentPath = path;
    updateCurrentPathDisplay();
    loadFiles();
}

// ===== LOAD FILES =====
async function loadFiles() {
    try {
        const res = await fetch('/file/search', {
            method: 'POST',
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                cwd: currentPath,
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
        const fileList = document.getElementById('fileList');
        fileList.innerHTML = '';

        // --- DIRECTORIES ---
        (data.directories || []).forEach(dir => {
            const div = document.createElement('div');
            div.className = 'file-item directory';
            div.innerHTML = `<span><i class="fa-solid fa-folder-closed"></i> ${dir.basename}</span>`;
            div.appendChild(renderOwnership(dir.account === currentUser ? currentUser : 'Shared'));

            const actions = document.createElement('div'); actions.className = 'file-actions';
            ['delete','rename','move'].forEach(action => {
                const btn = document.createElement('button');
                if(action==='delete'){ btn.innerHTML='<i class="fa-solid fa-trash"></i>'; btn.onclick=e=>{ e.stopPropagation(); deleteDirectory(dir._id); }; }
                if(action==='rename'){ btn.innerHTML='<i class="fa-solid fa-pen"></i>'; btn.onclick=e=>{ e.stopPropagation(); renameItem('directory',dir._id, dir.basename); }; }
                if(action==='move'){ btn.innerHTML='<i class="fa-solid fa-arrow-right-arrow-left"></i>'; btn.onclick=e=>{ e.stopPropagation(); moveItem('directory', dir._id); }; }
                actions.appendChild(btn);
            });
            div.appendChild(actions);
            div.addEventListener('click', () => navigateToDir(`${currentPath}/${dir.basename}`));
            fileList.appendChild(div);
        });

        // --- FILES ---
        (data.files || []).forEach(file => {
            const div = document.createElement('div');
            div.className = 'file-item';
            const displayName = file.original || file.filename;
            div.innerHTML = `<span>${getFileIcon(file.mime)} ${displayName}</span>`;
            div.appendChild(renderOwnership(file.account === currentUser ? currentUser : 'Shared'));

            div.onclick = e => { e.stopPropagation(); window.location.href = `/file/view/${file._id}`; };
            div.style.cursor = 'pointer';

            const actions = document.createElement('div'); actions.className = 'file-actions';

            const favBtn = document.createElement('button');
            favBtn.innerHTML = favoriteFiles.has(file._id) ? '<i class="fa-solid fa-star"></i>' : '<i class="fa-regular fa-star"></i>';
            favBtn.title = 'Favorite';
            favBtn.onclick = e => { e.stopPropagation(); toggleFavorite(file._id, favBtn); };
            actions.appendChild(favBtn);

            ['rename','delete','move'].forEach(action => {
                const btn = document.createElement('button');
                if(action==='rename'){ btn.innerHTML='<i class="fa-solid fa-pen"></i>'; btn.onclick=e=>{ e.stopPropagation(); renameItem('file',file._id,file.original); }; }
                if(action==='delete'){ btn.innerHTML='<i class="fa-solid fa-trash"></i>'; btn.onclick=e=>{ e.stopPropagation(); deleteFile(file._id); }; }
                if(action==='move'){ btn.innerHTML='<i class="fa-solid fa-arrow-right-arrow-left"></i>'; btn.onclick=e=>{ e.stopPropagation(); moveItem('file',file._id); }; }
                actions.appendChild(btn);
            });

            div.appendChild(actions);
            fileList.appendChild(div);
        });

    } catch(err){ console.error('Load files error:', err); }
}

// ===== INIT DOM =====
document.addEventListener('DOMContentLoaded', () => {
    updateCurrentPathDisplay();

    const dropZone = document.getElementById('dropZone');
    const createDirBtn = document.getElementById('createDirBtn');
    const navToParent = document.getElementById('navToParent');
    const cwd = document.getElementById('currentPath');

    dropZone.addEventListener('click', selectFile);
    createDirBtn.addEventListener('click', createDirectory);
    navToParent.addEventListener('click', () => {
        if (currentPath === '/') return;
        const parts = currentPath.split('/'); parts.pop();
        currentPath = parts.join('/') || '/';
        updateCurrentPathDisplay();
        loadFiles();
    });

    dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('hover'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('hover'));
    dropZone.addEventListener('drop', e => {
        e.preventDefault();
        dropZone.classList.remove('hover');
        uploadMultipleFiles(Array.from(e.dataTransfer.files));
    });

    cwd.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const raw = cwd.value.trim();
            const path = raw === '' ? '/' : raw;
            navigateToDir(path);
        }
    });

    loadFiles();
});