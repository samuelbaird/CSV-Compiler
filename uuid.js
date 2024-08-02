const emailToUUIDMap = new Map();

export function getUUIDForEmail(email) {
  if (!emailToUUIDMap.has(email)) {
    const uuid = generateUUID();
    emailToUUIDMap.set(email, uuid);
  }
  return emailToUUIDMap.get(email);
}

export function generateUUID() {
  return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) =>
    (
      c ^
      (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))
    ).toString(16)
  );
}
