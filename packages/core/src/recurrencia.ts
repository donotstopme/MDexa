import { ALIAS_REPITE, DIAS_SEM, REPITE } from './constantes';
import type { Actividad, Documento, Repite } from './tipos';
import { addDias, dias, fechaISO, hoy, normaliza, siguienteId, subtareasDe } from './utilidades';
import { etqs } from './etiquetas';

export const leerRepite = (t: unknown): Repite | '' => {
  const s = String(t || '');
  return ALIAS_REPITE[normaliza(s)] || ((REPITE as Record<string, string>)[s] ? (s as Repite) : '');
};

export function descRepite(a: Actividad, rep: Repite | '' = a.repite): string {
  if (!rep || !REPITE[rep]) return '';
  const f = a.fin || a.inicio || '', d = f ? new Date(f + 'T00:00') : null;
  if (rep === 'semana' && d) return `Cada ${DIAS_SEM[d.getDay()]}`;
  if (rep === 'quincena' && d) return `Cada 2 semanas (${DIAS_SEM[d.getDay()]})`;
  if (rep === 'mes' && d) return `Cada mes, el día ${d.getDate()}`;
  if (rep === 'trimestre' && d) return `Cada 3 meses, el día ${d.getDate()}`;
  return REPITE[rep];
}

export function sumarMeses(f: string, n: number, diaOrig?: number): string {
  const d = new Date(f + 'T00:00'), dia = diaOrig || d.getDate();
  const x = new Date(d.getFullYear(), d.getMonth() + n, 1), ult = new Date(x.getFullYear(), x.getMonth() + 1, 0).getDate();
  x.setDate(Math.min(dia, ult));
  return fechaISO(x);
}

export function avanzarRep(f: string, rep: Repite | '', diaOrig?: number): string {
  if (rep === 'dia') {
    let x = addDias(f, 1);
    while ([0, 6].includes(new Date(x + 'T00:00').getDay())) x = addDias(x, 1);
    return x;
  }
  if (rep === 'semana') return addDias(f, 7);
  if (rep === 'quincena') return addDias(f, 14);
  if (rep === 'mes') return sumarMeses(f, 1, diaOrig);
  if (rep === 'trimestre') return sumarMeses(f, 3, diaOrig);
  return f;
}

/**
 * Siguiente actividad de la serie. No muta nada: devuelve la nueva actividad y la original
 * con la marca de "se repite" quitada (pasa a la nueva).
 */
export function crearSiguiente(doc: Pick<Documento, 'actividades' | 'bitacora' | 'notas'>, a: Actividad, ahora: Date = new Date()) {
  const rep = a.repite as Repite, h = hoy(ahora), base = a.fin || a.inicio || a.terminada || h;
  const dur = a.inicio && a.fin ? dias(a.inicio, a.fin) : 0;
  const diaOrig = new Date(base + 'T00:00').getDate();
  let f = avanzarRep(base, rep, diaOrig), vueltas = 0;
  while (f < h && vueltas++ < 600) f = avanzarRep(f, rep, diaOrig);   // si se terminó tarde, la siguiente queda en el futuro
  const siguiente: Actividad = {
    id: siguienteId(doc), negocio: a.negocio, actividad: a.actividad, tamano: a.tamano, prioridad: a.prioridad,
    responsable: a.responsable, etiquetas: [...etqs(a)], subtareas: subtareasDe(a).map(x => ({ t: x.t, ok: false })),
    depende: [], repite: rep, estado: 'Planeado', terminada: '', inicio: '', fin: '',
  };
  if (a.fin) { siguiente.fin = f; siguiente.inicio = a.inicio ? addDias(f, -dur) : ''; }
  else if (a.inicio) { siguiente.inicio = f; }
  else { siguiente.fin = f; }
  return { siguiente, original: { ...a, repite: '' as const } };
}
