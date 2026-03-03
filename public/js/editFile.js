document.addEventListener("DOMContentLoaded", async () => {  
    const file = window.__FILE__;
    const currentUser = window.currentUser;
    const favoriteFiles = new Set(window.favoriteFiles);

    const { _id: fileId, original: filename, account: owner, tags = [], note = '' } = file;
    const ext = filename.split('.').pop().toLowerCase();

    const previewContainer = document.getElementById("previewContainer");
    const metadataContainer = document.getElementById("metadataContainer");
    const actionsContainer = document.getElementById("actionsContainer");

    // ======= Preview =======
    try {
        const res = await fetch(`/file/preview/${fileId}`);
        if (!res.ok) throw new Error('Preview failed');
        
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const mimeType = blob.type; // Use the server-provided MIME type

        // Clear previous preview and free memory
        if (previewContainer._currentUrl) {
            URL.revokeObjectURL(previewContainer._currentUrl);
        }
        previewContainer.innerHTML = ''; 
        previewContainer._currentUrl = url;

        if (mimeType.startsWith('audio/')) {
            const audio = document.createElement('audio');
            audio.controls = true;
            audio.src = url; // Most modern browsers don't even need the <source> tag if you have the blob URL
            previewContainer.appendChild(audio);

        } else if (mimeType.startsWith('video/')) {
            const video = document.createElement('video');
            video.controls = true; 
            video.style.width = '100%';
            video.src = url;
            previewContainer.appendChild(video);

        } else if (mimeType.startsWith('text/') || ext === 'json' || ext === 'md') {
            const text = await blob.text();
            const pre = document.createElement('pre');
            pre.style.whiteSpace = 'pre-wrap';
            pre.textContent = text;
            previewContainer.appendChild(pre);

        } else if (mimeType.startsWith('image/')) {
            const img = document.createElement('img');
            img.src = url; 
            img.style.maxWidth = '100%';
            previewContainer.appendChild(img);

        } else if (mimeType === 'application/pdf') {
            const iframe = document.createElement('iframe');
            iframe.src = url;
            iframe.width = '100%';
            iframe.height = '80vh';
            previewContainer.appendChild(iframe);

        } else {
            previewContainer.textContent = `Previews are not currently supported for: ${mimeType}`;
        }
    } catch (err) {
        console.error('Preview error:', err);
        previewContainer.textContent = 'Failed to load preview.';
    }

    // ======= Metadata =======
    const ul = document.createElement('ul');
    ul.innerHTML = `
        <li><strong>Filename:</strong> ${filename}</li>
        <li><strong>Owner:</strong> ${owner === currentUser ? 'You' : owner}</li>
        <li><strong>Tags:</strong> ${tags.join(', ') || '-'}</li>
        <li><strong>Note:</strong> ${note || '-'}</li>
    `;
    metadataContainer.appendChild(ul);

    // ======= Actions =======
    const dlBtn = document.createElement('button');
    dlBtn.innerText = 'Download';
    dlBtn.onclick = () => downloadFile(fileId);
    actionsContainer.appendChild(dlBtn);

    const favBtn = document.createElement('button');
    favBtn.innerText = favoriteFiles.has(fileId) ? 'Unfavorite' : 'Favorite';
    favBtn.style.marginLeft = '1em';
    favBtn.onclick = () => {
        toggleFavorite(fileId, favBtn);
        favBtn.innerText = favoriteFiles.has(fileId) ? 'Unfavorite' : 'Favorite';
    };
    actionsContainer.appendChild(favBtn);

    if (owner === currentUser) {
        const editBtn = document.createElement('button');
        editBtn.innerText = 'Edit Tags/Note';
        editBtn.style.marginLeft = '1em';
        editBtn.onclick = () => editFileMetadata(fileId);
        actionsContainer.appendChild(editBtn);

        const renameBtn = document.createElement('button');
        renameBtn.innerText = 'Rename';
        renameBtn.style.marginLeft = '1em';
        renameBtn.onclick = () => renameItem('file', filename);
        actionsContainer.appendChild(renameBtn);

        const delBtn = document.createElement('button');
        delBtn.innerText = 'Delete';
        delBtn.style.marginLeft = '1em';
        delBtn.onclick = () => { deleteFile(fileId); location.reload(); };
        actionsContainer.appendChild(delBtn);
    }
});