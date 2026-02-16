/* =========================
   STATE
========================= */
let pageSize = 50;
let offset = 0;
let loading = false;
let reachedEnd = false;

let matchCaseMode = false;
let matchEntireMode = false;
let useRegexMode = false;
let blacklistTagsMode = false;
let favouritesMode = false;

let allPasswords = [];
let visibleStart = 0;
let visibleEnd = 0;

let selectedIndex = -1;
let tagSuggestions = new Set();

/* =========================
   INIT
========================= */
document.addEventListener("DOMContentLoaded", () => {

    const container = document.getElementById("passwordContainer");
    const searchField = document.getElementById("searchField");
    const tagFilter = document.getElementById("tagFilter");

    /* =========================
       UTIL
    ========================= */
    const debounce = (fn, delay = 250) => {
        let t;
        return (...args) => {
            clearTimeout(t);
            t = setTimeout(() => fn(...args), delay);
        };
    };

    function calculateColour(str) {
        let hash = 0;
        str.split('').forEach(c => hash = c.charCodeAt(0) + ((hash << 5) - hash));
        let colour = '#';
        for (let i = 0; i < 3; i++) {
            const value = (hash >> (i * 8)) & 0xff;
            colour += value.toString(16).padStart(2, '0');
        }
        return colour;
    }

    function hideAllCopyMenus(){
        document.querySelectorAll('.copy_options').forEach(el=>el.classList.add('hidden'));
    }

    function refreshAutoHideCopyOptionContainer(container){
        if(container._hideTimer) clearTimeout(container._hideTimer);
        container._hideTimer = setTimeout(()=>container.classList.add('hidden'),5000);
    }

    /* =========================
       FETCH
    ========================= */
    async function fetchPasswords(){
        if(loading || reachedEnd) return;
        loading = true;

        const res = await fetch("/pass/search",{
            method:"POST",
            headers:{"Content-Type":"application/json"},
            body:JSON.stringify({
                limit:pageSize,
                offset:offset,
                favouritesOnly:favouritesMode,
                searchTerm:searchField.value.trim(),
                matchCase:matchCaseMode,
                matchEntire:matchEntireMode,
                useRegex:useRegexMode,
                searchTags: tagFilter.value.trim()
                    ? tagFilter.value.split(",").map(t=>t.trim()).filter(Boolean)
                    : [],
                blacklistTags:blacklistTagsMode
            })
        });

        const data = await res.json();
        const list = data.partialPasswords || [];

        if(offset===0){
            allPasswords=[];
            container.innerHTML="";
        }

        list.forEach(p=>{
            allPasswords.push(p);
            (p.searchTags||[]).forEach(t=>tagSuggestions.add(t));
        });

        offset += list.length;
        if(allPasswords.length >= data.total) reachedEnd=true;

        renderVirtual();
        loading=false;
    }

    function resetSearch(){
        offset=0;
        reachedEnd=false;
        selectedIndex=-1;
        fetchPasswords();
    }

    /* =========================
       VIRTUAL RENDER
    ========================= */
    function renderVirtual(){
        const rowHeight = 64;
        const viewportHeight = window.innerHeight;
        const scrollTop = window.scrollY;

        visibleStart = Math.floor(scrollTop / rowHeight) - 10;
        visibleEnd = Math.ceil((scrollTop + viewportHeight) / rowHeight) + 10;

        visibleStart = Math.max(0, visibleStart);
        visibleEnd = Math.min(allPasswords.length, visibleEnd);

        container.innerHTML="";

        for(let i=visibleStart;i<visibleEnd;i++){
            const el = renderRow(allPasswords[i], i);
            container.appendChild(el);
        }

        const spacerTop = document.createElement("div");
        spacerTop.style.height = (visibleStart*rowHeight)+"px";

        const spacerBottom = document.createElement("div");
        spacerBottom.style.height = ((allPasswords.length-visibleEnd)*rowHeight)+"px";

        container.prepend(spacerTop);
        container.appendChild(spacerBottom);
    }

    /* =========================
       ROW RENDER
    ========================= */
    function renderRow(e, index){
        const row = document.createElement("div");
        row.className="password";
        row.dataset.id=e._id;
        if(index===selectedIndex) row.classList.add("keyboardSelected");

        const title = document.createElement("span");
        title.innerText = e.title || "No Title";

        // ===== Favourite instant toggle
        const favBtn = document.createElement("button");
        favBtn.type="button";
        favBtn.innerHTML = e.isFavourite
            ? "<i class='fa fa-star'></i>"
            : "<i class='fa fa-star-o'></i>";

        favBtn.onclick = async ()=>{
            e.isFavourite = !e.isFavourite;
            favBtn.innerHTML = e.isFavourite
                ? "<i class='fa fa-star'></i>"
                : "<i class='fa fa-star-o'></i>";

            fetch('/pass/toggleFavourite',{
                method:'POST',
                headers:{'Content-Type':'application/json'},
                body:JSON.stringify({id:e._id})
            });
        };

        // ===== Copy menu
        const copyMenu = document.createElement("div");
        copyMenu.classList.add("hidden","copy_options");

        ["url","username","password","note"].forEach(key=>{
            const b=document.createElement("button");
            b.type="button";
            b.innerText=key;

            b.onclick=async()=>{
                const res = await fetch('/pass/copy',{
                    method:'POST',
                    headers:{'Content-Type':'application/json'},
                    body:JSON.stringify({id:e._id,category:key})
                });
                const data=await res.json();
                await navigator.clipboard.writeText(data.decryptedValue);
                refreshAutoHideCopyOptionContainer(copyMenu);
            };

            copyMenu.appendChild(b);
        });

        const copyBtn = document.createElement("button");
        copyBtn.innerHTML="<i class='fa fa-copy'></i>";
        copyBtn.onclick=(ev)=>{
            hideAllCopyMenus();
            copyMenu.classList.remove("hidden");
            copyMenu.style.left=ev.clientX+"px";
            copyMenu.style.top=ev.clientY+"px";
            refreshAutoHideCopyOptionContainer(copyMenu);
        };

        // edit
        const editBtn = document.createElement("button");
        editBtn.innerHTML="<i class='fa fa-edit'></i>";
        editBtn.onclick=()=>location.href=`/pass/viewEdit/${e._id}`;

        row.append(title,favBtn,copyBtn,editBtn,copyMenu);

        // tags
        const tagWrap = document.createElement("div");
        (e.searchTags||[]).forEach(t=>{
            const tag=document.createElement("span");
            tag.innerText=t;
            tag.classList.add("searchTag");
            tag.style.borderColor=calculateColour(t);
            tagWrap.appendChild(tag);
        });

        row.appendChild(tagWrap);
        return row;
    }

    /* =========================
       TAG AUTOCOMPLETE
    ========================= */
    const tagBox = document.createElement("div");
    tagBox.className="tagAutocomplete";
    tagFilter.parentNode.appendChild(tagBox);

    tagFilter.addEventListener("input",()=>{
        const val = tagFilter.value.toLowerCase();
        tagBox.innerHTML="";
        if(!val) return;

        [...tagSuggestions]
            .filter(t=>t.toLowerCase().includes(val))
            .slice(0,8)
            .forEach(tag=>{
                const item=document.createElement("div");
                item.innerText=tag;
                item.onclick=()=>{
                    tagFilter.value=tag;
                    tagBox.innerHTML="";
                    resetSearch();
                };
                tagBox.appendChild(item);
            });
    });

    /* =========================
       KEYBOARD NAV
    ========================= */
    document.addEventListener("keydown",e=>{
        if(e.target.tagName==="INPUT") return;

        if(e.key==="ArrowDown"){
            selectedIndex=Math.min(selectedIndex+1, allPasswords.length-1);
            renderVirtual();
        }

        if(e.key==="ArrowUp"){
            selectedIndex=Math.max(selectedIndex-1,0);
            renderVirtual();
        }

        if(e.key==="Enter"){
            if(selectedIndex>=0){
                const id = allPasswords[selectedIndex]._id;
                location.href=`/pass/viewEdit/${id}`;
            }
        }

        if(e.key===" "){
            if(selectedIndex>=0){
                e.preventDefault();
                const p = allPasswords[selectedIndex];
                p.isFavourite=!p.isFavourite;
                renderVirtual();

                fetch('/pass/toggleFavourite',{
                    method:'POST',
                    headers:{'Content-Type':'application/json'},
                    body:JSON.stringify({id:p._id})
                });
            }
        }

        if((e.ctrlKey||e.metaKey) && e.key==="/"){
            e.preventDefault();
            searchField.focus();
        }
    });

    /* =========================
       LIVE SEARCH
    ========================= */
    const live = debounce(resetSearch,300);
    searchField.addEventListener("input", live);
    tagFilter.addEventListener("input", live);

    document.getElementById("searchForm").addEventListener("submit",e=>{
        e.preventDefault();
        resetSearch();
    });

    /* =========================
       TOGGLES
    ========================= */
    function toggle(btn, ref){
        window[ref]=!window[ref];
        btn.classList.toggle("toggled", window[ref]);
        resetSearch();
    }

    document.getElementById("favorite").onclick=()=>toggle(favorite,'favouritesMode');
    document.getElementById("matchCase").onclick=()=>toggle(matchCase,'matchCaseMode');
    document.getElementById("matchEntire").onclick=()=>toggle(matchEntire,'matchEntireMode');
    document.getElementById("useRegex").onclick=()=>toggle(useRegex,'useRegexMode');
    document.getElementById("blacklistTags").onclick=()=>toggle(blacklistTags,'blacklistTagsMode');

    /* =========================
       SCROLL
    ========================= */
    window.addEventListener("scroll",()=>{
        renderVirtual();

        if(window.innerHeight + window.scrollY >= document.body.offsetHeight-400){
            fetchPasswords();
        }
    });

    /* =========================
       INIT
    ========================= */
    resetSearch();
});