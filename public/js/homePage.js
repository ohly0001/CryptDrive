const visibleTips = 5;
const securityTips = [
  // Password Security
  "Use unique passwords for every account.",
  "Use a long password: 12+ characters is recommended.",
  "Include uppercase, lowercase, numbers, and symbols in passwords.",
  "Avoid common passwords like '123456' or 'password'.",
  "Use passphrases instead of single words.",
  "Never reuse old passwords.",
  "Use a reputable password manager.",
  "Enable two-factor authentication (2FA) wherever possible.",
  "Use hardware-based 2FA (like YubiKey) for sensitive accounts.",
  "Change passwords regularly, especially after a breach.",
  "Do not write passwords on paper or sticky notes.",
  "Avoid password hints that are obvious.",
  "Never share your passwords via email or chat.",
  "Check if your passwords have been leaked using a trusted site.",
  "Use different passwords for work and personal accounts.",
  "Avoid personal info (birthdays, names) in passwords.",
  "Make random passwords instead of predictable patterns.",
  "Use multi-word random passphrases for easier memorization.",
  "Do not rely solely on browser-saved passwords.",
  "Consider encrypted local password storage as a backup.",
  
  // Account Security
  "Enable account recovery options with updated info.",
  "Remove old recovery emails or phone numbers you no longer use.",
  "Monitor account activity regularly.",
  "Be cautious with social media login links.",
  "Log out of accounts on shared devices.",
  "Review third-party app permissions periodically.",
  "Disable unnecessary features like location tracking.",
  "Use separate accounts for sensitive vs casual services.",
  "Avoid public Wi-Fi for account access without VPN.",
  "Sign out remotely if a device is lost or stolen.",
  "Set up alerts for suspicious account activity.",
  "Use strong secret questions with non-obvious answers.",
  "Lock inactive accounts to reduce attack surface.",
  "Enable biometric security for devices where possible.",
  "Regularly review account settings and security updates.",
  "Do not accept friend requests or connections from strangers.",
  "Be skeptical of unexpected password reset emails.",
  "Verify official sources before entering login credentials.",
  "Avoid logging in via third-party links in emails.",
  "Delete old or unused accounts to reduce exposure.",
  
  // Two-Factor Authentication
  "Use an authenticator app instead of SMS when possible.",
  "Backup 2FA codes in a secure location.",
  "Test 2FA recovery before relying on it.",
  "Do not share your 2FA device or app.",
  "Disable SMS-based 2FA if insecure.",
  "Use separate 2FA for personal and work accounts.",
  "Avoid storing 2FA codes in unencrypted files.",
  "Use U2F/WebAuthn hardware keys for high-value accounts.",
  "Monitor for phishing attempts targeting 2FA codes.",
  "Do not reuse 2FA codes across accounts.",
  
  // Email Security
  "Verify sender addresses carefully.",
  "Do not click on suspicious links in emails.",
  "Be cautious of email attachments from unknown senders.",
  "Enable spam filters and phishing detection.",
  "Use encrypted email services for sensitive communication.",
  "Do not share sensitive info via plain email.",
  "Check for HTTPS in email web login pages.",
  "Beware of urgent 'action required' scams.",
  "Educate yourself about common phishing tactics.",
  "Use a separate email for financial accounts.",
  
  // Browser & Device Security
  "Keep your operating system updated.",
  "Install software updates promptly.",
  "Use antivirus/antimalware software.",
  "Enable firewall protection.",
  "Avoid installing unnecessary software.",
  "Use ad blockers and anti-tracking tools.",
  "Regularly clear browser cache and cookies.",
  "Use a secure, updated browser.",
  "Disable browser extensions you don't need.",
  "Use private/incognito mode for sensitive browsing.",
  "Avoid auto-filling passwords on public computers.",
  "Encrypt sensitive data stored on devices.",
  "Lock devices with strong passwords or biometrics.",
  "Use full-disk encryption if possible.",
  "Enable device tracking and remote wipe.",
  "Be cautious with USB drives and external devices.",
  "Avoid pirated software that may contain malware.",
  "Regularly review installed apps for unnecessary access.",
  "Disable Bluetooth/Wi-Fi when not in use.",
  "Use VPNs on untrusted networks.",
  
  // File Handling Security
  "Always scan downloaded files for malware.",
  "Do not open attachments from unknown senders.",
  "Verify file sources before downloading.",
  "Use file integrity checks when possible.",
  "Encrypt sensitive files before sharing.",
  "Use secure cloud storage for sensitive data.",
  "Back up important files regularly.",
  "Avoid storing sensitive files on public/shared drives.",
  "Use strong passwords for encrypted archives.",
  "Limit file permissions on shared folders.",
  "Avoid executing unknown scripts or macros.",
  "Keep file extensions visible to avoid masquerading.",
  "Do not rename suspicious files to trick the system.",
  "Be cautious with executable (.exe, .bat) files.",
  "Regularly review old files and securely delete unnecessary ones.",
  "Use secure deletion tools to erase sensitive files.",
  "Verify digital signatures where applicable.",
  "Avoid auto-running files from removable media.",
  "Maintain an offline backup for critical files.",
  "Use sandboxing when opening untrusted files.",
  
  // Network Security
  "Use strong Wi-Fi passwords with WPA3 where possible.",
  "Hide your Wi-Fi SSID to reduce exposure.",
  "Disable WPS on your router.",
  "Change default router credentials immediately.",
  "Segment IoT devices on a separate network.",
  "Use VPNs for sensitive browsing on untrusted networks.",
  "Monitor network logs for unusual activity.",
  "Disable remote administration on routers unless needed.",
  "Update router firmware regularly.",
  "Use DNS filtering to block malicious sites.",
  "Avoid using public USB charging stations.",
  "Consider network intrusion detection for high-value setups.",
  "Limit unnecessary inbound/outbound traffic.",
  "Use secure protocols like HTTPS and SSH.",
  "Disable unneeded network services on devices.",
  "Regularly audit connected devices.",
  "Use strong passwords for shared network devices.",
  "Educate household members about safe network practices.",
  "Monitor for unauthorized device connections.",
  "Change network passwords periodically.",
  
  // Social Engineering & General Safety
  "Do not trust unsolicited messages or calls.",
  "Verify identities before sharing sensitive info.",
  "Be skeptical of urgent financial requests.",
  "Educate yourself about phishing, vishing, and smishing.",
  "Do not overshare personal info online.",
  "Limit personal info visible on social media.",
  "Report suspicious activity to authorities or IT teams.",
  "Do not use predictable patterns for usernames.",
  "Be cautious with public charging stations or kiosks.",
  "Educate family members about cyber safety.",
  "Regularly test your knowledge with security quizzes.",
  "Use discretion when installing browser or app extensions.",
  "Avoid clicking on shortened or masked links.",
  "Report scams to relevant platforms or agencies.",
  "Stay informed about new cyber threats.",
  "Backup security keys and critical credentials safely.",
  "Maintain physical security of devices and sensitive files.",
  "Consider professional security audits for critical systems.",
  "Have an incident response plan in case of compromise.",
  "Review security policies of services you use."
];

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

document.addEventListener('DOMContentLoaded', () => {
    const tipsContainer = document.getElementById('tipsSection');

    shuffle(securityTips);

    const list = document.createElement('ol');
    //list.type = 'I';
    securityTips.slice(0, visibleTips).forEach(e => {
        const item = document.createElement('li');
        item.innerText = e;
        list.appendChild(item);
    });
    tipsContainer.appendChild(list);
});