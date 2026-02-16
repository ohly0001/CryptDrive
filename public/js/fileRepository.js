async function selectFile() {
    try {
        const [fileHandle] = await window.showOpenFilePicker();
        const file = await fileHandle.getFile();
        await uploadFile(file)
    } catch (error) {
        console.error('File picker error:', error);
    }
}

async function uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file); 
    
    try {
        fetch('/file/upload', {
            method: 'POST',
            body: formData
        })
        .then(res => res.json())
        .then(data => {
            console.log('Success:', data);
        });
    } catch (error) {
        console.error('Error uploading file:', error);
    }
}

async function uploadFiles(files) {
    const formData = new FormData();
    for (const file in files) {
        formData.append('file[]', file); 
    }
    try {
        fetch('/file/uploadMany', {
            method: 'POST',
            body: formData
        })
        .then(res => res.json())
        .then(data => {
            console.log('Success:', data);
        });
    } catch (error) {
        console.error('Error uploading file:', error);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('dropZone');
    const chooseFileText = document.getElementById('chooseFileText');

    chooseFileText.addEventListener('click', e => {
        selectFile();
    });

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('hover');
    });
    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('hover');
    });
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault(); 
        dropZone.classList.remove('hover');

        const files = e.dataTransfer.files;
        uploadFiles(file);
    });

});