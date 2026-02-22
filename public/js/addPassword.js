document.addEventListener('DOMContentLoaded', () => {
    const newTitle = document.getElementById('newTitle');
    const newUrl = document.getElementById('newUrl');
    const newUser = document.getElementById('newUser');
    const newPassword = document.getElementById('newPassword');
    const newTag = document.getElementById('newTag');
    const tagContainer = document.getElementById('newTags');
    const newNote = document.getElementById('newNote');
    const newPasswordForm = document.getElementById('newPasswordForm');
    const newFavourite = document.getElementById('newFavourite');

    const tags = new Set();

    function calculateColour(str) {
        let hash = 0;
        str.split('').forEach(char => {
            hash = char.charCodeAt(0) + ((hash << 5) - hash)
        })
        let colour = '#'
        for (let i = 0; i < 3; i++) {
            const value = (hash >> (i * 8)) & 0xff
            colour += value.toString(16).padStart(2, '0')
        }
        return colour
    }

    newTag.addEventListener('keydown', e => {
        if (e.key !== 'Enter') return;
        e.preventDefault();

        const value = e.currentTarget.value.trim().toLowerCase();
        if (!value) return;

        if (tags.has(value)) return;
        tags.add(value);

        const tag = document.createElement('span');
        tag.innerText = value;
        tag.title = `Click to remove the '${value}' tag`;
        tag.classList.add('searchTag');
        tag.style.borderColor = calculateColour(value);

        tag.addEventListener('click', () => {
            tags.delete(value);
            tagContainer.removeChild(tag);
        });
        tagContainer.appendChild(tag);

        e.currentTarget.value = '';
    });

    newPasswordForm.addEventListener('submit', e => {
        e.preventDefault();

        if (!newPasswordForm.checkValidity()) return;

        const title = newTitle.value;
        const url = newUrl.value;
        const username = newUser.value;
        const password = newPassword.value;
        const note = newNote.value;
        const isFavourite = newFavourite.checked;

        fetch('/pass/add', {
            method: "POST",
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, url, username, password, searchTags: [...tags], note, isFavourite })
        })
        .then(res => res.json())
        .then(data => {
            if (data.redirect) {
                window.location.replace(data.redirect);
            } else if (data.message) {
                alert(data.message);
            }
        });
    });

    const peekButton = document.getElementById('passwordPeek');
    const showPassword = () => {
        peekButton.innerHTML = '<i class="fa-solid fa-eye"></i>';
        newPassword.type = 'text'
    };
    const hidePassword = () => {
        peekButton.innerHTML = '<i class="fa-solid fa-eye-slash"></i>';
        newPassword.type = 'password'
    };

    ['mousedown', 'touchstart'].forEach(evt => peekButton.addEventListener(evt, showPassword));
    ['mouseup', 'mouseleave', 'touchend'].forEach(evt => peekButton.addEventListener(evt, hidePassword));
});