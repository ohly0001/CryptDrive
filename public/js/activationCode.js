function processActivationForm(code) {
    const activationCode = code.value;

    //autosubmit when the correct length
    if (activationCode.length !== 6) {
        return; 
    }

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

function resendEmail() {
    fetch('/auth/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({  })
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const code = document.getElementById('code');
    code.addEventListener('input', (e) => {
        processActivationForm(code);
    });

    document.getElementById('resendEmail').addEventListener('click', () => {
        resendEmail();
    });
});