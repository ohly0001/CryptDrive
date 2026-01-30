function processForm(form) {
    if (form.checkValidity()) return;

    const privateKey = document.getElementById('privateKeyTF');

    fetch('/api/auth/connect', {
        method: 'POST', // Specify the method
        headers: {
            'Content-Type': 'application/json', // Inform the server about the data format
        },
        body: JSON.stringify({
            privateKey
        }), 
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok: ' + response.message);
        }
        document.location.href = '/api/drive/view';
    })
};

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('connectForm');
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        processForm(form);
    });

});