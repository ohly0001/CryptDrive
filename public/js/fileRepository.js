//TODO delete file, disble navToParent if in root, imp delete dir, imp edit file name & tags & note, imp move file between dir, imp change ownership, imp deletion gating if not owner, imp ownerhip indicator, imp file & directory selection / favouriting
//TODO group based file sharing. The file owner maintains full control over the file, but the share allows over uses to (change file tags, move the file, rename the file, edit the file note, overwrite the file, download file, but not; delete the file, change its permisison group or transfer its ownership), 
//TODO allow file previewing for (maybe pdf if its easy), images, txt, csv, json, xml in the browser (or any plain text viewable file) but requires a decryption request to see its contents



let currentPath = 'root';

// ===== File Selection / Drag & Drop =====
async function selectFile() {
    try {
        const [fileHandle] = await window.showOpenFilePicker();
        const file = await fileHandle.getFile();
        await uploadFiles([file]);
    } catch (error) {
        console.error('File picker error:', error);
    }
}

async function uploadFiles(files) {
    const formData = new FormData();
    for (const file of files) {
        formData.append('file[]', file);
    }

    try {
        const res = await fetch(`/file/uploadMany?path=${encodeURIComponent(currentPath)}`, {
            method: 'POST',
            body: formData
        });
        const data = await res.json();
        console.log('Upload success:', data);
        loadFiles(currentPath);
    } catch (err) {
        console.error('Upload error:', err);
    }
}

// ===== File download =====
async function downloadFile(fileId) {
    try {
        const res = await fetch(`/file/download/${fileId}`);
        if (!res.ok) throw new Error('Download failed');

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = ''; // let browser use original filename
        document.body.appendChild(a);
        a.click();
        a.remove();
    } catch (err) {
        console.error('Download error:', err);
    }
}

// ===== Directory Management =====
async function createDirectory() {
    const name = prompt('Enter new folder name:');
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
    document.getElementById('currentPath').innerText = currentPath;
    loadFiles(path);
}

// ===== Load files =====
// ===== File Selection State =====
const selectedFiles = new Set(); // stores fileIds

// ===== Updated loadFiles =====
async function loadFiles(path) {
    try {
        const res = await fetch(`/file/list?path=${encodeURIComponent(path)}`);
        const data = await res.json();
        const fileList = document.getElementById('fileList');
        fileList.innerHTML = '';

        // ---- Directories ----
        data.directories.forEach(dir => {
            const dirDiv = document.createElement('div');
            dirDiv.className = 'file-item directory';
            dirDiv.innerText = dir.name;

            // Ownership indicator
            const ownerSpan = document.createElement('span');
            ownerSpan.innerText = dir.owner === currentUser ? 'You' : dir.owner;
            ownerSpan.classList.add('ownerIndicator');
            dirDiv.appendChild(ownerSpan);

            // Select button
            const selectBtn = document.createElement('button');
            selectBtn.innerHTML = '<i class="fa-regular fa-square"></i>';
            selectBtn.onclick = (e) => {
                e.stopPropagation();
                if (selectedFiles.has(dir.name)) {
                    selectedFiles.delete(dir.name);
                    selectBtn.innerHTML = '<i class="fa-regular fa-square"></i>';
                } else {
                    selectedFiles.add(dir.name);
                    selectBtn.innerHTML = '<i class="fa-regular fa-square-check"></i>';
                }
            };
            dirDiv.appendChild(selectBtn);

            // Navigate on click
            dirDiv.addEventListener('click', () => navigateToDir(`${path}/${dir.name}`));

            // Actions container
            const actions = document.createElement('div');
            actions.className = 'file-actions';

            // Delete (only if owner)
            if (dir.owner === currentUser) {
                const delBtn = document.createElement('button');
                delBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
                delBtn.onclick = (e) => { e.stopPropagation(); deleteDirectory(dir.name); };
                actions.appendChild(delBtn);

                const renameBtn = document.createElement('button');
                renameBtn.innerHTML = '<i class="fa-solid fa-pen"></i>';
                renameBtn.onclick = (e) => { e.stopPropagation(); renameItem('directory', dir.name); };
                actions.appendChild(renameBtn);
            }

            dirDiv.appendChild(actions);
            fileList.appendChild(dirDiv);
        });

        // ---- Files ----
        data.files.forEach(file => {
            const div = document.createElement('div');
            div.className = 'file-item';
            const nameSpan = document.createElement('span');
            nameSpan.innerText = file.name;
            div.appendChild(nameSpan);

            // Ownership
            const ownerSpan = document.createElement('span');
            ownerSpan.innerText = file.owner === currentUser ? 'You' : file.owner;
            ownerSpan.classList.add('ownerIndicator');
            div.appendChild(ownerSpan);

            // Select button
            const selectBtn = document.createElement('button');
            selectBtn.innerHTML = selectedFiles.has(file._id) ? '<i class="fa-regular fa-square-check"></i>' : '<i class="fa-regular fa-square"></i>';
            selectBtn.onclick = (e) => {
                e.stopPropagation();
                if (selectedFiles.has(file._id)) selectedFiles.delete(file._id);
                else selectedFiles.add(file._id);
                selectBtn.innerHTML = selectedFiles.has(file._id) ? '<i class="fa-regular fa-square-check"></i>' : '<i class="fa-regular fa-square"></i>';
            };
            div.appendChild(selectBtn);

            // Actions
            const actions = document.createElement('div');
            actions.className = 'file-actions';

            // Download
            const downloadBtn = document.createElement('button');
            downloadBtn.innerHTML = '<i class="fa-solid fa-download"></i>';
            downloadBtn.onclick = (e) => { e.stopPropagation(); downloadFile(file._id); };
            actions.appendChild(downloadBtn);

            // Move
            if (file.owner === currentUser) {
                const moveBtn = document.createElement('button');
                moveBtn.innerHTML = '<i class="fa-solid fa-arrow-right-arrow-left"></i>';
                moveBtn.onclick = (e) => { e.stopPropagation(); moveFile(file._id); };
                actions.appendChild(moveBtn);
            }

            // Rename & Delete (owner only)
            if (file.owner === currentUser) {
                const renameBtn = document.createElement('button');
                renameBtn.innerHTML = '<i class="fa-solid fa-pen"></i>';
                renameBtn.onclick = (e) => { e.stopPropagation(); renameItem('file', file.name); };
                actions.appendChild(renameBtn);

                const delBtn = document.createElement('button');
                delBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
                delBtn.onclick = (e) => { e.stopPropagation(); deleteFile(file._id); };
                actions.appendChild(delBtn);
            }

            div.appendChild(actions);

            // Tags display
            const tagWrap = document.createElement("div");
            (file.tags || []).forEach(t => {
                const tag = document.createElement("span");
                tag.innerText = t;
                tag.title = `Click to add '${t}' tag`;
                tag.classList.add("searchTag");
                tag.style.borderColor = calculateColour(t);
                tag.onclick = () => addSearchTag(t);
                tagWrap.appendChild(tag);
            });
            div.appendChild(tagWrap);

            fileList.appendChild(div);
        });

    } catch (err) {
        console.error('Load files error:', err);
    }
}

// ===== File Search =====
async function searchFiles(query) {
    try {
        const res = await fetch('/file/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, filePath: currentPath })
        });
        const data = await res.json();
        const fileList = document.getElementById('fileList');
        fileList.innerHTML = '';

        if (data.files.length === 0) {
            fileList.innerHTML = '<i>No results found</i>';
            return;
        }

        data.files.forEach(file => {
            const div = document.createElement('div');
            div.className = 'file-item';
            div.innerHTML = `<span>${file.name}</span>
                            <div class="file-actions">
                            <button onclick="downloadFile('${file._id}')">
                                <i class="fa-solid fa-download"></i>
                            </button>
                            <button disabled>
                                <i class="fa-solid fa-share-nodes"></i>
                            </button>
                            <button onclick="moveFile('${file._id}')">
                                <i class="fa-solid fa-arrow-right-arrow-left"></i>
                            </button>
                            </div>`;
            fileList.appendChild(div);

            const dirDiv = document.createElement('div');
            dirDiv.className = 'file-item directory';
            dirDiv.innerText = dir.name;

            if (file.owner === currentUser) {
                const delBtn = document.createElement('button');
                delBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
                delBtn.onclick = (e) => { e.stopPropagation(); deleteDirectory(dir.name); };
                dirDiv.appendChild(delBtn);
            }
            
            dirDiv.addEventListener('click', () => navigateToDir(`${path}/${dir.name}`));
            fileList.appendChild(dirDiv);
        });
    } catch (err) {
        console.error('Search error:', err);
    }
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

function renderOwnership(file) {
    const span = document.createElement('span');
    span.innerText = file.owner === currentUser ? 'You' : file.owner;
    span.classList.add('ownerIndicator');
    return span;
}

async function renameItem(type, oldName) {
    const newName = prompt(`Enter new name for ${oldName}:`);
    if (!newName) return;

    try {
        const res = await fetch(`/file/${type}/rename`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: currentPath, oldName, newName })
        });
        const data = await res.json();
        if (data.success) loadFiles(currentPath);
    } catch (err) {
        console.error('Rename error:', err);
    }
}

async function moveFile(fileId) {
    const dest = prompt('Enter destination path (relative to root):');
    if (!dest) return;

    try {
        const res = await fetch(`/file/move`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileId, destPath: dest })
        });
        const data = await res.json();
        if (data.success) loadFiles(currentPath);
    } catch (err) {
        console.error('Move file error:', err);
    }
}

async function deleteFile(fileId) {
    if (!confirm('Are you sure you want to delete this file?')) return;
    try {
        const res = await fetch(`/file/delete/${fileId}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) loadFiles(currentPath);
    } catch (err) {
        console.error('Delete file error:', err);
    }
}

async function deleteDirectory(dirName) {
    if (!confirm(`Are you sure you want to delete folder "${dirName}"?`)) return;
    try {
        const res = await fetch(`/file/directory/delete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: `${currentPath}/${dirName}` })
        });
        const data = await res.json();
        if (data.success) loadFiles(currentPath);
    } catch (err) {
        console.error('Delete directory error:', err);
    }
}

// ===== Event Listeners =====
document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('dropZone');
    const chooseFileText = document.getElementById('chooseFileText');
    const createDirBtn = document.getElementById('createDirBtn');
    const navToParent = document.getElementById('navToParent');

    navToParent.addEventListener('click', (e) => {
        if (currentPath === 'root') return; // Disable if in root
        const parts = currentPath.split('/');
        parts.pop(); // Remove last folder
        currentPath = parts.join('/') || 'root';
        document.getElementById('currentPath').innerText = currentPath;
        loadFiles(currentPath);
    });

    chooseFileText.addEventListener('click', selectFile);
    createDirBtn.addEventListener('click', createDirectory);

    dropZone.addEventListener('dragover', e => {
        e.preventDefault();
        dropZone.classList.add('hover');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('hover');
    });

    dropZone.addEventListener('drop', e => {
        e.preventDefault();
        dropZone.classList.remove('hover');
        const files = Array.from(e.dataTransfer.files);
        uploadFiles(files);
    });

    // ===== Add search bar dynamically =====
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Search files...';
    searchInput.style.marginBottom = '10px';
    dropZone.insertAdjacentElement('afterend', searchInput);

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        if (query) searchFiles(query);
        else loadFiles(currentPath);
    });

    navToParent.addEventListener('click', (e) => {
        
    });

    loadFiles(currentPath);
});