import { describe, expect, test } from "bun:test";
import { isBlockedIp } from "../vite-plugin-fetch";

describe("ssrf address guard", () => {
  test("blocks loopback, private and link-local IPv4", () => {
    for (const ip of [
      "127.0.0.1", "127.1.2.3", "0.0.0.0", "10.0.0.1", "10.255.255.255",
      "172.16.0.1", "172.31.255.254", "192.168.1.1", "192.0.0.1",
      "169.254.169.254", "100.64.0.1", "198.18.0.1", "224.0.0.1", "255.255.255.255",
    ]) {
      expect(isBlockedIp(ip)).toBe(true);
    }
  });

  test("blocks the cloud metadata address specifically", () => {
    expect(isBlockedIp("169.254.169.254")).toBe(true);
  });

  test("allows ordinary public IPv4", () => {
    for (const ip of ["1.1.1.1", "8.8.8.8", "93.184.216.34", "172.32.0.1", "192.167.1.1", "100.63.0.1"]) {
      expect(isBlockedIp(ip)).toBe(false);
    }
  });

  test("blocks loopback, unique-local and link-local IPv6", () => {
    for (const ip of ["::1", "::", "fc00::1", "fd12:3456::1", "fe80::1", "feb0::1", "fe80::1%en0"]) {
      expect(isBlockedIp(ip)).toBe(true);
    }
  });

  test("blocks IPv4-mapped IPv6 that points somewhere private", () => {
    expect(isBlockedIp("::ffff:127.0.0.1")).toBe(true);
    expect(isBlockedIp("::FFFF:169.254.169.254")).toBe(true);
    expect(isBlockedIp("::ffff:8.8.8.8")).toBe(false);
  });

  test("allows ordinary public IPv6", () => {
    expect(isBlockedIp("2606:4700:4700::1111")).toBe(false);
  });
});
