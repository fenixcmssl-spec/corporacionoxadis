'use client';

import React from 'react';
import Image from 'next/image';
import { Users, ShieldCheck, MapPin, Tag, ArrowRight, MessageSquare, Send, CheckCircle2, Flag, AlertTriangle } from 'lucide-react';
import { PersonalAdDto } from '../../lib/types/fenix';
import ItemDetailModal from './ItemDetailModal';

interface TiendaPersonalesViewProps {
  tenantName: string;
  personals: PersonalAdDto[];
  accentColor?: string;
}

export default function TiendaPersonalesView({
  tenantName,
  personals,
  accentColor = '#ec4899',
}: TiendaPersonalesViewProps) {
  const [selectedPersonal, setSelectedPersonal] = React.useState<PersonalAdDto | null>(null);
  const [messageText, setMessageText] = React.useState('');
  const [senderContact, setSenderContact] = React.useState('');
  const [msgSent, setMsgSent] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [reportReason, setReportReason] = React.useState('');
  const [reportEmail, setReportEmail] = React.useState('');
  const [showReportForm, setShowReportForm] = React.useState(false);
  const [reportSent, setReportSent] = React.useState(false);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText || !senderContact || !selectedPersonal) return;
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const hostname = typeof window !== 'undefined' ? window.location.hostname : 'modaurbana.fenixcms.app';
      const res = await fetch(`/api/public/${hostname}/inquiries`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: 'Usuario Interesado',
          email: senderContact.includes('@') ? senderContact.trim() : 'contacto@privado.es',
          phone: !senderContact.includes('@') ? senderContact.trim() : undefined,
          message: `Mensaje para anuncio personal #${selectedPersonal.id} (@${selectedPersonal.contactNickname}): ${messageText.trim()}`,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.error || data.message || 'Error al transmitir el mensaje.');
      }

      setMsgSent(true);
      setTimeout(() => {
        setMsgSent(false);
        setMessageText('');
        setSenderContact('');
        setSelectedPersonal(null);
      }, 3000);
    } catch (err: any) {
      setSubmitError(err.message || 'No se pudo enviar el mensaje. Por favor intente más tarde.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportReason || !reportEmail || !selectedPersonal) return;
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const hostname = typeof window !== 'undefined' ? window.location.hostname : 'modaurbana.fenixcms.app';
      const res = await fetch(`/api/public/${hostname}/reports`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          targetType: 'PERSONAL',
          targetId: selectedPersonal.id,
          reporterEmail: reportEmail.trim(),
          reason: reportReason.trim(),
          details: `Denuncia sobre el anuncio personal '${selectedPersonal.title}'`,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.error || data.message || 'Error al enviar la denuncia.');
      }

      setReportSent(true);
      setTimeout(() => {
        setReportSent(false);
        setShowReportForm(false);
        setReportReason('');
        setReportEmail('');
      }, 3000);
    } catch (err: any) {
      setSubmitError(err.message || 'Error al registrar la denuncia.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section aria-labelledby="personales-heading" className="space-y-8">
      {/* Module Title Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-zinc-800 gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-zinc-400">
            <Users className="h-4 w-4 text-pink-500" />
            <span>Módulo de Anuncios Personales</span>
          </div>
          <h2 id="personales-heading" className="mt-1 text-2xl font-black text-white">
            Comunidad &amp; Contactos Personales de {tenantName}
          </h2>
          <p className="mt-1 text-xs text-zinc-400">
            Conexiones, actividades colaborativas y perfiles moderados con privacidad por defecto.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono">
          <ShieldCheck className="h-4 w-4 text-pink-400" />
          <span>Privacidad de Contacto &amp; Moderación</span>
        </div>
      </div>

      {/* Personals Grid */}
      {personals.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-12 text-center text-zinc-400">
          <Users className="h-10 w-10 mx-auto text-zinc-600 mb-3" />
          <h3 className="text-base font-bold text-white">No hay anuncios personales activos</h3>
          <p className="text-xs text-zinc-500 mt-1">
            Actualmente no hay perfiles publicados para esta sección.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {personals.map((per) => (
            <article
              key={per.id}
              onClick={() => setSelectedPersonal(per)}
              className="group flex flex-col justify-between rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 transition-all duration-300 hover:border-pink-500/50 hover:bg-zinc-900 cursor-pointer shadow-lg"
            >
              <div>
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-zinc-950 border border-zinc-800 mb-4">
                  <Image
                    src={per.imageUrl || 'https://picsum.photos/seed/personals/800/600'}
                    alt={per.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-2.5 left-2.5 rounded bg-pink-600 text-white px-2 py-0.5 text-[10px] font-mono font-bold uppercase shadow-sm">
                    {per.category}
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-zinc-400 mb-2 font-mono">
                  <span className="font-bold text-white">@{per.contactNickname}</span>
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-pink-400" />
                    {per.city}
                  </span>
                </div>

                <h3 className="text-base font-bold text-white group-hover:text-pink-400 transition-colors line-clamp-2">
                  {per.title}
                </h3>

                <p className="mt-2 text-xs text-zinc-400 line-clamp-3 leading-relaxed">
                  {per.description}
                </p>

                {/* Interests Chips */}
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {per.interests.map((tag) => (
                    <span
                      key={tag}
                      className="rounded bg-zinc-800 border border-zinc-700 px-2 py-0.5 text-[10px] font-mono text-zinc-300"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs font-bold text-pink-400">
                <span>Ver Perfil &amp; Conectar</span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Personal Detail Modal */}
      {selectedPersonal && (
        <ItemDetailModal
          isOpen={Boolean(selectedPersonal)}
          onClose={() => {
            setSelectedPersonal(null);
            setMsgSent(false);
          }}
          title={selectedPersonal.title}
          badge={selectedPersonal.category}
          badgeColor="#ec4899"
          tenantName={tenantName}
        >
          <div className="space-y-6">
            <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl bg-zinc-950 border border-zinc-800">
              <Image
                src={selectedPersonal.imageUrl}
                alt={selectedPersonal.title}
                fill
                className="object-cover"
                referrerPolicy="no-referrer"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 p-3 rounded-xl border border-zinc-800 bg-zinc-900/60 font-mono text-xs">
              <div>
                <span className="text-zinc-500 block text-[10px]">ALIAS</span>
                <strong className="text-white">@{selectedPersonal.contactNickname}</strong>
              </div>
              <div>
                <span className="text-zinc-500 block text-[10px]">CIUDAD</span>
                <strong className="text-white">{selectedPersonal.city}</strong>
              </div>
              {selectedPersonal.ageRange && (
                <div>
                  <span className="text-zinc-500 block text-[10px]">RANGO DE EDAD</span>
                  <strong className="text-white">{selectedPersonal.ageRange}</strong>
                </div>
              )}
              <div>
                <span className="text-zinc-500 block text-[10px]">ESTADO</span>
                <strong className="text-emerald-400">Identidad Verificada</strong>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-2">Mensaje del Anuncio</h4>
              <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-line">{selectedPersonal.description}</p>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-2">Intereses &amp; Aficiones</h4>
              <div className="flex flex-wrap gap-1.5">
                {selectedPersonal.interests.map((interest) => (
                  <span
                    key={interest}
                    className="rounded-lg bg-zinc-900 border border-zinc-800 px-2.5 py-1 text-xs text-zinc-300"
                  >
                    #{interest}
                  </span>
                ))}
              </div>
            </div>

            {/* Message Form */}
            <div className="p-4 rounded-xl border border-pink-950 bg-pink-950/20 space-y-3">
              <h4 className="text-xs font-bold text-pink-300 uppercase tracking-wider flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                <span>Enviar Mensaje Privado al Usuario</span>
              </h4>

              {msgSent ? (
                <div className="p-3 rounded-lg bg-emerald-950 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>¡Mensaje transmitido de forma segura al buzón de @{selectedPersonal.contactNickname}!</span>
                </div>
              ) : (
                <form onSubmit={handleSendMessage} className="space-y-3">
                  <input
                    type="text"
                    required
                    placeholder="Tu contacto o email de respuesta"
                    value={senderContact}
                    onChange={(e) => setSenderContact(e.target.value)}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white focus:outline-none focus:border-pink-500 font-mono"
                  />
                  <textarea
                    required
                    rows={3}
                    placeholder={`Escribe un mensaje respetuoso para presentarte...`}
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white focus:outline-none focus:border-pink-500"
                  />
                  <button
                    type="submit"
                    className="flex items-center justify-center gap-1.5 rounded-lg bg-pink-600 px-4 py-2 text-xs font-bold text-white hover:bg-pink-500 transition shadow"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>Transmitir Mensaje</span>
                  </button>
                </form>
              )}
            </div>
          </div>
        </ItemDetailModal>
      )}
    </section>
  );
}
