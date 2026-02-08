function processRegisterForm(form) {
    if (!form.reportValidity()) return;

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password1").value;
    const passConfirm = document.getElementById("password2").value;

    if (password !== passConfirm) {
        alert("Passwords must match");
        return;
    }

    if (password.length < 12 || password.length > 99) {
        alert(`Password must be between 12 to 99 characters.`);
        return;
    }

    if (password.length < 12 || password.length > 99) {
        alert(`Password must be between 12 to 99 characters.`);
        return;
    }

    if (zxcvbn(passInput).value.score < 3) {
        alert(`Password strength is insufficient`);
        return;
    }

    fetch('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    })
    .then(async (res) => {
        if (!res.ok) {
            try {
                const data = await res.json();
                alert(data?.error || "Registration failed");
            } catch {
                const text = await res.text();
                alert(`Server Error: ${text}`);
            }
        } else {
            document.location.replace('./activationCode.html');
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
        if (!passInput.value) {
            passwordStrengthGauge.value = 0;
            passwordStrengthLabel.innerText = "Password Strength";
            return;
        }

        if (passInput.value.length < 12) {
            passwordStrengthGauge.value = 0;
            passwordStrengthLabel.innerText = "Too Short";
            return;
        }

        if (passInput.value.length > 99) {
            passwordStrengthGauge.value = 0;
            passwordStrengthLabel.innerText = "Too Long";
            return;
        }

        const score = zxcvbn(passInput.value).score;
        passwordStrengthGauge.value = score;
        const labels = ["Very Weak", "Weak", "Fair", "Strong", "Very Strong"];
        passwordStrengthLabel.innerText = labels[score];
    });
});