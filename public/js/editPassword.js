document.addEventListener("DOMContentLoaded", () => {
    // Elements
    const urlInput = document.getElementById("savedUrl");
    const userInput = document.getElementById("savedUser");
    const passwordInput = document.getElementById("savedPassword");
    const passwordPeekBtn = document.getElementById("passwordPeek");

    const tagInput = document.getElementById("savedTag");
    const tagContainer = document.getElementById("savedTags");

    const noteInput = document.getElementById("savedNote");
    const form = document.getElementById("addPasswordForm");

    const creationTime = document.getElementById("creationTime");
    const updatedTime = document.getElementById("updatedTime");

    const deleteBtn = form.querySelector("button[type='button']:first-of-type");

    // ======= State =======
    let tags = new Set(<%= JSON.stringify(password.searchTags || []) %>);
    const passwordId = "<%= password._id %>";

    // Populate fields from server
    urlInput.value = "<%= password.url %>";
    userInput.value = "<%= password.username %>";
    passwordInput.value = "<%= password.password %>";
    noteInput.value = "<%= password.note %>";

    creationTime.innerHTML += ` ${new Date("<%= password.createdAt || Date.now() %>").toLocaleString()}`;
    updatedTime.innerHTML += ` ${new Date("<%= password.updatedAt || Date.now() %>").toLocaleString()}`;

    // ======= Render Tags =======
    function renderTags() {
        tagContainer.innerHTML = "";
        tags.forEach(tag => {
            const el = document.createElement("span");
            el.className = "tag";
            el.innerText = tag;

            const removeBtn = document.createElement("button");
            removeBtn.type = "button";
            removeBtn.innerHTML = "&times;";
            removeBtn.onclick = () => {
                tags.delete(tag);
                renderTags();
            };
            el.appendChild(removeBtn);
            tagContainer.appendChild(el);
        });
    }

    renderTags();

    // ======= Tag Input =======
    tagInput.addEventListener("keydown", e => {
        if (e.key === "Enter" || e.key === " " || e.key === ",") {
            e.preventDefault();
            const value = tagInput.value.trim();
            if (value) {
                value.split(/\s+/).forEach(t => tags.add(t));
                tagInput.value = "";
                renderTags();
            }
        }
    });

    // ======= Password Reveal =======
    passwordPeekBtn.addEventListener("click", () => {
        passwordInput.type = passwordInput.type === "password" ? "text" : "password";
    });

    // ======= Form Submit =======
    form.addEventListener("submit", async e => {
        e.preventDefault();
        const payload = {
            title: urlInput.value, // optional: if you have a title field, adjust
            url: urlInput.value,
            username: userInput.value,
            password: passwordInput.value,
            note: noteInput.value,
            searchTags: Array.from(tags),
            isFavourite: <%= password.isFavourite %>
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
    deleteBtn.addEventListener("click", async e => {
        if (!confirm("Delete this password?")) return;
        try {
            const res = await fetch("/pass/deleteOne", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: passwordId })
            });
            alert("Deleted!");
            window.location.href = "/home/passwordVault";
        } catch (err) {
            console.error(err);
            alert("Failed to delete password.");
        }
    });
});