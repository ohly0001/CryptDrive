// accountManagement.js

let editingAccount = false;
let currentAccount = null;

document.addEventListener('DOMContentLoaded', async () => {

    const editAccountButton = document.getElementById('editAccount');
    const accountTypeField = document.getElementById('accountType');
    const emailField = document.getElementById('email');
    const createdAt = document.getElementById('createdAt');
    const updatedAt = document.getElementById('updatedAt');

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

        accountTypeField.value = data.type;
        emailField.value = data.email;

        createdAt.innerHTML =
            `<i class="fa-solid fa-clock"></i> Created On: ${new Date(data.createdAt).toLocaleString()}`;

        updatedAt.innerHTML =
            `<i class="fa-regular fa-clock"></i> Last Updated On: ${new Date(data.updatedAt).toLocaleString()}`;

        emailField.readOnly = true;

    } catch (err) {
        console.error(err);
        alert('Could not load account details.');
    }

    // =============================
    // Edit / Save Toggle
    // =============================
    editAccountButton.addEventListener('click', async () => {

        if (!editingAccount) {
            // Enter edit mode
            editingAccount = true;
            emailField.readOnly = false;
            editAccountButton.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Changes';
            return;
        }

        // =============================
        // Save Mode
        // =============================
        const newEmail = emailField.value.trim().toLowerCase();

        // Prevent unnecessary update
        if (newEmail === currentAccount.email) {
            editingAccount = false;
            emailField.readOnly = true;
            editAccountButton.innerHTML = '<i class="fas fa-user-edit"></i> Edit Account';
            return;
        }

        try {
            const res = await fetch('/account/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: newEmail })
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

            emailField.value = data.email;
            emailField.readOnly = true;

            updatedAt.innerHTML =
                `<i class="fa-regular fa-clock"></i> Last Updated On: ${new Date(data.updatedAt).toLocaleString()}`;

            editingAccount = false;
            editAccountButton.innerHTML = '<i class="fas fa-user-edit"></i> Edit Account';

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