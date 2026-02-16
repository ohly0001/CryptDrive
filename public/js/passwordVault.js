let pageSize = 25;
let currentOffset = 0;
let loading = false;
let reachedEnd = false;

let blacklistTagsMode = false;
let matchCaseMode = false;
let matchEntireMode = false;
let favouritesMode = false;
let useRegexMode = false;

let allPasswords = [];

document.addEventListener('DOMContentLoaded', () => {

    const addPasswordButton = document.getElementById('addPasswordButton');
    const passwordContainer = document.getElementById('passwordContainer');

    const searchField = document.getElementById('searchField');
    const tagFilter = document.getElementById('tagFilter');

    const searchForm = document.getElementById('searchForm');

    // ===== ADD =====
    addPasswordButton.addEventListener('click', () => {
        document.location.href = '/pass/viewAdd';
    });

    // ===== UTIL =====
    function debounce(fn, delay = 300) {
        let t;
        return (...args) => {
            clearTimeout(t);
            t = setTimeout(() => fn(...args), delay);
        };
    }

    function refreshAutoHideCopyOptionContainer(container) {
        if (container._hideTimer) clearTimeout(container._hideTimer);
        container._hideTimer = setTimeout(() => container.classList.add('hidden'), 5000);
    }

    function hideAllCopyMenus() {
        document.querySelectorAll('.copy_options').forEach(el => el.classList.add('hidden'));
    }

    function calculateColour(str) {
        let hash = 0;
        str.split('').forEach(char => hash = char.charCodeAt(0) + ((hash << 5) - hash));
        let colour = '#';
        for (let i = 0; i < 3; i++) {
            const value = (hash >> (i * 8)) & 0xff;
            colour += value.toString(16).padStart(2, '0');
        }
        return colour;
    }

    // ===== TOGGLES =====
    function toggleMode(btn, varRef) {
        window[varRef] = !window[varRef];
        btn.classList.toggle('toggled', window[varRef]);
        resetAndLoad();
    }

    document.getElementById('favorite').onclick =
        () => toggleMode(document.getElementById('favorite'), 'favouritesMode');

    document.getElementById('blacklistTags').onclick =
        () => toggleMode(document.getElementById('blacklistTags'), 'blacklistTagsMode');

    document.getElementById('matchCase').onclick =
        () => toggleMode(document.getElementById('matchCase'), 'matchCaseMode');

    document.getElementById('matchEntire').onclick =
        () => toggleMode(document.getElementById('matchEntire'), 'matchEntireMode');

    document.getElementById('useRegex').onclick =
        () => toggleMode(document.getElementById('useRegex'), 'useRegexMode');

    // ===== FETCH =====
    async function loadPasswords() {
        if (loading || reachedEnd) return;
        loading = true;

        try {
            const res = await fetch('/pass/search', {
                method: 'POST',
                headers: {'Content-Type':'application/json'},
                body: JSON.stringify({
                    limit: pageSize,
                    offset: currentOffset,
                    favouritesOnly: favouritesMode,
                    searchTerm: searchField.value.trim(),
                    matchCase: matchCaseMode,
                    matchEntire: matchEntireMode,
                    useRegex: useRegexMode,
                    searchTags: tagFilter.value.trim()
                        ? tagFilter.value.split(',').map(t=>t.trim()).filter(Boolean)
                        : [],
                    blacklistTags: blacklistTagsMode
                })
            });

            const data = await res.json();
            const list = data.partialPasswords || [];

            if (currentOffset === 0) {
                passwordContainer.innerHTML = '';
                allPasswords = [];
            }

            list.forEach(renderPassword);
            allPasswords.push(...list);

            currentOffset += list.length;
            if (allPasswords.length >= data.total) reachedEnd = true;

        } catch (err) {
            console.error(err);
        }

        loading = false;
    }

    function resetAndLoad(){
        currentOffset = 0;
        reachedEnd = false;
        loadPasswords();
    }

    // ===== RENDER ONE =====
    function renderPassword(e) {

        const selectionBox = document.createElement('input');
        selectionBox.type='checkbox';
        selectionBox.classList.add('password-selection');

        const child = document.createElement('div');
        child.classList.add('password');
        child.dataset.id = e._id;

        const title = document.createElement('span');
        title.innerText = e.title || "No Title";

        // FAV
        const favBtn = document.createElement('button');
        favBtn.type='button';
        favBtn.innerHTML = e.isFavourite
            ? "<i class='fa fa-star'></i>"
            : "<i class='fa fa-star-o'></i>";

        favBtn.onclick = async ()=>{
            await fetch('/pass/toggleFavourite',{
                method:'POST',
                headers:{'Content-Type':'application/json'},
                body:JSON.stringify({id:e._id})
            });
            resetAndLoad();
        };

        // COPY MENU
        const copyOptionsContainer = document.createElement('div');
        copyOptionsContainer.classList.add('hidden','copy_options');

        ['url','username','password','note'].forEach(key=>{
            const btn = document.createElement('button');
            btn.type='button';
            btn.innerText = key;

            btn.onclick = async ()=>{
                const res = await fetch('/pass/copy',{
                    method:'POST',
                    headers:{'Content-Type':'application/json'},
                    body:JSON.stringify({id:e._id,category:key})
                });
                const data = await res.json();
                await navigator.clipboard.writeText(data.decryptedValue);
                refreshAutoHideCopyOptionContainer(copyOptionsContainer);
            };

            copyOptionsContainer.appendChild(btn);
        });

        const copyBtn = document.createElement('button');
        copyBtn.innerHTML="<i class='fa fa-copy'></i>";
        copyBtn.type='button';
        copyBtn.onclick=(ev)=>{
            hideAllCopyMenus();
            copyOptionsContainer.classList.remove('hidden');
            copyOptionsContainer.style.left = ev.clientX+'px';
            copyOptionsContainer.style.top = ev.clientY+'px';
            refreshAutoHideCopyOptionContainer(copyOptionsContainer);
        };

        // EDIT
        const editBtn = document.createElement('button');
        editBtn.innerHTML="<i class='fa fa-edit'></i>";
        editBtn.type='button';
        editBtn.onclick=()=> document.location.href=`/pass/viewEdit/${e._id}`;

        child.append(selectionBox,favBtn,title,copyBtn,editBtn,copyOptionsContainer,document.createElement('br'));

        // TAGS
        const tagContainer = document.createElement('div');
        (e.searchTags||[]).forEach(tagText=>{
            const tag = document.createElement('span');
            tag.innerText = tagText;
            tag.classList.add('searchTag');
            tag.style.borderColor = calculateColour(tagText);
            tagContainer.appendChild(tag);
        });

        child.appendChild(tagContainer);
        passwordContainer.appendChild(child);
    }

    // ===== LIVE SEARCH =====
    const liveSearch = debounce(()=>{
        resetAndLoad();
    }, 300);

    searchField.addEventListener('input', liveSearch);
    tagFilter.addEventListener('input', liveSearch);

    searchForm.addEventListener('submit', e=>{
        e.preventDefault();
        resetAndLoad();
    });

    // ===== INFINITE SCROLL =====
    window.addEventListener('scroll', ()=>{
        const nearBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 300;
        if (nearBottom) loadPasswords();
    });

    // ===== BATCH =====
    function selectPasswords(checked){
        document.querySelectorAll('.password-selection').forEach(c=>c.checked=checked);
    }

    document.getElementById('selectAll').onclick=()=>selectPasswords(true);
    document.getElementById('deselectAll').onclick=()=>selectPasswords(false);

    document.getElementById('deleteSelected').onclick=async ()=>{
        const selected = Array.from(document.querySelectorAll('.password-selection:checked'))
            .map(cb=>cb.closest('.password').dataset.id);

        if(!selected.length) return alert("No passwords selected.");
        if(!confirm(`Delete ${selected.length}?`)) return;

        await fetch('/pass/deleteMany',{
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify({ids:selected})
        });

        resetAndLoad();
    };

    document.getElementById('favouriteSelected').onclick=async ()=>{
        const selected = Array.from(document.querySelectorAll('.password-selection:checked'))
            .map(cb=>cb.closest('.password').dataset.id);

        if(!selected.length) return alert("No passwords selected.");

        await fetch('/pass/favouriteMany',{
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify({ids:selected,state:true})
        });

        resetAndLoad();
    };

    // ===== SHORTCUTS =====
    document.addEventListener('keydown', e=>{
        if(!e.ctrlKey && !e.metaKey) return;

        if(e.key==='/'){e.preventDefault();searchField.focus();}
        if(e.key==='p'){e.preventDefault();document.location.href='/pass/viewAdd';}
    });

    // ===== INIT =====
    resetAndLoad();
});