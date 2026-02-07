function processRegisterForm(form) {
    if (!form.reportValidity()) return;

    const email = document.getElementById("registerEmail").value.trim();
    const password = document.getElementById("registerPassword1").value;
    const passConfirm = document.getElementById("registerPassword2").value;

    if (password !== passConfirm) {
        alert("Passwords must match");
        return;
    }

    if (password.length < 12) {
        alert(`Password too short (min 12 characters)`);
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
        }
    })
}

document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('registerForm');
    registerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        processRegisterForm(registerForm);
    });
});