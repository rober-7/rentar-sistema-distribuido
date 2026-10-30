export function toProtoEnum(prefix: string, value: string): string {
  const fullPrefix = `${prefix}_`;
  return value.startsWith(fullPrefix) ? value : `${fullPrefix}${value}`;
}

export function fromProtoEnum(prefix: string, value: string): string {
  const fullPrefix = `${prefix}_`;
  return value.startsWith(fullPrefix) ? value.slice(fullPrefix.length) : value;
}
