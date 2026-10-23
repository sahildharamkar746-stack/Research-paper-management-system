#pragma once
#include <string>
#include <vector>
#include <random>
#include <sstream>
#include <iomanip>
#include <chrono>
#include <cstring>
#include <CommonCrypto/CommonKeyDerivation.h>
#include <CommonCrypto/CommonDigest.h>

namespace crypto_utils {

// Secure Hex encoding
inline std::string to_hex(const uint8_t* data, size_t len) {
    std::ostringstream oss;
    for (size_t i = 0; i < len; ++i) {
        oss << std::hex << std::setw(2) << std::setfill('0') << static_cast<int>(data[i]);
    }
    return oss.str();
}

// Secure Hex decoding
inline std::vector<uint8_t> from_hex(const std::string& hex) {
    std::vector<uint8_t> bytes;
    for (size_t i = 0; i < hex.length(); i += 2) {
        std::string byteString = hex.substr(i, 2);
        uint8_t byte = static_cast<uint8_t>(strtol(byteString.c_str(), nullptr, 16));
        bytes.push_back(byte);
    }
    return bytes;
}

// Generate cryptographically secure random token (e.g. for session IDs or salt)
inline std::string generate_secure_token(size_t byte_count = 32) {
    std::vector<uint8_t> buffer(byte_count);
    // Use /dev/urandom for cryptographic quality randomness
    FILE* f = fopen("/dev/urandom", "rb");
    if (f) {
        size_t read_bytes = fread(buffer.data(), 1, byte_count, f);
        fclose(f);
        if (read_bytes == byte_count) {
            return to_hex(buffer.data(), buffer.size());
        }
    }
    // Fallback to std::random_device
    std::random_device rd;
    for (size_t i = 0; i < byte_count; ++i) {
        buffer[i] = static_cast<uint8_t>(rd() & 0xFF);
    }
    return to_hex(buffer.data(), buffer.size());
}

/**
 * Standard Key Derivation Hash (PBKDF2-HMAC-SHA256 with 100,000 iterations and 128-bit salt)
 * Compliant with NIST SP 800-132 recommendations for password hashing.
 * Output format: "$pbkdf2-sha256$100000$<salt_hex>$<hash_hex>"
 */
inline std::string hash_password(const std::string& password) {
    const uint32_t iterations = 100000;
    std::string salt_hex = generate_secure_token(16); // 16 bytes = 128 bits salt
    std::vector<uint8_t> salt_bytes = from_hex(salt_hex);
    std::vector<uint8_t> key_out(32); // 256 bits

    int status = CCKeyDerivationPBKDF(
        kCCPBKDF2,
        password.c_str(),
        password.length(),
        salt_bytes.data(),
        salt_bytes.size(),
        kCCPRFHmacAlgSHA256,
        iterations,
        key_out.data(),
        key_out.size()
    );

    if (status != 0) {
        return "";
    }

    std::string hash_hex = to_hex(key_out.data(), key_out.size());
    return "$pbkdf2-sha256$" + std::to_string(iterations) + "$" + salt_hex + "$" + hash_hex;
}

// Constant-time string comparison to prevent timing attacks
inline bool constant_time_equals(const std::string& a, const std::string& b) {
    if (a.length() != b.length()) return false;
    unsigned char result = 0;
    for (size_t i = 0; i < a.length(); ++i) {
        result |= (a[i] ^ b[i]);
    }
    return result == 0;
}

// Verify password against stored hash
inline bool verify_password(const std::string& password, const std::string& stored_hash) {
    if (stored_hash.rfind("$pbkdf2-sha256$", 0) != 0) {
        return false;
    }

    std::stringstream ss(stored_hash);
    std::string segment;
    std::vector<std::string> parts;
    while (std::getline(ss, segment, '$')) {
        if (!segment.empty()) {
            parts.push_back(segment);
        }
    }

    if (parts.size() != 4) return false;
    // parts[0] = "pbkdf2-sha256"
    // parts[1] = iterations
    // parts[2] = salt_hex
    // parts[3] = hash_hex

    uint32_t iterations = 100000;
    try {
        iterations = std::stoul(parts[1]);
    } catch (...) {
        return false;
    }

    std::string salt_hex = parts[2];
    std::string expected_hash_hex = parts[3];
    std::vector<uint8_t> salt_bytes = from_hex(salt_hex);
    std::vector<uint8_t> key_out(32);

    int status = CCKeyDerivationPBKDF(
        kCCPBKDF2,
        password.c_str(),
        password.length(),
        salt_bytes.data(),
        salt_bytes.size(),
        kCCPRFHmacAlgSHA256,
        iterations,
        key_out.data(),
        key_out.size()
    );

    if (status != 0) return false;
    std::string computed_hash_hex = to_hex(key_out.data(), key_out.size());
    return constant_time_equals(computed_hash_hex, expected_hash_hex);
}

} // namespace crypto_utils
