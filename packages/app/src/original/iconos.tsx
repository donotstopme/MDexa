import type { SVGProps } from 'react';

/** Iconografía de MDexa original (trazos de 24 px) */
export const IC: Record<string, string> = {
  expandir: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5',
  contraer: 'M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5',
  carga:    'M4 20V10M10 20V4M16 20v-7M22 20H2',
  presentar:'M3 4h18v12H3zM8 20h8M12 16v4',
  salir:    'M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l-5-5 5-5M5 12h12',
  repetir:  'M17 2l3 3-3 3M4 11V9a4 4 0 0 1 4-4h12M7 22l-3-3 3-3M20 13v2a4 4 0 0 1-4 4H4',
  teclado:  'M3 6h18v12H3zM7 10h.01M11 10h.01M15 10h.01M7 14h10',
  arroba:   'M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0zM16 12v1.5a2.5 2.5 0 0 0 5 0V12a9 9 0 1 0-3.5 7.1',
  deshacer: 'M9 14L4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11',
  rehacer:  'M15 14l5-5-5-5M20 9H9.5a5.5 5.5 0 0 0 0 11H13',
  columnas: 'M4 5h16v14H4zM9.5 5v14M14.5 5v14',
  correo:   'M4 6h16v12H4zM4 7l8 6 8-6',
  copiar:   'M9 9h11v11H9zM5 15H4V4h11v1',
  checklist:'M4 6.5l1.5 1.5L8.5 5M4 12.5l1.5 1.5 3-3M4 18.5l1.5 1.5 3-3M12 7h8M12 13h8M12 19h8',
  cadena:   'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  sol:      'M12 3v2M12 19v2M5 5l1.4 1.4M17.6 17.6 19 19M3 12h2M19 12h2M5 19l1.4-1.4M17.6 6.4 19 5M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
  luna:     'M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z',
  auto:     'M12 3a9 9 0 1 0 0 18zM12 3a9 9 0 0 1 0 18',
  imagen:   'M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM3 16l5-5 5 5 3-3 5 5M15.5 9.5h.01',
  etiqueta: 'M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8zM7.5 7.5h.01',
  prioridad:'M12 20V4M5 11l7-7 7 7',
  carpeta:  'M3 7V5a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v1M3 7v11a2 2 0 0 0 2 2h13.5a2 2 0 0 0 1.9-1.4L22 11H6.5a2 2 0 0 0-1.9 1.4L3 18',
  nuevo:    'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M12 11v6M9 14h6',
  refrescar:'M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7',
  grafica:  'M4 4v16h16M8 16v-4M12 16V8M16 16v-6',
  libro:    'M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5zM4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5M8 7h8',
  descargar:'M12 3v12M7 10l5 5 5-5M5 20h14',
  candado:  'M6 11h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1zM8 11V7a4 4 0 0 1 8 0v4',
  abierto:  'M6 11h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1zM8 11V7a4 4 0 0 1 7.7-1.5',
  lapiz:    'M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16zM13.5 6.5l4 4',
  basura:   'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  mas:      'M12 5v14M5 12h14',
  check:    'M5 12.5l4.5 4.5L19 7',
  x:        'M6 6l12 12M18 6L6 18',
  buscar:   'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4.2-4.2',
  impresora:'M7 9V3h10v6M7 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2M7 14h10v7H7z',
  tienda:   'M4 10v10h16V10M3 10l1.6-6h14.8L21 10zM3 10a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0M10 20v-5h4v5',
  ojo:      'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  usuario:  'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
  archivo:  'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M9 13h6M9 17h4',
  bandera:  'M5 21V4M5 4h12l-2.5 4L17 12H5',
  calendario:'M4 6a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1zM4 10h16M8 3v4M16 3v4',
  lista:    'M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01',
  alerta:   'M12 3.5L22 20H2zM12 10v4M12 17h.01',
  reloj:    'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2',
  capas:    'M12 3l9 5-9 5-9-5zM3 13l9 5 9-5',
  gantt:    'M3 4v16M7 7h8M10 12h10M6 17h7',
  tablero:  'M4 4h4v16H4zM10 4h4v11h-4zM16 4h4v7h-4z',
  izq:      'M12 6l-6 6 6 6M18 6l-6 6 6 6',
  ant:      'M15 6l-6 6 6 6',
  campana:  'M6 16v-5a6 6 0 0 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0',
  puntos:   'M5 12h.01M12 12h.01M19 12h.01',
  subir:    'M12 15V3M7 8l5-5 5 5M5 20h14',
  estrella: 'M12 3.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z',
  sprint:   'M4 7h11l-3-3M20 17H9l3 3M15 7a5 5 0 0 1 0 10',
  nota:     'M5 5h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-8l-4 3.5V16H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM8 9.5h8M8 12.5h5',
  sig:      'M9 6l6 6-6 6',
  der:      'M12 6l6 6-6 6M6 6l6 6-6 6',
};

export function Ico({ n, t = 16, ...r }: { n: string; t?: number } & Omit<SVGProps<SVGSVGElement>, 'viewBox'>) {
  const d = IC[n];
  if (!d) return null;
  return <svg className="ic" viewBox="0 0 24 24" width={t} height={t} fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...r}><path d={d} /></svg>;
}

export const Estrella = ({ relleno = false }: { relleno?: boolean }) => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path style={relleno ? { fill: 'currentColor' } : undefined} d={IC.estrella} /></svg>
);
