// Convierte "talk[update][0][chat_id]" -> ["talk","update","0","chat_id"]
function keyToPath(key) {
  return key.replace(/\]/g, "").split("[");
}

// setDeep(obj, ["a","b","0","c"], val) -> obj.a.b[0].c = val
function setDeep(target, parts, value) {
  let cur = target;
  for (let i = 0; i < parts.length; i++) {
    const k = parts[i];
    const nextIsIndex = Number.isInteger(+parts[i + 1]);
    const isLast = i === parts.length - 1;

    if (isLast) {
      cur[k] = value;
    } else {
      if (cur[k] == null) cur[k] = nextIsIndex ? [] : {};
      cur = cur[k];
    }
  }
  return target;
}

export function parseIncoming(raw, contentType) {
  // 1) Intento JSON
  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(raw);
    } catch {
      // sigue abajo
    }
  }

  // 2) x-www-form-urlencoded → expandimos corchetes a objeto anidado
  const params = new URLSearchParams(raw);
  const nested = {};
  for (const [k, v] of params.entries()) {
    setDeep(nested, keyToPath(k), v);
  }
  return nested;
}  