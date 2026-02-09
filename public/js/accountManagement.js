let edittingAcount = false;

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('deleteAccount').addEventListener('click', () => {
        if (window.confirm("Are you sure you wish to flag this account for deletion?\nDoing so will schedule your data for deletion which is irreversible.\nLogging back in within 1 week will unflag your account.")) {
            fetch('/auth/deregister', {method: 'POST'})
            .then(res => res.json())
            .then(data => {
                document.location.replace(data.redirect);
            });
        }
    });

    document.getElementById('logout').addEventListener('click', () => {
        fetch('/auth/logout', {method: 'POST'})
        .then(res => res.json())
        .then(data => {
            document.location.replace(data.redirect);
        });
    });

    const editAccountButton = document.getElementById('editAccount');
    editAccountButton.addEventListener('click', () => {
        document.getElementById('accountDetails').childNodes.forEach(e => {
            if (e instanceof HTMLInputElement) {
                e.readOnly = edittingAcount;
            }
        });

        edittingAcount = !edittingAcount;

        if (edittingAcount) {
            editAccountButton.innerText = "💾 Save Account"; //📝matches the pencil but less obvious
        } else {
            fetch('/account/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }), 
            })
            .then(res => res.json())
            .then(data => {
                window.alert(data.message);
            });
            editAccountButton.innerText = "✏️ Edit Account";
        }
    });
});