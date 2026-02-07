var autoHideCopyOptionContainer;

function refreshAutoHideCopyOptionContainer(copyOptionsContainer) {
    clearTimeout(autoHideCopyOptionContainer);

    autoHideCopyOptionContainer = window.setTimeout(() => {
        copyOptionsContainer.classList.add('hidden');
    }, 5000);
}

document.addEventListener('DOMContentLoaded', () => {
    // add sub headers for multiple passwords under the same url (multiple accounts)
    const passwordContainer = document.getElementById('passwordContainer');

    /*
    fetch('/passwords/pull', {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' } 
    }).then(
        
    );
    */
    const passwordData = [
        {url: 'algonquincollege.com', username: 'ohly0001', password: 'pass'}, 
        {url: 'reddit.com', username: 'hjuldahr', password: '1234'}, 
        {url: 'google.com', username: 'rjohly', password: '9009'}, 
    ]; //temp
    passwordData.forEach((e) => {
        const childPasswordContainer = document.createElement('div');
        childPasswordContainer.classList.add('password');

        const label = document.createElement('span');
        label.innerText = e.url;

        const copyOptionsContainer = document.createElement('div');
        copyOptionsContainer.classList.add('hidden', 'copy_options');

        Object.entries(e).forEach(([key, value]) => {
            const copySubBtn = document.createElement('button');
            copySubBtn.innerText = key
            copySubBtn.addEventListener('click', async () => {
                await navigator.clipboard.writeText(value); //todo add decryption pre-processing
                refreshAutoHideCopyOptionContainer(copyOptionsContainer); // extends duration
            });
            copyOptionsContainer.appendChild(copySubBtn);
        });

        const copyOptionsBtn = document.createElement('button');
        copyOptionsBtn.innerText = "📋";
        copyOptionsBtn.title = 'Copy...';
        copyOptionsBtn.addEventListener('click', (event) => {
            hideChildPasswordContainers();
            copyOptionsContainer.classList.remove('hidden');

            copyOptionsContainer.style.left = event.clientX + 'px';
            copyOptionsContainer.style.top = event.clientY + 'px';

            // starts clock (or restarts if already running)
            refreshAutoHideCopyOptionContainer(copyOptionsContainer);
        });

        childPasswordContainer.appendChild(label);
        childPasswordContainer.appendChild(copyOptionsBtn);
        childPasswordContainer.appendChild(copyOptionsContainer);
        passwordContainer.appendChild(childPasswordContainer);
    });

    function hideChildPasswordContainers(callingNode) {
        Array.from(passwordContainer.children).forEach((child) => {
            child.getElementsByClassName('copy_options')[0].classList.add('hidden');
        });
    }
    
    const navHere = document.getElementById('navHere');
    //navHere.href = '/api/drive/view?dir=.';

    const navUp = document.getElementById('navUp');
    //navUp.href = '/api/drive/view?dir=..';
});