let currentPath = '/home';
const selectedFiles = new Set();
const favoriteFiles = new Set();

// ===== Utility Functions =====
function updateCurrentPathDisplay() {
    document.getElementById('currentPath').innerText = currentPath;
    document.getElementById('navToParent').disabled = currentPath === 'root' || currentPath === '/';
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

async function editFileMetadata(fileId) {
    const note = prompt('Enter file note:');
    const tags = prompt('Enter file tags (comma-separated):');
    try {
        const res = await fetch(`/file/metadata/${fileId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ note, tags: tags ? tags.split(',').map(t => t.trim()) : [] })
        });
        if (!res.ok) throw new Error('Metadata update failed');
        loadFiles(currentPath);
    } catch (err) {
        console.error('Edit metadata error:', err);
        alert('Failed to update metadata.');
    }
}

// ===== File Preview =====
async function previewFile(file) {
    const { _id: fileId, original: filename, account: owner, tags = [], note = '' } = file;
    const ext = filename.split('.').pop().toLowerCase();
    const textExt = ['txt','csv','json','xml','md'];
    const imgExt = ['png','jpg','jpeg','gif','webp'];
    const pdfExt = ['pdf'];

    try {
        const res = await fetch(`/file/preview/${fileId}`);
        if (!res.ok) throw new Error('Preview failed');
        const blob = await res.blob();

        const previewWindow = window.open('', '_blank');
        previewWindow.document.title = `Preview: ${filename}`;
        const doc = previewWindow.document;

        // Basic styling
        const style = doc.createElement('style');
        style.textContent = `
            body { font-family: sans-serif; margin:0; padding:0; }
            .tabs { display:flex; background:#eee; }
            .tab { padding:0.5em 1em; cursor:pointer; border-right:1px solid #ccc; }
            .tab.active { background:#fff; font-weight:bold; }
            .tab-content { padding:1em; }
        `;
        doc.head.appendChild(style);

        const tabsContainer = doc.createElement('div'); tabsContainer.className = 'tabs'; doc.body.appendChild(tabsContainer);
        const contentContainer = doc.createElement('div'); contentContainer.className = 'tab-content'; doc.body.appendChild(contentContainer);

        const tabNames = ['Preview','Metadata','Actions'];
        const tabs = {};
        tabNames.forEach(name => {
            const tab = doc.createElement('div');
            tab.className = 'tab';
            tab.innerText = name;
            tab.addEventListener('click', () => {
                Object.values(tabs).forEach(t => t.tab.classList.remove('active'));
                tab.classList.add('active');
                renderTab(name);
            });
            tabsContainer.appendChild(tab);
            tabs[name] = { tab };
        });
        tabs['Preview'].tab.classList.add('active');

        function renderTab(name) {
            contentContainer.innerHTML = '';
            if (name === 'Preview') {
                if (textExt.includes(ext)) {
                    blob.text().then(text => {
                        const pre = doc.createElement('pre');
                        pre.style.whiteSpace = 'pre-wrap';
                        pre.style.wordBreak = 'break-word';
                        pre.textContent = text;
                        contentContainer.appendChild(pre);
                    });
                } else if (imgExt.includes(ext)) {
                    const url = URL.createObjectURL(blob);
                    const img = doc.createElement('img');
                    img.src = url; img.style.maxWidth='100%'; img.style.height='auto';
                    contentContainer.appendChild(img);
                } else if (pdfExt.includes(ext)) {
                    const url = URL.createObjectURL(blob);
                    const iframe = doc.createElement('iframe');
                    iframe.src = url; iframe.width='100%'; iframe.height='80vh'; iframe.style.border='none';
                    contentContainer.appendChild(iframe);
                } else contentContainer.textContent = 'Preview not supported for this file type.';
            } else if (name === 'Metadata') {
                const ul = doc.createElement('ul');
                ul.innerHTML = `
                    <li><strong>Filename:</strong> ${filename}</li>
                    <li><strong>Owner:</strong> ${owner===currentUser?'You':owner}</li>
                    <li><strong>Tags:</strong> ${tags.join(', ')||'-'}</li>
                    <li><strong>Note:</strong> ${note||'-'}</li>
                `;
                contentContainer.appendChild(ul);
            } else if (name === 'Actions') {
                const dlBtn = doc.createElement('button'); dlBtn.innerText='Download'; dlBtn.onclick=()=>downloadFile(fileId); contentContainer.appendChild(dlBtn);
                const favBtn = doc.createElement('button'); favBtn.style.marginLeft='1em'; favBtn.innerText=favoriteFiles.has(fileId)?'Unfavorite':'Favorite'; favBtn.onclick=()=>{ toggleFavorite(fileId,favBtn); favBtn.innerText=favoriteFiles.has(fileId)?'Unfavorite':'Favorite'; }; contentContainer.appendChild(favBtn);

                if (owner===currentUser) {
                    const editBtn = doc.createElement('button'); editBtn.style.marginLeft='1em'; editBtn.innerText='Edit Tags/Note'; editBtn.onclick=()=>editFileMetadata(fileId); contentContainer.appendChild(editBtn);
                    const renameBtn = doc.createElement('button'); renameBtn.style.marginLeft='1em'; renameBtn.innerText='Rename'; renameBtn.onclick=()=>renameItem('file',filename); contentContainer.appendChild(renameBtn);
                    const delBtn = doc.createElement('button'); delBtn.style.marginLeft='1em'; delBtn.innerText='Delete'; delBtn.onclick=()=>{ deleteFile(fileId); previewWindow.close(); }; contentContainer.appendChild(delBtn);
                }
            }
        }
        renderTab('Preview');

    } catch(err) {
        console.error('Preview error:', err);
        alert('Failed to preview file.');
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

// uploadSingleFile, uploadMultipleFiles, uploadRequest remain unchanged (copy from original)

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

function navigateToDir(path) {
    currentPath = path;
    updateCurrentPathDisplay();
    loadFiles(path);
}

// ===== File / Directory Listing =====
async function loadFiles(path) {
    try {
        const res = await fetch(`/file/list/${encodeURIComponent(path)}`);
        const data = await res.json();
        const fileList = document.getElementById('fileList');
        fileList.innerHTML='';

        // Directories
        (data.directories||[]).forEach(dir=>{
            // TODO use font awesome for different file types
            const dirDiv=document.createElement('div');
            dirDiv.className='file-item directory';
            dirDiv.innerText=dir.basename;
            dirDiv.appendChild(renderOwnership(dir.account===currentUser?currentUser:'Shared'));

            const actions=document.createElement('div'); actions.className='file-actions';
            const downloadBtn=document.createElement('button'); downloadBtn.innerHTML='<i class="fa-solid fa-download"></i>'; downloadBtn.title='Download folder as ZIP'; downloadBtn.onclick=e=>{ e.stopPropagation(); downloadDirectory(dir._id); }; actions.appendChild(downloadBtn);

            if(dir.account===currentUser){
                ['delete','rename','move'].forEach(action=>{
                    const btn=document.createElement('button');
                    if(action==='delete'){ btn.innerHTML='<i class="fa-solid fa-trash"></i>'; btn.onclick=e=>{ e.stopPropagation(); deleteDirectory(dir.basename); }; }
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
        (data.files||[]).forEach(file=>{
            const fileDiv=document.createElement('div'); fileDiv.className='file-item'; fileDiv.innerHTML=`<span>${file.original}</span>`; fileDiv.appendChild(renderOwnership(file.account===currentUser?currentUser:'Shared'));

            const actions=document.createElement('div'); actions.className='file-actions';

            // Preview
            const previewBtn=document.createElement('button'); previewBtn.innerHTML='<i class="fa-regular fa-eye"></i>'; previewBtn.title='Preview file'; previewBtn.onclick=e=>{ e.stopPropagation(); previewFile(file); }; actions.appendChild(previewBtn);

            // Favorite
            const favBtn=document.createElement('button'); favBtn.innerHTML=favoriteFiles.has(file._id)?'<i class="fa-solid fa-star"></i>':'<i class="fa-regular fa-star"></i>'; favBtn.title='Favorite'; favBtn.onclick=e=>{ e.stopPropagation(); toggleFavorite(file._id,favBtn); }; actions.appendChild(favBtn);

            if(file.account===currentUser){
                ['rename','delete','move','metadata'].forEach(action=>{
                    const btn=document.createElement('button');
                    if(action==='rename'){ btn.innerHTML='<i class="fa-solid fa-pen"></i>'; btn.onclick=e=>{ e.stopPropagation(); renameItem('file',file.original); }; }
                    if(action==='delete'){ btn.innerHTML='<i class="fa-solid fa-trash"></i>'; btn.onclick=e=>{ e.stopPropagation(); deleteFile(file._id); }; }
                    if(action==='move'){ btn.innerHTML='<i class="fa-solid fa-arrow-right-arrow-left"></i>'; btn.onclick=e=>{ e.stopPropagation(); moveFile(file._id); }; }
                    if(action==='metadata'){ btn.innerHTML='<i class="fa-solid fa-info"></i>'; btn.title='Edit tags/note'; btn.onclick=e=>{ e.stopPropagation(); editFileMetadata(file._id); }; }
                    actions.appendChild(btn);
                });
            }
            fileDiv.appendChild(actions);
            fileList.appendChild(fileDiv);
        });
    } catch(err){ console.error('Load files error:',err); }
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

// ===== Event Listeners =====
document.addEventListener('DOMContentLoaded',()=>{
    updateCurrentPathDisplay();

    const dropZone=document.getElementById('dropZone');
    const createDirBtn=document.getElementById('createDirBtn');
    const navToParent=document.getElementById('navToParent');

    dropZone.addEventListener('click',selectFile);
    createDirBtn.addEventListener('click',createDirectory);
    navToParent.addEventListener('click',()=>{
        if(currentPath==='root') return;
        const parts=currentPath.split('/'); parts.pop();
        currentPath=parts.join('/')||'root';
        updateCurrentPathDisplay();
        loadFiles(currentPath);
    });

    dropZone.addEventListener('dragover',e=>{ e.preventDefault(); dropZone.classList.add('hover'); });
    dropZone.addEventListener('dragleave',()=>dropZone.classList.remove('hover'));
    dropZone.addEventListener('drop',e=>{
        e.preventDefault();
        dropZone.classList.remove('hover');
        uploadMultipleFiles(Array.from(e.dataTransfer.files));
    });

    const searchInput=document.createElement('input'); searchInput.type='text'; searchInput.placeholder='Search files...';
    dropZone.insertAdjacentElement('afterend',searchInput);
    searchInput.addEventListener('input',e=>{
        const query=e.target.value.trim(); query?searchFiles(query):loadFiles(currentPath);
    });

    loadFiles(currentPath);
});