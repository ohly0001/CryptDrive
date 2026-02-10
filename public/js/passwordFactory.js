document.addEventListener('DOMContentLoaded', () => {
    const PasswordGenerator = (() => {

        let length = 16;

        let allowedCharSet = new Set(
            [..."abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_=+[]{}./?;:"]
        );

        const charSets = {
            lowercase:     [..."abcdefghijklmnopqrstuvwxyz"],
            uppercase:     [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"],
            numbers:       [..."0123456789"],
            safeSymbols:   [...`!@#$%^&*()-_=+[]{}./?;:`],
            unsafeSymbols: [...` ~,'"\`\\|`],
        };

        const allowedCharSetField = document.getElementById('allowedCharSetField');
        allowedCharSetField.value = [...allowedCharSet].join('');

        // ---- CRYPTO RNG ----
        const buf = new Uint8Array(1);

        const randomInt = (max) => {
            if (max <= 0) return 0;
            const threshold = 256 - (256 % max);
            do { crypto.getRandomValues(buf); } while (buf[0] >= threshold);
            return buf[0] % max;
        };

        const getRandomElement = arr => arr[randomInt(arr.length)];

        // ---- CRYPTO SHUFFLE ----
        const cryptoShuffle = (array) => {
            for (let i = array.length - 1; i > 0; i--) {
                const j = randomInt(i + 1);
                [array[i], array[j]] = [array[j], array[i]];
            }
        };

        // ---- ENTROPY CALC ----
        const calcEntropyBits = (charsetSize, len) => {
            if (charsetSize === 0) return 0;
            return Math.log2(Math.pow(charsetSize, len));
        };

        // ---- PASSWORD GENERATION ----
        const generatePassword = () => {

            if (allowedCharSet.size === 0) {
                document.getElementById('generatedPassword').value = '';
                document.getElementById('entropyBits').innerText = '0 bits';
                return;
            }

            const allowedCharArray = [...allowedCharSet];

            // Determine enabled groups
            const enabledGroups = Object.values(charSets)
                .filter(set => set.every(c => allowedCharSet.has(c)));

            // zero-allocation-ish prealloc
            const password = new Array(length);
            let idx = 0;

            // guarantee ≥1 from each enabled group
            enabledGroups.forEach(group => {
                if (idx < length) {
                    password[idx++] = getRandomElement(group);
                }
            });

            // fill remaining
            while (idx < length) {
                password[idx++] = getRandomElement(allowedCharArray);
            }

            // shuffle so guaranteed chars aren't predictable
            cryptoShuffle(password);

            const passwordString = password.join('');

            const passwordField = document.getElementById('generatedPassword');
            passwordField.value = passwordString;

            // zxcvbn strength
            const score = zxcvbn(passwordString).score;
            document.getElementById('passwordStrength').value = score;
            const labels = ["Very Weak", "Weak", "Fair", "Strong", "Very Strong"];
            document.getElementById('passwordStrengthLabel').innerText = labels[score];

            // entropy display
            const entropy = calcEntropyBits(allowedCharArray.length, length);
            document.getElementById('entropyBits').innerHTML =
                `<b>${Math.round(entropy)}</b> Bits of Entropy`;
        };

        // ---- CLIPBOARD COPY ----
        const copyPassword = async () => {
            const text = document.getElementById('generatedPassword').value;
            await navigator.clipboard.writeText(text);
        };

        // ---- UI BINDINGS ----
        const bindUI = () => {

            // manual charset editing
            allowedCharSetField.addEventListener('change', e => {

                // printable ASCII only safeguard
                allowedCharSet = new Set(
                    [...e.currentTarget.value].filter(c => c >= ' ' && c <= '~')
                );

                Object.entries(charSets).forEach(([id, charSet]) => {
                    document.getElementById(id).checked =
                        charSet.every(c => allowedCharSet.has(c));
                });

                allowedCharSetField.value = [...allowedCharSet].join('');
                generatePassword();
            });

            // copy
            document.getElementById('copyGeneratedPassword')
                .addEventListener('click', copyPassword);

            // regenerate
            document.getElementById('regeneratePassword')
                .addEventListener('click', generatePassword);

            // length controls
            const lengthField = document.getElementById('passwordLengthField');
            const lengthSlider = document.getElementById('passwordLengthSlider');

            const setLength = value => {
                length = Math.min(Math.max(parseInt(value) || 16, 1), 256);
                if (parseInt(lengthField.value) !== length) lengthField.value = length;
                if (parseInt(lengthSlider.value) !== length) lengthSlider.value = length;
            };

            lengthField.addEventListener('input', e => {
                setLength(e.currentTarget.value);
                generatePassword();
            });

            lengthSlider.addEventListener('input', e => setLength(e.currentTarget.value));
            ['mouseup', 'touchend'].forEach(evt =>
                lengthSlider.addEventListener(evt, generatePassword)
            );

            // toggles
            const bindToggle = (id, charSet) => {
                document.getElementById(id).addEventListener('change', e => {
                    if (e.currentTarget.checked) {
                        charSet.forEach(c => allowedCharSet.add(c));
                    } else {
                        charSet.forEach(c => allowedCharSet.delete(c));
                    }
                    allowedCharSetField.value = [...allowedCharSet].join('');
                    generatePassword();
                });
            };

            bindToggle('lowercase',     charSets.lowercase);
            bindToggle('uppercase',     charSets.uppercase);
            bindToggle('numbers',       charSets.numbers);
            bindToggle('safeSymbols',   charSets.safeSymbols);
            bindToggle('unsafeSymbols', charSets.unsafeSymbols);

            // peek
            const passwordField = document.getElementById('generatedPassword');
            const peekButton = document.getElementById('passwordPeek');

            const show = () => passwordField.type = 'text';
            const hide = () => passwordField.type = 'password';

            ['mousedown','touchstart'].forEach(e => peekButton.addEventListener(e, show));
            ['mouseup','mouseleave','touchend']
                .forEach(e => peekButton.addEventListener(e, hide));
        };

        const init = () => {
            bindUI();
            generatePassword();
        };

        return { init };
    })();

    PasswordGenerator.init();
});