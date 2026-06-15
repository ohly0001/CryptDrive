document.addEventListener('DOMContentLoaded', () => {
    const codeInput = document.getElementById('code');
    const resendButton = document.getElementById('resendEmail');

    const processActivationForm = async (value) => {
        if (value.length !== 6) return; // autosubmit only when code is 6 chars

        try {
            const res = await fetch('/auth/registerCode', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ activationCode: value })
            });

            const data = await res.json();

            if (res.ok && data.redirect) {
                window.location.replace(data.redirect);
            } else {
                alert(data.message || 'Invalid or expired activation code.');
                codeInput.value = '';
                codeInput.focus();
            }
        } catch (err) {
            console.error(err);
            alert('Network error, please try again.');
        }
    };

    codeInput.addEventListener('input', (e) => {
        processActivationForm(e.target.value.trim());
    });

    resendButton.addEventListener('click', async () => {
        try {
            const res = await fetch('/auth/resend', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            const data = await res.json();
            if (res.ok) {
                alert('Activation code resent. Check your email.');
            } else {
                alert(data.message || 'Failed to resend code.');
            }
        } catch (err) {
            console.error(err);
            alert('Network error, please try again.');
        }
    });
});