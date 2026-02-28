// accountManagement.js

let editingAccount = false;
let currentAccount = null;

document.addEventListener('DOMContentLoaded', async () => {

    const editAccountButton = document.getElementById('editAccount');
    const accountTypeField = document.getElementById('accountType');
    const usernameField = document.getElementById('username');
    const emailField = document.getElementById('email');
    const createdAt = document.getElementById('createdAt');
    const updatedAt = document.getElementById('updatedAt');

    function setEditting(state) {
        editingAccount = state;
        usernameField.readOnly = !state;
        emailField.readOnly = !state;
        editAccountButton.innerHTML = editingAccount ? '<i class="fa-solid fa-floppy-disk"></i> Save Changes' : '<i class="fas fa-user-edit"></i> Edit Account';
    }
    function startEditting() {
        setEditting(true);
    }
    function stopEditting() {
        setEditting(false);
    }

    // =============================
    // Load Account
    // =============================
    try {
        const res = await fetch('/account/pull');
        const data = await res.json();

        if (data.redirect) {
            window.location.replace(data.redirect);
            return;
        }

        if (data.message) {
            alert(data.message);
            return;
        }

        currentAccount = data;

        usernameField.value = data.username;
        accountTypeField.value = data.type;
        emailField.value = data.email;

        createdAt.innerHTML =
            `<i class="fa-solid fa-clock"></i> Created On: ${new Date(data.createdAt).toLocaleString()}`;

        updatedAt.innerHTML =
            `<i class="fa-regular fa-clock"></i> Last Updated On: ${new Date(data.updatedAt).toLocaleString()}`;

        stopEditting();

    } catch (err) {
        console.error(err);
        alert('Could not load account details.');
    }

    // =============================
    // Edit / Save Toggle
    // =============================
    editAccountButton.addEventListener('click', async () => {

        if (!editingAccount) {
            startEditting();
            return;
        }

        // =============================
        // Save Mode
        // =============================
        const newUsername = usernameField.value.trim();
        const newEmail = emailField.value.trim().toLowerCase();

        // Prevent unnecessary update
        if (newUsername === currentAccount.username || newEmail === currentAccount.email) {
            alert("No changes were made.");
            stopEditting();
            return;
        }

        if (!confirm("Are you sure you want commit these changes?")) return;

        try {
            const res = await fetch('/account/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: newUsername, email: newEmail })
            });

            const data = await res.json();

            if (data.redirect) {
                window.location.replace(data.redirect);
                return;
            }

            if (data.message) {
                alert(data.message);
                return;
            }

            // Update local state from server response
            currentAccount = data;

            usernameField.value = data.username;
            emailField.value = data.email;
            stopEditting();

            updatedAt.innerHTML =
                `<i class="fa-regular fa-clock"></i> Last Updated On: ${new Date(data.updatedAt).toLocaleString()}`;

        } catch (err) {
            console.error(err);
            alert('Failed to update account.');
        }
    });

    // =============================
    // Delete Account
    // =============================
    document.getElementById('deleteAccount').addEventListener('click', async () => {

        if (!window.confirm(
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
    document.getElementById('logout').addEventListener('click', async () => {
        try {
            const res = await fetch('/auth/logout', { method: 'POST' });
            const data = await res.json();
            window.location.replace(data.redirect);
        } catch {
            alert('Failed to log out.');
        }
    });
});