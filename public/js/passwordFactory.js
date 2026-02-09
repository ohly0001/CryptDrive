document.addEventListener('DOMContentLoaded', () => {
    const PasswordGenerator = (() => {
        let length = 16;
        let enableLowercase = true;
        let enableUppercase = true;
        let enableNumbers = true;
        let enableSymbols = true;

        const charSets = {
            lowercase: [..."abcdefghijklmnopqrstuvwxyz"],
            uppercase: [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"],
            numbers:   [..."0123456789"],
            symbols:   [...`~\`!@#$%^&*()-_=+,./?;:'"[{]}|\\`],
        };

        const getRandomElement = arr => arr[window.crypto.randomInt(0, arr.length)];

        const secureShuffle = array => {
            for (let i = array.length - 1; i > 0; i--) {
                const j = window.crypto.randomInt(0, i + 1);
                [array[i], array[j]] = [array[j], array[i]];
            }
            return array;
        };

        const generatePassword = () => {
            if (!enableLowercase && !enableUppercase && !enableNumbers && !enableSymbols) return '';

            const activePools = [];
            let allChars = [];
            if (enableLowercase) { activePools.push(charSets.lowercase); allChars.push(...charSets.lowercase); }
            if (enableUppercase) { activePools.push(charSets.uppercase); allChars.push(...charSets.uppercase); }
            if (enableNumbers)   { activePools.push(charSets.numbers);   allChars.push(...charSets.numbers); }
            if (enableSymbols)   { activePools.push(charSets.symbols);   allChars.push(...charSets.symbols); }

            if (!activePools.length || len < activePools.length) return '';

            const password = activePools.map(getRandomElement);

            while (password.length < len) {
                password.push(getRandomElement(allChars));
            }

            secureShuffle(password);
            const passwordString = password.join('');

            const passwordField = document.getElementById('generatedPassword');
            passwordField.value = passwordString;

            const score = zxcvbn(passwordString).score;
            document.getElementById('passwordStrength').value = score;
            const labels = ["Very Weak", "Weak", "Fair", "Strong", "Very Strong"];
            document.getElementById('passwordStrengthLabel').innerText = labels[score];
        };

        const bindUI = () => {
            // Copy
            document.getElementById('copyGeneratedPassword').addEventListener('click', async () => {
                await navigator.clipboard.writeText(document.getElementById('generatedPassword').value);
            });

            // Regenerate
            document.getElementById('regeneratePassword').addEventListener('click', generatePassword);

            // Length inputs
            const lengthField = document.getElementById('passwordLengthField');
            const lengthSlider = document.getElementById('passwordLengthSlider');

            // Update length state and sync fields
            const setLength = value => {
                length = Math.min(Math.max(parseInt(value) || 16, 1), 128);
                if (parseInt(lengthField.value) !== length) lengthField.value = length;
                if (parseInt(lengthSlider.value) !== length) lengthSlider.value = length;
            };

            // Text field changes generate password immediately
            lengthField.addEventListener('input', e => {
                setLength(e.currentTarget.value);
                generatePassword();
            });

            // Slider changes only update length live
            lengthSlider.addEventListener('input', e => setLength(e.currentTarget.value));

            // Regenerate password on mouseup/touchend after slider drag
            ['mouseup', 'touchend'].forEach(evt => lengthSlider.addEventListener(evt, generatePassword));

            // Checkbox toggles
            const bindToggle = (id, setter) => {
                document.getElementById(id).addEventListener('change', e => {
                    setter(e.currentTarget.checked);
                    generatePassword();
                });
            };
            bindToggle('enableLowercase', val => enableLowercase = val);
            bindToggle('enableUppercase', val => enableUppercase = val);
            bindToggle('enableNumbers',   val => enableNumbers   = val);
            bindToggle('enableSymbols',   val => enableSymbols   = val);

            // Peek password
            const passwordField = document.getElementById('generatedPassword');
            const peekButton = document.getElementById('passwordPeek');
            const showPassword = () => passwordField.type = 'text';
            const hidePassword = () => passwordField.type = 'password';

            ['mousedown', 'touchstart'].forEach(evt => peekButton.addEventListener(evt, showPassword));
            ['mouseup', 'mouseleave', 'touchend'].forEach(evt => peekButton.addEventListener(evt, hidePassword));
        };

        const init = () => {
            bindUI();
            generatePassword(); // initial password
        };

        return { init };
    })();

    PasswordGenerator.init();
});