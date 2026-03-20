// register.js
function processRegisterForm(form) {
    if (!form.reportValidity()) return;

    const username = document.getElementById("username").value.trim();
    const email = document.getElementById("email").value.trim().toLowerCase();
    const password = document.getElementById("password1").value;
    const passConfirm = document.getElementById("password2").value;

    if (username === email) {
        alert("Your cannot use your email as your usename");
        return;
    }

    if (password !== passConfirm) {
        alert("Passwords must match");
        return;
    }

    if (password.length < 12 || password.length > 128) {
        alert(`Password must be between 12 to 128 characters.`);
        return;
    }

    if (password.length < 12 || password.length > 99) {
        alert(`Password must be between 12 to 99 characters.`);
        return;
    }

    if (zxcvbn(password).score < 3) {
        alert(`Password strength is insufficient`);
        return;
    }

    fetch('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
    })
    .then(async (res) => {
        const contentType = res.headers.get('content-type');
        const body = contentType && contentType.includes('application/json') ? await res.json() : await res.text();
        
        if (!res.ok) {
            alert(body?.error || body || "Registration failed");
        } else {
            //document.location.replace('./activationCode.html');
        }
    })
}

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('form');
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        processRegisterForm(form);
    });

    const password = document.getElementById('password1');
    password.addEventListener('input', () => {
        const passwordStrengthGauge = document.getElementById('passwordStrength');
        const passwordStrengthLabel = document.getElementById('passwordStrengthLabel');

        if (!password.value) {
            passwordStrengthGauge.value = 0;
            passwordStrengthLabel.innerText = "Password Strength";
            return;
        }

        if (password.value.length < 12) {
            passwordStrengthGauge.value = 0;
            passwordStrengthLabel.innerText = "Too Short";
            return;
        }

        if (password.value.length > 128) {
            passwordStrengthGauge.value = 0;
            passwordStrengthLabel.innerText = "Too Long";
            return;
        }

        const score = zxcvbn(password.value).score;
        passwordStrengthGauge.value = score;
        const labels = ["Very Weak", "Weak", "Fair", "Strong", "Very Strong"];
        passwordStrengthLabel.innerText = labels[score];
    });

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