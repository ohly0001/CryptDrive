document.addEventListener("DOMContentLoaded", async () => {  
    const file = window.__FILE__;
    const currentUser = window.currentUser;
    const favoriteFiles = new Set(window.favoriteFiles);

    const { _id: fileId, filename, account: owner } = file;
    const ext = filename.split('.').pop().toLowerCase();

    const metadataContainer = document.getElementById("metadataContainer");
    const actionsContainer = document.getElementById("actionsContainer");

    // ======= Metadata =======
    const ul = document.createElement('ul');
    ul.innerHTML = `
        <li><strong>Filename:</strong> ${filename}</li>
        <li><strong>Owner:</strong> ${owner === currentUser ? 'You' : owner}</li>
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