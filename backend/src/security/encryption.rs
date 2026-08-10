use std::fs;
use std::path::Path;

use aes_gcm::aead::{Aead, AeadCore, OsRng};
use aes_gcm::{Aes256Gcm, Key, KeyInit};
use base64::{engine::general_purpose::STANDARD, Engine};

pub fn load_or_create_master_key(path: &Path) -> anyhow::Result<[u8; 32]> {
    if path.exists() {
        let encoded = fs::read_to_string(path)?;
        let bytes = STANDARD.decode(encoded.trim())?;
        let mut key = [0u8; 32];
        key.copy_from_slice(&bytes);
        return Ok(key);
    }

    let key = Aes256Gcm::generate_key(&mut OsRng);
    let encoded = STANDARD.encode(key);
    fs::write(path, &encoded)?;

    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        fs::set_permissions(path, fs::Permissions::from_mode(0o600))?;
    }

    let mut out = [0u8; 32];
    out.copy_from_slice(&key);
    Ok(out)
}

pub fn encrypt(master_key: &[u8; 32], plaintext: &str) -> anyhow::Result<String> {
    let cipher = Aes256Gcm::new(Key::<Aes256Gcm>::from_slice(master_key));
    let nonce = Aes256Gcm::generate_nonce(&mut OsRng);
    let ciphertext = cipher
        .encrypt(&nonce, plaintext.as_bytes())
        .map_err(|e| anyhow::anyhow!("encryption failed: {e}"))?;

    let mut payload = nonce.to_vec();
    payload.extend_from_slice(&ciphertext);
    Ok(STANDARD.encode(payload))
}

pub fn decrypt(master_key: &[u8; 32], payload: &str) -> anyhow::Result<String> {
    let raw = STANDARD.decode(payload)?;
    if raw.len() < 12 {
        anyhow::bail!("ciphertext payload too short");
    }
    let (nonce_bytes, ciphertext) = raw.split_at(12);

    let cipher = Aes256Gcm::new(Key::<Aes256Gcm>::from_slice(master_key));
    let plaintext = cipher
        .decrypt(nonce_bytes.into(), ciphertext)
        .map_err(|e| anyhow::anyhow!("decryption failed: {e}"))?;

    Ok(String::from_utf8(plaintext)?)
}
