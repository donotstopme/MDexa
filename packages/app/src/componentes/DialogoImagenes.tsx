import { useEffect, useRef, useState } from 'react';
import { EST, carpetaImagenes, imagenesDe, negocioDe, nomCorto, type Documento, type Imagen } from '@mdexa/core';
import { Ico } from '../original/iconos';
import { colorEstado, fmtHora, haceLargo } from '../original/piezas';
import type { Almacenamiento } from '../almacenamiento/tipos';
import { Dialogo } from './Dialogo';

/** Ventana de imágenes de una actividad: galería, arrastrar/pegar/elegir, visor en grande */
export function DialogoImagenes({ doc, id, archivo, almacen, escritura, onAgregar, onBorrar, onCerrar }: {
  doc: Documento; id: number; archivo: string; almacen: Almacenamiento; escritura: { ok: boolean; msg: string };
  onAgregar(files: File[]): Promise<boolean>; onBorrar(img: Imagen): void; onCerrar(): void;
}) {
  const a = doc.actividades.find(x => x.id === id);
  const [acceso, setAcceso] = useState(false), [urls, setUrls] = useState<Record<string, string | null>>({}), [sobre, setSobre] = useState(false), [visor, setVisor] = useState<number | null>(null);
  const entrada = useRef<HTMLInputElement>(null);
  const lista = imagenesDe(doc, id), disponible = almacen.imagenesDisponibles();
  const claves = lista.map(x => x.archivo).join('|');

  useEffect(() => { void almacen.imagenesAcceso().then(setAcceso); }, [almacen]);
  useEffect(() => {
    if (!acceso) return;
    let vivo = true;
    lista.forEach(x => { void almacen.urlImagen(x.archivo).then(u => { if (vivo) setUrls(s => (s[x.archivo] === u ? s : { ...s, [x.archivo]: u })); }); });
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acceso, claves, almacen]);
  useEffect(() => {   // pegar una captura con Ctrl+V
    const pegar = (e: ClipboardEvent) => {
      if (visor !== null || !escritura.ok) return;
      const fs = [...(e.clipboardData?.files ?? [])].filter(f => /^image\//.test(f.type));
      if (fs.length) { e.preventDefault(); void agregar(fs); }
    };
    document.addEventListener('paste', pegar); return () => document.removeEventListener('paste', pegar);
  });
  if (!a) return null;
  const est = EST(a);
  const darAcceso = async () => { const r = await almacen.pedirCarpeta(); if (r.aviso) window.alert(r.aviso); setAcceso(await almacen.imagenesAcceso()); };
  const agregar = async (fs: File[]) => { if (await onAgregar(fs)) setAcceso(await almacen.imagenesAcceso()); };

  return (
    <>
      <Dialogo onCerrar={onCerrar}>
        <h2><Ico n="imagen" t={20} /> {nomCorto(a)}</h2>
        <p>{negocioDe(a)} · <span className={`es-${colorEstado(est)}`}>{est}</span> · {lista.length} {lista.length === 1 ? 'imagen' : 'imágenes'} · se guardan en la carpeta <code>{carpetaImagenes(archivo)}</code> junto al archivo</p>
        {(!disponible || !acceso) && (
          <div className="img-acceso">
            {!disponible
              ? <><Ico n="alerta" t={16} /> <span>Para ver y agregar imágenes abre el .md desde su carpeta con Chrome o Edge.</span></>
              : <><Ico n="candado" t={16} /> <span>{lista.length ? 'Para ver las imágenes' : 'Para guardar imágenes'}, da acceso a la carpeta donde está <b>{archivo}</b>. Solo se pide una vez en este navegador.</span>
                  <button type="button" className="prim" onClick={() => void darAcceso()}><Ico n="carpeta" t={15} /> Dar acceso a la carpeta</button></>}
          </div>
        )}
        <div className="img-galeria">
          {lista.length ? lista.map((x, i) => (
            <figure key={x.archivo} className="img-it">
              <button type="button" className="img-th" title="Ver en grande" onClick={() => (acceso ? setVisor(i) : void darAcceso())}>
                {!acceso ? <Ico n="imagen" t={28} /> : urls[x.archivo] === undefined ? <span className="img-carga" /> : urls[x.archivo] ? <img src={urls[x.archivo]!} alt={x.nombre} loading="lazy" /> : <span className="img-falta"><Ico n="alerta" t={18} /> No se encontró el archivo</span>}
              </button>
              <figcaption><span className="img-nom" title={x.nombre}>{x.nombre}</span><span className="nd">{x.autor} · <span title={fmtHora(x.fecha)}>{haceLargo(x.fecha)}</span></span>
                {escritura.ok && <button type="button" className="ico-btn peligro img-borrar" title="Eliminar imagen" aria-label="Eliminar imagen" onClick={() => onBorrar(x)}><Ico n="basura" t={13} /></button>}</figcaption>
            </figure>
          )) : <div className="vacio"><Ico n="imagen" t={26} /><p>Aún no hay imágenes en esta actividad.</p></div>}
        </div>
        {disponible && escritura.ok && (
          <div className={`img-zona ${sobre ? 'sobre' : ''}`} onDragOver={e => { e.preventDefault(); setSobre(true); }} onDragLeave={() => setSobre(false)} onDrop={e => { e.preventDefault(); setSobre(false); void agregar([...e.dataTransfer.files]); }}>
            <span>Arrastra imágenes aquí o pega una captura con Ctrl+V</span><button type="button" onClick={() => entrada.current?.click()}>Elegir imágenes</button>
          </div>
        )}
        <input ref={entrada} type="file" accept="image/*" multiple hidden onChange={e => { void agregar([...(e.target.files ?? [])]); e.target.value = ''; }} />
        <div className="pie">
          <span className="ayuda"><Ico n={escritura.ok ? 'check' : 'candado'} t={13} /> {escritura.ok ? escritura.msg.replace('nota', 'imagen') : escritura.msg.replace(/notas/g, 'imágenes')}</span>
          <div className="barra"><button type="button" onClick={onCerrar}>Cerrar</button></div>
        </div>
      </Dialogo>
      {visor !== null && lista[visor] && <Visor lista={lista} i={visor} urls={urls} onI={setVisor} onCerrar={() => setVisor(null)} />}
    </>
  );
}

function Visor({ lista, i, urls, onI, onCerrar }: { lista: Imagen[]; i: number; urls: Record<string, string | null>; onI(i: number): void; onCerrar(): void }) {
  const x = lista[i], u = urls[x.archivo], n = lista.length, ir = (d: number) => onI((i + d + n) % n);
  return (
    <Dialogo className="visor" onCerrar={onCerrar}>
      <div onKeyDown={e => { if (e.key === 'ArrowLeft') ir(-1); if (e.key === 'ArrowRight') ir(1); }} onClick={e => { if (e.target === e.currentTarget) onCerrar(); }} tabIndex={-1} ref={el => el?.focus()}>
        <img src={u || ''} alt={x.nombre} />
        <div className="visor-pie"><span>{x.nombre} · {x.autor} · {fmtHora(x.fecha)}{n > 1 ? ` · ${i + 1} de ${n}` : ''}</span>
          <div className="barra">
            {n > 1 && <><button type="button" title="Anterior (←)" aria-label="Anterior" onClick={() => ir(-1)}>‹</button><button type="button" title="Siguiente (→)" aria-label="Siguiente" onClick={() => ir(1)}>›</button></>}
            <button type="button" onClick={() => { if (u) window.open(u, '_blank'); }}>Abrir en otra pestaña</button><button type="button" title="Cerrar (Esc)" aria-label="Cerrar" onClick={onCerrar}>×</button></div></div>
      </div>
    </Dialogo>
  );
}
