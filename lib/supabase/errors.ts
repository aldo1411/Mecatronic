interface PostgresError {
  code?: string
  message?: string
}

const UNIQUE_MESSAGES: Record<string, string> = {
  profiles_rfc_unique:            'El RFC ya está registrado con otro cliente',
  workshops_rfc_unique:           'El RFC ya está registrado en otro taller',
  contacts_contact_unique:    'El contacto ya está registrado con otro cliente',
  suppliers_phone_unique:     'Ese teléfono ya está registrado en otro proveedor',
  suppliers_email_unique:     'Ese correo ya está registrado en otro proveedor',
}

/**
 * Convierte errores de Postgres en mensajes de usuario legibles.
 * Si no reconoce el error, re-lanza el mensaje original.
 */
export function parseDbError(error: PostgresError): string {
  if (error.code === '23505') {
    for (const [key, msg] of Object.entries(UNIQUE_MESSAGES)) {
      if (error.message?.includes(key)) return msg
    }
    return 'Ya existe un registro con ese valor'
  }
  return error.message ?? 'Error inesperado'
}
