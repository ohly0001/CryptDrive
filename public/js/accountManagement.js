// accountManagement.js

let editingAccount = false;
let currentAccount = {};

document.addEventListener('DOMContentLoaded', async () => {
    const accountForm = document.getElementById('accountDetails');
    const editAccountButton = document.getElementById('editAccount');

    // Fetch current account details from the server
    try {
        const res = await fetch('/account/pull');
        if (!res.ok) throw new Error('Failed to fetch account details');
        currentAccount = await res.json();

        // Populate form fields
        for (const field of accountForm.elements) {
            if (field.name && currentAccount[field.name] !== undefined) {
                field.value = currentAccount[field.name];
                field.readOnly = true;
            }
        }
    } catch (err) {
        console.error(err);
        window.alert('Could not load account details. Please try again later.');
    }

    // Toggle edit/save
    editAccountButton.addEventListener('click', async () => {
        editingAccount = !editingAccount;

        // Enable/disable input fields
        for (const field of accountForm.elements) {
            if (field instanceof HTMLInputElement && field.name !== 'oldPassword') {
                field.readOnly = !editingAccount;
            }
        }

        if (editingAccount) {
            editAccountButton.innerText = "💾 Save Account";
        } else {
            // Collect updated values
            const updatedData = {};
            for (const field of accountForm.elements) {
                if (field.name && field.value !== undefined) {
                    updatedData[field.name] = field.value;
                }
            }

            try {
                const res = await fetch('/account/update', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updatedData)
                });
                const data = await res.json();
                window.alert(data.message);

                // Re-populate with latest saved values
                for (const field of accountForm.elements) {
                    if (field.name && updatedData[field.name] !== undefined) {
                        field.value = updatedData[field.name];
                        field.readOnly = true;
                    }
                }
            } catch (err) {
                console.error(err);
                window.alert('Failed to update account.');
            }

            editAccountButton.innerText = "✏️ Edit Account";
        }
    });

    // Delete account
    document.getElementById('deleteAccount').addEventListener('click', async () => {
        if (window.confirm(
            "Are you sure you wish to flag this account for deletion?\n" +
            "Doing so will schedule your data for deletion which is irreversible.\n" +
            "Logging back in within 1 week will unflag your account."
        )) {
            try {
                const res = await fetch('/auth/deregister', { method: 'POST' });
                const data = await res.json();
                document.location.replace(data.redirect);
            } catch {
                window.alert('Failed to delete account.');
            }
        }
    });

    // Logout
    document.getElementById('logout').addEventListener('click', async () => {
        try {
            const res = await fetch('/auth/logout', { method: 'POST' });
            const data = await res.json();
            document.location.replace(data.redirect);
        } catch {
            window.alert('Failed to log out.');
        }
    });
});