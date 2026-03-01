function processLoginForm(form) {
    if (!form.checkValidity()) return;

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const loginInput = document.getElementById('login');

    loginInput.disabled = true;
    loginInput.value = 'Please Wait...';
    loginInput.style.cursor = 'wait';

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
            
            loginInput.disabled = false;
            loginInput.value = 'Login';
            loginInput.style.cursor = 'pointer';
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
    const peekButton = document.getElementById('passwordPeek');
    const showPassword = () => {
        peekButton.innerHTML = '<i class="fa-solid fa-eye"></i>';
        password.type = 'text'
    };
    const hidePassword = () => {
        peekButton.innerHTML = '<i class="fa-solid fa-eye-slash"></i>';
        password.type = 'password'
    };

    ['mousedown', 'touchstart'].forEach(evt => peekButton.addEventListener(evt, showPassword));
    ['mouseup', 'mouseleave', 'touchend'].forEach(evt => peekButton.addEventListener(evt, hidePassword));
});