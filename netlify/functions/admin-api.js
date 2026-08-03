const { getStore } = require("@netlify/blobs");

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "stonic-admin-123";

function makeKey() {
  const part = () => Math.random().toString(36).substring(2, 6).toUpperCase();
  return `STONIC-${part()}-${part()}-${part()}`;
}

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const { action, password, license_id } = body;

    if (password !== ADMIN_PASSWORD) {
      return { statusCode: 200, body: JSON.stringify({ success: false, message: "Invalid password" }) };
    }

    const store = getStore("licenses");

    if (action === "list") {
      const { blobs } = await store.list();
      const data = await Promise.all(blobs.map(async (b) => await store.get(b.key, { type: "json" })));
      return { statusCode: 200, body: JSON.stringify({ success: true, data: data.filter(Boolean) }) };
    }

    if (action === "create") {
      const key = makeKey();
      const record = { id: key, license_key: key, status: "active", machine_fingerprint: null, activated_at: null, created_at: new Date().toISOString() };
      await store.setJSON(key, record);
      return { statusCode: 200, body: JSON.stringify({ success: true, key }) };
    }

    if (action === "revoke") {
      const existing = await store.get(license_id, { type: "json" });
      if (existing) {
        existing.status = "revoked";
        await store.setJSON(license_id, existing);
      }
      return { statusCode: 200, body: JSON.stringify({ success: true }) };
    }

    return { statusCode: 400, body: JSON.stringify({ success: false, message: "Unknown action" }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ success: false, message: err.message }) };
  }
};
