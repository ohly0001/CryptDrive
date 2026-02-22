const state = {
    allGroups: [],
    selectedIndex: -1,
    searchTags: new Set(),
    favouritesOnly: false,
    sortMode: 0, // 0: name asc, 1: name desc, 2: members asc, 3: members desc
    loading: false,
    reachedEnd: false,
    pageSize: 50,
    offset: 0
};

let visibleStart = 0;
let visibleEnd = 0;

document.addEventListener("DOMContentLoaded", () => {
    const container = document.getElementById("groupContainer");
    const searchField = document.getElementById("searchField");
    const tagFilter = document.getElementById("tagFilter");
    const tagContainer = document.getElementById("newTags");
    const sortModeBtn = document.getElementById("sortMode");

    document.getElementById("createGroupButton").addEventListener("click", () => location.href = "/groups/create");
    document.getElementById("joinGroupButton").addEventListener("click", joinGroup);

    // Toggle favourites filter
    document.getElementById("favorite").addEventListener("click", () => {
        state.favouritesOnly = !state.favouritesOnly;
        document.getElementById("favorite").classList.toggle("toggled", state.favouritesOnly);
        resetSearch();
    });

    // Sort button
    sortModeBtn.addEventListener("click", () => {
        state.sortMode = (state.sortMode + 1) % 4;
        const icons = ["fa-arrow-up-a-z","fa-arrow-down-a-z","fa-arrow-up-1-9","fa-arrow-down-1-9"];
        sortModeBtn.innerHTML = `Sort By: <i class="fa-solid ${icons[state.sortMode]}"></i>`;
        resetSearch();
    });

    // Tag filter
    tagFilter.addEventListener("keydown", e => {
        if (e.key !== "Enter") return;
        e.preventDefault();
        const value = tagFilter.value.trim().toLowerCase();
        if (!value || state.searchTags.has(value)) return;

        state.searchTags.add(value);
        const tag = document.createElement("span");
        tag.innerText = value;
        tag.title = "Click to remove";
        tag.classList.add("searchTag");
        tag.addEventListener("click", () => {
            state.searchTags.delete(value);
            tagContainer.removeChild(tag);
            resetSearch();
        });
        tagContainer.appendChild(tag);
        tagFilter.value = "";
        resetSearch();
    });

    searchField.addEventListener("input", debounce(resetSearch, 300));
    window.addEventListener("scroll", () => {
        if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 400) fetchGroups();
        renderVirtual();
    });

    resetSearch();

    // =================== FUNCTIONS ===================

    function joinGroup() {
        const code = document.getElementById("joinCode").value.trim();
        if (!code) return alert("Enter a group code!");
        fetch("/groups/join", {
            method: "POST",
            headers: {"Content-Type":"application/json"},
            body: JSON.stringify({code})
        }).then(res => res.json())
          .then(data => {
              alert(data.message);
              resetSearch();
          });
    }

    function resetSearch() {
        state.offset = 0;
        state.reachedEnd = false;
        state.allGroups = [];
        renderVirtual();
        fetchGroups();
    }

    async function fetchGroups() {
        if (state.loading || state.reachedEnd) return;
        state.loading = true;

        const res = await fetch("/groups/list", {
            method: "POST",
            headers: {"Content-Type":"application/json"},
            body: JSON.stringify({
                limit: state.pageSize,
                offset: state.offset,
                searchTerm: searchField.value.trim(),
                searchTags: [...state.searchTags],
                favouritesOnly: state.favouritesOnly
            })
        });

        const data = await res.json();
        if (!data.groups || !data.groups.length) {
            state.reachedEnd = true;
            state.loading = false;
            return;
        }

        state.allGroups.push(...data.groups);
        state.offset += data.groups.length;
        sortGroups();
        renderVirtual();
        state.loading = false;
    }

    // =================== VIRTUAL RENDER ===================
    function renderVirtual() {
        const rowHeight = 64;
        const viewportHeight = window.innerHeight;
        const scrollTop = window.scrollY;

        visibleStart = Math.floor(scrollTop / rowHeight) - 10;
        visibleEnd = Math.ceil((scrollTop + viewportHeight) / rowHeight) + 10;

        visibleStart = Math.max(0, visibleStart);
        visibleEnd = Math.min(state.allGroups.length, visibleEnd);

        container.innerHTML = "";

        const spacerTop = document.createElement("div");
        spacerTop.style.height = (visibleStart * rowHeight) + "px";

        const spacerBottom = document.createElement("div");
        spacerBottom.style.height = ((state.allGroups.length - visibleEnd) * rowHeight) + "px";

        container.appendChild(spacerTop);

        for (let i = visibleStart; i < visibleEnd; i++) {
            container.appendChild(renderRow(state.allGroups[i], i));
        }

        container.appendChild(spacerBottom);
    }

    function renderRow(group, index) {
        const row = document.createElement("div");
        row.className = "password";

        // Group name
        const title = document.createElement("span");
        title.innerText = group.name;
        row.appendChild(title);

        // Favourite
        const favBtn = document.createElement("button");
        favBtn.innerHTML = group.isFavourite ? "<i class='fa fa-star'></i>" : "<i class='fa fa-star-o'></i>";
        favBtn.onclick = async () => {
            group.isFavourite = !group.isFavourite;
            favBtn.innerHTML = group.isFavourite ? "<i class='fa fa-star'></i>" : "<i class='fa fa-star-o'></i>";
            await fetch("/groups/favourite", {
                method: "POST",
                headers: {"Content-Type":"application/json"},
                body: JSON.stringify({id: group._id, state: group.isFavourite})
            });
            renderVirtual();
        };
        row.appendChild(favBtn);

        // Owner & members
        const owner = document.createElement("span");
        owner.innerText = `Owner: ${group.owner}`;
        row.appendChild(owner);

        const members = document.createElement("span");
        members.innerText = `Members: ${group.members.join(", ")}`;
        row.appendChild(members);

        // Tags
        const tagWrap = document.createElement("div");
        (group.tags || []).forEach(t => {
            const tag = document.createElement("span");
            tag.innerText = t;
            tag.classList.add("searchTag");
            tagWrap.appendChild(tag);
        });
        row.appendChild(tagWrap);

        // Actions
        const actions = document.createElement("div");
        if (group.isOwner) {
            // OWNER MODALS
            ["Add Member","Remove Member","Add Tag","Remove Tag","Delete Group"].forEach(a => {
                const btn = document.createElement("button");
                btn.innerText = a;
                btn.onclick = () => openOwnerModal(a, group);
                actions.appendChild(btn);
            });
        } else {
            const leaveBtn = document.createElement("button");
            leaveBtn.innerText = "Leave Group";
            leaveBtn.onclick = async () => {
                if (!confirm(`Leave ${group.name}?`)) return;
                await fetch(`/groups/leave`, {
                    method: "POST",
                    headers: {"Content-Type":"application/json"},
                    body: JSON.stringify({id: group._id})
                });
                resetSearch();
            };
            actions.appendChild(leaveBtn);
        }
        row.appendChild(actions);

        return row;
    }

    // =================== OWNER MODAL ===================
    function openOwnerModal(action, group) {
        const input = prompt(`${action} for "${group.name}"\n(Separate multiple values with commas)`);
        if (input === null) return;

        const values = input.split(",").map(v => v.trim()).filter(v => v);
        if (!values.length) return;

        let endpoint;
        switch(action) {
            case "Add Member": endpoint = "/groups/addMembers"; break;
            case "Remove Member": endpoint = "/groups/removeMembers"; break;
            case "Add Tag": endpoint = "/groups/addTags"; break;
            case "Remove Tag": endpoint = "/groups/removeTags"; break;
            case "Delete Group": 
                if (!confirm(`Delete the group "${group.name}"? This cannot be undone.`)) return;
                endpoint = "/groups/delete"; 
                values.push("dummy"); // placeholder for POST body
                break;
        }

        fetch(endpoint, {
            method: "POST",
            headers: {"Content-Type":"application/json"},
            body: JSON.stringify({id: group._id, values})
        }).then(res => res.json())
          .then(data => {
              alert(data.message || `${action} completed`);
              resetSearch();
          });
    }

    function sortGroups() {
        state.allGroups.sort((a,b) => {
            switch(state.sortMode) {
                case 0: return a.name.localeCompare(b.name);
                case 1: return b.name.localeCompare(a.name);
                case 2: return a.members.length - b.members.length;
                case 3: return b.members.length - a.members.length;
            }
        });
    }

    function debounce(fn, delay=250) {
        let t;
        return (...args) => {
            clearTimeout(t);
            t = setTimeout(() => fn(...args), delay);
        };
    }
});