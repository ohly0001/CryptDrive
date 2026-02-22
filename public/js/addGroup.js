const maxMaxMembers = 10;

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('newPasswordForm');

    const nameInput = document.getElementById('newName');
    const useJoinCodeInput = document.getElementById('useJoinCode');
    const favouriteInput = document.getElementById('newFavourite');

    const memberInput = document.getElementById('newMember');
    const memberContainer = document.getElementById('newMembers');
    const maxMemberInput = document.getElementById('maxMembers');
    maxMemberInput.max = maxMaxMembers;

    const tagInput = document.getElementById('newTag');
    const tagContainer = document.getElementById('newTags');

    const descInput = document.getElementById('newDesc');

    let members = new Set();
    let tags = new Set();

    /* ---------------------------
       MEMBER HANDLING
    ---------------------------- */

    memberInput.addEventListener('keydown', e => {
        if (e.key !== 'Enter') return;

        e.preventDefault();

        const maxMembers = parseInt(maxMemberInput.value);
        if (members.size >= maxMembers) {
            alert(`Maximum of ${maxMembers} members reached.`);
            return;
        }

        const value = e.currentTarget.value.trim().toLowerCase();
        if (!value || members.has(value)) return;

        members.add(value);
        renderMemberTag(value);
        e.currentTarget.value = '';

        // Adjust maxMemberInput if needed
        if (parseInt(maxMemberInput.value) < members.size) {
            maxMemberInput.value = members.size;
            maxMemberInput.min = members.size;
        }
    });

    function renderMemberTag(value) {
        const tag = document.createElement('span');
        tag.classList.add('memberTag');
        tag.innerText = value;
        tag.name = `Click to remove member '${value}'`;

        tag.addEventListener('click', () => {
            members.delete(value);
            memberContainer.removeChild(tag);
        });

        memberContainer.appendChild(tag);
    }

    /* ---------------------------
       TAG HANDLING
    ---------------------------- */

    function calculateColour(str) {
        let hash = 0;
        for (let char of str) {
            hash = char.charCodeAt(0) + ((hash << 5) - hash);
        }
        let colour = '#';
        for (let i = 0; i < 3; i++) {
            const value = (hash >> (i * 8)) & 0xff;
            colour += value.toString(16).padStart(2, '0');
        }
        return colour;
    }

    tagInput.addEventListener('keydown', e => {
        if (e.key !== 'Enter') return;

        e.preventDefault();
        const value = e.currentTarget.value.trim().toLowerCase();
        if (!value || tags.has(value)) return;

        tags.add(value);
        renderTag(value);
        e.currentTarget.value = '';
    });

    function renderTag(value) {
        const tag = document.createElement('span');
        tag.classList.add('searchTag');
        tag.innerText = value;
        tag.name = `Click to remove '${value}' tag`;
        tag.style.borderColor = calculateColour(value);

        tag.addEventListener('click', () => {
            tags.delete(value);
            tagContainer.removeChild(tag);
        });

        tagContainer.appendChild(tag);
    }

    /* ---------------------------
       FORM SUBMIT
    ---------------------------- */

    form.addEventListener('submit', async e => {
        e.preventDefault();

        const payload = {
            title: titleInput.value.trim(),
            generateJoinCode: useJoinCodeInput.checked,
            favourite: favouriteInput.checked,
            members: [...members],
            tags: [...tags],
            description: descInput.value.trim(),
            maxMembers: parseInt(maxMemberInput?.value || Math.min(members.size, maxMaxMembers))
        };

        try {
            const res = await fetch('/api/groups', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (data.redirect) {
                window.location.replace(data.redirect);
            } else if (data.message) {
                alert(data.message);
            }
        } catch (err) {
            console.error(err);
            alert('Error creating group.');
        }
    });
});
