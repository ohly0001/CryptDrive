function processActivationForm(form) {
    const activationCode = document.getElementById("code").value;

    fetch('/auth/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activationCode })
    })
    .then(res => res.json())
    .then(data => {
        if (data.redirect) {
            window.location.replace(data.redirect);
        } else if (data.message) {
            alert(data.message);
            document.getElementById('code').value = '';
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('form');
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        processActivationForm(form);
    });
});