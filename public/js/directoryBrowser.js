document.addEventListener('DOMContentLoaded', () => {
    const navHere = document.getElementById('navHere');
    navHere.href = '/api/drive/view?dir=.';

    const navUp = document.getElementById('navUp');
    navUp.href = '/api/drive/view?dir=..';
});