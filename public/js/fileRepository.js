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
async function loadFiles(path) {
    try {
        const res = await fetch(`/file/list?path=${encodeURIComponent(path)}`);
        const data = await res.json();
        const fileList = document.getElementById('fileList');
        fileList.innerHTML = '';

        // Directories first
        data.directories.forEach(dir => {
            const div = document.createElement('div');
            div.className = 'file-item directory';
            div.innerText = dir.name;
            div.addEventListener('click', () => navigateToDir(`${path}/${dir.name}`));
            fileList.appendChild(div);
        });

        // Files
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
                             </div>`;
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
                             </div>`;
            fileList.appendChild(div);
        });
    } catch (err) {
        console.error('Search error:', err);
    }
}

// ===== Event Listeners =====
document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('dropZone');
    const chooseFileText = document.getElementById('chooseFileText');
    const createDirBtn = document.getElementById('createDirBtn');
    const navToParent = document.getElementById('navToParent');

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