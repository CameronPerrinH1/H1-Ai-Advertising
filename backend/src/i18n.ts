// Visitor-facing text that code (not the model) writes: confirmations, fallbacks, limits.
import type { Lang } from '@concierge/shared';

export interface Strings {
  appointmentNote: (time: string) => string;
  consultNote: string;
  callbackNote: (time: string) => string;
  anyProvider: string;
  appointmentSent: (time: string) => string;
  holdNote: (time: string) => string;
  holdPlaced: (when: string, time: string) => string;
  slotTaken: string;
  callbackSent: (time: string) => string;
  actionExpired: string;
  fallback: string;
  messageLimit: (phone: string) => string;
  busy: string;
  yourEvent: string;
  staffGreeting: (name: string) => string;
  firstVisitIntro: string;
  callUrgent: string;
  call911: string;
  call988: string;
  text988: string;
  categories: Record<string, string>;
}

const en: Strings = {
  appointmentNote: (time) => `This is a request, not a confirmed booking. The team will contact you ${time} to confirm.`,
  consultNote: 'Your visit starts with a consultation with your provider.',
  callbackNote: (time) => `The team will call you ${time}.`,
  anyProvider: 'First available',
  appointmentSent: (time) => `Your request is in. The team will reach out ${time} to confirm your appointment.`,
  holdNote: (time) => `Tapping Confirm holds this time for you. The team will text you ${time} to confirm your appointment.`,
  holdPlaced: (when, time) => `Your time is held: ${when}. The team will text you ${time} to confirm your appointment.`,
  slotTaken: 'That time was just taken, sorry about that. Want me to show the next openings?',
  callbackSent: (time) => `You're all set. The team will call you ${time}.`,
  actionExpired: 'That request is no longer available. Just ask, and I can set it up again.',
  fallback:
    "I want to be sure I give you accurate details. You can see current options and book online, or I can have the team call you.",
  messageLimit: (phone) => `We've covered a lot. To keep going, book online or call us at ${phone}.`,
  busy: "One moment, I'm still answering your last message.",
  yourEvent: 'your event',
  staffGreeting: (name) =>
    `Hi, I'm ${name}, your team assistant. Ask me about treatments, policies, or how to answer a guest, or practice a call with me. Please don't enter guest names or health details.`,
  firstVisitIntro: "Here's what to know before your visit.",
  callUrgent: 'Call our urgent line',
  call911: 'Call 911',
  call988: 'Call 988',
  text988: 'Text 988',
  categories: {
    medical_question: 'Medical question',
    reschedule: 'Reschedule',
    cancel: 'Cancel',
    complaint: 'Concern',
    other: 'Other',
  },
};

const es: Strings = {
  appointmentNote: (time) => `Esta es una solicitud, no una reserva confirmada. El equipo te contactará ${time} para confirmarla.`,
  consultNote: 'Tu visita comienza con una consulta con tu proveedor.',
  callbackNote: (time) => `El equipo te llamará ${time}.`,
  anyProvider: 'Primer disponible',
  appointmentSent: (time) => `Recibimos tu solicitud. El equipo te contactará ${time} para confirmar tu cita.`,
  holdNote: (time) => `Al tocar Confirmar, apartamos este horario para ti. El equipo te enviará un mensaje ${time} para confirmar tu cita.`,
  holdPlaced: (when, time) => `Tu horario está apartado: ${when}. El equipo te enviará un mensaje ${time} para confirmar tu cita.`,
  slotTaken: 'Ese horario se acaba de ocupar, lo siento. ¿Te muestro los próximos horarios?',
  callbackSent: (time) => `Listo. El equipo te llamará ${time}.`,
  actionExpired: 'Esa solicitud ya no está disponible. Pídemelo y la preparo de nuevo.',
  fallback:
    'Quiero asegurarme de darte información precisa. Puedes ver las opciones actuales y reservar en línea, o puedo pedirle al equipo que te llame.',
  messageLimit: (phone) => `Hemos cubierto mucho. Para continuar, reserva en línea o llámanos al ${phone}.`,
  busy: 'Un momento, todavía estoy respondiendo tu último mensaje.',
  yourEvent: 'tu evento',
  staffGreeting: (name) =>
    `Hola, soy ${name}, tu asistente de equipo. Pregúntame sobre tratamientos, políticas o cómo responder a un cliente, o practica una llamada conmigo. Por favor, no escribas nombres ni datos de salud de clientes.`,
  firstVisitIntro: 'Esto es lo que conviene saber antes de tu visita.',
  callUrgent: 'Llamar a la línea de urgencias',
  call911: 'Llamar al 911',
  call988: 'Llamar al 988',
  text988: 'Enviar texto al 988',
  categories: {
    medical_question: 'Pregunta médica',
    reschedule: 'Cambiar cita',
    cancel: 'Cancelar',
    complaint: 'Inquietud',
    other: 'Otro',
  },
};

export function strings(lang: Lang): Strings {
  return lang === 'es' ? es : en;
}
