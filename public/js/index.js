document.addEventListener('DOMContentLoaded', () => {
    fetch('/auth/autologin')
    .then(res => res.json())
    .then(data => {
        if (data.redirect) {
            window.location.replace(data.redirect);
        } else if (data.message) {
            alert(data.message);
        }
    });
});