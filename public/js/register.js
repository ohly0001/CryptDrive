// --- Helpers ---
const $ = (id) => document.getElementById(id);

const getFormData = () => ({
    username: $("username").value.trim(),
    email: $("email").value.trim().toLowerCase(),
    password: $("password1").value,
    confirm: $("password2").value
});

const showError = (msg) => {
    alert(msg);
};

const isPasswordValidLength = (password) =>
    password.length >= 12 && password.length <= 128;

const getPasswordScore = (password) =>
    zxcvbn(password).score;

// --- UI: Password Strength ---
function updatePasswordStrength(password) {
    const meter = $("passwordStrength");
    const label = $("passwordStrengthLabel");

    if (!password) {
        meter.value = 0;
        label.innerText = "Password Strength";
        return;
    }

    if (!isPasswordValidLength(password)) {
        meter.value = 0;
        label.innerText =
            password.length < 12 ? "Too Short" : "Too Long";
        return;
    }

    const score = getPasswordScore(password);
    const labels = ["Very Weak", "Weak", "Fair", "Strong", "Very Strong"];

    meter.value = score;
    label.innerText = labels[score];
}

// --- Password Peek ---
function setupPasswordPeek() {
    const input = $("password1");
    const button = $("passwordPeek");

    const show = () => {
        input.type = "text";
        button.innerHTML = '<i class="fa-solid fa-eye"></i>';
    };

    const hide = () => {
        input.type = "password";
        button.innerHTML = '<i class="fa-solid fa-eye-slash"></i>';
    };

    ["mousedown", "touchstart"].forEach(e =>
        button.addEventListener(e, show)
    );

    ["mouseup", "mouseleave", "touchend"].forEach(e =>
        button.addEventListener(e, hide)
    );
}

// --- Init ---
document.addEventListener("DOMContentLoaded", () => {
    $("password1").addEventListener("input", (e) =>
        updatePasswordStrength(e.target.value)
    );

    setupPasswordPeek();
});