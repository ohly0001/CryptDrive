//TODO allow files or folders to be dragged to drop them inside others

// ===== GLOBALS =====
let currentPath = window.__CWD__ || '/';
const selectedFiles = new Set();
const favoriteFiles = new Set();
const currentUser = window.__CURRENT_USER__ || 'You'; // you can inject this server-side
const searchField = document.getElementById('searchField') || { value: '' };

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

    searchTags: new Set()
};

const mimeToCategory = {
    'audio': new Set(['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4']),
    'video': new Set(['video/mp4', 'video/webm', 'video/ogg']),
    'image': new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml']),
    'pdf': new Set(['application/pdf']),
    'word': new Set(['application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
    'excel': new Set(['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']),
    'powerpoint': new Set(['application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation']),
    'csv': new Set(['text/csv']),
    'code': new Set(['text/html', 'text/css', 'application/javascript', 'application/json', 'application/xml']),
    'text': new Set(['text/plain', 'text/markdown']),
    'zip': new Set(['application/zip', 'application/x-7z-compressed', 'application/x-rar-compressed']),
    'secure': new Set(['application/pgp-encrypted', 'application/x-pem-file']),
    'crypto': new Set(['application/x-bitcoin']),
    'medical': new Set(['application/hl7-v2', 'application/fhir+json']),
    'system': new Set(['application/octet-stream'])
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
        if (mimeList.has(mime)) {
            return categoryIcons[category] || categoryIcons.default;
        }
    }

    // Fallback for MIME types starting with image/audio/video
    if (mime.startsWith('image/')) return categoryIcons.image;
    if (mime.startsWith('audio/')) return categoryIcons.audio;
    if (mime.startsWith('video/')) return categoryIcons.video;

    return categoryIcons.default;
}

// ===== Utility Functions =====
function updateCurrentPathDisplay() {
    const pathElem = document.getElementById('currentPath');
    if (pathElem) pathElem.innerText = currentPath;
    const navBtn = document.getElementById('navToParent');
    if (navBtn) navBtn.disabled = currentPath === 'root' || currentPath === '/';
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

function toggleFavorite(fileId, btn) {
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

// ===== File / Directory Actions =====
async function deleteFile(fileId) {
    if (!confirm('Are you sure you want to delete this file?')) return;
    try {
        const res = await fetch(`/file/delete/${fileId}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Delete failed');
        loadFiles(currentPath);
    } catch (err) {
        console.error('Delete file error:', err);
        alert('Failed to delete file.');
    }
}

async function deleteDirectory(dirName) {
    if (!confirm(`Are you sure you want to delete folder "${dirName}" and its contents?`)) return;
    try {
        const res = await fetch(`/file/directory/delete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: currentPath, name: dirName })
        });
        const data = await res.json();
        if (!data.success) throw new Error('Delete failed');
        loadFiles(currentPath);
    } catch (err) {
        console.error('Delete directory error:', err);
        alert('Failed to delete directory.');
    }
}

async function renameItem(type, oldName) {
    const newName = prompt(`Enter new ${type} name:`, oldName);
    if (!newName || newName === oldName) return;
    try {
        const res = await fetch(`/file/rename`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type, path: currentPath, oldName, newName })
        });
        const data = await res.json();
        if (data.success) loadFiles(currentPath);
    } catch (err) {
        console.error('Rename error:', err);
        alert('Failed to rename item.');
    }
}

async function moveFile(fileId) {
    const destPath = prompt('Enter destination folder path:');
    if (!destPath || destPath === currentPath) return;
    try {
        const res = await fetch(`/file/move`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileId, destPath })
        });
        const data = await res.json();
        if (data.success) loadFiles(currentPath);
    } catch (err) {
        console.error('Move file error:', err);
        alert('Failed to move file.');
    }
}

// ===== File Upload =====
async function selectFile() {
    try {
        const handles = await window.showOpenFilePicker({ multiple:true });
        const files = await Promise.all(handles.map(h=>h.getFile()));
        if(!files.length) return;
        files.length===1?uploadSingleFile(files[0]):uploadMultipleFiles(files);
    } catch(err){ console.error('File picker error:',err); alert('Failed to select file(s).'); }
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
    if(!name) return;
    try {
        const res = await fetch('/file/directory/create',{
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify({name,parentPath:currentPath})
        });
        const data = await res.json();
        if(data.success) loadFiles(currentPath);
    } catch(err){ console.error('Create directory error:',err); }
}

// ===== DIRECTORY NAVIGATION =====
function navigateToDir(path) {
    currentPath = path;
    updateCurrentPathDisplay();
    loadFiles(path);
}

// ===== File / Directory Listing =====
async function loadFiles(path) {
    try {
        const res = await fetch('/file/search', {
            method: 'POST',
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
                blacklistTags: state.blacklistTags,
                cwd: path
            })
        });

        const data = await res.json();
        const fileList = document.getElementById('fileList');
        fileList.innerHTML = '';

        // Directories
        (data.directories || []).forEach(dir => {
            const dirDiv = document.createElement('div');
            dirDiv.className = 'file-item directory';

            const title = document.createElement('span');
            title.innerHTML = `<span><i class="fa-solid fa-folder-closed"></i> ${dir.basename}</span>`;
            dirDiv.appendChild(title);

            // hover open effect
            ['mouseover', 'mouseenter'].forEach(ev => dirDiv.addEventListener(ev, () => {
                title.innerHTML = `<span><i class="fa-solid fa-folder-open"></i> ${dir.basename}</span>`;
            }));
            ['mouseout', 'mouseleave'].forEach(ev => dirDiv.addEventListener(ev, () => {
                title.innerHTML = `<span><i class="fa-solid fa-folder-closed"></i> ${dir.basename}</span>`;
            }));

            dirDiv.appendChild(renderOwnership(dir.account === currentUser ? currentUser : 'Shared'));

            const actions = document.createElement('div'); actions.className = 'file-actions';
            const downloadBtn = document.createElement('button');
            downloadBtn.innerHTML = '<i class="fa-solid fa-download"></i>';
            downloadBtn.title = 'Download folder as ZIP';
            downloadBtn.onclick = e => { e.stopPropagation(); downloadDirectory(dir._id); };
            actions.appendChild(downloadBtn);

            if (dir.account === currentUser) {
                ['delete','rename','move','configure'].forEach(action => {
                    const btn = document.createElement('button');
                    if(action==='delete'){ btn.innerHTML='<i class="fa-solid fa-trash"></i>'; btn.onclick=e=>{ e.stopPropagation(); deleteDirectory(dir._id); }; }
                    if(action==='rename'){ btn.innerHTML='<i class="fa-solid fa-pen"></i>'; btn.onclick=e=>{ e.stopPropagation(); renameItem('directory',dir.basename); }; }
                    if(action==='move'){ btn.innerHTML='<i class="fa-solid fa-arrow-right-arrow-left"></i>'; btn.onclick=e=>{ e.stopPropagation(); moveFile(dir._id); }; }
                    actions.appendChild(btn);
                });
            }
            dirDiv.appendChild(actions);
            dirDiv.addEventListener('click',()=>navigateToDir(`${path}/${dir.basename}`));
            fileList.appendChild(dirDiv);
        });

        // Files
        (data.files || []).forEach(file => {
            const fileDiv = document.createElement('div');
            fileDiv.className = 'file-item';
            fileDiv.innerHTML = `<span>${getFileIcon(file.mime)} ${file.original}</span>`;
            fileDiv.appendChild(renderOwnership(file.account === currentUser ? currentUser : 'Shared'));

            const actions = document.createElement('div'); actions.className = 'file-actions';
            const previewBtn = document.createElement('button');
            previewBtn.innerHTML = '<i class="fa-solid fa-arrows-to-eye"></i>';
            previewBtn.title = 'Preview file';
            previewBtn.onclick = () => { document.location.href = `/file/editFile/${file._id}`; };
            actions.appendChild(previewBtn);

            const favBtn = document.createElement('button');
            favBtn.innerHTML = favoriteFiles.has(file._id) ? '<i class="fa-solid fa-star"></i>' : '<i class="fa-regular fa-star"></i>';
            favBtn.title = 'Favorite';
            favBtn.onclick = e => { e.stopPropagation(); toggleFavorite(file._id, favBtn); };
            actions.appendChild(favBtn);

            if(file.account === currentUser) {
                ['rename','delete','move'].forEach(action => {
                    const btn = document.createElement('button');
                    if(action==='rename'){ btn.innerHTML='<i class="fa-solid fa-pen"></i>'; btn.onclick=e=>{ e.stopPropagation(); renameItem('file',file.original); }; }
                    if(action==='delete'){ btn.innerHTML='<i class="fa-solid fa-trash"></i>'; btn.onclick=e=>{ e.stopPropagation(); deleteFile(file._id); }; }
                    if(action==='move'){ btn.innerHTML='<i class="fa-solid fa-arrow-right-arrow-left"></i>'; btn.onclick=e=>{ e.stopPropagation(); moveFile(file._id); }; }
                    actions.appendChild(btn);
                });
            }

            fileDiv.appendChild(actions);
            fileList.appendChild(fileDiv);
        });

    } catch(err){ console.error('Load files error:', err); }
}

// ===== Search =====
async function searchFiles(query) {
    try {
        const res = await fetch('/file/search',{
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify({ searchTerm: query, filepath: currentPath })
        });
        const data = await res.json();
        const fileList = document.getElementById('fileList');
        fileList.innerHTML='';
        (data.files||[]).forEach(file=>{
            const div=document.createElement('div'); div.className='file-item'; div.innerHTML=`<span>${file.original}</span>`; fileList.appendChild(div);
        });
    } catch(err){ console.error('Search error:',err); }
}

// ===== DOM READY =====
document.addEventListener('DOMContentLoaded', () => {
    updateCurrentPathDisplay();

    const dropZone = document.getElementById('dropZone');
    const createDirBtn = document.getElementById('createDirBtn');
    const navToParent = document.getElementById('navToParent');

    dropZone.addEventListener('click', selectFile);
    createDirBtn.addEventListener('click', createDirectory);
    navToParent.addEventListener('click', () => {
        if(currentPath==='root') return;
        const parts = currentPath.split('/'); parts.pop();
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

    loadFiles(currentPath);
});