export interface SampleDoc {
  id: string;
  name: string;
  description: string;
  mimeType: string;
  content: string; // text or base64
  suggestedExtension: string;
}

export const SAMPLE_DOCUMENTS: SampleDoc[] = [
  {
    id: 'factura-proveedor-abc',
    name: 'Factura_Compra_Proveedor_ABC.txt',
    description: 'Factura de compra recibida de suministros y tecnología (Proveedor ABC S.A.)',
    mimeType: 'text/plain',
    suggestedExtension: '.pdf',
    content: `FACTURA ELECTRONICA DE COMPRA
N° Factura: F-2026-0891
Fecha de Emisión: 2026-08-07
Fecha de Vencimiento: 2026-09-06

PROVEEDOR:
Proveedor ABC S.A.
RUT/NIT: 900.123.456-7
Dirección: Av. Empresarial 450, Piso 8, Ciudad
Teléfono: +56 2 2987 6543
Email: facturacion@proveedorabc.com

CLIENTE:
Empresa Demostración AMOD S.A.
RUT/NIT: 800.987.654-2

DETALLE DE PRODUCTOS / SERVICIOS:
1. Servidores Cloud Pro - Período Agosto 2026 - $850.00
2. Soporte Técnico Especializado Secretarial - $400.00

SUBTOTAL: $1,250.00
IVA (19%): $237.50
TOTAL A PAGAR: $1,487.50

Forma de Pago: Transferencia Bancaria
Banco: Banco Central / Cta Cte 123-45678-90
Observación: Factura correspondiente al suministro mensual de servidores e infraestructura.`
  },
  {
    id: 'contrato-prestacion-servicios',
    name: 'Contrato_Prestacion_Servicios_Consultora_Global.txt',
    description: 'Contrato legal de asesoría y servicios profesionales con Consultora Global Ltda.',
    mimeType: 'text/plain',
    suggestedExtension: '.pdf',
    content: `CONTRATO DE PRESTACION DE SERVICIOS PROFESIONALES

En la ciudad, a 15 de mayo de 2026, entre:
DE UNA PARTE: Empresa Demostración AMOD S.A., representada por la Gerencia General.
DE OTRA PARTE: Consultora Global Ltda., representada por Don Carlos M. Mendoza.

CLAUSULA PRIMERA - OBJETO DEL CONTRATO:
El Prestador se compromete a brindar servicios de consultoría e implementación del sistema de Gestión Secretarial e Inteligencia Artificial en las dependencias de la Empresa.

CLAUSULA SEGUNDA - HONORARIOS Y FORMA DE PAGO:
El valor total de los servicios asciende a la suma de $5,000.00 USD, cancelados en 2 cuotas iguales contra entrega de informes de avance.

CLAUSULA TERCERA - VIGENCIA:
El presente contrato tendrá una vigencia de 12 meses a contar del 01 de junio de 2026 al 31 de mayo de 2027.

Firmado en dos ejemplares de un mismo tenor y a un solo efecto.
Representante Empresa AMOD / Representante Consultora Global Ltda.`
  },
  {
    id: 'informe-acta-directiva',
    name: 'Informe_Gestion_Secretaria_Agosto_2026.txt',
    description: 'Informe administrativo de la Secretaría General sobre avance organizativo.',
    mimeType: 'text/plain',
    suggestedExtension: '.docx',
    content: `MEMORANDUM INTERNO / INFORME DE GESTION
DE: Secretaría Administrativa General
PARA: Dirección de Administración y Finanzas
FECHA: 2026-08-01
ASUNTO: Reporte Mensual de Digitalización de Archivo y Correspondencia

1. RESUMEN EJECUTIVO:
Durante el mes de julio de 2026, el departamento de Secretaría Administrativa ha completado la reorganización física y digital de 450 expedientes corporativos.

2. LOGROS PRINCIPALES:
- Implementación de la norma de codificación empresarial (01 al 07).
- Clasificación de 120 facturas de proveedores e integración con Google Drive.
- Reducción del tiempo de búsqueda de documentos en un 65%.

3. RECOMENDACIONES:
Continuar con la capacitación del personal administrativo en el uso del asistente AMOD Solución IA para la nomenclatura estándar: TIPO_FECHA_ENTIDAD.

Atentamente,
Secretaría Administrativa
AMOD Solución IA`
  }
];
