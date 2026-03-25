// accountManagement.js

let editingAccount = false;
let currentAccount = null;

document.addEventListener('DOMContentLoaded', async () => {

    const editAccountButton = document.getElementById('editAccount'); // Save in edit mode
    const cancelEditAccountButton = document.getElementById('cancelEditAccount');
    const accountTypeField = document.getElementById('accountType');
    const usernameField = document.getElementById('username');
    const emailField = document.getElementById('email');
    const createdAt = document.getElementById('createdAt');
    const updatedAt = document.getElementById('updatedAt');
    const logout = document.getElementById('logout');

    // =============================
    // State Helpers
    // =============================
    function setEditing(state) {
        editingAccount = state;
        usernameField.readOnly = !state;
        emailField.readOnly = !state;

        if (state) {
            editAccountButton.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save';
            editAccountButton.disabled = true; // initially no changes
            cancelEditAccountButton.style.display = 'inline-block';
        } else {
            editAccountButton.innerHTML = '<i class="fas fa-user-edit"></i> Edit Account';
            editAccountButton.disabled = false;
            cancelEditAccountButton.style.display = 'none';
        }
    }

    function startEditing() {
        setEditing(true);
    }

    function stopEditing() {
        setEditing(false);
        renderAccount(currentAccount); // revert UI to saved state
    }

    // =============================
    // Utility Helpers
    // =============================
    function normalizeAccount(account) {
        return {
            username: (account.username || '').trim(),
            email: (account.email || '').trim().toLowerCase()
        };
    }

    function getFormValues() {
        return {
            username: usernameField.value.trim(),
            email: emailField.value.trim().toLowerCase()
        };
    }

    function getChanges(current, updated) {
        const changes = {};
        if (updated.username !== current.username) changes.username = updated.username;
        if (updated.email !== current.email) changes.email = updated.email;
        return changes;
    }

    function renderAccount(data) {
        usernameField.value = data.username;
        accountTypeField.value = data.type;
        emailField.value = data.email;

        createdAt.innerHTML =
            `<i class="fa-solid fa-clock"></i> Created On: ${new Date(data.createdAt).toLocaleString()}`;
        updatedAt.innerHTML =
            `<i class="fa-regular fa-clock"></i> Last Updated On: ${new Date(data.updatedAt).toLocaleString()}`;
    }

    function updateButtonState() {
        if (!editingAccount) return;
        const current = normalizeAccount(currentAccount);
        const updated = getFormValues();
        const hasChanges = Object.keys(getChanges(current, updated)).length > 0;

        editAccountButton.disabled = !hasChanges;
    }

    usernameField.addEventListener('input', updateButtonState);
    emailField.addEventListener('input', updateButtonState);

    // =============================
    // Load Account
    // =============================
    try {
        const res = await fetch('/account/pull');
        const data = await res.json();

        if (data.redirect) return window.location.replace(data.redirect);
        if (data.message) return alert(data.message);

        currentAccount = data;
        renderAccount(data);
        stopEditing();

    } catch (err) {
        console.error(err);
        alert('Could not load account details.');
    }

    // =============================
    // Cancel Button
    // =============================
    cancelEditAccountButton.addEventListener('click', () => {
        stopEditing();
    });

    // =============================
    // Edit / Save Button
    // =============================
    editAccountButton.addEventListener('click', async () => {

        if (!editingAccount) {
            startEditing();
            return;
        }

        // Editing with changes
        const current = normalizeAccount(currentAccount);
        const updated = getFormValues();
        const changes = getChanges(current, updated);
        const hasChanges = Object.keys(changes).length > 0;

        if (!hasChanges) return; // Save is disabled anyway

        if (!confirm("Are you sure you want to commit these changes?")) {
            stopEditing();
            return;
        }

        editAccountButton.disabled = true;

        try {
            const res = await fetch('/account/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(changes)
            });

            const data = await res.json();

            if (data.redirect) return window.location.replace(data.redirect);
            if (data.message) {
                alert(data.message);
                editAccountButton.disabled = false;
                return;
            }

            currentAccount = data;
            stopEditing();

        } catch (err) {
            console.error(err);
            alert('Failed to update account.');
            editAccountButton.disabled = false;
        }
    });

    // =============================
    // Delete Account
    // =============================
    document.getElementById('deleteAccount').addEventListener('click', async () => {
        if (!confirm(
            "Are you sure you wish to flag this account for deletion?\n" +
            "Doing so will schedule your data for deletion which is irreversible.\n" +
            "Logging back in within 1 week will unflag your account."
        )) return;

        try {
            const res = await fetch('/auth/deregister', { method: 'POST' });
            const data = await res.json();
            window.location.replace(data.redirect);
        } catch {
            alert('Failed to delete account.');
        }
    });

    // =============================
    // Logout
    // =============================
    logout.addEventListener('click', async () => {
        try {
            const res = await fetch('/auth/logout', { method: 'POST' });
            const data = await res.json();
            if (data.redirect) window.location.replace(data.redirect);
            else if (data.message) alert(data.message);
        } catch {
            alert('Logout failed.');
        }
    });

    logout.addEventListener('mouseenter', () => {
        logout.innerHTML = '<i class="fa-solid fa-door-open"></i> Logout';
    });

    logout.addEventListener('mouseleave', () => {
        logout.innerHTML = '<i class="fa-solid fa-door-closed"></i> Logout';
    });
});