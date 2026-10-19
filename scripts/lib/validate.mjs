// Minimal JSON Schema validator for the subset used by the Hub's ecosystem feed schema:
// $ref (#/$defs), type, enum, const, pattern, required, properties, additionalProperties,
// propertyNames, items and minItems. Standard library only.

function typeOf(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'number') return Number.isInteger(value) ? 'integer' : 'number';
  return typeof value; // string, boolean, object
}

function matchesType(value, type) {
  const actual = typeOf(value);
  if (type === 'number') return actual === 'number' || actual === 'integer';
  return actual === type;
}

export function validate(schema, value, root = schema, path = '$', errors = []) {
  if (schema.$ref) {
    const name = schema.$ref.replace(/^#\/\$defs\//, '');
    const target = root.$defs?.[name];
    if (!target) throw new Error(`schema $ref not found: ${schema.$ref}`);
    return validate(target, value, root, path, errors);
  }

  if (schema.const !== undefined && value !== schema.const) {
    errors.push(`${path}: expected constant ${JSON.stringify(schema.const)}`);
  }
  if (schema.enum && !schema.enum.includes(value)) {
    errors.push(`${path}: ${JSON.stringify(value)} is not one of ${JSON.stringify(schema.enum)}`);
  }
  if (schema.type) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!types.some((t) => matchesType(value, t))) {
      errors.push(`${path}: expected type ${types.join(' or ')}, got ${typeOf(value)}`);
      return errors;
    }
  }
  if (typeof value === 'string' && schema.pattern && !new RegExp(schema.pattern, 'u').test(value)) {
    errors.push(`${path}: ${JSON.stringify(value)} does not match ${schema.pattern}`);
  }

  if (typeOf(value) === 'object') {
    for (const key of schema.required ?? []) {
      if (!(key in value)) errors.push(`${path}: missing required property "${key}"`);
    }
    if (schema.propertyNames?.enum) {
      for (const key of Object.keys(value)) {
        if (!schema.propertyNames.enum.includes(key)) {
          errors.push(`${path}: property name "${key}" is not allowed`);
        }
      }
    }
    const props = schema.properties ?? {};
    for (const [key, sub] of Object.entries(props)) {
      if (key in value) validate(sub, value[key], root, `${path}.${key}`, errors);
    }
    for (const key of Object.keys(value)) {
      if (key in props) continue;
      if (schema.additionalProperties === false) {
        errors.push(`${path}: unexpected property "${key}"`);
      } else if (typeof schema.additionalProperties === 'object') {
        validate(schema.additionalProperties, value[key], root, `${path}.${key}`, errors);
      }
    }
  }

  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) {
      errors.push(`${path}: needs at least ${schema.minItems} item(s), has ${value.length}`);
    }
    if (schema.items) {
      value.forEach((item, i) => validate(schema.items, item, root, `${path}[${i}]`, errors));
    }
  }
  return errors;
}
