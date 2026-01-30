const { use } = require("react");

document.addEventListener('DOMContentLoaded', () => {
    // add sub headers for multiple passwords under the same url (multiple accounts)
    const passwordContainer = document.getElementById('password_container');

    const passwordData = [
        {url: 'algonquincollege.com', username: 'ohly0001', password: '****'}, 
        {url: 'google.com', username: 'hjuldahr', password: '****'}, 
    ]; //temp
    passwordData.forEach((e) => {
        const childPasswordContainer = document.createElement('div');
        childPasswordContainer.classList.add('password');

        const label = document.createElement('span');
        label.innerText = e.username;

        const button = document.createElement('button');
        button.innerText = '📋';
        button.title = 'Copy Password';
        button.addEventListener('click', () => {

        });

        childPasswordContainer.appendChild(label);
        childPasswordContainer.appendChild(button);
        passwordContainer.appendChild(childPasswordContainer);
    });
    
    const navHere = document.getElementById('navHere');
    navHere.href = '/api/drive/view?dir=.';

    const navUp = document.getElementById('navUp');
    navUp.href = '/api/drive/view?dir=..';
});