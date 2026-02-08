function processLoginForm(form) {
    if (!form.checkValidity()) return;

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    fetch('/auth/login', {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }), 
    })
    .then(res => res.json())
    .then(data => {
        if (data.redirect) {
            window.location.replace(data.redirect);
        } else if (data.message) {
            alert(data.message);
            document.getElementById('password').value = '';
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('form');
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        processLoginForm(form);
    });

    const password = document.getElementById('password');
    const showPassword = () => password.type = 'text';
    const hidePassword = () => password.type = 'password';

    const peekButton = document.getElementById('passwordPeek');
    peekButton.addEventListener('mousedown', showPassword);
    peekButton.addEventListener('mouseup', hidePassword);
    peekButton.addEventListener('mouseleave', hidePassword);
    peekButton.addEventListener('touchstart', showPassword);
    peekButton.addEventListener('touchend', hidePassword);
});