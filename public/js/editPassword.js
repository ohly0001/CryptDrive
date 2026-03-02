document.addEventListener("DOMContentLoaded", () => {

    // ======= Server Data =======
    const passwordData = window.__PASSWORD__;
    const passwordId = passwordData._id;

    // ======= Elements =======
    const titleInput = document.getElementById("savedTitle");
    const urlInput = document.getElementById("savedUrl");
    const userInput = document.getElementById("savedUser");
    const passwordInput = document.getElementById("savedPassword");
    const passwordPeekBtn = document.getElementById("passwordPeek");
    const favouriteInput = document.getElementById("savedFavourite");

    const tagInput = document.getElementById("savedTag");
    const tagContainer = document.getElementById("savedTags");

    const noteInput = document.getElementById("savedNote");
    const form = document.getElementById("editPasswordForm");

    const deleteBtn = document.getElementById("delete");
    const revertBtn = document.getElementById("revert");
    const backBtn = document.getElementById("back");

    // ======= State =======
    let tags = new Set(passwordData.searchTags || []);

    // ======= Utilities =======
    function calculateColour(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }

        let colour = "#";
        for (let i = 0; i < 3; i++) {
            const value = (hash >> (i * 8)) & 0xff;
            colour += value.toString(16).padStart(2, "0");
        }
        return colour;
    }

    function renderTags() {
        tagContainer.innerHTML = "";

        tags.forEach(tag => {
            const el = document.createElement("span");
            el.className = "searchTag";
            el.innerText = tag;
            el.title = `Click to remove '${tag}'`;
            el.style.borderColor = calculateColour(tag);

            el.addEventListener("click", () => {
                tags.delete(tag);
                renderTags();
            });

            tagContainer.appendChild(el);
        });
    }

    renderTags();

    // ======= Tag Input =======
    tagInput.addEventListener("keydown", e => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const value = tagInput.value.trim();

            if (value) {
                tags.add(value);
                tagInput.value = "";
                renderTags();
            }
        }
    });

    // ======= Password Reveal =======
    passwordPeekBtn.addEventListener("click", () => {
        const visible = passwordInput.type === "password";
        passwordInput.type = visible ? "text" : "password";
        passwordPeekBtn.innerHTML = !visible ? '<i class="fa-solid fa-eye"></i>' : '<i class="fa-solid fa-eye-slash"></i>';
    });

    // ======= Form Submit =======
    form.addEventListener("submit", async e => {
        e.preventDefault();

        const payload = {
            title: titleInput.value.trim(),
            url: urlInput.value.trim(),
            username: userInput.value.trim(),
            password: passwordInput.value,
            note: noteInput.value.trim(),
            searchTags: [...tags],
            isFavourite: favouriteInput.checked
        };

        try {
            const res = await fetch(`/pass/edit/${passwordId}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (data.redirect) {
                window.location.href = data.redirect;
            } else if (data.message) {
                alert(data.message);
            }

        } catch (err) {
            console.error(err);
            alert("Error saving password.");
        }
    });

    // ======= Delete =======
    deleteBtn.addEventListener("click", async () => {
        if (!confirm("Delete this password?")) return;

        try {
            await fetch("/pass/deleteOne", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: passwordId })
            });

            window.location.href = "/home/passwordVault";
        } catch (err) {
            console.error(err);
            alert("Failed to delete password.");
        }
    });

    // ======= Revert =======
    revertBtn.addEventListener("click", () => {
        location.reload();
    });

    // ======= Back =======
    backBtn.addEventListener("click", () => {
        window.location.href = "/home/passwordVault";
    });
});