// RFC 8941 Token: `[A-Za-z*]` followed by tchar / ":" / "/".
const STRUCTURED_FIELD_TOKEN = /^[A-Za-z*][A-Za-z0-9!#$%&'*+\-.^_`|~:/]*$/;

// Serialises a value as an RFC 8941 Structured Field item: a bare Token when
// possible, otherwise a quoted String.
export function toStructuredFieldItem(value: string) {
  return STRUCTURED_FIELD_TOKEN.test(value) ? value : JSON.stringify(value);
}
